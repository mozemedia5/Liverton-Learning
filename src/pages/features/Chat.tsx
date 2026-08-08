import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Send,
  MoreVertical,
  Paperclip,
  Smile,
  Menu,
  X,
  Loader2,
  UserPlus,
  Settings,
  Trash2,
  Info,
  MessageSquare,
  Plus,
  FileText,
  Download,
  CheckCheck,
  Mic
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  listenToUserChats,
  listenToMessages,
  sendMessage,
  sendMessageWithFile,
  searchUsers,
  getOrCreateChat,
  deleteChat,
  markChatAsRead,
  type ChatContact
} from '@/services/chatService';
import { uploadChatFile, getFileType } from '@/services/fileUploadService';
import type { Chat as ChatType, Message } from '@/types';
import type { ChatSettings as ChatSettingsType } from '@/types/chat';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ViewUserProfile } from '@/components/ViewUserProfile';
import { ChatSettingsEnhanced } from '@/components/ChatSettingsEnhanced';
import { EmojiPicker } from '@/components/EmojiPicker';
import { DeleteChatConfirmation } from '@/components/DeleteChatConfirmation';
import { groupMessagesByDate } from '@/lib/dateUtils';
import { DateSeparator } from '@/components/DateSeparator';
import { SEO } from '@/components/SEO';

