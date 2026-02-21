/**
 * Course Service - Firebase Operations for Courses
 * Handles course creation, updates, file uploads, and student enrollment
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import type { Unsubscribe } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';

// ==========================================
// TYPES
// ==========================================

export interface CourseMaterial {
  id: string;
  name: string;
  type: 'video' | 'pdf' | 'audio' | 'document' | 'spreadsheet' | 'presentation' | 'image';
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number; // in minutes
  maxAttempts?: number;
  createdAt: Date;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  grade?: string;
  price: number;
  status: 'draft' | 'active' | 'archived';
  materials: CourseMaterial[];
  enrolledStudents: string[];
  maxStudents?: number;
  thumbnail?: string;
  duration?: string;
  lessons: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  enrolledAt: Date;
  progress: number;
  status: 'active' | 'completed' | 'dropped';
  lastAccessed?: Date;
}

// ==========================================
// FILE UPLOAD
// ==========================================

const ALLOWED_FILE_TYPES = {
  'video': ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  'pdf': ['application/pdf'],
  'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
  'document': [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  'spreadsheet': [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ],
  'presentation': [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function getFileType(mimeType: string): CourseMaterial['type'] | null {
  for (const [type, mimeTypes] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (mimeTypes.includes(mimeType)) {
      return type as CourseMaterial['type'];
    }
  }
  return null;
}

/**
 * Upload a course material file to Firebase Storage
 */
export async function uploadCourseMaterial(
  courseId: string, 
  file: File
): Promise<CourseMaterial> {
  // Validate file type
  const fileType = getFileType(file.type);
  if (!fileType) {
    throw new Error(`File type not supported: ${file.type}`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Create storage reference
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storageRef = ref(storage, `courses/${courseId}/materials/${timestamp}_${safeFileName}`);

  // Upload file
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    id: `${timestamp}_${safeFileName}`,
    name: file.name,
    type: fileType,
    url: downloadUrl,
    size: file.size,
    uploadedAt: new Date()
  };
}

/**
 * Delete a course material from Firebase Storage
 */
export async function deleteCourseMaterial(courseId: string, material: CourseMaterial): Promise<void> {
  const storageRef = ref(storage, `courses/${courseId}/materials/${material.id}`);
  await deleteObject(storageRef);
}

// ==========================================
// COURSE CRUD OPERATIONS
// ==========================================

/**
 * Create a new course
 */
export async function createCourse(
  teacherId: string,
  teacherName: string,
  courseData: Omit<Course, 'id' | 'teacherId' | 'teacherName' | 'materials' | 'enrolledStudents' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const courseRef = collection(db, 'courses');
  
  const newCourse = {
    ...courseData,
    teacherId,
    teacherName,
    materials: [],
    enrolledStudents: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(courseRef, newCourse);
  return docRef.id;
}

/**
 * Update an existing course
 */
export async function updateCourse(
  courseId: string,
  updates: Partial<Omit<Course, 'id' | 'createdAt'>>
): Promise<void> {
  const courseRef = doc(db, 'courses', courseId);
  await updateDoc(courseRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a course and all its materials
 */
export async function deleteCourse(courseId: string): Promise<void> {
  // Get course data first
  const courseRef = doc(db, 'courses', courseId);
  const courseSnap = await getDoc(courseRef);
  
  if (!courseSnap.exists()) {
    throw new Error('Course not found');
  }

  const course = courseSnap.data() as Course;

  // Delete all materials from storage
  for (const material of course.materials || []) {
    try {
      await deleteCourseMaterial(courseId, material);
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  }

  // Delete course document
  await deleteDoc(courseRef);
}

/**
 * Get a single course by ID
 */
export async function getCourse(courseId: string): Promise<Course | null> {
  const courseRef = doc(db, 'courses', courseId);
  const courseSnap = await getDoc(courseRef);
  
  if (!courseSnap.exists()) {
    return null;
  }

  const data = courseSnap.data();
  return {
    id: courseSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
  } as Course;
}

// ==========================================
// COURSE SUBSCRIPTIONS (REAL-TIME)
// ==========================================

/**
 * Subscribe to all courses by a teacher (real-time)
 */
export function subscribeToTeacherCourses(
  teacherId: string,
  callback: (courses: Course[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'courses'),
    where('teacherId', '==', teacherId),

  );

  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as Course;
    });
    callback(courses);
  });
}

/**
 * Subscribe to courses for a student (real-time)
 */
export function subscribeToStudentCourses(
  studentId: string,
  callback: (courses: Course[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'courses'),
    where('enrolledStudents', 'array-contains', studentId),

  );

  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as Course;
    });
    callback(courses);
  });
}

/**
 * Subscribe to all active courses (for browsing)
 */
export function subscribeToAllCourses(
  callback: (courses: Course[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'courses'),
    where('status', '==', 'active'),

  );

  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as Course;
    });
    callback(courses);
  });
}

// ==========================================
// ENROLLMENT OPERATIONS
// ==========================================

/**
 * Enroll a student in a course
 */
