import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  where,
  Timestamp,
  QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserRole } from '@/types';

// User interface for Firestore data
export interface FirestoreUser {
  uid: string;
  email: string;
  fullName: string;
  name?: string;
  role: UserRole;
  sex?: 'male' | 'female' | 'other';
  age?: number;
  country?: string;
  profilePicture?: string;
  phone?: string;
  address?: string;
  bio?: string;
  createdAt?: Timestamp | Date | string | any;
  updatedAt?: Timestamp | Date | string | any;
  status?: 'active' | 'suspended' | 'pending';
  isVerified?: boolean;
  schoolName?: string;
  schoolId?: string;
  schoolRegistrationNumber?: string;
  schoolType?: string;
  subjectsTaught?: string[];
  subjects?: string[];
  levelOfEducation?: string;
  educationLevel?: string;
  experience?: number;
  linkedStudentIds?: string[];
  studentCount?: number;
  teacherCount?: number;
  parentIds?: string[];
  viewOnly?: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalSchools: number;
  totalParents: number;
  totalAdmins: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingVerifications: number;
  totalRevenue?: number;
  recentUsers: FirestoreUser[];
}

/**
 * Safely convert various date formats to a Date object
 * Uses duck typing instead of instanceof for better compatibility with Firestore data
 */
