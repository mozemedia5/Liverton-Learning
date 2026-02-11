import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Quiz } from '@/types';

export function useQuizzes() {
  const { userData } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'quizzes'),
        where('studentId', '==', userData.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const quizzesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Quiz[];
          setQuizzes(quizzesData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching quizzes:', err);
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
  }, [userData?.uid]);

  return { quizzes, loading, error };
}