export async function enrollStudent(
  courseId: string,
  studentId: string,
  studentName: string
): Promise<void> {
  const courseRef = doc(db, 'courses', courseId);
  const enrollmentRef = collection(db, 'enrollments');

  // Get course to get teacher info
  const courseSnap = await getDoc(courseRef);
  if (!courseSnap.exists()) {
    throw new Error('Course not found');
  }

  const course = courseSnap.data() as Course;

  // Update course enrolledStudents array
  await updateDoc(courseRef, {
    enrolledStudents: arrayUnion(studentId)
  });

  // Create enrollment record
  await addDoc(enrollmentRef, {
    courseId,
    studentId,
    studentName,
    teacherId: course.teacherId,
    enrolledAt: serverTimestamp(),
    progress: 0,
    status: 'active'
  });
}

/**
 * Subscribe to enrollments for a student
 */
export function subscribeToStudentEnrollments(
  studentId: string,
  callback: (enrollments: Enrollment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'enrollments'),
    where('studentId', '==', studentId),
    orderBy('enrolledAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const enrollments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        enrolledAt: data.enrolledAt?.toDate?.() || new Date(data.enrolledAt),
        lastAccessed: data.lastAccessed?.toDate?.() || undefined
      } as Enrollment;
    });
    callback(enrollments);
  });
}

/**
 * Subscribe to enrollments for a teacher's courses
 */
export function subscribeToTeacherEnrollments(
  teacherId: string,
  callback: (enrollments: Enrollment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'enrollments'),
    where('teacherId', '==', teacherId),
    orderBy('enrolledAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const enrollments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        enrolledAt: data.enrolledAt?.toDate?.() || new Date(data.enrolledAt),
        lastAccessed: data.lastAccessed?.toDate?.() || undefined
      } as Enrollment;
    });
    callback(enrollments);
  });
}

// ==========================================
// QUIZ OPERATIONS
// ==========================================

/**
 * Create a quiz for a course
 */
export async function createQuiz(
  courseId: string,
  quizData: Omit<Quiz, 'id' | 'courseId' | 'createdAt'>
): Promise<string> {
  const quizRef = collection(db, 'quizzes');
  
  const newQuiz = {
    ...quizData,
    courseId,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(quizRef, newQuiz);
  return docRef.id;
}

/**
 * Update a quiz
 */
export async function updateQuiz(
  quizId: string,
  updates: Partial<Omit<Quiz, 'id' | 'courseId' | 'createdAt'>>
): Promise<void> {
  const quizRef = doc(db, 'quizzes', quizId);
  await updateDoc(quizRef, updates);
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string): Promise<void> {
  const quizRef = doc(db, 'quizzes', quizId);
  await deleteDoc(quizRef);
}

/**
 * Get quizzes for a course
 */
export async function getCourseQuizzes(courseId: string): Promise<Quiz[]> {
  const q = query(
    collection(db, 'quizzes'),
    where('courseId', '==', courseId),

  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
    } as Quiz;
  });
}

/**
 * Subscribe to quizzes for a course (real-time)
 */
export function subscribeToCourseQuizzes(
  courseId: string,
  callback: (quizzes: Quiz[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'quizzes'),
    where('courseId', '==', courseId),

  );

  return onSnapshot(q, (snapshot) => {
    const quizzes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      } as Quiz;
    });
    callback(quizzes);
  });
}

// ==========================================
// ONE-TIME FETCH FUNCTIONS
// ==========================================

/**
 * Get all courses by a teacher
 */
export async function getTeacherCourses(teacherId: string): Promise<Course[]> {
  const q = query(
    collection(db, 'courses'),
    where('teacherId', '==', teacherId),

  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
    } as Course;
  });
}

/**
 * Get courses for a student
 */
export async function getStudentCourses(studentId: string): Promise<Course[]> {
  const q = query(
    collection(db, 'courses'),
    where('enrolledStudents', 'array-contains', studentId),

  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
    } as Course;
  });
}

/**
 * Get all active courses
 */
export async function getAllCourses(): Promise<Course[]> {
  const q = query(
    collection(db, 'courses'),
    where('status', '==', 'active'),

  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
    } as Course;
  });
}

/**
 * Add material to a course
 */
export async function addCourseMaterial(
  courseId: string,
  material: CourseMaterial
): Promise<void> {
  const courseRef = doc(db, 'courses', courseId);
  await updateDoc(courseRef, {
    materials: arrayUnion(material),
    updatedAt: serverTimestamp()
  });
}

/**
 * Remove material from a course
 */
export async function removeCourseMaterial(
  courseId: string,
  materialId: string
): Promise<void> {
  const courseRef = doc(db, 'courses', courseId);
  const courseSnap = await getDoc(courseRef);
  
  if (!courseSnap.exists()) {
    throw new Error('Course not found');
  }

  const course = courseSnap.data() as Course;
  const updatedMaterials = course.materials.filter(m => m.id !== materialId);

  await updateDoc(courseRef, {
    materials: updatedMaterials,
    updatedAt: serverTimestamp()
  });
}
