import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Send,
  Loader2,
  Sparkles,
  MessageCircle,
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Menu,
  X,
  Copy
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
  deleteDoc,
} from 'firebase/firestore';

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
  createdAt: any;
  updatedAt: any;
  messageCount: number;
}

export default function HannaChatIntegrated() {
  const { userData, currentUser } = useAuth();

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'hanna_chats'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatSession[];

        const sortedSessions = sessions.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis?.() || 0;
          const timeB = b.updatedAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setChatSessions(sortedSessions);
        if (sortedSessions.length > 0 && !currentChatId) {
          setCurrentChatId(sortedSessions[0].id);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading chats:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, currentChatId]);

  useEffect(() => {
    if (!currentChatId) return;

    const q = query(
      collection(db, 'hanna_messages'),
      where('chatId', '==', currentChatId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];

        const sortedMsgs = msgs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeA - timeB;
        });

        setMessages(sortedMsgs);
      },
      (error) => {
        console.error('Error loading messages:', error);
      }
    );

    return () => unsubscribe();
  }, [currentChatId]);

  const handleNewChat = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const chatRef = await addDoc(collection(db, 'hanna_chats'), {
        userId: currentUser.uid,
        title: `Chat with Hanna - ${new Date().toLocaleDateString()}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
      });

      setCurrentChatId(chatRef.id);
      setMessages([]);
      setInputValue('');
      toast.success('New chat created!');
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !currentChatId || !currentUser) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsSendingMessage(true);

    try {
      await addDoc(collection(db, 'hanna_messages'), {
        chatId: currentChatId,
        senderId: currentUser.uid,
        senderName: userData?.fullName || 'User',
        senderRole: 'user',
        content: userMessage,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'hanna_chats', currentChatId), {
        updatedAt: serverTimestamp(),
      });

      // AI Response Logic (Simulated for this version)
      setTimeout(async () => {
          try {
              await addDoc(collection(db, 'hanna_messages'), {
                  chatId: currentChatId,
                  senderId: 'hanna-ai',
                  senderName: 'Hanna',
                  senderRole: 'hanna',
                  content: "I'm Hanna, your AI assistant. I've received your message and I'm here to help you with your learning journey!",
                  createdAt: serverTimestamp(),
              });
          } catch (err) {
              console.error("AI response error:", err);
          }
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return;

    try {
      await deleteDoc(doc(db, 'hanna_chats', chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-30 w-full sm:w-80 lg:relative lg:translate-x-0
          bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800
          transition-transform duration-300 ease-in-out flex flex-col
        `}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Hanna AI
          </h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleNewChat} className="rounded-full">
              <Plus className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden rounded-full" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No chats yet</p>
            </div>
          ) : (
            chatSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setCurrentChatId(session.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`
                  w-full p-3 flex items-center gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group
                  ${currentChatId === session.id ? 'bg-purple-50 dark:bg-purple-900/20 border-r-2 border-purple-600' : ''}
                `}
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600">
                   <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold truncate text-sm">{session.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {session.messageCount || 0} messages
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(session.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {currentChatId ? (
          <>
            <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600">
                   <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold leading-tight">Hanna AI Assistant</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-gray-500">Online & Ready to help</span>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${message.senderRole === 'user' ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={message.senderRole === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}>
                        {message.senderRole === 'user' ? getInitials(message.senderName) : 'H'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`space-y-1 ${message.senderRole === 'user' ? 'items-end' : ''}`}>
                      <div className={`
                        p-3 rounded-2xl text-sm
                        ${message.senderRole === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-tl-none'}
                      `}>
                        {message.content}
                      </div>
                      <span className="text-[10px] text-gray-500 px-1">{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-4 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center max-w-4xl mx-auto">
                <Input
                  placeholder="Ask Hanna anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-gray-100 dark:bg-gray-900 border-none rounded-full px-6 focus-visible:ring-purple-600"
                  disabled={isSendingMessage}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={!inputValue.trim() || isSendingMessage}
                >
                  {isSendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
             <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-6">
               <Sparkles className="w-10 h-10 text-purple-600" />
             </div>
             <h2 className="text-2xl font-bold mb-2">Welcome to Hanna AI</h2>
             <p className="text-gray-500 max-w-md mb-8">
               I'm your intelligent assistant, here to help you with your studies, answer questions, and guide you through the platform.
             </p>
             <Button onClick={handleNewChat} className="bg-purple-600 hover:bg-purple-700 text-white px-8 rounded-full">
               <Plus className="w-4 h-4 mr-2" />
               Start a New Conversation
             </Button>
          </div>
        )}
      </main>
    </div>
  );
}
