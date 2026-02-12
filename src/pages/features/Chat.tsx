/**
 * Chat Component
 * Main chat interface supporting both user-to-user messaging and Hanna AI assistant
 * Features: Real-time messaging, chat history, Hanna AI integration
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ArrowLeft, 
  Search, 
  Send, 
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc, onSnapshot } from 'firebase/firestore';

interface ChatUser {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
  isHanna?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface HannaChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messageCount?: number;
}

interface HannaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

/**
 * Mock chat data - includes Hanna AI as a contact
 * Hanna is marked with isHanna flag for special handling
 */
const mockChats: ChatUser[] = [
  { 
    id: 'hanna', 
    name: 'Hanna AI', 
    role: 'ai_assistant', 
    lastMessage: 'Hi! I\'m here to help with your learning journey.', 
    lastMessageTime: 'Now', 
    unread: 0, 
    online: true,
    isHanna: true
  },
  { id: '1', name: 'Mr. Johnson', role: 'teacher', lastMessage: 'Don\'t forget about the quiz tomorrow!', lastMessageTime: '10:30 AM', unread: 2, online: true },
  { id: '2', name: 'Alice Smith', role: 'student', lastMessage: 'Can you help me with question 5?', lastMessageTime: 'Yesterday', unread: 0, online: false },
  { id: '3', name: 'School Admin', role: 'school_admin', lastMessage: 'Important announcement regarding exams', lastMessageTime: 'Yesterday', unread: 1, online: true },
  { id: '4', name: 'Ms. Davis', role: 'teacher', lastMessage: 'Great work on your assignment!', lastMessageTime: '2 days ago', unread: 0, online: false },
  { id: '5', name: 'Bob Wilson', role: 'student', lastMessage: 'Thanks for the help!', lastMessageTime: '3 days ago', unread: 0, online: true },
];

const mockMessages: Message[] = [
  { id: '1', senderId: '1', content: 'Hello! How are you doing with the coursework?', timestamp: '10:15 AM', read: true },
  { id: '2', senderId: 'me', content: 'I\'m doing well, thanks! Just reviewing for the quiz.', timestamp: '10:20 AM', read: true },
  { id: '3', senderId: '1', content: 'Great! Don\'t forget about the quiz tomorrow!', timestamp: '10:30 AM', read: false },
];

