import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Course } from '@/types';

interface UseCourseOptions {
  userId?: string;
  role?: string;
}

export function useCourses(options?: UseCourseOptions) {
  const { userData } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    try {
      const constraints: QueryConstraint[] = [];
      
      // Build query based on user role
      if (userData.role === 'student' || userData.role === 'parent') {
        constraints.push(where('enrolledStudents', 'array-contains', userData.uid));
      } else if (userData.role === 'teacher') {
        constraints.push(where('teacherId', '==', userData.uid));
      }

      const q = query(collection(db, 'courses'), ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const coursesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Course[];
          setCourses(coursesData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching courses:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);
    }
  }, [userData?.uid, userData?.role]);

  return { courses, loading, error };
}
