/**
 * Parent Service - Handles parent-student linking and management
 * This service manages the relationship between parents and their children (students)
 * in the Firebase database
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, Parent } from '@/types';

/**
 * Interface for linking a student to a parent account
 */
export interface StudentLinkRequest {
  studentEmail: string;
  studentName: string;
  relationship: string;
  contactNumber?: string;
}

/**
 * Interface for a linked student in parent's account
 */
export interface LinkedStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  relationship: string;
  contactNumber?: string;
  linkedAt: Date;
  status: 'pending' | 'active' | 'removed';
}

/**
 * Verify if a student exists in the system by email
 * @param studentEmail - Email of the student to verify
 * @returns Student data if found, null otherwise
 */
export async function verifyStudentExists(studentEmail: string): Promise<User | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', studentEmail), where('role', '==', 'student'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const studentDoc = querySnapshot.docs[0];
    return studentDoc.data() as User;
  } catch (error) {
    console.error('Error verifying student:', error);
    throw new Error('Failed to verify student. Please try again.');
  }
}

/**
 * Link a student to a parent account
 * Creates a relationship between parent and student in Firestore
 * @param parentId - UID of the parent
 * @param studentId - UID of the student
 * @param linkData - Information about the link (relationship, contact, etc.)
 */
export async function linkStudentToParent(
  parentId: string,
  studentId: string,
  linkData: Omit<StudentLinkRequest, 'studentEmail'>
): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    // Update parent's linkedStudentIds array
    const parentRef = doc(db, 'users', parentId);
    batch.update(parentRef, {
      linkedStudentIds: arrayUnion(studentId),
      updatedAt: serverTimestamp(),
    });
    
    // Create a link document for tracking
    const linkRef = doc(db, 'parentStudentLinks', `${parentId}_${studentId}`);
    batch.set(linkRef, {
      parentId,
      studentId,
      studentName: linkData.studentName,
      relationship: linkData.relationship,
      contactNumber: linkData.contactNumber || '',
      status: 'active',
      linkedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Update student's parent information (optional - for student to know who can view their data)
    const studentRef = doc(db, 'users', studentId);
    batch.update(studentRef, {
      parentIds: arrayUnion(parentId),
      updatedAt: serverTimestamp(),
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error linking student to parent:', error);
    throw new Error('Failed to link student. Please try again.');
  }
}

/**
 * Get all students linked to a parent
 * @param parentId - UID of the parent
 * @returns Array of linked students
 */
export async function getLinkedStudents(parentId: string): Promise<LinkedStudent[]> {
  try {
    const linksRef = collection(db, 'parentStudentLinks');
    const q = query(linksRef, where('parentId', '==', parentId), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    
    const linkedStudents: LinkedStudent[] = [];
    
    for (const linkDoc of querySnapshot.docs) {
      const linkData = linkDoc.data();
      linkedStudents.push({
        studentId: linkData.studentId,
        studentName: linkData.studentName,
        studentEmail: linkData.studentEmail || '',
        relationship: linkData.relationship,
        contactNumber: linkData.contactNumber,
        linkedAt: linkData.linkedAt?.toDate() || new Date(),
        status: linkData.status,
      });
    }
    
    return linkedStudents;
  } catch (error) {
    console.error('Error fetching linked students:', error);
    throw new Error('Failed to fetch linked students.');
  }
}

/**
 * Remove a student link from parent account
 * @param parentId - UID of the parent
 * @param studentId - UID of the student
 */
export async function unlinkStudentFromParent(parentId: string, studentId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    // Update parent's linkedStudentIds array
    const parentRef = doc(db, 'users', parentId);
    batch.update(parentRef, {
      linkedStudentIds: arrayRemove(studentId),
      updatedAt: serverTimestamp(),
    });
    
    // Update link status to removed
    const linkRef = doc(db, 'parentStudentLinks', `${parentId}_${studentId}`);
    batch.update(linkRef, {
      status: 'removed',
      updatedAt: serverTimestamp(),
    });
    
    // Remove parent from student's parentIds
    const studentRef = doc(db, 'users', studentId);
    batch.update(studentRef, {
      parentIds: arrayRemove(parentId),
      updatedAt: serverTimestamp(),
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error unlinking student from parent:', error);
    throw new Error('Failed to unlink student.');
  }
}

/**
 * Update student link information (relationship, contact, etc.)
 * @param parentId - UID of the parent
 * @param studentId - UID of the student
 * @param updateData - Data to update
 */
export async function updateStudentLink(
  parentId: string,
  studentId: string,
  updateData: Partial<Omit<StudentLinkRequest, 'studentEmail'>>
): Promise<void> {
  try {
    const linkRef = doc(db, 'parentStudentLinks', `${parentId}_${studentId}`);
    await updateDoc(linkRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating student link:', error);
    throw new Error('Failed to update student link.');
  }
}

/**
 * Get parent's profile with all linked students
 * @param parentId - UID of the parent
 * @returns Parent data with linked students
 */
export async function getParentProfile(parentId: string): Promise<(Parent & { linkedStudents: LinkedStudent[] }) | null> {
  try {
    const parentDoc = await getDoc(doc(db, 'users', parentId));
    
    if (!parentDoc.exists()) {
      return null;
    }
    
    const parentData = parentDoc.data() as Parent;
    const linkedStudents = await getLinkedStudents(parentId);
    
    return {
      ...parentData,
      linkedStudents,
    };
  } catch (error) {
    console.error('Error fetching parent profile:', error);
    throw new Error('Failed to fetch parent profile.');
  }
}

/**
 * Add a new student to parent's account during registration
 * This is called during the parent registration process
 * @param parentId - UID of the parent
 * @param studentData - Student information to link
 */
export async function addStudentDuringRegistration(
  parentId: string,
  studentData: StudentLinkRequest
): Promise<void> {
  try {
    // Verify student exists
    const student = await verifyStudentExists(studentData.studentEmail);
    
    if (!student) {
      throw new Error(`Student with email ${studentData.studentEmail} not found. Please ensure the student has registered first.`);
    }
    
    // Link the student to parent
    await linkStudentToParent(parentId, student.uid, {
      studentName: studentData.studentName,
      relationship: studentData.relationship,
      contactNumber: studentData.contactNumber,
    });
  } catch (error) {
    console.error('Error adding student during registration:', error);
    throw error;
  }
}
