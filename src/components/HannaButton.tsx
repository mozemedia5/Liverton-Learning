/**
 * HannaButton Component
 * Floating "Ask Hanna" AI assistant button that appears on authenticated pages.
 * Clicking directly navigates to the Hanna AI chat section and opens a new chat.
 * No intermediate dialog — clean, direct, instant.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { AskHannaIcon } from '@/components/AskHannaIcon';

/**
 * HannaButton Component
 * Beautiful floating button to start a new chat with Hanna AI.
 * Hidden when user is already in the Hanna chat interface.
 */
export function HannaButton() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Hide the button when already in Hanna chat to avoid duplication
   */
  const isInHannaChat =
    location.pathname === '/features/hanna-ai' ||
    location.pathname === '/features/chat';

  if (isInHannaChat) {
    return null;
  }

  /**
   * Create a new Hanna chat session and navigate to it
   */
  const handleAskHanna = async () => {
    try {
      if (currentUser) {
        // Create a fresh chat session so user lands on a new conversation in correct hanna_chats collection
        const docRef = await addDoc(collection(db, 'hanna_chats'), {
          userId: currentUser.uid,
          title: `Chat with Hanna - ${new Date().toLocaleDateString()}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          messageCount: 0,
        });
        // Navigate to Hanna AI with the new session id
        navigate(`/features/hanna-ai?session=${docRef.id}`);
      } else {
        navigate('/features/hanna-ai');
      }
    } catch {
      // Fallback: just navigate to Hanna AI
      navigate('/features/hanna-ai');
    }
  };

  return (
    <button
      onClick={handleAskHanna}
      title="Ask Hanna AI"
      className="
        fixed bottom-28 right-5 z-30 lg:bottom-6
        flex items-center gap-2
        p-1.5 pr-4 rounded-2xl
        bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600
        hover:from-violet-500 hover:via-purple-500 hover:to-blue-500
        text-white font-semibold text-sm
        shadow-lg hover:shadow-purple-500/40 hover:shadow-xl
        transition-all duration-300 ease-in-out
        hover:scale-105 active:scale-95
        border border-white/20
      "
    >
      {/* Animated AI icon */}
      <div className="relative flex-shrink-0">
        <AskHannaIcon size={34} showText={false} className="rounded-xl shadow-md" />
      </div>
      {/* Label */}
      <span className="whitespace-nowrap font-bold text-gray-100">Ask Hanna</span>
    </button>
  );
}

export default HannaButton;
