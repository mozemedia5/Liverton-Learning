import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      setCurrentUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && isMounted) {
            const data = userDoc.data() as User;
            setUserData(data);
            setUserRole(data.role);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          if (isMounted) {
            setUserData(null);
            setUserRole(null);
          }
        }
      } else {
        if (isMounted) {
          setUserData(null);
          setUserRole(null);
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    });

    // Safety timeout - prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Auth] Loading timeout reached, forcing completion');
        setLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      setUserData(data);
      setUserRole(data.role);
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

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    setUserRole(null);
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

  const value: AuthContextType = {
    currentUser,
    userData,
    userRole,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
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
