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
  Users,
  Settings
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
  doc
} from 'firebase/firestore';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatSettings } from '@/components/ChatSettings';
import type { ChatSettings as ChatSettingsType, Message as ChatMessageType } from '@/types/chat';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'hanna';
  content: string;
  createdAt: any;
  readStatus?: 'sent' | 'delivered' | 'read';
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  type: 'direct' | 'hanna';
  participants?: string[];
  createdAt: any;
  updatedAt: any;
  messageCount: number;
}

/**
 * Enhanced Chat Page Component
 * 
 * Features:
 * - Real-time chat with WhatsApp-style message status indicators
 * - Hanna AI assistant integration
 * - Multiple chat sessions
 * - Firebase Firestore message persistence
 * - Modern Material Design UI
 * - Customizable chat settings
 * - Online status tracking
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
  const [showSettings, setShowSettings] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    theme: 'light',
    fontSize: 14,
    fontStyle: 'normal',
    notificationsEnabled: true,
    muteNotifications: false,
    colors: {
      sentMessageBg: '#007AFF',
      receivedMessageBg: '#E8E8ED',
      textColor: '#000000',
      accentColor: '#007AFF',
    },
  });
  
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
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
    }, (error) => {
      console.error('Error loading chat sessions:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, currentChatId]);

  /**
   * Load messages for current chat with real-time updates
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
      
      const sortedMsgs = msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      setMessages(sortedMsgs);

      // Mark messages as read
      sortedMsgs.forEach(msg => {
        if (msg.senderId !== currentUser?.uid && msg.readStatus !== 'read') {
          updateDoc(doc(db, 'messages', msg.id), {
            readStatus: 'read'
          }).catch(err => console.error('Error updating read status:', err));
        }
      });
    }, (error) => {
      console.error('Error loading messages:', error);
    });

    return () => unsubscribe();
  }, [currentChatId, currentUser?.uid]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !currentChatId || !currentUser) return;

    setIsSendingMessage(true);
    try {
      const senderName = (userData as any)?.displayName || 'Anonymous';
      
      const messageData = {
        chatId: currentChatId,
        senderId: currentUser.uid,
        senderName: senderName,
        senderRole: 'user' as const,
        content: inputValue.trim(),
        createdAt: serverTimestamp(),
        readStatus: 'sent' as const,
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update chat session timestamp
      await updateDoc(doc(db, 'chats', currentChatId), {
        updatedAt: serverTimestamp(),
      });

      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  /**
   * Handle selecting a chat
   */
  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  /**
   * Handle creating a new chat
   */
  const handleCreateNewChat = async (type: 'direct' | 'hanna') => {
    if (!currentUser) return;

    try {
      const chatData = {
        userId: currentUser.uid,
        title: type === 'hanna' ? 'Chat with Hanna AI' : 'New Direct Chat',
        type,
        participants: [currentUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
      };

      const docRef = await addDoc(collection(db, 'chats'), chatData);
      setCurrentChatId(docRef.id);
      setShowNewChatModal(false);
      toast.success(`New ${type === 'hanna' ? 'AI' : 'direct'} chat created`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat');
    }
  };

  /**
   * Get icon for chat type
   */
  const getChatIcon = (type: 'direct' | 'hanna') => {
    return type === 'hanna' ? (
      <Sparkles className="w-4 h-4 text-purple-500" />
    ) : (
      <Users className="w-4 h-4 text-blue-500" />
    );
  };

  /**
   * Handle settings change
   */
  const handleSettingsChange = (settings: ChatSettingsType) => {
    setChatSettings(settings);
    localStorage.setItem('chatSettings', JSON.stringify(settings));
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <MessageCircle className="w-5 h-5" />
              Messages
            </h1>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowNewChatModal(true)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              size="icon"
              className="rounded-lg"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No chats yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Start a new chat</p>
            </div>
          ) : (
            chatSessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSelectChat(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-start gap-3 ${
                  currentChatId === session.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
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
      <main className="flex-1 flex flex-col bg-white dark:bg-gray-950">
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
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome to Hanna AI</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md">
                          I'm Hanna, your AI assistant. Ask me anything about your courses, learning progress, or any questions you have!
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Start a Conversation</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md">
                          Send a message to begin chatting with other users.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                messages.map(message => (
                  <ChatMessage
                    key={message.id}
                    message={message as ChatMessageType}
                    isCurrentUser={message.senderId === currentUser?.uid}
                    customColors={chatSettings.colors}
                    fontSize={chatSettings.fontSize}
                    fontStyle={chatSettings.fontStyle}
                    isRecipientOnline={false}
                    isMessageRead={message.readStatus === 'read'}
                  />
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
                  className="flex-1 rounded-lg border-gray-300 dark:border-gray-700"
                />
                <Button
                  type="submit"
                  disabled={isSendingMessage || !inputValue.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Chat Selected</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create a new chat or select one from the sidebar to get started
              </p>
              <Button onClick={() => setShowNewChatModal(true)} className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6 bg-white dark:bg-gray-900 shadow-xl rounded-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Start New Chat</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewChatModal(false)}
                className="rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleCreateNewChat('hanna')}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white justify-start rounded-lg"
                disabled={isLoading}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Chat with Hanna AI
              </Button>
              <Button
                onClick={() => handleCreateNewChat('direct')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white justify-start rounded-lg"
                disabled={isLoading}
              >
                <Users className="w-4 h-4 mr-2" />
                Chat with User
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Chat Settings Modal */}
      {showSettings && (
        <ChatSettings
          currentSettings={chatSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
