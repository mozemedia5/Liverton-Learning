/**
 * HannaButton Component
 * Floating "Ask Hanna" AI assistant button that appears on authenticated pages.
 * Clicking directly navigates to the Hanna AI chat section and opens a new chat.
 * No intermediate dialog — clean, direct, instant.
 */

import { Bot, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

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
        // Create a fresh chat session so user lands on a new conversation
        const docRef = await addDoc(collection(db, 'hannaChats'), {
          userId: currentUser.uid,
          title: 'New Chat',
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
        fixed bottom-24 right-5 z-30
        flex items-center gap-2
        px-4 py-3 rounded-2xl
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
        <Bot className="w-5 h-5" />
        <Sparkles className="w-2.5 h-2.5 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
      </div>
      {/* Label */}
      <span className="whitespace-nowrap">Ask Hanna</span>
    </button>
  );
}

export default HannaButton;