/**
 * AI responses for Hanna - used when no real API is available
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

export default function Chat() {
  const { currentUser } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hannaSessions, setHannaSessions] = useState<HannaChatSession[]>([]);
  const [currentHannaSession, setCurrentHannaSession] = useState<string | null>(null);
  const [hannaMessages, setHannaMessages] = useState<HannaMessage[]>([]);

  /**
   * Get user initials for avatar fallback
   * @param name - User's full name
   * @returns Two-letter initials
   */
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Filter chats based on search query
   * Searches through chat names and last messages
   */
  const filteredChats = mockChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Load Hanna chat sessions from Firestore
   * Fetches all sessions for the current user
   */
  const loadHannaSessions = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'hannaChats'),
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as HannaChatSession[];
      setHannaSessions(sessions);
      
      // Auto-select first session if available
      if (sessions.length > 0 && !currentHannaSession) {
        setCurrentHannaSession(sessions[0].id);
      }
    } catch (error) {
      console.error('Error loading Hanna sessions:', error);
      // Don't show error toast - this is expected if user hasn't used Hanna yet
    }
  };

  /**
   * Load messages for the current Hanna session
   * Sets up real-time listener for message updates
   */
  const loadHannaMessages = (sessionId: string) => {
    try {
      const q = query(
        collection(db, 'hannaChats', sessionId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      // Set up real-time listener for messages
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as HannaMessage[];
        setHannaMessages(messages);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading Hanna messages:', error);
      return undefined;
    }
  };

  /**
   * Send a message to Hanna AI
   * Creates user message, generates AI response, saves both to Firestore
   */
  const handleSendHannaMessage = async () => {
    if (!messageInput.trim() || !currentUser || !currentHannaSession) return;

    const userMessageText = messageInput.trim();
    setMessageInput('');
    setLoading(true);

    try {
      // Save user message to Firestore
      await addDoc(
        collection(db, 'hannaChats', currentHannaSession, 'messages'),
        {
          role: 'user',
          content: userMessageText,
          timestamp: Timestamp.now(),
        }
      );

      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate AI response (placeholder - would call Gemini API in production)
      const aiResponse = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];

      // Save AI response to Firestore
      await addDoc(
        collection(db, 'hannaChats', currentHannaSession, 'messages'),
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: Timestamp.now(),
        }
      );

      // Update session metadata
      await updateDoc(doc(db, 'hannaChats', currentHannaSession), {
        updatedAt: Timestamp.now(),
        messageCount: hannaMessages.length + 2,
      });

      await loadHannaSessions();
    } catch (error) {
      console.error('Error sending Hanna message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send a regular message to another user
   * In production, this would save to a messages collection
   */
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;

    setMessageInput('');
    setLoading(true);

    try {
      // In production, this would save to Firestore
      // For now, just show a toast
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load Hanna sessions on component mount
   */
  useEffect(() => {
    if (currentUser) {
      loadHannaSessions();
    }
  }, [currentUser]);

  /**
   * Load messages when current Hanna session changes
   */
  useEffect(() => {
    if (currentHannaSession) {
      const unsubscribe = loadHannaMessages(currentHannaSession);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentHannaSession]);

  /**
   * Handle chat selection
   * When Hanna is selected, load her session
   * When regular user is selected, clear Hanna session
   */
  const handleSelectChat = (chat: ChatUser) => {
    setSelectedChat(chat);
    if (chat.isHanna) {
      // Load or create Hanna session
      if (hannaSessions.length > 0) {
        setCurrentHannaSession(hannaSessions[0].id);
      } else {
        // Create new session if none exists
        createNewHannaSession();
      }
    } else {
      setCurrentHannaSession(null);
    }
  };

  /**
   * Create a new Hanna chat session
   * Called when user starts chatting with Hanna for the first time
   */
  const createNewHannaSession = async () => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'hannaChats'), {
        userId: currentUser.uid,
        title: 'New Chat',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messageCount: 0,
      });
      setCurrentHannaSession(docRef.id);
      await loadHannaSessions();
    } catch (error) {
      console.error('Error creating Hanna session:', error);
      toast.error('Failed to create chat session');
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-black">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-black">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 flex-1 overflow-y-auto">
            {/* Hanna AI Contact - Always at top */}
            <button
              onClick={() => handleSelectChat(mockChats[0])}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                selectedChat?.id === 'hanna'
                  ? 'bg-gray-100 dark:bg-gray-900'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
              }`}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">Hanna AI</p>
                  <span className="text-xs text-gray-500">Now</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  Hi! I'm here to help with your learning journey.
                </p>
              </div>
            </button>

            {/* Divider */}
            <div className="px-2 py-2">
              <div className="h-px bg-gray-200 dark:bg-gray-800" />
            </div>

            {/* Regular Chats */}
            <div className="space-y-1 flex-1 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 px-2">CONTACTS</p>
              {filteredChats.slice(1).map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    selectedChat?.id === chat.id && !selectedChat?.isHanna
                      ? 'bg-gray-100 dark:bg-gray-900'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
                    </Avatar>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-black" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{chat.name}</p>
                      <span className="text-xs text-gray-500">{chat.lastMessageTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <Badge variant="default" className="ml-2">{chat.unread}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-black ${selectedChat ? 'block' : 'hidden md:block'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setSelectedChat(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {selectedChat.isHanna ? (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedChat.name)}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <p className="font-medium">{selectedChat.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedChat.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!selectedChat.isHanna && (
                  <>
                    <Button variant="ghost" size="icon">
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="w-5 h-5" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedChat.isHanna ? (
                // Hanna Messages
                hannaMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Welcome to Hanna AI</h3>
                      <p className="text-gray-600 dark:text-gray-400">Start a conversation by typing a message below</p>
                    </div>
                  </div>
                ) : (
                  hannaMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500'}`}>
                          {new Date(message.timestamp.toMillis()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )
              ) : (
                // Regular Messages
                mockMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        message.senderId === 'me'
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${message.senderId === 'me' ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500'}`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input
                  placeholder={selectedChat.isHanna ? "Ask Hanna anything..." : "Type a message..."}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedChat.isHanna) {
                        handleSendHannaMessage();
                      } else {
                        handleSendMessage();
                      }
                    }
                  }}
                  disabled={loading}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Smile className="w-5 h-5" />
                </Button>
                <Button 
                  onClick={selectedChat.isHanna ? handleSendHannaMessage : handleSendMessage}
                  disabled={loading || !messageInput.trim()}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold">Select a chat to start messaging</h3>
              <p className="text-gray-600 dark:text-gray-400">Choose from your existing conversations or chat with Hanna AI</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
