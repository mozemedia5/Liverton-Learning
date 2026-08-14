import type { UserRole } from './index';

export type ModuleStatus = 'draft' | 'published' | 'archived';
export type LessonFormat = 'recorded' | 'live' | 'resource';
export type WorkHubRole = 'owner' | 'co_creator' | 'co_teacher' | 'assistant' | 'reviewer';
export type WorkHubPermission = 'manage_module' | 'manage_lessons' | 'manage_assessments' | 'manage_students' | 'manage_live_lessons' | 'manage_members' | 'publish_module' | 'review_submissions';

export interface ModuleLesson {
  id: string;
  title: string;
  format: LessonFormat;
  content?: string;
  videoUrl?: string;
  liveLessonId?: string;
  resourceUrls?: string[];
  drivePdfUrls?: string[];
  notes?: string;
  assignment: { instructions: string; submissionType?: string; deadline?: Date | string; points?: number };
  quizId?: string;
  order: number;
  releaseAt?: Date | string;
  status?: 'draft' | 'published';
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  subject: string;
  level?: string;
  coverUrl?: string;
  promotionalVideoUrl?: string;
  teacherId: string;
  teacherName: string;
  objectives?: string[];
  learningOutcomes?: string[];
  lessons: ModuleLesson[];
  status: ModuleStatus;
  price: number;
  enrolledStudentIds: string[];
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkHubMember {
  userId: string;
  name: string;
  email: string;
  role: WorkHubRole;
  permissions: WorkHubPermission[];
  status: 'active' | 'pending' | 'revoked';
  invitedAt?: Date | string;
}

export interface WorkHub {
  id: string;
  ownerId: string;
  name: string;
  members: WorkHubMember[];
  memberIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const WORK_HUB_ROLE_PERMISSIONS: Record<WorkHubRole, WorkHubPermission[]> = {
  owner: ['manage_module', 'manage_lessons', 'manage_assessments', 'manage_students', 'manage_live_lessons', 'manage_members', 'publish_module', 'review_submissions'],
  co_creator: ['manage_module', 'manage_lessons', 'manage_assessments', 'manage_live_lessons', 'publish_module'],
  co_teacher: ['manage_lessons', 'manage_assessments', 'manage_students', 'manage_live_lessons', 'review_submissions'],
  assistant: ['manage_students', 'manage_live_lessons'],
  reviewer: ['review_submissions'],
};

export function canWorkHubMember(member: WorkHubMember | undefined, permission: WorkHubPermission): boolean {
  return Boolean(member?.status === 'active' && member.permissions.includes(permission));
}

export function normalizeModule(id: string, data: Record<string, any>): LearningModule {
  return {
    id,
    title: data.title || 'Untitled module',
    description: data.description || '',
    subject: data.subject || 'General education',
    level: data.level,
    coverUrl: data.coverUrl,
    promotionalVideoUrl: data.promotionalVideoUrl || data.promoVideoUrl,
    teacherId: data.teacherId || data.instructorId || '',
    teacherName: data.teacherName || data.instructor || 'Teacher',
    objectives: data.objectives || data.learningObjectives || [],
    learningOutcomes: data.learningOutcomes || [],
    lessons: Array.isArray(data.lessons) ? data.lessons : [],
    status: data.status || 'draft',
    price: Number(data.price || 0),
    enrolledStudentIds: data.enrolledStudentIds || data.enrolledStudents || [],
    averageRating: Number(data.averageRating || 0),
    reviewCount: Number(data.reviewCount || data.ratingsCount || 0),
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now()),
  };
}

export type LearningUserRole = UserRole;
