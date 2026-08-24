import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  students: number;
  progress?: number;
  thumbnail?: string;
  subject?: string;
  materials?: unknown[];
}

export const useCourses = (userId?: string) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const coursesRef = collection(db, 'courses');
    const enrolledQuery = query(coursesRef, where('enrolledStudents', 'array-contains', userId));

    const unsubscribe = onSnapshot(enrolledQuery, (snapshot) => {
      const data = snapshot.docs.map((courseDoc) => {
        const raw = courseDoc.data() as Record<string, unknown>;
        return {
          id: courseDoc.id,
          title: String(raw.title || 'Untitled module'),
          description: String(raw.description || ''),
          instructor: String(raw.teacherName || raw.instructor || 'Teacher'),
          students: Array.isArray(raw.enrolledStudents) ? raw.enrolledStudents.length : 0,
          progress: Number(raw.progress || 0),
          thumbnail: typeof raw.thumbnail === 'string' ? raw.thumbnail : undefined,
          subject: typeof raw.subject === 'string' ? raw.subject : undefined,
          materials: Array.isArray(raw.materials) ? raw.materials : [],
        };
      });
      setCourses(data);
      setLoading(false);
    }, (snapshotError) => {
      console.error('Unable to load enrolled modules:', snapshotError);
      setError(snapshotError instanceof Error ? snapshotError.message : 'Failed to fetch enrolled modules');
      setCourses([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { courses, loading, error };
};
