import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

function audienceKey(role: string | null | undefined) {
  if (role === 'student') return 'students';
  if (role === 'teacher') return 'teachers';
  if (role === 'parent') return 'parents';
  if (role === 'school_admin') return 'school_admins';
  return null;
}

/** Live unread notification count for navigation badges and dashboard summaries. */
export function useUnreadNotificationsCount(): number {
  const { currentUser, userRole, isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setCount(0);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const roleAudience = audienceKey(userRole);
      const nextCount = snapshot.docs.reduce((total, notification) => {
        const data = notification.data();
        const targeted = (Array.isArray(data.targetUsers) && data.targetUsers.includes(currentUser.uid))
          || (typeof data.targetEmail === 'string' && data.targetEmail.toLowerCase() === (currentUser.email || '').toLowerCase())
          || data.targetAudience?.includes('all')
          || Boolean(roleAudience && data.targetAudience?.includes(roleAudience));
        const readBy = Array.isArray(data.readBy) ? data.readBy : [];
        const isRead = readBy.includes(currentUser.uid) || data.isRead === true;
        return targeted && !data.isHidden && !isRead ? total + 1 : total;
      }, 0);
      setCount(nextCount);
    }, (error) => {
      console.error('Unread notification listener failed:', error);
      setCount(0);
    });

    return () => unsubscribe();
  }, [currentUser, userRole, isAuthenticated]);

  return isAuthenticated ? count : 0;
}
