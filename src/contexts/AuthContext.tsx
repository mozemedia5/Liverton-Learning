import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
  type User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/types';
import { normalizeUserRole } from '@/lib/authNavigation';
import { clearAccountSetupReminder, createAccountSetupReminder, getAccountSetupStatus, syncAccountIdentity } from '@/services/accountSetupService';
import { claimUsername, normalizeUsername, releaseUsername, validateUsername } from '@/services/userProfileService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  userRole: UserRole | null;
  loading: boolean;
  initialLoadComplete: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  register: (email: string, password: string, userData: Partial<User>) => Promise<UserRole>;
  signInWithGoogle: (role?: UserRole) => Promise<UserRole>;
  signInWithApple: (role?: UserRole) => Promise<UserRole>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const profileLoadIdRef = useRef(0);
  const cachedRole = normalizeUserRole(localStorage.getItem('liverton_user_role'));

  const setResolvedRole = (role: UserRole | null) => {
    setUserRole(role);
    if (role) localStorage.setItem('liverton_user_role', role);
    else localStorage.removeItem('liverton_user_role');
  };

  const getProfileWithTimeout = async (uid: string) => {
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('PROFILE_LOOKUP_TIMEOUT')), 5000);
    });
    return Promise.race([getDoc(doc(db, 'users', uid)), timeout]);
  };

  const getAuthenticatedEmail = (user: FirebaseUser, fallback = '') =>
    user.email || user.providerData.find((provider) => provider.email)?.email || fallback;

  const syncAccountOnOpen = async (profile: User, user: FirebaseUser): Promise<void> => {
    if (!profile.uid || user.email === 'mock@liverton.com') return;

    const authenticatedEmail = getAuthenticatedEmail(user, profile.email);
    const setupStatus = getAccountSetupStatus(profile, user);
    const providerIds = user.providerData.map((provider) => provider.providerId);
    const userRef = doc(db, 'users', user.uid);

    void updateDoc(userRef, {
      email: authenticatedEmail,
      emailVerified: user.emailVerified,
      providerIds,
      setupProgress: setupStatus.percentage,
      updatedAt: serverTimestamp(),
    }).catch((error) => console.warn('Unable to refresh account setup fields:', error));

    try {
      await syncAccountIdentity({
        ...profile,
        email: authenticatedEmail,
        emailVerified: user.emailVerified,
        providerIds,
      }, user);
    } catch (error) {
      console.warn('Unable to sync searchable user identity:', error);
    }

    // Notifications are a convenience side effect. They must never block
    // authentication or profile persistence when rules are stale or a reminder
    // document is unavailable.
    if (setupStatus.percentage < 100) {
      void createAccountSetupReminder(profile, user, profile.role)
        .catch((error) => console.warn('Unable to create account setup reminder:', error));
    } else {
      void clearAccountSetupReminder(user.uid)
        .catch((error) => console.warn('Unable to clear account setup reminder:', error));
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mockRole = urlParams.get('mockRole') || localStorage.getItem('mockRole');
    if (mockRole) {
      setCurrentUser({
        uid: 'mock-uid',
        email: 'mock@liverton.com',
        displayName: 'Mock ' + mockRole,
      } as any);
      setUserData({
        fullName: 'Mock ' + mockRole.replace('_', ' '),
        role: mockRole as any,
        email: 'mock@liverton.com',
        uid: 'mock-uid',
      } as any);
      setResolvedRole(mockRole as any);
      setLoading(false);
      setInitialLoadComplete(true);
      return;
    }

    // Set up auth state listener only once
    unsubscribeRef.current = onAuthStateChanged(auth, async (user) => {
      const profileLoadId = ++profileLoadIdRef.current;
      try {
        setCurrentUser(user);
        // Firebase has resolved the session. Do not block the entire app while
        // the optional Firestore profile refresh runs in the background.
        setLoading(false);
        setInitialLoadComplete(true);
        
        if (user) {
          // Reuse the last known role immediately. The full Firestore profile
          // refresh continues below, so returning users do not wait on a network
          // read before the app can render their dashboard.
          if (cachedRole) {
            setUserData(prev => prev || {
              uid: user.uid,
              email: user.email || '',
              fullName: user.displayName || 'Liverton User',
              role: cachedRole,
            } as User);
            setResolvedRole(cachedRole);
            setLoading(false);
            setInitialLoadComplete(true);
          }
          try {
            const userDoc = await getProfileWithTimeout(user.uid);
            if (userDoc.exists()) {
              const data = userDoc.data() as User;
              // Force platform_admin role for the specific admin email if it's not set in Firestore
              if (user.email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
                data.role = 'platform_admin';
              }
              const normalizedRole = normalizeUserRole(data.role);
              if (!normalizedRole) throw new Error('Your account profile has an unsupported role. Please contact support.');
              data.role = normalizedRole;
              setUserData(data);
              setResolvedRole(normalizedRole);
              await syncAccountOnOpen(data, user);
            } else if (user.email === 'infoliverton@gmail.com') {
              // Fallback for the admin user if document doesn't exist yet
              const adminData: User = {
                uid: user.uid,
                email: user.email,
                fullName: 'Platform Admin',
                role: 'platform_admin',
                sex: 'other',
                age: 0,
                country: 'Global',
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              setUserData(adminData);
              setResolvedRole('platform_admin');
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            if (error instanceof Error && error.message === 'PROFILE_LOOKUP_TIMEOUT' && cachedRole) {
              setResolvedRole(cachedRole);
              setUserData(prev => prev || {
                uid: user.uid,
                email: user.email || '',
                fullName: user.displayName || 'Liverton User',
                role: cachedRole,
              } as User);
            }
            // Do not clear a profile that was just written by register/login while
            // this listener was still resolving the same Firebase user.
            if (profileLoadId === profileLoadIdRef.current && !cachedRole) {
              setUserData(prev => prev?.uid === user.uid ? prev : null);
              setResolvedRole(null);
            }
          }
        } else {
          setUserData(null);
          setResolvedRole(null);
        }
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    });

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserRole> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      // Force platform_admin role for the specific admin email
      if (email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
        data.role = 'platform_admin';
      }
      const normalizedRole = normalizeUserRole(data.role);
      if (!normalizedRole) throw new Error('Your account profile has an unsupported role. Please contact support.');
      data.role = normalizedRole;
      setUserData(data);
      setResolvedRole(normalizedRole);
      await syncAccountOnOpen(data, userCredential.user);
      return normalizedRole;
    } else if (email === 'infoliverton@gmail.com') {
      // Fallback for the admin user if document doesn't exist
      const adminData: User = {
        uid: userCredential.user.uid,
        email: email,
        fullName: 'Platform Admin',
        role: 'platform_admin',
        sex: 'other',
        age: 0,
        country: 'Global',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUserData(adminData);
      setResolvedRole('platform_admin');
      return 'platform_admin';
    }

    throw new Error('Your account profile is missing. Please contact support before signing in again.');
  };

  const register = async (email: string, password: string, userDataInput: Partial<User>): Promise<UserRole> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    const newUser: Partial<User> = {
      uid,
      email,
      emailVerified: userCredential.user.emailVerified,
      providerIds: userCredential.user.providerData.map((provider) => provider.providerId),
      ...userDataInput,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'users', uid), newUser);
    
    // Also create role-specific document
    if (userDataInput.role) {
      await setDoc(doc(db, userDataInput.role + 's', uid), newUser);
      setUserData(newUser as User);
      setResolvedRole(userDataInput.role);
      await syncAccountOnOpen(newUser as User, userCredential.user);
      return userDataInput.role;
    }

    throw new Error('A valid account role is required to finish registration.');
  };

  const signInWithGoogle = async (role?: UserRole): Promise<UserRole> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const { user } = userCredential;

    // Check if user document exists in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // It's a new user, we must write their profile!
      // If a role was provided, use it. Otherwise, default to 'student'
      const assignedRole = role || 'student';
      const newUser: User = {
        uid: user.uid,
        email: getAuthenticatedEmail(user),
        fullName: user.displayName || 'Google User',
        role: assignedRole,
        sex: 'other',
        age: 0,
        country: 'Uganda',
        emailVerified: user.emailVerified,
        providerIds: user.providerData.map((provider) => provider.providerId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(userDocRef, newUser);
      await setDoc(doc(db, assignedRole + 's', user.uid), newUser);

      setUserData(newUser);
      setResolvedRole(assignedRole);
      await syncAccountOnOpen(newUser, user);
      return assignedRole;
    } else {
      // User already exists, load their data
      const data = userDoc.data() as User;
      // Force platform_admin if applicable
      if (user.email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
        data.role = 'platform_admin';
      }
      const normalizedRole = normalizeUserRole(data.role);
      if (!normalizedRole) throw new Error('Your account profile has an unsupported role. Please contact support.');
      data.role = normalizedRole;
      setUserData(data);
      setResolvedRole(normalizedRole);
      await syncAccountOnOpen(data, user);
      return normalizedRole;
    }
  };

  const signInWithApple = async (role?: UserRole): Promise<UserRole> => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const userCredential = await signInWithPopup(auth, provider);
    const { user } = userCredential;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const assignedRole = role || 'student';
      const newUser: User = {
        uid: user.uid,
        email: getAuthenticatedEmail(user),
        fullName: user.displayName || 'Apple User',
        role: assignedRole,
        sex: 'other',
        age: 0,
        country: 'Uganda',
        emailVerified: user.emailVerified,
        providerIds: user.providerData.map((provider) => provider.providerId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(userDocRef, newUser);
      await setDoc(doc(db, assignedRole + 's', user.uid), newUser);

      setUserData(newUser);
      setResolvedRole(assignedRole);
      await syncAccountOnOpen(newUser, user);
      return assignedRole;
    }

    const data = userDoc.data() as User;
    if (user.email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
      data.role = 'platform_admin';
    }
    const normalizedRole = normalizeUserRole(data.role);
    if (!normalizedRole) throw new Error('Your account profile has an unsupported role. Please contact support.');
    data.role = normalizedRole;
    setUserData(data);
    setResolvedRole(normalizedRole);
    await syncAccountOnOpen(data, user);
    return normalizedRole;
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    setResolvedRole(null);
    setCurrentUser(null);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) {
      throw new Error('You must be signed in to update your profile.');
    }

    let profileUpdate: Partial<User> = { ...data };
    const previousUsername = normalizeUsername(userData?.username);
    let claimedUsername: string | null = null;

    if (typeof data.username === 'string') {
      const usernameError = validateUsername(data.username);
      if (usernameError) throw new Error(usernameError);
      claimedUsername = normalizeUsername(data.username);
      await claimUsername(claimedUsername, currentUser.uid);
      profileUpdate = {
        ...profileUpdate,
        username: claimedUsername,
        usernameLower: claimedUsername,
      };
    }

    const profileTimestamp = serverTimestamp();
    const userRef = doc(db, 'users', currentUser.uid);

    try {
      await setDoc(userRef, {
        ...profileUpdate,
        updatedAt: profileTimestamp,
      }, { merge: true });

      if (userData?.role) {
        const roleRef = doc(db, userData.role + 's', currentUser.uid);
        await setDoc(roleRef, {
          ...profileUpdate,
          updatedAt: profileTimestamp,
        }, { merge: true });
      }
    } catch (error) {
      // Do not strand a new username claim when a profile write is rejected.
      if (claimedUsername && claimedUsername !== previousUsername) {
        await releaseUsername(claimedUsername, currentUser.uid).catch((releaseError) => {
          console.warn('Unable to roll back username claim:', releaseError);
        });
      }
      throw error;
    }

    const nextProfile = userData ? { ...userData, ...profileUpdate } : null;
    setUserData(nextProfile);
    if (nextProfile) {
      // Directory syncing is useful for chat discovery but should not make a
      // successful profile save look like a failure if the secondary index is
      // temporarily unavailable.
      try {
        await syncAccountIdentity(nextProfile, currentUser);
      } catch (error) {
        // The primary profile write already succeeded. Directory indexing is a
        // secondary convenience and must not make the save look unsuccessful.
        console.warn('Unable to refresh searchable user identity:', error);
      }
      if (claimedUsername && previousUsername && previousUsername !== claimedUsername) {
        await releaseUsername(previousUsername, currentUser.uid).catch((error) => {
          console.warn('Unable to release previous username claim:', error);
        });
      }
      // Account-setup reminders are also secondary side effects. A stale or
      // partially deployed ruleset must not make profile editing fail after the
      // users/{uid} and role profile documents have been written.
      await syncAccountOnOpen(nextProfile, currentUser).catch((error) => {
        console.warn('Unable to refresh account setup side effects:', error);
      });
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser || !currentUser.email) {
      throw new Error('No user is currently logged in');
    }

    // Re-authenticate the user before changing password
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );

    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  };

  const deleteAccount = async () => {
    if (!currentUser) {
      throw new Error('No user is currently logged in');
    }

    // Delete user data from Firestore
    try {
      // Delete from main users collection
      await deleteDoc(doc(db, 'users', currentUser.uid));

      // Delete from role-specific collection
      if (userData?.role) {
        await deleteDoc(doc(db, userData.role + 's', currentUser.uid));
      }
    } catch (error) {
      console.error('Error deleting Firestore data:', error);
    }

    // Delete Firebase Auth user
    await deleteUser(currentUser);

    // Clear local state
    setUserData(null);
    setResolvedRole(null);
    setCurrentUser(null);
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    userRole,
    loading,
    initialLoadComplete,
    login,
    register,
    signInWithGoogle,
    signInWithApple,
    logout,
    updateUserProfile,
    changePassword,
    deleteAccount,
    isAuthenticated: !!currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
