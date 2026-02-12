/**
 * Hanna AI Assistant Page
 * Dedicated interface for interacting with Hanna AI
 * Features: Chat history, session management, educational content generation
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { Unsubscribe } from 'firebase/firestore';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp, 
  orderBy, 
  limit, 
  updateDoc, 
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Send, Trash2, Zap, Plus, MessageSquare, Loader } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Interface for Hanna AI messages
 * Supports both user and assistant messages with timestamps
 */
interface HannaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

/**
 * Interface for chat sessions
 * Represents a conversation with Hanna AI
 */
interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messageCount?: number;
}

/**
 * Pre-defined AI responses for demonstration
 * In production, these would be replaced with actual Gemini API calls
 */
const AI_RESPONSES = [
  "That's an interesting question! Let me help you with that.",
  "I'd be happy to assist you. Here's what I think...",
  "Great question! This is something many people wonder about.",
  "Let me provide you with some insights on this topic.",
  "That's a thoughtful inquiry. Consider this perspective...",
  "Absolutely! This is an important concept to understand...",
  "I appreciate your curiosity. Here's my analysis...",
  "That's a complex topic, but I can break it down for you...",
];

/**
 * Hanna AI Component
 * Main interface for users to interact with Hanna AI assistant
 * 
 * Features:
 * - Create new chat sessions
 * - Send messages to Hanna AI
 * - View chat history
 * - Delete chat sessions
 * - Real-time message updates
 */
export default function HannaAI() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<HannaMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  /**
   * Load all chat sessions for the current user
   * Fetches sessions from Firestore ordered by most recent first
   */
  const loadSessions = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'hannaChats'),
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const sess = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatSession[];
      setSessions(sess);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load chat sessions');
    }
  };

  /**
   * Start a new chat session
   * Creates a new document in Firestore for the chat
   */
  const startNewSession = async () => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'hannaChats'), {
        userId: currentUser.uid,
        title: 'New Chat',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messageCount: 0,
      });
      setCurrentSessionId(docRef.id);
      setMessages([]);
      await loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create new chat session');
    }
  };

  /**
   * Load messages for a specific chat session
   * Sets up real-time listener for message updates
   */
  const loadMessages = (sessionId: string) => {
    // Unsubscribe from previous listener if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    try {
      const q = query(
        collection(db, 'hannaChats', sessionId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      // Set up real-time listener
      unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as HannaMessage[];
        setMessages(msgs);
      });
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  /**
   * Send a message to Hanna AI
   * Saves user message and generates AI response
   */
  const sendMessage = async () => {
    if (!input.trim() || !currentUser || !currentSessionId) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Save user message to Firestore
      await addDoc(
        collection(db, 'hannaChats', currentSessionId, 'messages'),
        {
          role: 'user',
          content: userMessage,
          timestamp: Timestamp.now(),
        }
      );

      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate AI response (placeholder - would call Gemini API in production)
      const aiResponse = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];

      // Save AI response to Firestore
      await addDoc(
        collection(db, 'hannaChats', currentSessionId, 'messages'),
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: Timestamp.now(),
        }
      );

      // Update session title if first message
      if (messages.length === 0) {
        const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
        await updateDoc(doc(db, 'hannaChats', currentSessionId), {
          title,
          updatedAt: Timestamp.now(),
        });
      }

      // Update session metadata
      await updateDoc(doc(db, 'hannaChats', currentSessionId), {
        updatedAt: Timestamp.now(),
        messageCount: messages.length + 2,
      });

      await loadSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a chat session
   * Removes the session and all its messages from Firestore
   */
  const deleteSession = async (sessionId: string) => {
    try {
      // Delete session document
      await updateDoc(doc(db, 'hannaChats', sessionId), {
        deleted: true,
        deletedAt: Timestamp.now(),
      });

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }

      await loadSessions();
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete chat');
    }
  };

  /**
   * Auto-scroll to latest message
   * Ensures new messages are visible to user
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /**
   * Load sessions and start new chat on component mount
   */
  useEffect(() => {
    if (currentUser) {
      loadSessions();
      startNewSession();
    }

    // Cleanup: unsubscribe from listener on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [currentUser]);

  /**
   * Load messages when current session changes
   */
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Chat Sessions List */}
      {showSessions && (
        <div className="w-64 border-r border-border bg-muted/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <Button
              onClick={startNewSession}
              className="w-full gap-2"
              variant="default"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No chats yet. Start a new conversation!
                </p>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div
                      onClick={() => setCurrentSessionId(session.id)}
                      className="flex-1"
                    >
                      <p className="font-medium text-sm truncate">
                        {session.title}
                      </p>
                      <p className="text-xs opacity-70">
                        {session.messageCount || 0} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="text-xs opacity-50 hover:opacity-100 mt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h1 className="text-xl font-semibold">Hanna AI Assistant</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSessions(!showSessions)}
          >
            {showSessions ? 'Hide' : 'Show'} Sessions
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">Start a Conversation</h2>
                <p className="text-muted-foreground">
                  Ask Hanna anything about your learning journey
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-lg">
                  <Loader className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-background p-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask Hanna anything..."
              disabled={loading || !currentSessionId}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !currentSessionId}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
