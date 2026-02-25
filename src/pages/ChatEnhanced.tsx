/**
 * Enhanced Chat Page Component
 * Complete chat system with all advanced features:
 * - View user profiles with sensitivity consciousness
 * - Chat settings (themes, wallpapers, fonts, colors)
 * - Delete chat with confirmation
 * - Message read status indicators (single/double ticks)
 * - Message timestamps with date separators (Today, Yesterday, dates)
 * - Custom themes and wallpapers
 * - Font customization
 */

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
  Settings,
  Trash2,
  MoreVertical,
  Eye,
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
  getDocs,
} from 'firebase/firestore';
import { ChatSettingsModal } from '@/components/ChatSettings';
import { ViewUserProfileModal } from '@/components/ViewUserProfile';
import { DeleteChatConfirmationModal } from '@/components/DeleteChatConfirmation';
import { ChatMessage } from '@/components/ChatMessage';
import {
  Message,
  ChatSession,
  ChatSettings as ChatSettingsType,
  UserProfile,
} from '@/types/chat';
import { CHAT_THEMES } from '@/lib/chatThemes';
import {
  getMessageDateLabel,
  shouldShowDateSeparator,
  formatMessageTime,
} from '@/lib/messageUtils';

/**
 * Enhanced Chat Page
 * Main chat interface with all features
 */