export default function Chat() {
  const { currentUser, userData } = useAuth();
  const { chatId: chatIdParam } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatFilter, setChatFilter] = useState('');
  const [searchResults, setSearchResults] = useState<ChatContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New feature states
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean; chatId?: string; chatTitle?: string}>({
    isOpen: false
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  
  // Chat settings state
  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    theme: 'light',
    wallpaper: '#FFFFFF',
    wallpaperType: 'color',
    fontStyle: 'normal',
    fontSize: 14,
    notificationsEnabled: true,
    muteNotifications: false,
    encryptionEnabled: false,
    dataProtectionEnabled: false,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to user's chats (+ honor /chat/:chatId deep links)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = listenToUserChats(currentUser.uid, (updatedChats) => {
      setChats(updatedChats);
      setLoading(false);

      if (chatIdParam) {
        const target = updatedChats.find(c => c.id === chatIdParam);
        if (target && selectedChat?.id !== target.id) {
          setSelectedChat(target);
        }
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, chatIdParam]);

  // Selecting a conversation updates the URL (shareable deep link) and marks it read
  const openChat = (chat: ChatType) => {
    setSelectedChat(chat);
    navigate(`/chat/${chat.id}`, { replace: true });
    if (currentUser) {
      markChatAsRead(chat.id, currentUser.uid);
    }
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // Listen to messages when a chat is selected (+ keep read receipts fresh)
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const unsubscribe = listenToMessages(selectedChat.id, (updatedMessages) => {
      setMessages(updatedMessages);
      if (currentUser && updatedMessages.some(m => !(m.readBy || []).includes(currentUser.uid))) {
        markChatAsRead(selectedChat.id, currentUser.uid);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.id, currentUser]);

  // Handle user search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2 && currentUser) {
        setIsSearching(true);
        try {
          const results = await searchUsers(searchTerm, currentUser.uid);
          setSearchResults(results);
        } catch {
          toast.error('Failed to search users');
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim() || !selectedChat || !currentUser) return;

    const content = messageInput.trim();
    setMessageInput('');
    
    try {
      await sendMessage(
        selectedChat.id, 
        currentUser.uid, 
        userData?.fullName || 'Me', 
        content
      );
    } catch {
      toast.error('Failed to send message');
      setMessageInput(content); // Restore input on failure
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat || !currentUser || !userData) return;

    setUploadingFile(true);
    setUploadProgress(0);

    try {
      const downloadURL = await uploadChatFile(
        file,
        selectedChat.id,
        (progress) => {
          setUploadProgress(progress.progress);
        }
      );

      await sendMessageWithFile(
        selectedChat.id,
        currentUser.uid,
        userData.fullName || 'Me',
        file.name,
        downloadURL,
        file.name,
        getFileType(downloadURL)
      );

      toast.success('File sent successfully!');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Start Voice input simulation / Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Voice input is not supported directly in this browser. Simulating mic input...', { duration: 3000 });
      setIsRecording(true);
      setTimeout(() => {
        setMessageInput(prev => prev + (prev ? ' ' : '') + "Hello! Let's schedule a call.");
        setIsRecording(false);
        toast.success('Voice transcription complete!');
      }, 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info('Listening... Speak now!', { id: 'voice-toast' });
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast.error('Voice input failed. Please try again or type directly.', { id: 'voice-toast' });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      if (result) {
        setMessageInput(prev => prev + (prev ? ' ' : '') + result);
        toast.success('Voice recognized successfully!', { id: 'voice-toast' });
      }
    };

    recognition.start();
  };

  const handleStartChat = async (contact: ChatContact) => {
    if (!currentUser || !userData) return;

    try {
      const chatId = await getOrCreateChat(
        currentUser.uid,
        contact.uid,
        userData,
        contact
      );

      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        openChat(chat);
      } else {
        navigate(`/chat/${chatId}`);
      }

      setIsSearchOpen(false);
      setSearchTerm('');
    } catch {
      toast.error('Failed to start chat');
    }
  };

  const handleDeleteChat = async () => {
    if (!deleteConfirmation.chatId) return;
    
    try {
      await deleteChat(deleteConfirmation.chatId);
      toast.success('Chat deleted successfully');
      setSelectedChat(null);
      setDeleteConfirmation({ isOpen: false });
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const handleViewProfile = () => {
    if (!selectedChat || !currentUser) return;
    const otherId = selectedChat.participants.find(id => id !== currentUser.uid);
    if (otherId) {
      setViewProfileUserId(otherId);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOtherParticipantName = (chat: ChatType) => {
    if (!currentUser) return 'Unknown';
    const otherId = chat.participants.find(id => id !== currentUser.uid);
    return otherId ? chat.participantNames[otherId] : 'Unknown';
  };

  const getOtherParticipantRole = (chat: ChatType) => {
    if (!currentUser) return 'student';
    const otherId = chat.participants.find(id => id !== currentUser.uid);
    return otherId ? chat.participantRoles[otherId] : 'student';
  };

  const getUnreadCount = (chat: ChatType): number => {
    if (!currentUser) return 0;
    return chat.unreadCounts?.[currentUser.uid] || 0;
  };

  const filteredChats = useMemo(() => {
    const q = chatFilter.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(chat =>
      getOtherParticipantName(chat).toLowerCase().includes(q) ||
      (chat.lastMessage?.content || '').toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, chatFilter, currentUser]);

  // Get wallpaper style
  const getWallpaperStyle = (): React.CSSProperties => {
    if (!chatSettings.wallpaper) return {};
    
    if (chatSettings.wallpaperType === 'image') {
      return {
        backgroundImage: `url(${chatSettings.wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    } else if (chatSettings.wallpaperType === 'gradient') {
      return {
        background: chatSettings.wallpaper,
      };
    } else {
      return {
        backgroundColor: chatSettings.wallpaper,
      };
    }
  };

  if (loading) {
    return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

  // Group messages by date
  const messageGroups = groupMessagesByDate(messages);

  return (
    <>
      <SEO title="Chats" description="Chat with teachers, students and school teams on Liverton Learning." noIndex />
    <div className="flex h-screen bg-white dark:bg-[#07070a] overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 dark:bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Sidebar - Chat List */}
      <aside 
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-30 w-full sm:w-80 lg:relative lg:translate-x-0
          bg-white/95 dark:bg-[#0d0d12]/95 border-r border-gray-200 dark:border-white/5 backdrop-blur-md
          transition-transform duration-300 ease-in-out flex flex-col z-20
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSearchOpen(true)}
              className="rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            >
              <UserPlus className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden rounded-full"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search/Filter */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search chats..."
              value={chatFilter}
              onChange={(e) => setChatFilter(e.target.value)}
              className="pl-10 bg-gray-100 dark:bg-white/5 border-none rounded-full"
            />
            {chatFilter && (
              <button
                onClick={() => setChatFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No conversations yet</p>
              <Button 
                variant="link" 
                onClick={() => setIsSearchOpen(true)}
                className="mt-2 text-emerald-500 font-bold"
              >
                Start a new chat
              </Button>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              <p>No chats match "{chatFilter}"</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const unread = getUnreadCount(chat);
              return (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className={`
                    w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors
                    ${selectedChat?.id === chat.id ? 'bg-emerald-500/10 border-r-2 border-emerald-500' : ''}
                  `}
                >
                  <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-800">
                    <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold">
                      {getInitials(getOtherParticipantName(chat))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold truncate">{getOtherParticipantName(chat)}</h3>
                      <span className={`text-xs ${unread > 0 ? 'text-emerald-500 font-bold' : 'text-gray-500'}`}>
                        {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unread > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
                        {chat.lastMessage?.content || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <header className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-[#07070a]/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden text-slate-600 dark:text-slate-300"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    {getInitials(getOtherParticipantName(selectedChat))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-bold leading-tight">{getOtherParticipantName(selectedChat)}</h2>
                  <span className="text-xs text-gray-500 capitalize">{getOtherParticipantRole(selectedChat).replace('_', ' ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-600 dark:text-slate-300"><MoreVertical className="w-5 h-5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#111115] border border-slate-200 dark:border-white/10">
                    <DropdownMenuItem className="gap-2 text-slate-700 dark:text-slate-200" onClick={handleViewProfile}>
                      <Info className="w-4 h-4" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-slate-700 dark:text-slate-200" onClick={() => setIsSettingsOpen(true)}>
                      <Settings className="w-4 h-4" /> Chat Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 text-red-600 font-bold"
                      onClick={() => setDeleteConfirmation({
                        isOpen: true,
                        chatId: selectedChat.id,
                        chatTitle: getOtherParticipantName(selectedChat)
                      })}
                    >
                      <Trash2 className="w-4 h-4" /> Delete Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Messages Area with Wallpaper */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-1" 
              style={getWallpaperStyle()}
            >
              {messageGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  {/* Date Separator */}
                  <DateSeparator dateLabel={group.dateLabel} />
                  
                  {/* Messages for this date */}
                  {group.messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser?.uid;
                    const hasAttachment = msg.attachments && msg.attachments.length > 0;
                    
                    return (
                      <div 
                        key={msg.id || idx} 
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
                      >
                        <div className={`
                          max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm
                          ${isMe 
                            ? `bg-emerald-600 text-white rounded-tr-none`
                            : 'bg-white dark:bg-[#111115] text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-white/5'}
                        `}
                        style={{
                          fontSize: `${chatSettings.fontSize}px`,
                          fontStyle: chatSettings.fontStyle.includes('italic') ? 'italic' : 'normal',
                          fontWeight: chatSettings.fontStyle.includes('bold') ? 'bold' : 'normal',
                        }}
                        >
                          {hasAttachment && (
                            <div className="mb-2">
                              {msg.attachments?.map((attachment, attIdx) => (
                                <div key={attIdx} className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                                  {attachment.type === 'image' ? (
                                    <img 
                                      src={attachment.url} 
                                      alt={attachment.name}
                                      className="max-w-full rounded-lg"
                                    />
                                  ) : (
                                    <>
                                      <FileText className="w-5 h-5" />
                                      <span className="text-sm flex-1">{attachment.name}</span>
                                      <a 
                                        href={attachment.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1 hover:bg-white/20 rounded"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{msg.content}</p>
                          <span className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'justify-end text-emerald-100' : 'text-gray-400'}`}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            {isMe && (
                              <CheckCheck className={`w-3.5 h-3.5 ${
                                selectedChat.participants.some(p => p !== currentUser?.uid && (msg.readBy || []).includes(p))
                                  ? 'text-emerald-300'
                                  : 'text-emerald-200/60'
                              }`} />
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload Progress */}
            {uploadingFile && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 border-t border-emerald-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm text-emerald-900 dark:text-emerald-200">Uploading file...</p>
                    <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-emerald-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-emerald-600">{Math.round(uploadProgress)}%</span>
                </div>
              </div>
            )}

            {/* Elegant Premium Message Input Composer Unified with Hanna AI */}
            <footer className="p-4 bg-white dark:bg-[#07070a] border-t border-gray-200 dark:border-white/5">
              <form 
                onSubmit={handleSendMessage}
                className="flex items-end gap-2.5 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/95 shadow-xl p-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all duration-200 max-w-5xl mx-auto"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                {/* File Attachment Button */}
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full w-10 h-10 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                {/* Text Input area */}
                <div className="flex-1 relative">
                  <Input 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..." 
                    className="w-full bg-transparent border-none py-2 px-1 focus-visible:ring-0 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
                    disabled={uploadingFile}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5"
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                    {isEmojiPickerOpen && (
                      <EmojiPicker 
                        onEmojiSelect={handleEmojiSelect}
                        onClose={() => setIsEmojiPickerOpen(false)}
                      />
                    )}
                  </div>
                </div>

                {/* Voice Input Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleVoiceInput}
                  disabled={uploadingFile}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isRecording ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  title="Voice Input"
                >
                  <Mic className="w-5 h-5" />
                </Button>

                {/* Submit button */}
                <Button 
                  type="submit" 
                  disabled={!messageInput.trim() || uploadingFile}
                  className="rounded-full w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-black">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
            <p className="text-gray-500 max-w-xs mb-8">
              Select a conversation from the sidebar or start a new one to begin chatting.
            </p>
            <Button 
              onClick={() => setIsSearchOpen(true)}
              className="rounded-full px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>
            <Button 
              variant="ghost" 
              className="lg:hidden mt-4"
              onClick={() => setIsSidebarOpen(true)}
            >
              Show Conversations
            </Button>
          </div>
        )}
      </main>

      {/* New Chat Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold">New Message</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  autoFocus
                  placeholder="Search by name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-100 dark:bg-gray-800 border-none rounded-xl"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleStartChat(user)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.fullName}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')} • {user.email}</p>
                    </div>
                  </button>
                ))
              ) : searchTerm.length >= 2 ? (
                <p className="text-center py-8 text-gray-500">No users found</p>
              ) : (
                <p className="text-center py-8 text-gray-500 text-sm">Type at least 2 characters to search</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewProfileUserId && (
        <ViewUserProfile
          userId={viewProfileUserId}
          onClose={() => setViewProfileUserId(null)}
        />
      )}

      {/* Chat Settings Modal */}
      {isSettingsOpen && (
        <ChatSettingsEnhanced
          currentSettings={chatSettings}
          onSettingsChange={setChatSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Delete Chat Confirmation Dialog */}
      <DeleteChatConfirmation
        isOpen={deleteConfirmation.isOpen}
        chatTitle={deleteConfirmation.chatTitle || ''}
        onConfirm={handleDeleteChat}
        onCancel={() => setDeleteConfirmation({ isOpen: false })}
      />
    </div>
    </>
  );
}
