import { useEffect, useState } from 'react';
import { isNotificationVisibleToUser, subscribeToVisibleNotifications } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

/** Live unread notification count for navigation badges and dashboard summaries. */
export function useUnreadNotificationsCount(): number {
  const { currentUser, userRole, isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setCount(0);
      return;
    }

    const unsubscribe = subscribeToVisibleNotifications(currentUser.uid, currentUser.email, userRole, (notifications) => {
      const nextCount = notifications.reduce((total, notification) => {
        const data = notification;
        const targeted = isNotificationVisibleToUser(data, currentUser.uid, currentUser.email, userRole);
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