export default function ChatEnhanced() {
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

  // Settings and modals
  const [showSettings, setShowSettings] = useState(false);
  const [showViewProfile, setShowViewProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    chatId: string;
    chatTitle: string;
  } | null>(null);

  // Chat settings
  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    theme: 'light',
    wallpaper: '#FFFFFF',
    wallpaperType: 'color',
    messageAccentColor: '#007AFF',
    fontStyle: 'normal',
    fontSize: 14,
    notificationsEnabled: true,
    muteNotifications: false,
    customColors: {
      sentMessageBg: '#007AFF',
      receivedMessageBg: '#E5E5EA',
      textColor: '#000000',
      accentColor: '#007AFF',
    },
  });

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Load chat sessions
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
        ...doc.data(),
      } as ChatSession));

      setChatSessions(sessions);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  /**
   * Load messages for selected chat
   */
  useEffect(() => {
    if (!currentChatId) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', currentChatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Message))
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeA - timeB;
        });

      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [currentChatId]);

  /**
   * Load chat settings
   */
  useEffect(() => {
    if (!currentChatId) return;

    const loadSettings = async () => {
      try {
        const chatDoc = await getDocs(
          query(
            collection(db, 'chats'),
            where('id', '==', currentChatId)
          )
        );

        if (!chatDoc.empty) {
          const chat = chatDoc.docs[0].data() as ChatSession;
          if (chat.settings) {
            setChatSettings(chat.settings);
          }
        }
      } catch (error) {
        console.error('Error loading chat settings:', error);
      }
    };

    loadSettings();
  }, [currentChatId]);

  /**
   * Handle select chat
   */
  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setOpenMenuId(null);
  };

  /**
   * Handle send message
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !currentChatId) return;

    setIsSendingMessage(true);

    try {
      await addDoc(collection(db, 'messages'), {
        chatId: currentChatId,
        senderId: currentUser?.uid,
        senderName: userData?.name || 'Anonymous',
        senderRole: 'user',
        content: inputValue,
        createdAt: serverTimestamp(),
        readStatus: 'sent',
        isEdited: false,
      });

      // Update chat last message
      const chatRef = doc(db, 'chats', currentChatId);
      await updateDoc(chatRef, {
        lastMessage: inputValue,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setInputValue('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Send message error:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  /**
   * Handle create new chat
   */
  const handleCreateNewChat = async (type: 'hanna' | 'direct') => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      const chatTitle = type === 'hanna' ? 'Chat with Hanna AI' : 'New Chat';

      const newChat = await addDoc(collection(db, 'chats'), {
        userId: currentUser.uid,
        title: chatTitle,
        type,
        participants: type === 'direct' ? [currentUser.uid] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
        settings: chatSettings,
      });

      setCurrentChatId(newChat.id);
      setShowNewChatModal(false);
      toast.success(`${type === 'hanna' ? 'Chat with Hanna' : 'New chat'} created`);
    } catch (error) {
      toast.error('Failed to create chat');
      console.error('Create chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle save chat settings
   */
  const handleSaveSettings = async (settings: ChatSettingsType) => {
    if (!currentChatId) return;

    try {
      const chatRef = doc(db, 'chats', currentChatId);
      await updateDoc(chatRef, {
        settings,
      });

      setChatSettings(settings);
      toast.success('Chat settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Save settings error:', error);
    }
  };

  /**
   * Handle delete chat
   */
  const handleDeleteChat = async () => {
    if (!deleteConfirmData) return;

    try {
      // Delete chat document
      await deleteDoc(doc(db, 'chats', deleteConfirmData.chatId));

      // Delete all messages in chat
      const messagesQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', deleteConfirmData.chatId)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      for (const msgDoc of messagesSnapshot.docs) {
        await deleteDoc(msgDoc.ref);
      }

      setCurrentChatId(null);
      setShowDeleteConfirm(false);
      setDeleteConfirmData(null);
      toast.success('Chat deleted successfully');
    } catch (error) {
      toast.error('Failed to delete chat');
      console.error('Delete chat error:', error);
    }
  };

  /**
   * Handle view user profile
   */
  const handleViewProfile = async (userId: string) => {
    try {
      // Fetch user profile from Firestore
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('uid', '==', userId))
      );

      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        setSelectedUser({
          id: userId,
          name: userData.name || 'Unknown',
          email: userData.email || '',
          avatar: userData.avatar,
          bio: userData.bio,
          role: userData.role || 'student',
          joinedDate: userData.createdAt,
          courses: userData.courses || [],
          lastSeen: userData.lastSeen,
          isOnline: userData.isOnline || false,
        });
        setShowViewProfile(true);
      }
    } catch (error) {
      toast.error('Failed to load user profile');
      console.error('Load profile error:', error);
    }
  };

  /**
   * Get chat icon
   */
  const getChatIcon = (type: string) => {
    return type === 'hanna' ? (
      <Sparkles className="w-4 h-4 text-purple-600" />
    ) : (
      <Users className="w-4 h-4 text-blue-600" />
    );
  };

  /**
   * Get current chat
   */
  const currentChat = chatSessions.find(c => c.id === currentChatId);

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
            </div>
          ) : (
            chatSessions.map(session => (
              <div key={session.id} className="relative group">
                <button
                  onClick={() => handleSelectChat(session.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-2 ${
                    currentChatId === session.id
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="mt-1">{getChatIcon(session.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {session.messageCount} messages
                    </p>
                  </div>
                </button>

                {/* Chat Menu */}
                {currentChatId === session.id && (
                  <div className="absolute right-2 top-2">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === session.id ? null : session.id)
                      }
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === session.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        <button
                          onClick={() => {
                            setShowSettings(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                        >
                          <Settings className="w-4 h-4" />
                          Chat Settings
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmData({
                              chatId: session.id,
                              chatTitle: session.title,
                            });
                            setShowDeleteConfirm(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Chat
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {currentChatId ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between bg-white dark:bg-gray-900">
              <div>
                <h2 className="font-semibold">{currentChat?.title}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentChat?.messageCount || 0} messages
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{
                background: chatSettings.wallpaper,
              }}
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    {currentChat?.type === 'hanna' ? (
                      <>
                        <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">
                          Welcome to Hanna AI
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md">
                          I'm Hanna, your AI assistant. Ask me anything!
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">
                          Start a Conversation
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md">
                          Send a message to begin chatting.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                  const previousMessage = index > 0 ? messages[index - 1] : undefined;
                  const showDate = shouldShowDateSeparator(message, previousMessage);
                  const dateLabel = showDate
                    ? getMessageDateLabel(message.createdAt)
                    : '';

                  return (
                    <div key={message.id}>
                      <ChatMessage
                        message={message}
                        isCurrentUser={message.senderId === currentUser?.uid}
                        showDate={showDate}
                        dateLabel={dateLabel}
                        customColors={chatSettings.customColors}
                        fontSize={chatSettings.fontSize}
                        fontStyle={chatSettings.fontStyle}
                      />
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              className="border-t border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900"
            >
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input
                  type="text"
                  placeholder={
                    currentChat?.type === 'hanna'
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
                Create a new chat or select one from the sidebar
              </p>
              <Button
                onClick={() => setShowNewChatModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
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
                onClick={() => setShowNewChatModal(false)}
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

      {/* Chat Settings Modal */}
      <ChatSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={chatSettings}
        onSave={handleSaveSettings}
      />

      {/* View User Profile Modal */}
      <ViewUserProfileModal
        isOpen={showViewProfile}
        onClose={() => setShowViewProfile(false)}
        user={selectedUser}
        onStartChat={(userId) => {
          // Handle start chat with user
          console.log('Start chat with:', userId);
        }}
      />

      {/* Delete Chat Confirmation Modal */}
      <DeleteChatConfirmationModal
        isOpen={showDeleteConfirm}
        chatTitle={deleteConfirmData?.chatTitle || ''}
        onConfirm={handleDeleteChat}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmData(null);
        }}
      />
    </div>
  );
}
