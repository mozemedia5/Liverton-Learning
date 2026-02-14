/**
 * Zoom Lessons Service
 * 
 * Handles all Firebase Firestore operations for:
 * - Lesson management (create, read, update, delete)
 * - Student enrollments
 * - Lesson history and tracking
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Type definitions for Zoom Lessons
 */
export interface ZoomLesson {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  scheduledDate: string;
  duration: number;
  enrollmentFee: number;
  maxStudents?: number;
  enrolledCount?: number;
  outcomes?: string[];
  materials?: Array<{ name: string; url?: string }>;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  lessonId: string;
  lessonTitle: string;
  enrolledAt: string;
  status: 'enrolled' | 'attended' | 'cancelled';
}

export interface LessonHistory {
  id: string;
  studentId: string;
  lessonId: string;
  lessonTitle: string;
  completedDate: string;
  status: 'completed' | 'cancelled' | 'no-show';
  teacherFeedback?: string;
}

/**
 * Create a new lesson
 * @param lessonData - Lesson information
 * @returns Created lesson with ID
 */
export async function createLesson(lessonData: Omit<ZoomLesson, 'id'>) {
  try {
    const lessonsRef = collection(db, 'zoomLessons');
    const docRef = await addDoc(lessonsRef, {
      ...lessonData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enrolledCount: 0,
    });

    return {
      id: docRef.id,
      ...lessonData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
}

/**
 * Get all lessons
 * @returns Array of all lessons
 */
export async function getAllLessons(): Promise<ZoomLesson[]> {
  try {
    const lessonsRef = collection(db, 'zoomLessons');
    const snapshot = await getDocs(lessonsRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ZoomLesson));
  } catch (error) {
    console.error('Error fetching all lessons:', error);
    throw error;
  }
}

/**
 * Get lessons created by a specific teacher
 * @param teacherId - Teacher's user ID
 * @returns Array of teacher's lessons
 */
export async function getTeacherLessons(teacherId: string): Promise<ZoomLesson[]> {
  try {
    const lessonsRef = collection(db, 'zoomLessons');
    const q = query(lessonsRef, where('teacherId', '==', teacherId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ZoomLesson));
  } catch (error) {
    console.error('Error fetching teacher lessons:', error);
    throw error;
  }
}

/**
 * Get a specific lesson by ID
 * @param lessonId - Lesson ID
 * @returns Lesson data or null
 */
export async function getLesson(lessonId: string): Promise<ZoomLesson | null> {
  try {
    const lessonRef = doc(db, 'zoomLessons', lessonId);
    const snapshot = await getDoc(lessonRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as ZoomLesson;
  } catch (error) {
    console.error('Error fetching lesson:', error);
    throw error;
  }
}

/**
 * Update a lesson
 * @param lessonId - Lesson ID
 * @param updates - Fields to update
 */
export async function updateLesson(
  lessonId: string,
  updates: Partial<ZoomLesson>
) {
  try {
    const lessonRef = doc(db, 'zoomLessons', lessonId);
    await updateDoc(lessonRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
}

/**
 * Delete a lesson
 * @param lessonId - Lesson ID
 */
export async function deleteLesson(lessonId: string) {
  try {
    const lessonRef = doc(db, 'zoomLessons', lessonId);
    await updateDoc(lessonRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
}

/**
 * Enroll a student in a lesson
 * @param studentId - Student's user ID
 * @param lessonId - Lesson ID
 * @returns Enrollment record
 */
export async function enrollInLesson(studentId: string, lessonId: string) {
  try {
    // Get lesson details
    const lesson = await getLesson(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Create enrollment record
    const enrollmentsRef = collection(db, 'studentEnrollments');
    const docRef = await addDoc(enrollmentsRef, {
      studentId,
      lessonId,
      lessonTitle: lesson.title,
      enrolledAt: new Date().toISOString(),
      status: 'enrolled',
    });

    // Update lesson enrolled count
    const lessonRef = doc(db, 'zoomLessons', lessonId);
    await updateDoc(lessonRef, {
      enrolledCount: (lesson.enrolledCount || 0) + 1,
    });

    return {
      id: docRef.id,
      studentId,
      lessonId,
      lessonTitle: lesson.title,
      enrolledAt: new Date().toISOString(),
      status: 'enrolled',
    };
  } catch (error) {
    console.error('Error enrolling in lesson:', error);
    throw error;
  }
}

/**
 * Get lessons a student is enrolled in
 * @param studentId - Student's user ID
 * @returns Array of enrolled lessons
 */
export async function getStudentEnrolledLessons(
  studentId: string
): Promise<ZoomLesson[]> {
  try {
    const enrollmentsRef = collection(db, 'studentEnrollments');
    const q = query(enrollmentsRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);

    const lessonIds = snapshot.docs.map((doc) => doc.data().lessonId);

    if (lessonIds.length === 0) {
      return [];
    }

    // Fetch lesson details for each enrollment
    const lessons: ZoomLesson[] = [];
    for (const lessonId of lessonIds) {
      const lesson = await getLesson(lessonId);
      if (lesson) {
        lessons.push(lesson);
      }
    }

    return lessons;
  } catch (error) {
    console.error('Error fetching student enrolled lessons:', error);
    throw error;
  }
}

/**
 * Get lesson history for a student
 * @param studentId - Student's user ID
 * @returns Array of completed lessons
 */
export async function getStudentLessonHistory(
  studentId: string
): Promise<LessonHistory[]> {
  try {
    const historyRef = collection(db, 'lessonHistory');
    const q = query(historyRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as LessonHistory));
  } catch (error) {
    console.error('Error fetching lesson history:', error);
    throw error;
  }
}

/**
 * Get lessons for a parent's child
 * @param studentId - Child's student ID
 * @returns Array of child's enrolled lessons
 */
export async function getParentChildLessons(
  studentId: string
): Promise<ZoomLesson[]> {
  try {
    return await getStudentEnrolledLessons(studentId);
  } catch (error) {
    console.error('Error fetching parent child lessons:', error);
    throw error;
  }
}

/**
 * Record lesson completion
 * @param studentId - Student's user ID
 * @param lessonId - Lesson ID
 * @param feedback - Teacher feedback (optional)
 */
export async function recordLessonCompletion(
  studentId: string,
  lessonId: string,
  feedback?: string
) {
  try {
    const lesson = await getLesson(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const historyRef = collection(db, 'lessonHistory');
    await addDoc(historyRef, {
      studentId,
      lessonId,
      lessonTitle: lesson.title,
      completedDate: new Date().toISOString(),
      status: 'completed',
      teacherFeedback: feedback || '',
    });

    // Update enrollment status
    const enrollmentsRef = collection(db, 'studentEnrollments');
    const q = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('lessonId', '==', lessonId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.docs.length > 0) {
      const enrollmentRef = doc(db, 'studentEnrollments', snapshot.docs[0].id);
      await updateDoc(enrollmentRef, {
        status: 'attended',
      });
    }
  } catch (error) {
    console.error('Error recording lesson completion:', error);
    throw error;
  }
}

/**
 * Get all enrollments for a lesson
 * @param lessonId - Lesson ID
 * @returns Array of student enrollments
 */
export async function getLessonEnrollments(
  lessonId: string
): Promise<StudentEnrollment[]> {
  try {
    const enrollmentsRef = collection(db, 'studentEnrollments');
    const q = query(enrollmentsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as StudentEnrollment));
  } catch (error) {
    console.error('Error fetching lesson enrollments:', error);
    throw error;
  }
}

/**
 * Check if student is enrolled in a lesson
 * @param studentId - Student's user ID
 * @param lessonId - Lesson ID
 * @returns True if enrolled, false otherwise
 */
export async function isStudentEnrolled(
  studentId: string,
  lessonId: string
): Promise<boolean> {
  try {
    const enrollmentsRef = collection(db, 'studentEnrollments');
    const q = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('lessonId', '==', lessonId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.length > 0;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    throw error;
  }
}
