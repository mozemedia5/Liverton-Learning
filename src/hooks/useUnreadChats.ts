import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listenToUserChats } from '@/services/chatService';

/**
 * Subscribe to the signed-in user's chats and expose the total unread
 * message count (used for nav badges).
 */
export function useUnreadChatsCount(): number {
  const { currentUser, isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const unsubscribe = listenToUserChats(currentUser.uid, (chats) => {
      const total = chats.reduce((sum, chat) => {
        return sum + (chat.unreadCounts?.[currentUser.uid] || 0);
      }, 0);
      setCount(total);
    });
    return () => unsubscribe();
  }, [isAuthenticated, currentUser]);

  return isAuthenticated ? count : 0;
}