const convertTimestamp = (timestamp: any): Date => {
  // Return epoch date for null/undefined
  if (timestamp === null || timestamp === undefined) {
    return new Date(0);
  }
  
  // If it's already a Date, validate it
  if (timestamp instanceof Date) {
    if (!isNaN(timestamp.getTime())) {
      return timestamp;
    }
    return new Date(0);
  }
  
  // Handle Firebase Timestamp - check for toDate method (duck typing)
  if (typeof timestamp === 'object' && timestamp !== null) {
    // Check if it has a callable toDate method
    if (typeof timestamp.toDate === 'function') {
      try {
        const date = timestamp.toDate();
        if (date instanceof Date && typeof date.getTime === 'function' && !isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        console.warn('Error converting timestamp with toDate():', e);
      }
    }
    
    // Handle objects that look like Timestamps with seconds/nanoseconds
    if (typeof timestamp.seconds === 'number') {
      try {
        const date = new Date(timestamp.seconds * 1000);
        if (typeof date.getTime === 'function' && !isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        console.warn('Error converting timestamp with seconds:', e);
      }
    }
    
    // Handle _seconds field (some Firebase SDK versions)
    if (typeof timestamp._seconds === 'number') {
      try {
        const date = new Date(timestamp._seconds * 1000);
        if (typeof date.getTime === 'function' && !isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        console.warn('Error converting timestamp with _seconds:', e);
      }
    }
  }

  // Handle strings or numbers - wrap in try-catch for safety
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    try {
      const date = new Date(timestamp);
      if (typeof date.getTime === 'function' && !isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      console.warn('Error parsing timestamp:', e);
    }
  }

  // Default fallback - always return a valid Date
  return new Date(0);
};

const convertDocToUser = (doc: QueryDocumentSnapshot<DocumentData>): FirestoreUser => {
  const data = doc.data();
  return {
    uid: doc.id,
    email: data.email || '',
    fullName: data.fullName || data.name || 'Unknown',
    name: data.name || data.fullName,
    role: data.role || 'student',
    sex: data.sex || 'other',
    age: data.age || 0,
    country: data.country || 'Unknown',
    profilePicture: data.profilePicture || data.profileImageUrl,
    phone: data.phone,
    address: data.address,
    bio: data.bio,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    status: data.status || 'active',
    isVerified: data.isVerified || false,
    schoolName: data.schoolName,
    schoolId: data.schoolId,
    schoolRegistrationNumber: data.schoolRegistrationNumber,
    schoolType: data.schoolType,
    subjectsTaught: data.subjectsTaught || data.subjects,
    subjects: data.subjects,
    levelOfEducation: data.levelOfEducation || data.educationLevel,
    educationLevel: data.educationLevel,
    experience: data.experience,
    linkedStudentIds: data.linkedStudentIds,
    studentCount: data.studentCount,
    teacherCount: data.teacherCount,
    parentIds: data.parentIds,
    viewOnly: data.viewOnly,
  };
};

/**
 * Fetch all users from Firestore - Simple version without ordering to avoid index issues
 */
export const getAllUsers = async (): Promise<FirestoreUser[]> => {
  try {
    console.log('[Firebase] Fetching all users...');
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    console.log(`[Firebase] Found ${snapshot.docs.length} users`);
    
    const users = snapshot.docs.map(convertDocToUser);
    
    // Sort in memory instead of using orderBy
    return users.sort((a, b) => {
      const dateA = convertTimestamp(a.createdAt).getTime();
      const dateB = convertTimestamp(b.createdAt).getTime();
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error('[Firebase] Error fetching users:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Fetch users by role - Simple version without composite queries
 */
export const getUsersByRole = async (role: UserRole): Promise<FirestoreUser[]> => {
  try {
    console.log(`[Firebase] Fetching users with role: ${role}`);
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', role)
    );
    const snapshot = await getDocs(usersQuery);
    
    console.log(`[Firebase] Found ${snapshot.docs.length} users with role ${role}`);
    
    const users = snapshot.docs.map(convertDocToUser);
    
    // Sort in memory
    return users.sort((a, b) => {
      const dateA = convertTimestamp(a.createdAt).getTime();
      const dateB = convertTimestamp(b.createdAt).getTime();
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error(`[Firebase] Error fetching ${role} users:`, error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Fetch a single user by ID
 */
export const getUserById = async (userId: string): Promise<FirestoreUser | null> => {
  try {
    console.log(`[Firebase] Fetching user: ${userId}`);
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log(`[Firebase] User ${userId} not found`);
      return null;
    }
    console.log(`[Firebase] User ${userId} found`);
    return convertDocToUser(userDoc as QueryDocumentSnapshot<DocumentData>);
  } catch (error: any) {
    console.error('[Firebase] Error fetching user:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Fetch users with pending verification - Using simple queries
 */
export const getPendingVerifications = async (): Promise<FirestoreUser[]> => {
  try {
    console.log('[Firebase] Fetching pending verifications...');
    
    // Get all users and filter in memory to avoid composite index issues
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    const users = snapshot.docs.map(convertDocToUser);
    
    // Filter pending users in memory
    const pendingUsers = users.filter(u => 
      !u.isVerified && (u.role === 'teacher' || u.role === 'school_admin')
    );
    
    console.log(`[Firebase] Found ${pendingUsers.length} pending verifications`);
    
    return pendingUsers.sort((a, b) => {
      const dateA = convertTimestamp(a.createdAt).getTime();
      const dateB = convertTimestamp(b.createdAt).getTime();
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error('[Firebase] Error fetching pending verifications:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Fetch dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    console.log('[Firebase] Fetching dashboard stats...');
    
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    console.log(`[Firebase] Total documents in users collection: ${snapshot.docs.length}`);
    
    const users = snapshot.docs.map(convertDocToUser);
    
    const totalStudents = users.filter(u => u.role === 'student').length;
    const totalTeachers = users.filter(u => u.role === 'teacher').length;
    const totalSchools = users.filter(u => u.role === 'school_admin').length;
    const totalParents = users.filter(u => u.role === 'parent').length;
    const totalAdmins = users.filter(u => u.role === 'platform_admin').length;
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;
    const activeUsers = users.length - suspendedUsers;
    
    const pendingTeachers = users.filter(u => u.role === 'teacher' && !u.isVerified).length;
    const pendingSchools = users.filter(u => u.role === 'school_admin' && !u.isVerified).length;
    const pendingVerifications = pendingTeachers + pendingSchools;
    
    const recentUsers = users
      .sort((a, b) => {
        const dateA = convertTimestamp(a.createdAt).getTime();
        const dateB = convertTimestamp(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    const stats = {
      totalUsers: users.length,
      totalStudents,
      totalTeachers,
      totalSchools,
      totalParents,
      totalAdmins,
      activeUsers,
      suspendedUsers,
      pendingVerifications,
      recentUsers,
    };
    
    console.log('[Firebase] Dashboard stats:', stats);
    
    return stats;
  } catch (error: any) {
    console.error('[Firebase] Error fetching dashboard stats:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Update user status
 */
export const updateUserStatus = async (
  userId: string, 
  status: 'active' | 'suspended'
): Promise<void> => {
  try {
    console.log(`[Firebase] Updating user ${userId} status to ${status}`);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status,
      updatedAt: new Date(),
    });
    console.log(`[Firebase] User ${userId} status updated successfully`);
  } catch (error: any) {
    console.error('[Firebase] Error updating user status:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Update user role
 */
export const updateUserRole = async (
  userId: string, 
  role: UserRole
): Promise<void> => {
  try {
    console.log(`[Firebase] Updating user ${userId} role to ${role}`);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role,
      updatedAt: new Date(),
    });
    console.log(`[Firebase] User ${userId} role updated successfully`);
  } catch (error: any) {
    console.error('[Firebase] Error updating user role:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Verify a user
 */
export const verifyUser = async (userId: string): Promise<void> => {
  try {
    console.log(`[Firebase] Verifying user ${userId}`);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isVerified: true,
      updatedAt: new Date(),
    });
    console.log(`[Firebase] User ${userId} verified successfully`);
  } catch (error: any) {
    console.error('[Firebase] Error verifying user:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    console.log(`[Firebase] Deleting user ${userId}`);
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    console.log(`[Firebase] User ${userId} deleted successfully`);
  } catch (error: any) {
    console.error('[Firebase] Error deleting user:', error);
    console.error('[Firebase] Error code:', error.code);
    console.error('[Firebase] Error message:', error.message);
    throw error;
  }
};

/**
 * Format a FirestoreUser for display in the UI
 */
export const formatUserForDisplay = (user: FirestoreUser) => {
  return {
    id: user.uid,
    email: user.email,
    name: user.fullName || user.name || 'Unknown',
    role: user.role,
    status: user.status || 'active',
    joinDate: formatDateForDisplay(user.createdAt),
    isVerified: user.isVerified || false,
    country: user.country,
    schoolName: user.schoolName,
  };
};

/**
 * Helper to format date for display
 */
const formatDateForDisplay = (timestamp: any): string => {
  const date = convertTimestamp(timestamp);
  if (date.getTime() === 0) {
    return 'Unknown';
  }
  return date.toLocaleDateString();
};

/**
 * Get badge color class for a user role
 */
export const getRoleBadgeColor = (role: UserRole): string => {
  const colors: Record<string, string> = {
    student: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    teacher: 'bg-green-100 text-green-800 hover:bg-green-100',
    school_admin: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    parent: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    platform_admin: 'bg-red-100 text-red-800 hover:bg-red-100',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
};

/**
 * Get badge color class for a user status
 */
export const getStatusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 hover:bg-green-100',
    suspended: 'bg-red-100 text-red-800 hover:bg-red-100',
    pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
};