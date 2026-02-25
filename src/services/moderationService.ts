/**
 * Moderation Service - Firebase Operations for Content Moderation
 * Handles fetching, tagging, disabling, and deleting user-generated content
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ==========================================
// TYPES
// ==========================================

export interface ModerationTag {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface ModerationAction {
  id: string;
  contentId: string;
  contentType: string;
  action: 'tagged' | 'disabled' | 'enabled' | 'deleted' | 'approved';
  adminId: string;
  adminName: string;
  tags?: string[];
  reason?: string;
  timestamp: Date;
}

export interface ModerationContent {
  id: string;
  type: 'course' | 'event' | 'lesson' | 'assignment' | 'quiz' | 'zoom_session' | 'document';
  title: string;
  description?: string;
  author: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'disabled' | 'pending_review';
  tags: string[];
  flagCount: number;
  isDisabled: boolean;
  moderationNotes?: string;
  rawData: any;
}

// ==========================================
// FETCH ALL CONTENT FOR MODERATION
// ==========================================

/**
 * Fetch all courses for moderation
 */
export async function getAllCoursesForModeration(): Promise<ModerationContent[]> {
  try {
    const coursesRef = collection(db, 'courses');
    const snapshot = await getDocs(coursesRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: 'course',
        title: data.title || 'Untitled Course',
        description: data.description,
        author: data.teacherName || 'Unknown',
        authorId: data.teacherId,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        status: data.status || 'active',
        tags: data.moderationTags || [],
        flagCount: data.flagCount || 0,
        isDisabled: data.isDisabled || false,
        moderationNotes: data.moderationNotes,
        rawData: data,
      } as ModerationContent;
    });
  } catch (error) {
    console.error('Error fetching courses for moderation:', error);
    return [];
  }
}

/**
 * Fetch all assignments for moderation
 */
export async function getAllAssignmentsForModeration(): Promise<ModerationContent[]> {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const snapshot = await getDocs(assignmentsRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: 'assignment',
        title: data.title || 'Untitled Assignment',
        description: data.description,
        author: data.createdBy || 'Unknown',
        authorId: data.createdById || '',
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        status: data.status || 'active',
        tags: data.moderationTags || [],
        flagCount: data.flagCount || 0,
        isDisabled: data.isDisabled || false,
        moderationNotes: data.moderationNotes,
        rawData: data,
      } as ModerationContent;
    });
  } catch (error) {
    console.error('Error fetching assignments for moderation:', error);
    return [];
  }
}

/**
 * Fetch all quizzes for moderation
 */
/**
 * Fetch all quizzes for moderation
 */
export async function getAllQuizzesForModeration(): Promise<ModerationContent[]> {
  try {
    const quizzesRef = collection(db, 'quizzes');
    const snapshot = await getDocs(quizzesRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: 'quiz',
        title: data.title || 'Untitled Quiz',
        description: data.description,
        author: data.teacherName || 'Unknown',
        authorId: data.teacherId || '',
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        status: data.status || 'active',
        tags: data.moderationTags || [],
        flagCount: data.flagCount || 0,
        isDisabled: data.isDisabled || false,
        moderationNotes: data.moderationNotes,
        rawData: data,
      } as ModerationContent;
    });
  } catch (error) {
    console.error('Error fetching quizzes for moderation:', error);
    return [];
  }
}

/**
 * Fetch all activities (events, lessons, zoom sessions) for moderation
 */
export async function getAllActivitiesForModeration(): Promise<ModerationContent[]> {
  try {
    const activitiesRef = collection(db, 'activities');
    const snapshot = await getDocs(activitiesRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      const activityType = data.type || 'event';
      
      return {
        id: doc.id,
        type: activityType === 'zoom' ? 'zoom_session' : activityType === 'lesson' ? 'lesson' : 'event',
        title: data.title || 'Untitled Activity',
        description: data.description,
        author: data.createdBy || 'Unknown',
        authorId: data.createdById || '',
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        status: data.status || 'active',
        tags: data.moderationTags || [],
        flagCount: data.flagCount || 0,
        isDisabled: data.isDisabled || false,
        moderationNotes: data.moderationNotes,
        rawData: data,
      } as ModerationContent;
    });
  } catch (error) {
    console.error('Error fetching activities for moderation:', error);
    return [];
  }
}

/**
 * Fetch all content for moderation (combined from all sources)
 */
