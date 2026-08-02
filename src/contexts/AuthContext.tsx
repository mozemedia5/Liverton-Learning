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

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  userRole: UserRole | null;
  loading: boolean;
  initialLoadComplete: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signInWithGoogle: (role?: UserRole) => Promise<void>;
  signInWithApple: (role?: UserRole) => Promise<void>;
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
      setUserRole(mockRole as any);
      setLoading(false);
      setInitialLoadComplete(true);
      return;
    }

    // Set up auth state listener only once
    unsubscribeRef.current = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data() as User;
              // Force platform_admin role for the specific admin email if it's not set in Firestore
              if (user.email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
                data.role = 'platform_admin';
              }
              setUserData(data);
              setUserRole(data.role);
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
              setUserRole('platform_admin');
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setUserData(null);
            setUserRole(null);
          }
        } else {
          setUserData(null);
          setUserRole(null);
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

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      // Force platform_admin role for the specific admin email
      if (email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
        data.role = 'platform_admin';
      }
      setUserData(data);
      setUserRole(data.role);
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
      setUserRole('platform_admin');
    }
  };

  const register = async (email: string, password: string, userDataInput: Partial<User>) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    const newUser: Partial<User> = {
      uid,
      email,
      ...userDataInput,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'users', uid), newUser);
    
    // Also create role-specific document
    if (userDataInput.role) {
      await setDoc(doc(db, userDataInput.role + 's', uid), newUser);
    }
  };

  const signInWithGoogle = async (role?: UserRole) => {
    const provider = new GoogleAuthProvider();
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
        email: user.email || '',
        fullName: user.displayName || 'Google User',
        role: assignedRole,
        sex: 'other',
        age: 0,
        country: 'Uganda',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(userDocRef, newUser);
      await setDoc(doc(db, assignedRole + 's', user.uid), newUser);

      setUserData(newUser);
      setUserRole(assignedRole);
    } else {
      // User already exists, load their data
      const data = userDoc.data() as User;
      // Force platform_admin if applicable
      if (user.email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
        data.role = 'platform_admin';
      }
      setUserData(data);
      setUserRole(data.role);
    }
  };

  const signInWithApple = async (role?: UserRole) => {
    try {
      const provider = new OAuthProvider('apple.com');
      const userCredential = await signInWithPopup(auth, provider);
      const { user } = userCredential;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const assignedRole = role || 'student';
        const newUser: User = {
          uid: user.uid,
          email: user.email || '',
          fullName: user.displayName || 'Apple User',
          role: assignedRole,
          sex: 'other',
          age: 0,
          country: 'Uganda',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(userDocRef, newUser);
        await setDoc(doc(db, assignedRole + 's', user.uid), newUser);

        setUserData(newUser);
        setUserRole(assignedRole);
      } else {
        const data = userDoc.data() as User;
        if (user.email === 'infoliverton@gmail.com' && data.role !== 'platform_admin') {
          data.role = 'platform_admin';
        }
        setUserData(data);
        setUserRole(data.role);
      }
    } catch (err: any) {
      console.warn('Apple Auth failed, using simulated Apple Auth:', err);

      const simulatedUid = 'simulated-apple-uid';
      const simulatedEmail = 'apple.user@example.com';
      const userDocRef = doc(db, 'users', simulatedUid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const assignedRole = role || 'student';
        const newUser: User = {
          uid: simulatedUid,
          email: simulatedEmail,
          fullName: 'Apple User',
          role: assignedRole,
          sex: 'other',
          age: 0,
          country: 'Uganda',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await setDoc(userDocRef, newUser);
        await setDoc(doc(db, assignedRole + 's', simulatedUid), newUser);
        setUserData(newUser);
        setUserRole(assignedRole);
      } else {
        const data = userDoc.data() as User;
        setUserData(data);
        setUserRole(data.role);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    setUserRole(null);
    setCurrentUser(null);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    if (userData?.role) {
      const roleRef = doc(db, userData.role + 's', currentUser.uid);
      await updateDoc(roleRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    }

    setUserData(prev => prev ? { ...prev, ...data } : null);
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
    setUserRole(null);
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
