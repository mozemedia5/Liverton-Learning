export type UserRole = 'student' | 'teacher' | 'school_admin' | 'parent' | 'platform_admin';

export type DocumentType = 'doc' | 'sheet' | 'presentation';
export type DocumentVisibility = 'private' | 'internal' | 'public';
export type DocumentSharePermission = 'view' | 'edit';

export interface User {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  sex: 'male' | 'female' | 'other';
  age: number;
  country: string;
  profilePicture?: string;
  profileImageUrl?: string; // New field for profile image URL from Firebase Storage
  phone?: string; // New field for phone number
  address?: string; // New field for address
  bio?: string; // New field for bio/about
  createdAt: Date;
  updatedAt: Date;
  // Additional fields for registration
  schoolName?: string;
  schoolRegistrationNumber?: string;
  schoolType?: string;
  contactInfo?: {
    phone: string;
    address: string;
  };
  studentEmail?: string;
  studentName?: string;
  relationship?: string;
  studentCount?: number;
  teacherCount?: number;
  levelOfEducation?: string;
  educationLevel?: string;
  subjectsTaught?: string[];
  subjects?: string[]; // Alternative field name for subjects
  coursesCreated?: string[];
  earnings?: {
    total: number;
    pending: number;
    history: Payment[];
  };
  isVerified?: boolean;
  experience?: number;
  linkedStudentIds?: string[];
  parentIds?: string[]; // IDs of parents linked to this student
  viewOnly?: boolean;
  enrolledCourses?: string[];
  progress?: Array<{
    courseId: string;
    percentage: number;
    videosWatched: number;
    booksRead: number;
    quizzesTaken: number;
    examsTaken: number;
  }>;
  rankings?: {
    school: number;
    country: number;
    global: number;
  };
  name?: string;
}

export interface Student extends User {
  role: 'student';
  schoolId: string;
  schoolName: string;
  levelOfEducation: string;
  enrolledCourses: string[];
  progress: {
    courseId: string;
    percentage: number;
    videosWatched: number;
    booksRead: number;
    quizzesTaken: number;
    examsTaken: number;
  }[];
  rankings: {
    school: number;
    country: number;
    global: number;
  };
}

export interface Teacher extends User {
  role: 'teacher';
  schoolId?: string;
  schoolName?: string;
  subjectsTaught: string[];
  educationLevel: string;
  experience: number;
  cvUrl?: string;
  idUrl?: string;
  certificatesUrl?: string;
  coursesCreated: string[];
  earnings: {
    total: number;
    pending: number;
    history: Payment[];
  };
  isVerified: boolean;
}

export interface SchoolAdmin extends User {
  role: 'school_admin';
  schoolId: string;
  schoolName: string;
  schoolRegistrationNumber: string;
  licenseDocumentsUrl?: string;
  schoolType: string;
  contactInfo: {
    phone: string;
    address: string;
  };
  studentCount: number;
  teacherCount: number;
}

export interface Parent extends User {
  role: 'parent';
  linkedStudentIds: string[];
  viewOnly: true;
}

export interface PlatformAdmin extends User {
  role: 'platform_admin';
  permissions: string[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  schoolId?: string;
  subject: string;
  price: number;
  lessons: Lesson[];
  enrolledStudents: string[];
  createdAt: Date;
  updatedAt: Date;
  instructor?: string;
  students?: number;
  progress?: number;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  notesUrl?: string;
  quizId?: string;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  questions: number;
  timeLimit?: number;
  passingScore: number;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'scenario';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  answers: Record<string, string | string[]>;
  completedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  type: 'course_purchase' | 'school_subscription' | 'teacher_earning';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  itemId: string;
  itemName: string;
  flutterwaveRef?: string;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  message?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  targetAudience: UserRole[];
  targetSchoolId?: string;
  targetUsers?: string[];
  category: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantRoles: Record<string, UserRole>;
  title?: string;
  type?: 'hanna' | 'direct';
  lastMessage?: Message;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  createdAt: Date | any;
  readBy: string[];
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
}

export interface Attendance {
  id: string;
  studentId: string;
  schoolId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;
  notes?: string;
}

export interface School {
  id: string;
  name: string;
  registrationNumber: string;
  licenseDocumentsUrl?: string;
  type: string;
  country: string;
  address: string;
  phone: string;
  email: string;
  adminId: string;
  studentCount: number;
  teacherCount: number;
  subscriptionStatus: 'active' | 'inactive' | 'pending';
  subscriptionExpiry?: Date;
  createdAt: Date;
}

// --- Document Management System (DMS) Types ---
export interface DocumentFolder {
  id: string;
  title: string;
  ownerId: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMeta {
  id: string;
  title: string;
  type: DocumentType;
  ownerId: string;
  role: UserRole;
  schoolId?: string;
  folderId?: string | null;
  sharedWith: string[];
  sharedWithPermissions?: Record<string, DocumentSharePermission>;
  visibility: DocumentVisibility;
  publicToken?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isFavorite?: boolean;
}

export type DocumentContent =
  | { kind: 'doc'; html: string }
  | { kind: 'sheet'; cells: Record<string, string> }
  | { kind: 'presentation'; slides: PresentationSlide[]; theme?: string };

export interface PresentationSlide {
  id: string;
  title?: string;
  elements: PresentationElement[];
  layout?: 'title' | 'title_content' | 'blank';
}

export type PresentationElement =
  | {
      id: string;
      type: 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      text: string;
      fontSize?: number;
      bold?: boolean;
      italic?: boolean;
      align?: 'left' | 'center' | 'right';
    }
  | {
      id: string;
      type: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
      url: string;
    }
  | {
      id: string;
      type: 'shape';
      x: number;
      y: number;
      w: number;
      h: number;
      shape: 'rect' | 'ellipse';
    };

export interface DocumentRecord extends DocumentMeta {
  content?: DocumentContent;
  fileUrl?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  createdAt: Date;
  createdBy: string;
  content: DocumentContent;
}

export interface HannaQueueItem {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  userId: string;
  documentId: string;
  createdAt: Date;
  payload: DocumentContent;
}

// Re-export chat types
export type { ChatSettings, ChatTheme, FontStyle, UserProfile, ThemeConfig } from './chat';
