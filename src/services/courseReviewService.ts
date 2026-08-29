import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  username?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CourseReviewSummary {
  averageRating: number;
  reviewCount: number;
}

const asDate = (value: unknown): Date => {
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
};

const mapReview = (reviewDoc: { id: string; data: () => Record<string, unknown> }): CourseReview => {
  const data = reviewDoc.data();
  return {
    id: reviewDoc.id,
    courseId: String(data.courseId || ''),
    userId: String(data.userId || ''),
    userName: String(data.userName || 'Liverton learner'),
    username: typeof data.username === 'string' ? data.username : undefined,
    rating: Math.min(5, Math.max(1, Number(data.rating) || 1)),
    comment: String(data.comment || ''),
    createdAt: asDate(data.createdAt),
    updatedAt: data.updatedAt ? asDate(data.updatedAt) : undefined,
  };
};

export function subscribeToCourseReviews(
  courseId: string,
  callback: (reviews: CourseReview[]) => void,
): Unsubscribe {
  const reviewsQuery = query(
    collection(db, 'courseReviews'),
    where('courseId', '==', courseId),
  );

  return onSnapshot(reviewsQuery, (snapshot) => {
    const reviews = snapshot.docs
      .map((reviewDoc) => mapReview(reviewDoc))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(reviews);
  }, (error) => {
    console.error('Unable to subscribe to module reviews:', error);
    callback([]);
  });
}

/**
 * One real-time listener is used by the module catalogue and aggregates all
 * review documents in memory. This keeps rating cards live without creating a
 * separate Firestore listener for every visible module.
 */
export function subscribeToAllCourseReviewSummaries(
  callback: (summaries: Record<string, CourseReviewSummary>) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'courseReviews'), (snapshot) => {
    const totals: Record<string, { total: number; count: number }> = {};

    snapshot.docs.forEach((reviewDoc) => {
      const review = mapReview(reviewDoc);
      if (!review.courseId) return;
      const existing = totals[review.courseId] || { total: 0, count: 0 };
      existing.total += review.rating;
      existing.count += 1;
      totals[review.courseId] = existing;
    });

    const summaries: Record<string, CourseReviewSummary> = {};
    Object.entries(totals).forEach(([courseId, value]) => {
      summaries[courseId] = {
        averageRating: Number((value.total / value.count).toFixed(1)),
        reviewCount: value.count,
      };
    });
    callback(summaries);
  }, (error) => {
    console.error('Unable to subscribe to module review summaries:', error);
    callback({});
  });
}

export async function addCourseReview(input: {
  courseId: string;
  userId: string;
  userName: string;
  username?: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const rating = Math.round(input.rating);
  const comment = input.comment.trim();
  if (rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5 stars.');
  if (!comment) throw new Error('Write a short review before submitting.');

  await addDoc(collection(db, 'courseReviews'), {
    courseId: input.courseId,
    userId: input.userId,
    userName: input.userName.trim() || 'Liverton learner',
    ...(input.username?.trim() ? { username: input.username.trim() } : {}),
    rating,
    comment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
