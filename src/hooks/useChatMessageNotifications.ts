import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';
import { createElement } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listenToUserChats } from '@/services/chatService';

/**
 * Global new-message notifications: watches the user's conversations and
 * shows a toast (with a "View" deep-link) whenever a message arrives from
 * someone else while the user is not already inside that conversation.
 */
export function useChatMessageNotifications() {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Track last-seen message per chat to detect genuinely new arrivals
  const seenRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const unsubscribe = listenToUserChats(currentUser.uid, (chats) => {
      const seen = seenRef.current;

      chats.forEach(chat => {
        const lastMsg = chat.lastMessage;
        if (!lastMsg) return;

        const msgTime = lastMsg.createdAt?.toMillis?.()
          ?? (lastMsg.createdAt instanceof Date ? lastMsg.createdAt.getTime() : 0);
        if (!msgTime) return;

        const previous = seen.get(chat.id);

        // First snapshot: just record positions, never toast old messages
        if (previous === undefined) {
          seen.set(chat.id, msgTime);
          return;
        }

        const isNew = msgTime > previous;
        const fromOther = lastMsg.senderId !== currentUser.uid;
        const notViewing = location.pathname !== `/chat/${chat.id}` && location.pathname !== '/chat';

        if (isNew && fromOther && notViewing) {
          const senderName = lastMsg.senderName || 'New message';
          const preview = (lastMsg.content || '📎 Attachment').slice(0, 80);

          toast(senderName, {
            description: preview,
            icon: createElement(MessageSquare, { className: 'w-4 h-4 text-emerald-500' }),
            action: {
              label: 'View',
              onClick: () => navigate(`/chat/${chat.id}`),
            },
            duration: 4500,
          });
        }

        if (isNew) {
          seen.set(chat.id, msgTime);
        }
      });
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser, location.pathname]);
}
