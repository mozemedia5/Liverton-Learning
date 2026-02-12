/**
 * Chat Component
 * Main chat interface supporting both user-to-user messaging and Hanna AI assistant
 * Features: Real-time messaging, chat history, Hanna AI integration
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc } from 'firebase/firestore';

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

const mockChats: ChatUser[] = [
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

export default function Chat() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hannaSessions, setHannaSessions] = useState<HannaChatSession[]>([]);
  const [currentHannaSession, setCurrentHannaSession] = useState<string | null>(null);
  const [hannaMessages, setHannaMessages] = useState<HannaMessage[]>([]);

  // Load Hanna chat sessions on mount
  useEffect(() => {
    if (currentUser) {
      loadHannaSessions();
    }
  }, [currentUser]);

  // Load Hanna messages when session changes
  useEffect(() => {
    if (currentHannaSession) {
      loadHannaMessages(currentHannaSession);
    }
  }, [currentHannaSession]);

  /**
   * Load all Hanna chat sessions for the current user
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
    } catch (error) {
      console.error('Error loading Hanna sessions:', error);
    }
  };

  /**
   * Load messages for a specific Hanna chat session
   */
  const loadHannaMessages = async (sessionId: string) => {
    try {
      const q = query(
        collection(db, 'hannaChats', sessionId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as HannaMessage[];
      setHannaMessages(messages);
    } catch (error) {
      console.error('Error loading Hanna messages:', error);
      toast.error('Failed to load chat history');
    }
  };

  /**
   * Create a new Hanna chat session
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
      setHannaMessages([]);
      await loadHannaSessions();
      toast.success('New chat session created');
    } catch (error) {
      console.error('Error creating Hanna session:', error);
      toast.error('Failed to create chat session');
    }
  };

  /**
   * Send message to Hanna AI
   */
  const handleSendHannaMessage = async () => {
    const userMessage = messageInput.trim();
    if (!messageInput.trim() || !currentUser || !currentHannaSession) return;

    setMessageInput('');
    setLoading(true);

    try {
      // Save user message
      const userMsgRef = await addDoc(
        collection(db, 'hannaChats', currentHannaSession, 'messages'),
        {
          role: 'user',
          content: userMessage,
          timestamp: Timestamp.now(),
          userId: currentUser.uid,
        }
      );

      setHannaMessages(prev => [...prev, {
        id: userMsgRef.id,
        role: 'user',
        content: userMessage,
        timestamp: Timestamp.now(),
      }]);

      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate AI response (in production, this would call Cloud Function)
      const aiResponse = generateAIResponse(userMessage);

      const aiMsgRef = await addDoc(
        collection(db, 'hannaChats', currentHannaSession, 'messages'),
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: Timestamp.now(),
          userId: currentUser.uid,
        }
      );

      setHannaMessages(prev => [...prev, {
        id: aiMsgRef.id,
        role: 'assistant',
        content: aiResponse,
        timestamp: Timestamp.now(),
      }]);

      // Update session title if first message
      if (hannaMessages.length === 0) {
        const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
        await updateDoc(doc(db, 'hannaChats', currentHannaSession), {
          title,
          updatedAt: Timestamp.now(),
        });
      }

      // Update session metadata
      await updateDoc(doc(db, 'hannaChats', currentHannaSession), {
        lastMessage: userMessage,
        lastMessageTime: Timestamp.now(),
        messageCount: (hannaMessages.length / 2) + 1,
      });

    } catch (error) {
      console.error('Error sending Hanna message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a Hanna chat session
   */

  /**
   * Generate AI response (placeholder - will be replaced with Cloud Function call)
   */
  const generateAIResponse = (_userMessage: string): string => {
    const responses = [
      "That's an interesting question! Let me help you with that.",
      "I'd be happy to assist you. Here's what I think...",
      "Great question! This is something many people wonder about.",
      "Let me provide you with some insights on this topic.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  /**
   * Handle selecting Hanna as chat contact
   */
  const handleSelectHanna = () => {
    if (hannaSessions.length === 0) {
      createNewHannaSession();
    } else {
      setCurrentHannaSession(hannaSessions[0].id);
    }
    setSelectedChat({
      id: 'hanna',
      name: 'Hanna AI',
      role: 'ai_assistant',
      lastMessage: 'Your intelligent learning companion',
      lastMessageTime: 'Always available',
      unread: 0,
      online: true,
      isHanna: true,
    });
  };

  const filteredChats = mockChats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    toast.success('Message sent!');
    setMessageInput('');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Chat</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-65px)]">
        {/* Chat List */}
        <div className={`w-full md:w-80 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 ${selectedChat ? 'hidden md:block' : 'block'}`}>
          <div className="p-4 space-y-4 h-full flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Hanna AI Section */}
            <div className="space-y-2">
              <button
                onClick={handleSelectHanna}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  selectedChat?.isHanna
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Hanna AI</p>
                  <p className={`text-sm ${selectedChat?.isHanna ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                    Your learning companion
                  </p>
                </div>
              </button>

              {/* Hanna Sessions */}
              {selectedChat?.isHanna && hannaSessions.length > 0 && (
                <div className="ml-4 space-y-1 max-h-40 overflow-y-auto">
                  {hannaSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setCurrentHannaSession(session.id)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        currentHannaSession === session.id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-900'
                      }`}
                    >
                      <p className="truncate font-medium">{session.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.updatedAt.toMillis()).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Regular Chats */}
            <div className="space-y-1 flex-1 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 px-2">CONTACTS</p>
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat);
                    setCurrentHannaSession(null);
                  }}
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
      </main>
    </div>
  );
}
