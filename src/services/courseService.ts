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

import type { Unsubscribe } from 'firebase/firestore';
import { uploadToCloudinary } from './cloudinaryService';
import { dispatchEnrollmentNotification } from './notificationService';
import { auth, db } from '@/lib/firebase';

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
  documentId?: string;
  fileName?: string;
  mimeType?: string;
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
  shortDescription?: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  category?: string;
  grade?: string;
  level?: string;
  language?: string;
  price: number;
  currency?: string;
  isFree?: boolean;
  status: 'draft' | 'ready_for_review' | 'active' | 'updated' | 'archived';
  materials: CourseMaterial[];
  enrolledStudents: string[];
  maxStudents?: number;
  thumbnail?: string;
  coverUrl?: string;
  duration?: string;
  estimatedDuration?: number;
  learningObjectives?: string[];
  prerequisites?: string[];
  learningOutcomes?: string[];
  tags?: string[];
  certificateEligible?: boolean;
  visibility?: 'public' | 'unlisted' | 'private';
  lessons: number;
  lessonsList?: unknown[];
  finalExam?: unknown;
  teamConfig?: unknown;
  promoVideoUrl?: string;
  moduleShorts?: unknown[];
  advertising?: unknown;
  readiness?: { complete: boolean; missing: string[]; checkedAt?: Date };
  analytics?: Record<string, number>;
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
 * Upload a course material file to Firebase Storage and add to course
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

  // Determine Cloudinary upload category preset
  let cloudinaryCategory: 'image' | 'course_video' | 'short_video' | 'audio' | 'document' = 'document';
  if (fileType === 'video') {
    cloudinaryCategory = 'course_video';
  } else if (fileType === 'audio') {
    cloudinaryCategory = 'audio';
  } else if (fileType === 'image') {
    cloudinaryCategory = 'image';
  }

  // Upload to Cloudinary with matching preset
  const downloadUrl = await uploadToCloudinary(file, cloudinaryCategory);
  const timestamp = Date.now();

  const material: CourseMaterial = {
    id: `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
    name: file.name,
    type: fileType,
    url: downloadUrl,
    size: file.size,
    uploadedAt: new Date()
  };

  // Add material to course
  await addCourseMaterial(courseId, material);

  return material;
}

/**
 * Delete a course material from Firebase Storage and Firestore
 */
export async function deleteCourseMaterial(courseId: string, materialId: string): Promise<void> {
  // First remove from Firestore
  await removeCourseMaterial(courseId, materialId);
  
  // Course files are stored in Cloudinary. Firestore metadata is removed
  // above; Cloudinary deletion requires a secured server-side destroy call.
  // The old client-side Firebase Storage deletion has been removed.
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
  
  const normalizedPrice = Number(courseData.price || 0);
  const newCourse = {
    ...courseData,
    price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
    currency: String(courseData.currency || 'UGX').toUpperCase(),
    isFree: courseData.isFree ?? normalizedPrice <= 0,
    visibility: courseData.visibility || 'public',
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
      await deleteCourseMaterial(courseId, material.id);
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
function asCourseDate(value: unknown): Date {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = value ? new Date(value as string | number) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function mapCourseSnapshot(courseSnap: { id: string; data: () => Record<string, any> }): Course {
  const data = courseSnap.data();
  return {
    id: courseSnap.id,
    ...data,
    materials: Array.isArray(data.materials) ? data.materials : [],
    enrolledStudents: Array.isArray(data.enrolledStudents) ? data.enrolledStudents : [],
    lessons: Number(data.lessons || 0),
    createdAt: asCourseDate(data.createdAt),
    updatedAt: asCourseDate(data.updatedAt),
  } as Course;
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const normalizedCourseId = courseId.trim();
  if (!normalizedCourseId) return null;
  const courseSnap = await getDoc(doc(db, 'courses', normalizedCourseId));
  return courseSnap.exists() ? mapCourseSnapshot(courseSnap) : null;
}

/**
 * Get a course that is intentionally published for public sharing.
 * Draft and archived courses remain available to authenticated owner workflows
 * through getCourse, but are never exposed by the public course route.
 */
export async function getPublicCourse(courseId: string): Promise<Course | null> {
  const course = await getCourse(courseId);
  return course?.status === 'active' ? course : null;
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

/**
 * Subscribe to all courses (for platform admin)
 */
export function subscribeToAllCoursesAdmin(
  callback: (courses: Course[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'courses'),
    orderBy('createdAt', 'desc')
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
  }, (error) => {
    console.error("Error subscribing to all courses:", error);
    // Fallback without ordering if index is missing
    const simpleQ = query(collection(db, 'courses'));
    onSnapshot(simpleQ, (snapshot) => {
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
  studentName: string,
  studentEmail?: string,
  studentPhone?: string
): Promise<void> {
  const courseRef = doc(db, 'courses', courseId);
  const enrollmentRef = collection(db, 'enrollments');

  const signedInUser = auth.currentUser;
  if (signedInUser?.uid === studentId) {
    const response = await fetch('/api/courses/enroll', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await signedInUser.getIdToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not enroll in the module.');
    return;
  }

  // Get course to get teacher info for legacy or administrative callers.
  const courseSnap = await getDoc(courseRef);
  if (!courseSnap.exists()) {
    throw new Error('Course not found');
  }

  const course = courseSnap.data() as Course;

  // Prevent duplicate enrollment
  if (course.enrolledStudents?.includes(studentId)) {
    console.log(`Student ${studentId} is already enrolled in course ${courseId}.`);
    return;
  }

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

  // Dispatch real enrollment notifications (Firestore + PWA + Email + WhatsApp provider abstractions)
  try {
    await dispatchEnrollmentNotification({
      courseId,
      courseTitle: course.title,
      studentId,
      studentName,
      studentEmail,
      studentPhone,
      teacherId: course.teacherId,
      teacherName: course.teacherName
    });
  } catch (notifyErr) {
    console.warn('Enrollment notification dispatch warning:', notifyErr);
  }
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

/**
 * Subscribe to course materials (real-time)
 */
export function subscribeToCourseMaterials(
  courseId: string,
  callback: (materials: CourseMaterial[]) => void
): Unsubscribe {
  const courseRef = doc(db, 'courses', courseId);
  
  return onSnapshot(courseRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const materials = (data.materials || []).map((m: any) => ({
        ...m,
        uploadedAt: m.uploadedAt?.toDate?.() || new Date(m.uploadedAt)
      }));
      callback(materials);
    } else {
      callback([]);
    }
  });
}

/**
 * Subscribe to enrollments for a specific course
 */
export function subscribeToEnrollmentsForCourse(
  courseId: string,
  callback: (enrollments: Enrollment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'enrollments'),
    where('courseId', '==', courseId),
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
/**
 * Create a quiz for a course
 */
export async function createQuiz(
  courseId: string,
  teacherId: string,
  teacherName: string,
  quizData: Omit<Quiz, 'id' | 'courseId' | 'createdAt'>
): Promise<string> {
  const quizRef = collection(db, 'quizzes');
  
  const newQuiz = {
    ...quizData,
    courseId,
    teacherId,
    teacherName,
    totalAttempts: 0,
    averageScore: 0,
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

export async function shareDocumentToCourse(params: {
  courseId: string;
  documentId: string;
  title: string;
  type: CourseMaterial['type'];
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  viewerUrl: string;
}): Promise<void> {
  const courseRef = doc(db, 'courses', params.courseId);
  const courseSnap = await getDoc(courseRef);
  if (!courseSnap.exists()) throw new Error('Module not found');
  const course = courseSnap.data() as Course;
  if ((course.materials || []).some((material) => material.documentId === params.documentId)) return;

  const documentRef = doc(db, 'documents', params.documentId);
  const documentSnap = await getDoc(documentRef);
  if (!documentSnap.exists()) throw new Error('Document not found');
  if (documentSnap.data().ownerId !== course.teacherId) {
    throw new Error('Only the document owner can add this document to the module.');
  }
  await updateDoc(documentRef, { visibility: 'internal', updatedAt: serverTimestamp() });

  await addCourseMaterial(params.courseId, {
    id: `document_${params.documentId}`,
    name: params.fileName || params.title,
    type: params.type,
    url: params.fileUrl || params.viewerUrl,
    size: params.size || 0,
    uploadedAt: new Date(),
    documentId: params.documentId,
    fileName: params.fileName,
    mimeType: params.mimeType,
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
