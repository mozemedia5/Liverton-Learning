/**
 * Zoom Lessons Service
 * Handles all Zoom lesson-related operations including creation, enrollment, and tracking
 * 
 * Features:
 * - Create and manage Zoom lessons (teachers)
 * - Enroll in lessons (students)
 * - Track lesson history and attendance
 * - Manage learning outcomes and schedules
 * - Parent monitoring of children's lessons
 */

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

/**
 * Zoom Lesson interface - defines structure of a lesson
 */
export interface ZoomLesson {
  id?: string;
  teacherId: string;
  teacherName: string;
  className: string;
  title: string;
  description: string;
  zoomLink: string;
  zoomMeetingId: string;
  scheduledDate: Timestamp;
  scheduledTime: string; // HH:MM format
  duration: number; // in minutes
  enrollmentFee: number;
  maxStudents: number;
  enrolledStudents: number;
  mainTopic: string;
  learningOutcomes: string[];
  materials: string[]; // URLs or file names
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Student Enrollment interface - tracks student enrollment in lessons
 */
export interface StudentEnrollment {
  id?: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  enrollmentDate: Timestamp;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentAmount: number;
  attended: boolean;
  attendanceTime?: Timestamp;
  notes?: string;
}

/**
 * Lesson History interface - tracks completed lessons
 */
export interface LessonHistory {
  id?: string;
  lessonId: string;
  studentId: string;
  teacherId: string;
  completedDate: Timestamp;
  duration: number;
  feedback?: string;
  rating?: number;
  certificateIssued: boolean;
}

/**
 * Create a new Zoom lesson (Teacher only)
 * @param lessonData - Lesson details
 * @returns Promise with lesson ID
 */
export async function createZoomLesson(lessonData: Omit<ZoomLesson, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, 'zoomLessons'), {
      ...lessonData,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating zoom lesson:', error);
    throw error;
  }
}

/**
 * Get all lessons created by a teacher
 * @param teacherId - Teacher's user ID
 * @returns Promise with array of lessons
 */
