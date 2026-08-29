import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  students: number;
  progress?: number;
}

export const useCourses = (userId?: string) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, where('students', 'array-contains', userId));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Course[];
        setCourses(data);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
      setLoading(false);
    }
  }, [userId]);

  return { courses, loading, error };
};
