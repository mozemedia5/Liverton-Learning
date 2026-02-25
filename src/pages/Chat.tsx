import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  Sparkles,
  MessageCircle,
  Plus,
  X,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { getChatDisplayTitle } from '@/services/chatService';
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'hanna';
  content: string;
  createdAt: any;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  type: 'direct' | 'hanna'; // 'direct' for user-to-user, 'hanna' for AI
  participants?: string[];
  createdAt: any;
  updatedAt: any;
  messageCount: number;
}

/**
 * Chat Page Component
 * 
 * Features:
 * - Real-time chat with other users
 * - Hanna AI assistant integration
 * - Multiple chat sessions
 * - Firebase Firestore message persistence
 * - Create new chats with users or Hanna
 * - Professional UI with real-time updates
 */
export default function Chat() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  
  // Chat state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to bottom of messages when new messages arrive
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Load chat sessions for current user
   */
  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    // Simple query without ordering to avoid index issues during development
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      
      // Sort in memory instead of Firestore to avoid index requirement
      const sortedSessions = sessions.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setChatSessions(sortedSessions);
      
      // Auto-select first chat if none selected
      if (sortedSessions.length > 0 && !currentChatId) {
        setCurrentChatId(sortedSessions[0].id);
      }
      
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading chat sessions:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, currentChatId]);

  /**
   * Load messages for current chat
   */
  useEffect(() => {
    if (!currentChatId) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', currentChatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Sort in memory
      const sortedMsgs = msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      setMessages(sortedMsgs);
    }, (error) => {
      console.error('Error loading messages:', error);
    });

    return () => unsubscribe();
  }, [currentChatId]);

  /**
   * Create a new chat session
   */
  const handleCreateNewChat = async (type: 'hanna' | 'direct') => {
    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      
      const chatData = {
        userId: currentUser.uid,
        type: type,
        title: type === 'hanna' 
          ? `Chat with Hanna - ${new Date().toLocaleDateString()}`
          : `New Chat - ${new Date().toLocaleDateString()}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
      };

      const chatRef = await addDoc(collection(db, 'chats'), chatData);

      setCurrentChatId(chatRef.id);
      setMessages([]);
      setShowNewChatModal(false);
      toast.success(`New ${type === 'hanna' ? 'Hanna AI' : 'chat'} created!`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send message to chat
   * If chat type is 'hanna', calls backend Cloud Function to get AI response
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !currentChatId || !currentUser) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsSendingMessage(true);

    try {
      // Get current chat to check type
      const currentChat = chatSessions.find(c => c.id === currentChatId);
      const isHannaChat = currentChat?.type === 'hanna';

      // Add user message to Firestore
      await addDoc(collection(db, 'messages'), {
        chatId: currentChatId,
        senderId: currentUser.uid,
        senderName: userData?.fullName || 'User',
        senderRole: 'user',
        content: userMessage,
        createdAt: serverTimestamp(),
      });

      // Update chat session
      await updateDoc(doc(db, 'chats', currentChatId), {
        updatedAt: serverTimestamp(),
      });

      // If Hanna chat, get AI response
      if (isHannaChat) {
        try {
          const response = await fetch('/api/hanna/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId: currentChatId,
              userId: currentUser.uid,
              userMessage: userMessage,
              userName: userData?.fullName || 'User',
              userRole: userData?.role || 'student',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get AI response');
          }

          const data = await response.json();

          // Add Hanna's response to Firestore
          await addDoc(collection(db, 'messages'), {
            chatId: currentChatId,
            senderId: 'hanna-ai',
            senderName: 'Hanna',
            senderRole: 'hanna',
            content: data.response,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          console.error('Error getting Hanna response:', error);
          toast.error('Failed to get AI response');
        }
      }

      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  /**
   * Select a chat session
   */
  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  /**
   * Get chat icon based on type
   */
  const getChatIcon = (chatType: string) => {
    return chatType === 'hanna' ? (
      <Sparkles className="w-4 h-4 text-purple-500" />
    ) : (
      <Users className="w-4 h-4 text-blue-500" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-black dark:text-white transition-colors duration-300 flex">
      {/* Sidebar - Chat Sessions */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 pl-12 md:pl-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Messages
            </h1>
          </div>
          <Button 
            onClick={() => setShowNewChatModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No chats yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            chatSessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSelectChat(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-2 ${
                  currentChatId === session.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="mt-1">
                  {getChatIcon(session.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {session.messageCount} messages
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {currentChatId ? (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    {chatSessions.find(c => c.id === currentChatId)?.type === 'hanna' ? (
                      <>
                        <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Welcome to Hanna AI</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md">
                          I'm Hanna, your AI assistant. Ask me anything about your courses, learning progress, or any questions you have!
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md">
                          Send a message to begin chatting with other users.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderRole === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <Card
                      className={`max-w-md p-4 ${
                        message.senderRole === 'user'
                          ? 'bg-blue-600 text-white dark:bg-blue-700'
                          : message.senderRole === 'hanna'
                          ? 'bg-purple-100 dark:bg-purple-900 text-black dark:text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {message.senderName}
                      </p>
                      <p className="text-sm">{message.content}</p>
                    </Card>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input
                  type="text"
                  placeholder={
                    chatSessions.find(c => c.id === currentChatId)?.type === 'hanna'
                      ? 'Ask Hanna anything...'
                      : 'Type a message...'
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSendingMessage}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isSendingMessage || !inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Chat Selected</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create a new chat or select one from the sidebar to get started
              </p>
              <Button onClick={() => setShowNewChatModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Start New Chat</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNewChatModal(false);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleCreateNewChat('hanna')}
                className="w-full bg-purple-600 hover:bg-purple-700 justify-start"
                disabled={isLoading}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Chat with Hanna AI
              </Button>
              <Button
                onClick={() => handleCreateNewChat('direct')}
                className="w-full bg-blue-600 hover:bg-blue-700 justify-start"
                disabled={isLoading}
              >
                <Users className="w-4 h-4 mr-2" />
                Chat with User
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