export async function getTeacherLessons(teacherId: string) {
  try {
    const q = query(
      collection(db, 'zoomLessons'),
      where('teacherId', '==', teacherId),
      orderBy('scheduledDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as (ZoomLesson & { id: string })[];
  } catch (error) {
    console.error('Error fetching teacher lessons:', error);
    throw error;
  }
}

/**
 * Get all available lessons for students to enroll
 * @returns Promise with array of available lessons
 */
export async function getAvailableLessons() {
  try {
    const q = query(
      collection(db, 'zoomLessons'),
      where('status', 'in', ['scheduled', 'ongoing']),
      orderBy('scheduledDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as (ZoomLesson & { id: string })[];
  } catch (error) {
    console.error('Error fetching available lessons:', error);
    throw error;
  }
}

/**
 * Get lessons a student is enrolled in
 * @param studentId - Student's user ID
 * @returns Promise with array of enrolled lessons
 */
export async function getStudentEnrolledLessons(studentId: string) {
  try {
    const q = query(
      collection(db, 'studentEnrollments'),
      where('studentId', '==', studentId),
      orderBy('enrollmentDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const enrollments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as (StudentEnrollment & { id: string })[];

    // Fetch lesson details for each enrollment
    const lessonsWithDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lessonDoc = await getDocs(
          query(collection(db, 'zoomLessons'), where('id', '==', enrollment.lessonId))
        );
        const lesson = lessonDoc.docs[0]?.data() as ZoomLesson;
        return { enrollment, lesson };
      })
    );

    return lessonsWithDetails;
  } catch (error) {
    console.error('Error fetching student enrolled lessons:', error);
    throw error;
  }
}

/**
 * Enroll a student in a lesson
 * @param lessonId - Lesson ID
 * @param studentId - Student's user ID
 * @param studentName - Student's name
 * @param paymentAmount - Enrollment fee
 * @returns Promise with enrollment ID
 */
export async function enrollStudentInLesson(
  lessonId: string,
  studentId: string,
  studentName: string,
  paymentAmount: number
) {
  try {
    const now = Timestamp.now();
    
    // Create enrollment record
    const enrollmentRef = await addDoc(collection(db, 'studentEnrollments'), {
      lessonId,
      studentId,
      studentName,
      enrollmentDate: now,
      paymentStatus: 'pending',
      paymentAmount,
      attended: false,
    });

    // Update lesson enrolled count
    const lessonRef = doc(db, 'zoomLessons', lessonId);
    await updateDoc(lessonRef, {
      enrolledStudents: (await getDocs(
        query(collection(db, 'studentEnrollments'), where('lessonId', '==', lessonId))
      )).size + 1,
    });

    return enrollmentRef.id;
  } catch (error) {
    console.error('Error enrolling student in lesson:', error);
    throw error;
  }
}

/**
 * Get lesson history for a student
 * @param studentId - Student's user ID
 * @returns Promise with array of completed lessons
 */
export async function getStudentLessonHistory(studentId: string) {
  try {
    const q = query(
      collection(db, 'lessonHistory'),
      where('studentId', '==', studentId),
      orderBy('completedDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as (LessonHistory & { id: string })[];
  } catch (error) {
    console.error('Error fetching lesson history:', error);
    throw error;
  }
}

/**
 * Get upcoming lessons for a student
 * @param studentId - Student's user ID
 * @returns Promise with array of upcoming lessons
 */
export async function getStudentUpcomingLessons(studentId: string) {
  try {
    const q = query(
      collection(db, 'studentEnrollments'),
      where('studentId', '==', studentId)
    );
    const enrollments = await getDocs(q);
    
    const upcomingLessons = [];
    for (const enrollment of enrollments.docs) {
      const lessonId = enrollment.data().lessonId;
      const lessonDoc = await getDocs(
        query(collection(db, 'zoomLessons'), where('id', '==', lessonId))
      );
      const lesson = lessonDoc.docs[0]?.data() as ZoomLesson;
      
      if (lesson && lesson.status === 'scheduled') {
        upcomingLessons.push({ ...lesson, id: lessonId });
      }
    }

    return upcomingLessons.sort((a, b) => 
      a.scheduledDate.toMillis() - b.scheduledDate.toMillis()
    );
  } catch (error) {
    console.error('Error fetching upcoming lessons:', error);
    throw error;
  }
}

/**
 * Update lesson status
 * @param lessonId - Lesson ID
 * @param status - New status
 */
export async function updateLessonStatus(
  lessonId: string,
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
) {
  try {
    const lessonRef = doc(db, 'zoomLessons', lessonId);
    await updateDoc(lessonRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating lesson status:', error);
    throw error;
  }
}

/**
 * Mark student attendance for a lesson
 * @param enrollmentId - Enrollment ID
 * @param attended - Attendance status
 */
export async function markStudentAttendance(enrollmentId: string, attended: boolean) {
  try {
    const enrollmentRef = doc(db, 'studentEnrollments', enrollmentId);
    await updateDoc(enrollmentRef, {
      attended,
      attendanceTime: attended ? Timestamp.now() : null,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
}

/**
 * Get parent's view of children's lessons
 * @param parentId - Parent's user ID
 * @param childId - Child's user ID
 * @returns Promise with child's lesson data
 */
export async function getParentChildLessons(parentId: string, childId: string) {
  try {
    // Get all enrollments for the child
    const enrollmentsQuery = query(
      collection(db, 'studentEnrollments'),
      where('studentId', '==', childId)
    );
    const enrollments = await getDocs(enrollmentsQuery);

    const lessonsData = [];
    for (const enrollment of enrollments.docs) {
      const lessonId = enrollment.data().lessonId;
      const lessonDoc = await getDocs(
        query(collection(db, 'zoomLessons'), where('id', '==', lessonId))
      );
      const lesson = lessonDoc.docs[0]?.data() as ZoomLesson;
      
      lessonsData.push({
        enrollment: { id: enrollment.id, ...enrollment.data() },
        lesson: { id: lessonId, ...lesson },
      });
    }

    return lessonsData;
  } catch (error) {
    console.error('Error fetching parent child lessons:', error);
    throw error;
  }
}

/**
 * Delete a lesson (Teacher only)
 * @param lessonId - Lesson ID
 */
export async function deleteZoomLesson(lessonId: string) {
  try {
    const batch = writeBatch(db);

    // Delete lesson
    batch.delete(doc(db, 'zoomLessons', lessonId));

    // Delete all enrollments for this lesson
    const enrollmentsQuery = query(
      collection(db, 'studentEnrollments'),
      where('lessonId', '==', lessonId)
    );
    const enrollments = await getDocs(enrollmentsQuery);
    enrollments.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
}

/**
 * Update lesson details (Teacher only)
 * @param lessonId - Lesson ID
 * @param updates - Fields to update
 */
export async function updateZoomLesson(
  lessonId: string,
  updates: Partial<ZoomLesson>
) {
  try {
    const lessonRef = doc(db, 'zoomLessons', lessonId);
    await updateDoc(lessonRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
}
