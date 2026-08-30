import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Pin,
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
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { SEO } from '@/components/SEO';
import UnifiedMediaViewer, { type UnifiedMediaItem } from '@/components/UnifiedMediaViewer';
import type { SharedContent } from '@/types';
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

export default function Chat() {
  const { currentUser, userData } = useAuth();
  const { chatId: chatIdParam } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sharedMessage = searchParams.get('share');
  const sharedMetadataParam = searchParams.get('shareMeta');
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<UnifiedMediaItem | null>(null);
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatFilter, setChatFilter] = useState('');
  const [searchResults, setSearchResults] = useState<ChatContact[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchRetry, setSearchRetry] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  
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
  const [isRecording] = useState(false);
  
  // Profile pictures cache
  const [profilePictures, setProfilePictures] = useState<Record<string, string>>({});

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
      setChatError(null);
      setLoading(false);

      if (chatIdParam) {
        const target = updatedChats.find(c => c.id === chatIdParam);
        if (target && selectedChat?.id !== target.id) {
          setSelectedChat(target);
        }
      }
    }, (error) => {
      console.error('Unable to load chats:', error);
      setChatError('Chats are temporarily unavailable. Refresh after the latest access rules finish deploying.');
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, chatIdParam]);

  // Fetch profile pictures for chat participants
  useEffect(() => {
    if (!currentUser || chats.length === 0) return;
    let cancelled = false;
    const fetchProfiles = async () => {
      const { getDoc, doc: docFn } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      if (cancelled) return;
      const uniqueIds = new Set<string>();
      chats.forEach(chat => {
        chat.participants.forEach(id => {
          if (id !== currentUser.uid) uniqueIds.add(id);
        });
      });
      const newPictures: Record<string, string> = {};
      for (const uid of uniqueIds) {
        if (profilePictures[uid]) continue;
        try {
          const snap = await getDoc(docFn(db, 'users', uid));
          if (snap.exists()) {
            const data = snap.data();
            const pic = data.profilePicture || data.profileImageUrl || '';
            if (pic) newPictures[uid] = pic;
          }
        } catch {
          // silently skip
        }
      }
      if (!cancelled && Object.keys(newPictures).length > 0) {
        setProfilePictures(prev => ({ ...prev, ...newPictures }));
      }
    };
    fetchProfiles();
    return () => { cancelled = true; };
  }, [currentUser, chats, profilePictures]);

  // Selecting a conversation updates the URL (shareable deep link) and marks it read
  const openChat = (chat: ChatType) => {
    setSelectedChat(chat);
    navigate(`/chat/${chat.id}`, { replace: true });
    if (currentUser) {
      markChatAsRead(chat.id, currentUser.uid);
    }
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // Product shares arrive through an exact chat deep link and are placed in the composer.
  useEffect(() => {
    if (selectedChat && sharedMessage) setMessageInput(sharedMessage);
    if (!sharedMetadataParam) { setSharedContent(null); return; }
    try {
      const parsed = JSON.parse(sharedMetadataParam) as SharedContent;
      if (parsed?.id && parsed?.title && parsed?.type) setSharedContent(parsed);
    } catch { setSharedContent(null); }
  }, [selectedChat?.id, sharedMessage, sharedMetadataParam]);

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
      const normalizedTerm = searchTerm.trim();
      if (normalizedTerm.length >= 2 && currentUser) {
        setIsSearching(true);
        setSearchError(null);
        setSearchResults([]);
        try {
          const results = await searchUsers(normalizedTerm, currentUser.uid);
          setSearchResults(results);
        } catch (error) {
          console.error('Failed to search users:', error);
          setSearchResults([]);
          const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
          setSearchError(
            code === 'permission-denied'
              ? 'Your account cannot access the user directory. Please sign in again.'
              : code === 'unavailable'
                ? 'The user directory could not be reached. Check your connection and try again.'
                : code === 'failed-precondition'
                  ? 'The user directory needs a Firestore index update. Please try again after deployment.'
                  : 'The real user directory could not be loaded. Try again in a moment.',
          );
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setSearchError(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser, searchRetry]);

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
        content,
        false,
        sharedContent || undefined,
      );
      setSharedContent(null);
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
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
        toast.success('Starting new chat...');
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
    } catch (error) {
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

  // Filter and sort chats (pinned chats first)
  const sortedChats = chats
    .filter(chat => {
      if (!chatFilter) return true;
      const otherName = getOtherParticipantName(chat).toLowerCase();
      const lastMsg = (chat.lastMessage?.content || '').toLowerCase();
      return otherName.includes(chatFilter.toLowerCase()) || lastMsg.includes(chatFilter.toLowerCase());
    })
    .sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(currentUser?.uid || '') ? 1 : 0;
      const bPinned = b.pinnedBy?.includes(currentUser?.uid || '') ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  const getUnreadCount = (chat: ChatType): number => {
    if (!currentUser) return 0;
    return chat.unreadCounts?.[currentUser.uid] || 0;
  };

  const handleTogglePin = async (chat: ChatType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    const isPinned = chat.pinnedBy?.includes(currentUser.uid);
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        pinnedBy: isPinned ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
      toast.success(isPinned ? 'Chat unpinned' : 'Chat pinned');
    } catch (err) {
      console.error('Error toggling pin:', err);
      toast.error('Failed to update pin state');
    }
  };

  const handleVoiceInput = () => {
    toast.info('Voice input is not supported in this browser environment.');
  };

  // Group messages by date
  const messageGroups = groupMessagesByDate(messages);

  return (
    <>
      <SEO title="Chats" description="Chat with teachers, students and school teams on Liverton Learning." noIndex />
    <div className="liv-chat-page flex h-full bg-white dark:bg-[#07070a] overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 dark:bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Sidebar - Chat List */}
      <aside 
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          liv-chat-sidebar fixed inset-y-0 left-0 z-30 w-80 lg:relative lg:translate-x-0
          bg-white/95 dark:bg-[#0d0d12]/95 border-r border-gray-200 dark:border-white/5 backdrop-blur-md
          transition-all duration-300 ease-in-out flex flex-col z-20
        `}
      >
        {/* Sidebar Header */}
        <div className="liv-chat-sidebar-header p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <h1 className="text-xl font-bold">Chat</h1>
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

        {chatError && <div className="mx-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">{chatError}</div>}

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
          ) : sortedChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              <p>No chats match "{chatFilter}"</p>
            </div>
          ) : (
            sortedChats.map((chat) => {
              const unread = getUnreadCount(chat);
              const isPinned = chat.pinnedBy?.includes(currentUser?.uid || '');
              return (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className={`
                    w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative group
                    ${selectedChat?.id === chat.id ? 'bg-emerald-500/10 border-r-2 border-emerald-500' : ''}
                  `}
                >
                  <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-800">
                    {(() => {
                      const otherId = chat.participants.find(id => id !== currentUser?.uid);
                      const pic = otherId ? profilePictures[otherId] : '';
                      return pic ? <AvatarImage src={pic} alt={getOtherParticipantName(chat)} className="object-cover" /> : null;
                    })()}
                    <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold">
                      {getInitials(getOtherParticipantName(chat))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold truncate pr-6">{getOtherParticipantName(chat)}</h3>
                      <span className={`text-xs ${unread > 0 ? 'text-emerald-500 font-bold' : 'text-gray-500'}`}>
                        {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unread > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
                        {chat.lastMessage?.content || 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isPinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-500 fill-current" />
                        )}
                        {unread > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Absolute pin action button visible on hover/focus */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleTogglePin(chat, e)}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"
                    title={isPinned ? "Unpin conversation" : "Pin conversation"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-500 fill-current' : 'text-slate-400'}`} />
                  </Button>
                </button>
              );
            })
          )}
        </div>

        {/* Elegant Bottom Actions within Chat Sidebar */}
        <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col gap-1 text-xs">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full text-left px-3 py-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Settings className="w-4 h-4 text-emerald-500" />
            Chat Settings
          </button>
          {selectedChat && (
            <button
              onClick={() => setDeleteConfirmation({
                isOpen: true,
                chatId: selectedChat.id,
                chatTitle: getOtherParticipantName(selectedChat)
              })}
              className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-500 rounded-xl flex items-center gap-2 font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Conversation
            </button>
          )}
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-15 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <header className="liv-chat-header p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-[#07070a]/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-600 dark:text-slate-300"
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  {(() => {
                    const otherId = selectedChat.participants.find(id => id !== currentUser?.uid);
                    const pic = otherId ? profilePictures[otherId] : '';
                    return pic ? <AvatarImage src={pic} alt={getOtherParticipantName(selectedChat)} className="object-cover" /> : null;
                  })()}
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
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="gap-2" onClick={handleViewProfile}>
                      <Info className="w-4 h-4" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => setIsSettingsOpen(true)}>
                      <Settings className="w-4 h-4" /> Chat Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-red-600"
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
                            ? `bg-blue-600 text-white rounded-tr-none`
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-700'}
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
                          <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <UnifiedMediaViewer item={selectedMedia} open={Boolean(selectedMedia)} onOpenChange={open => { if (!open) setSelectedMedia(null); }} />

            {/* Upload Progress */}
            {uploadingFile && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 dark:text-blue-200">Uploading file...</p>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-blue-600">{Math.round(uploadProgress)}%</span>
                </div>
              </div>
            )}

            {/* Message Input */}
            <footer className="sticky bottom-0 z-20 shrink-0 p-3 sm:p-4 bg-white/95 dark:bg-[#080a0f]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10">
              <form 
                onSubmit={handleSendMessage}
                className="liv-chat-composer-form relative flex flex-col gap-2 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.05] p-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all max-w-4xl mx-auto w-full"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                <div className="w-full">
                  <textarea 
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      const target = e.target;
                      target.style.height = "auto";
                      target.style.height = `${Math.min(target.scrollHeight, 112)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    rows={1}
                    placeholder="Type a message..." 
                    className="w-full min-h-[38px] max-h-[112px] bg-transparent resize-none border-none outline-none px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      title="Attach file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>

                    <div className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10"
                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        title="Add emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                      {isEmojiPickerOpen && (
                        <div className="absolute bottom-10 left-0 z-50">
                          <EmojiPicker
                            onEmojiSelect={handleEmojiSelect}
                            onClose={() => setIsEmojiPickerOpen(false)}
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleVoiceInput}
                      disabled={uploadingFile}
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isRecording ? "text-red-500 animate-pulse bg-red-500/10" : "text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/10"}`}
                      title="Voice Input"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={!messageInput.trim() || uploadingFile}
                    className="h-8 w-8 rounded-full p-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-md shadow-emerald-600/20 transition-transform active:scale-95 flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </footer>
          </>
        ) : (
          <div className="liv-chat-empty flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-black">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Chat</h2>
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
              <h3 className="text-lg font-bold">New Chat</h3>
              <Button variant="ghost" size="icon" onClick={() => { setIsSearchOpen(false); setSearchTerm(''); setSearchResults([]); setSearchError(null); }} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  autoFocus
                  placeholder="Search by name, username, or email..."
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
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{user.fullName}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">{user.username ? `@${user.username}` : 'Username not set'}</p>
                      <p className="text-xs text-gray-500 capitalize truncate">{user.role.replace('_', ' ')} • {user.email || 'No email on file'}</p>
                    </div>
                  </button>
                ))
              ) : searchError ? (
                <div className="text-center py-8 px-5 text-gray-500">
                  <p>{searchError}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchRetry(prev => prev + 1)}>Try again</Button>
                </div>
              ) : searchTerm.trim().length >= 2 ? (
                <p className="text-center py-8 text-gray-500">No real users found for “{searchTerm.trim()}”. Try the full name, username, or email.</p>
              ) : (
                <p className="text-center py-8 text-gray-500 text-sm">Type at least 2 characters of a name, username, or email to search</p>
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

      {/* Delete Chat Confirmation */}
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
