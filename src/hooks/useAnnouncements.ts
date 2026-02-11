import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Announcement } from '@/types';

interface UseAnnouncementsOptions {
  maxResults?: number;
}

export function useAnnouncements(options?: UseAnnouncementsOptions) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxResults = options?.maxResults || 10;

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const announcementsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Announcement[];
          setAnnouncements(announcementsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching announcements:', err);
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
  }, [maxResults]);

  return { announcements, loading, error };
}