export async function getAllContentForModeration(): Promise<ModerationContent[]> {
  try {
    const [courses, assignments, quizzes, activities] = await Promise.all([
      getAllCoursesForModeration(),
      getAllAssignmentsForModeration(),
      getAllQuizzesForModeration(),
      getAllActivitiesForModeration(),
    ]);
    
    return [...courses, ...assignments, ...quizzes, ...activities];
  } catch (error) {
    console.error('Error fetching all content for moderation:', error);
    return [];
  }
}

/**
 * Subscribe to real-time updates of all content for moderation
 */
export function subscribeToModerationContent(
  callback: (content: ModerationContent[]) => void
): Unsubscribe[] {
  const unsubscribers: Unsubscribe[] = [];

  // Subscribe to courses
  const coursesUnsub = onSnapshot(collection(db, 'courses'), (snapshot) => {
    const courses = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: 'course',
        title: data.title || 'Untitled Course',
        description: data.description,
        author: data.teacherName || 'Unknown',
        authorId: data.teacherId,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        status: data.status || 'active',
        tags: data.moderationTags || [],
        flagCount: data.flagCount || 0,
        isDisabled: data.isDisabled || false,
        moderationNotes: data.moderationNotes,
        rawData: data,
      } as ModerationContent;
    });
    
    // Fetch other content types and combine
    Promise.all([
      getAllAssignmentsForModeration(),
      getAllQuizzesForModeration(),
      getAllActivitiesForModeration(),
    ]).then(([assignments, quizzes, activities]) => {
      callback([...courses, ...assignments, ...quizzes, ...activities]);
    });
  });

  unsubscribers.push(coursesUnsub);
  return unsubscribers;
}

// ==========================================
// MODERATION ACTIONS
// ==========================================

/**
 * Add tags to content
 */
export async function tagContent(
  contentType: string,
  contentId: string,
  tags: string[],
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(db, contentType === 'course' ? 'courses' : 
                        contentType === 'assignment' ? 'assignments' :
                        contentType === 'quiz' ? 'quizzes' : 'activities', contentId);
    
    await updateDoc(docRef, {
      moderationTags: tags,
      moderationNotes: notes || '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tagging content:', error);
    throw error;
  }
}

/**
 * Disable/Enable content visibility
 */
export async function toggleContentVisibility(
  contentType: string,
  contentId: string,
  isDisabled: boolean,
  reason?: string
): Promise<void> {
  try {
    const collectionName = contentType === 'course' ? 'courses' : 
                          contentType === 'assignment' ? 'assignments' :
                          contentType === 'quiz' ? 'quizzes' : 'activities';
    
    const docRef = doc(db, collectionName, contentId);
    
    await updateDoc(docRef, {
      isDisabled,
      status: isDisabled ? 'disabled' : 'active',
      moderationNotes: reason || '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling content visibility:', error);
    throw error;
  }
}

/**
 * Delete content permanently
 */
export async function deleteContent(
  contentType: string,
  contentId: string
): Promise<void> {
  try {
    const collectionName = contentType === 'course' ? 'courses' : 
                          contentType === 'assignment' ? 'assignments' :
                          contentType === 'quiz' ? 'quizzes' : 'activities';
    
    const docRef = doc(db, collectionName, contentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting content:', error);
    throw error;
  }
}

/**
 * Approve content (remove from moderation queue)
 */
export async function approveContent(
  contentType: string,
  contentId: string
): Promise<void> {
  try {
    const collectionName = contentType === 'course' ? 'courses' : 
                          contentType === 'assignment' ? 'assignments' :
                          contentType === 'quiz' ? 'quizzes' : 'activities';
    
    const docRef = doc(db, collectionName, contentId);
    
    await updateDoc(docRef, {
      status: 'active',
      isDisabled: false,
      flagCount: 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error approving content:', error);
    throw error;
  }
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(): Promise<{
  totalContent: number;
  disabledContent: number;
  flaggedContent: number;
  pendingReview: number;
}> {
  try {
    const allContent = await getAllContentForModeration();
    
    return {
      totalContent: allContent.length,
      disabledContent: allContent.filter(c => c.isDisabled).length,
      flaggedContent: allContent.filter(c => c.flagCount > 0).length,
      pendingReview: allContent.filter(c => c.status === 'pending_review').length,
    };
  } catch (error) {
    console.error('Error getting moderation stats:', error);
    return {
      totalContent: 0,
      disabledContent: 0,
      flaggedContent: 0,
      pendingReview: 0,
    };
  }
}
