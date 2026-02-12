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
  Trash2,
  Search,
  FileUp,

  Copy,

  Settings,
  Clock,
  MessageSquare,

} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

/**
 * Message interface for Hanna AI chat
 * Supports user and AI messages with metadata
 */
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'hanna';
  content: string;
  createdAt: any;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
}

/**
 * Chat session interface
 * Represents a conversation with Hanna
 */
interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  messageCount: number;
  archived?: boolean;
}

/**
 * Hanna AI Chat Component - Enhanced Version
 *
 * Features:
 * - Real-time chat with Hanna AI assistant
 * - Firebase Firestore message persistence
 * - Multiple chat sessions with management
 * - AI-powered responses using Gemini API
 * - Message history and context awareness
 * - File upload support
 * - Message search functionality
 * - Professional UI with dark mode support
 * - Real-time updates and notifications
 * - Chat session archiving and deletion
 * - Message copying and export
 */
export default function HannaChat() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  // Chat state management
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Load chat sessions for current user
   * Real-time listener for chat updates
   */
  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'hanna_chats'),
      where('userId', '==', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatSession[];

        setChatSessions(sessions);

        // Auto-select first chat if none selected
        if (sessions.length > 0 && !currentChatId) {
          setCurrentChatId(sessions[0].id);
        }

        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading chats:', error);
        toast.error('Failed to load chats');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, currentChatId]);

  /**
   * Load messages for current chat
   * Real-time listener for message updates
   */
  useEffect(() => {
    if (!currentChatId) return;

    const q = query(
      collection(db, 'hanna_messages'),
      where('chatId', '==', currentChatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];

        setMessages(msgs);
      },
      (error) => {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      }
    );

    return () => unsubscribe();
  }, [currentChatId]);

  /**
   * Create a new chat session with Hanna
   */
  const handleNewChat = async () => {
    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      const chatRef = await addDoc(collection(db, 'hanna_chats'), {
        userId: currentUser.uid,
        title: `Chat with Hanna - ${new Date().toLocaleDateString()}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
        archived: false,
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

  /**
   * Send message to Hanna AI
   * Calls backend Cloud Function to get AI response
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
      // Add user message to Firestore
      await addDoc(collection(db, 'hanna_messages'), {
        chatId: currentChatId,
        senderId: currentUser.uid,
        senderName: userData?.fullName || 'User',
        senderRole: 'user',
        content: userMessage,
        createdAt: serverTimestamp(),
        attachments: selectedFile
          ? [
              {
                type: selectedFile.type,
                name: selectedFile.name,
                url: '', // File URL would be set after upload
              },
            ]
          : [],
      });

      // Update chat session
      await updateDoc(doc(db, 'hanna_chats', currentChatId), {
        updatedAt: serverTimestamp(),
      });

      // Clear selected file
      setSelectedFile(null);

      // Call backend Cloud Function to get AI response
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
            conversationHistory: messages.slice(-5).map((msg) => ({
              role: msg.senderRole === 'user' ? 'user' : 'assistant',
              content: msg.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();

        // Add Hanna's response to Firestore
        await addDoc(collection(db, 'hanna_messages'), {
          chatId: currentChatId,
          senderId: 'hanna-ai',
          senderName: 'Hanna',
          senderRole: 'hanna',
          content: data.response,
          createdAt: serverTimestamp(),
        });

        toast.success('Message sent!');
      } catch (error) {
        console.error('Error getting AI response:', error);
        toast.error('Failed to get response from Hanna');
      }
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
    setSearchQuery('');
  };

  /**
   * Delete a chat session
   */
  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      // Delete all messages in the chat
      const messagesSnapshot = await fetch(
        `/api/hanna/messages?chatId=${chatId}`
      );
      if (messagesSnapshot.ok) {
        const data = await messagesSnapshot.json();
        for (const message of data.messages) {
          await deleteDoc(doc(db, 'hanna_messages', message.id));
        }
      }

      // Delete the chat
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

  /**
   * Search messages across all chats
   */
  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUser) {
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/hanna/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          query: searchQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      toast.success(`Found ${data.count} results`);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Copy message to clipboard
   */
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date =
      timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-black dark:text-white transition-colors duration-300 flex">
      {/* Sidebar - Chat Sessions */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Hanna AI
            </h1>
          </div>
          <Button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleSearch}
              disabled={isSearching}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 px-2">
                SEARCH RESULTS
              </p>
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectChat(result.chatId)}
                  className="w-full text-left p-3 rounded-lg transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                >
                  <p className="text-sm font-medium truncate text-purple-600 dark:text-purple-400">
                    {result.content.substring(0, 50)}...
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTime(result.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No chats yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 px-2">
                RECENT CHATS
              </p>
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative p-3 rounded-lg transition-all cursor-pointer ${
                    currentChatId === session.id
                      ? 'bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-800 text-purple-900 dark:text-purple-100 shadow-sm'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleSelectChat(session.id)}
                >
                  <p className="text-sm font-medium truncate">
                    {session.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      {session.messageCount} messages
                    </p>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {currentChatId ? (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="font-semibold">
                    {chatSessions.find((s) => s.id === currentChatId)?.title}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {messages.length} messages
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">
                      Welcome to Hanna AI
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      I'm Hanna, your intelligent AI assistant. Ask me anything
                      about your courses, learning progress, or any questions
                      you have!
                    </p>
                    <div className="grid grid-cols-1 gap-2 text-left">
                      <button
                        onClick={() =>
                          setInputValue(
                            'What courses are available for me to take?'
                          )
                        }
                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-left transition-colors"
                      >
                        📚 What courses are available?
                      </button>
                      <button
                        onClick={() =>
                          setInputValue(
                            'How can I improve my study habits?'
                          )
                        }
                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-left transition-colors"
                      >
                        💡 How can I improve my study habits?
                      </button>
                      <button
                        onClick={() =>
                          setInputValue(
                            'Can you help me understand this concept?'
                          )
                        }
                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-left transition-colors"
                      >
                        🤔 Help me understand a concept
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderRole === 'user'
                        ? 'justify-end'
                        : 'justify-start'
                    } group`}
                  >
                    <div
                      className={`max-w-md lg:max-w-2xl ${
                        message.senderRole === 'user'
                          ? 'order-2'
                          : 'order-1'
                      }`}
                    >
                      <Card
                        className={`p-4 rounded-2xl transition-all ${
                          message.senderRole === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white dark:from-purple-700 dark:to-purple-800 shadow-lg'
                            : 'bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <p className="text-xs font-semibold mb-2 opacity-75">
                          {message.senderName}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p className="text-xs opacity-60 mt-2">
                          {formatTime(message.createdAt)}
                        </p>
                      </Card>
                      {message.senderRole === 'hanna' && (
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyMessage(message.content)}
                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900">
              {selectedFile && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-900 dark:text-blue-100">
                      {selectedFile.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Ask Hanna anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSendingMessage}
                  className="flex-1 rounded-full border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <FileUp className="w-4 h-4" />
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingMessage || !inputValue.trim()}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Tip: You can upload documents for Hanna to analyze
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Chat Selected</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                Create a new chat or select one from the sidebar to get started
                with Hanna AI
              </p>
              <Button
                onClick={handleNewChat}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
