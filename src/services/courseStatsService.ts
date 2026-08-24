import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function recordCourseView(courseId: string, userId: string): Promise<void> {
  if (!courseId || !userId) return;
  await addDoc(collection(db, 'courseViews'), {
    courseId,
    userId,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToCourseViewCounts(
  callback: (counts: Record<string, number>) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'courseViews'), (snapshot) => {
    const counts: Record<string, number> = {};
    snapshot.docs.forEach((viewDoc) => {
      const courseId = viewDoc.data().courseId;
      if (typeof courseId !== 'string' || !courseId) return;
      counts[courseId] = (counts[courseId] || 0) + 1;
    });
    callback(counts);
  }, (error) => {
    console.error('Unable to subscribe to module view counts:', error);
    callback({});
  });
}
