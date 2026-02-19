import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  where,
  orderBy,
  limit,
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
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  status?: 'active' | 'suspended' | 'pending';
  isVerified?: boolean;
  // Role-specific fields
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

// Dashboard statistics interface
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

// Convert Firestore timestamp to Date
const convertTimestamp = (timestamp: Timestamp | Date | undefined): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// Convert Firestore document to User object
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
 * Fetch all users from Firestore
 */
export const getAllUsers = async (): Promise<FirestoreUser[]> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(convertDocToUser);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch users by role
 */
export const getUsersByRole = async (role: UserRole): Promise<FirestoreUser[]> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', role),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(convertDocToUser);
  } catch (error) {
    console.error(`Error fetching ${role} users:`, error);
    throw error;
  }
};

/**
 * Fetch a single user by ID
 */
export const getUserById = async (userId: string): Promise<FirestoreUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    return convertDocToUser(userDoc as QueryDocumentSnapshot<DocumentData>);
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

/**
 * Fetch users with pending verification
 */
export const getPendingVerifications = async (): Promise<FirestoreUser[]> => {
  try {
    // Query for teachers pending verification
    const teachersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'teacher'),
      where('isVerified', '==', false)
    );
    
    // Query for school admins pending verification
    const schoolsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'school_admin'),
      where('isVerified', '==', false)
    );

    const [teachersSnapshot, schoolsSnapshot] = await Promise.all([
      getDocs(teachersQuery),
      getDocs(schoolsQuery)
    ]);

    const pendingUsers = [
      ...teachersSnapshot.docs.map(convertDocToUser),
      ...schoolsSnapshot.docs.map(convertDocToUser)
    ];

    return pendingUsers.sort((a, b) => {
      const dateA = convertTimestamp(a.createdAt).getTime();
      const dateB = convertTimestamp(b.createdAt).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    throw error;
  }
};

/**
 * Fetch dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const usersQuery = query(collection(db, 'users'));
    const snapshot = await getDocs(usersQuery);
    
    const users = snapshot.docs.map(convertDocToUser);
    
    const totalStudents = users.filter(u => u.role === 'student').length;
    const totalTeachers = users.filter(u => u.role === 'teacher').length;
    const totalSchools = users.filter(u => u.role === 'school_admin').length;
    const totalParents = users.filter(u => u.role === 'parent').length;
    const totalAdmins = users.filter(u => u.role === 'platform_admin').length;
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;
    const activeUsers = users.length - suspendedUsers;
    
    // Get pending verifications
    const pendingTeachers = users.filter(u => u.role === 'teacher' && !u.isVerified).length;
    const pendingSchools = users.filter(u => u.role === 'school_admin' && !u.isVerified).length;
    const pendingVerifications = pendingTeachers + pendingSchools;
    
    // Get recent users (last 10)
    const recentUsers = users
      .sort((a, b) => {
        const dateA = convertTimestamp(a.createdAt).getTime();
        const dateB = convertTimestamp(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    return {
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
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

/**
 * Update user status (active/suspended)
 */
export const updateUserStatus = async (
  userId: string, 
  status: 'active' | 'suspended'
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating user status:', error);
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
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Verify a user (teacher or school)
 */
export const verifyUser = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isVerified: true,
      status: 'active',
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    throw error;
  }
};

/**
 * Reject/delete a user
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Search users by name or email
 */
export const searchUsers = async (searchTerm: string): Promise<FirestoreUser[]> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('fullName'),
      limit(100)
    );
    const snapshot = await getDocs(usersQuery);
    
    const users = snapshot.docs.map(convertDocToUser);
    const term = searchTerm.toLowerCase();
    
    return users.filter(user => 
      user.fullName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Get recent user registrations
 */
export const getRecentRegistrations = async (limit_count: number = 10): Promise<FirestoreUser[]> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(limit_count)
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(convertDocToUser);
  } catch (error) {
    console.error('Error fetching recent registrations:', error);
    throw error;
  }
};

/**
 * Format Firestore user for display
 */
export const formatUserForDisplay = (user: FirestoreUser) => {
  return {
    id: user.uid,
    email: user.email,
    name: user.fullName,
    role: user.role,
    status: user.status || 'active',
    joinDate: convertTimestamp(user.createdAt).toISOString().split('T')[0],
    isVerified: user.isVerified || false,
    country: user.country,
    schoolName: user.schoolName,
  };
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    student: 'Student',
    teacher: 'Teacher',
    school_admin: 'School Admin',
    parent: 'Parent',
    platform_admin: 'Platform Admin',
  };
  return roleNames[role] || role;
};

/**
 * Get role badge color class
 */
export const getRoleBadgeColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    student: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    teacher: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    school_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    parent: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    platform_admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

/**
 * Get status badge color class
 */
export const getStatusBadgeColor = (status: string): string => {
  return status === 'active'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : status === 'suspended'
    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
};
