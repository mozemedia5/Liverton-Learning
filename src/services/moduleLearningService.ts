import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ModuleProgressRecord {
  id: string;
  courseId: string;
  studentId: string;
  completedMaterialIds: string[];
  completedLessonIds: string[];
  percentage: number;
  updatedAt?: Date;
}

export interface ModuleSubmission {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  assignmentId: string;
  assignmentTitle: string;
  response: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: 'submitted' | 'graded' | 'returned';
  submittedAt?: Date;
  feedback?: string;
  score?: number;
}

const progressId = (courseId: string, studentId: string) => `${courseId}_${studentId}`;

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function subscribeToModuleProgress(
  courseId: string,
  studentId: string,
  callback: (progress: ModuleProgressRecord | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'moduleProgress', progressId(courseId, studentId)), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data();
    callback({
      id: snapshot.id,
      courseId,
      studentId,
      completedMaterialIds: Array.isArray(data.completedMaterialIds) ? data.completedMaterialIds : [],
      completedLessonIds: Array.isArray(data.completedLessonIds) ? data.completedLessonIds : [],
      percentage: Number(data.percentage || 0),
      updatedAt: asDate(data.updatedAt),
    });
  }, () => callback(null));
}

export async function saveModuleProgress(
  courseId: string,
  studentId: string,
  updates: Pick<ModuleProgressRecord, 'completedMaterialIds' | 'completedLessonIds' | 'percentage'>,
): Promise<void> {
  await setDoc(doc(db, 'moduleProgress', progressId(courseId, studentId)), {
    courseId,
    studentId,
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function subscribeToModuleSubmissions(
  courseId: string,
  studentId: string,
  callback: (submissions: ModuleSubmission[]) => void,
): Unsubscribe {
  const submissionsQuery = query(
    collection(db, 'moduleSubmissions'),
    where('courseId', '==', courseId),
    where('studentId', '==', studentId),
  );
  return onSnapshot(submissionsQuery, (snapshot) => {
    const mapped = snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        ...data,
        submittedAt: asDate(data.submittedAt),
      } as ModuleSubmission;
    });
    callback(mapped.sort((left, right) => (right.submittedAt?.getTime() || 0) - (left.submittedAt?.getTime() || 0)));
  }, () => callback([]));
}

export async function submitModuleAssignment(input: Omit<ModuleSubmission, 'id' | 'submittedAt' | 'status'>): Promise<string> {
  const reference = await addDoc(collection(db, 'moduleSubmissions'), {
    ...input,
    status: 'submitted',
    submittedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updateModuleSubmission(
  submissionId: string,
  updates: Pick<ModuleSubmission, 'feedback' | 'score' | 'status'>,
): Promise<void> {
  await updateDoc(doc(db, 'moduleSubmissions', submissionId), updates);
}
