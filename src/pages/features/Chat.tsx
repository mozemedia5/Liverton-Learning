import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  Send, 
  MoreVertical,
  Phone,
  Video,
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
  Download
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

export default function Chat() {
  const { currentUser, userData } = useAuth();
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Listen to user's chats
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = listenToUserChats(currentUser.uid, (updatedChats) => {
      setChats(updatedChats);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Listen to messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    
    const unsubscribe = listenToMessages(selectedChat.id, (updatedMessages) => {
      setMessages(updatedMessages);
    });
    
    return () => unsubscribe();
  }, [selectedChat]);

  // Handle user search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2 && currentUser) {
        setIsSearching(true);
        try {
          const results = await searchUsers(searchTerm, currentUser.uid);
          setSearchResults(results);
        } catch (error) {
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
    } catch (error) {
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
        setSelectedChat(chat);
      } else {
        toast.success('Starting new chat...');
      }
      
      setIsSearchOpen(false);
      setSearchTerm('');
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (error) {
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

  // Group messages by date
  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden">
      {/* Sidebar - Chat List */}
      <aside 
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-30 w-full sm:w-80 lg:relative lg:translate-x-0
          bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800
          transition-transform duration-300 ease-in-out flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSearchOpen(true)}
              className="rounded-full"
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
              className="pl-10 bg-gray-100 dark:bg-gray-900 border-none rounded-full"
            />
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
                className="mt-2"
              >
                Start a new chat
              </Button>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setSelectedChat(chat);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`
                  w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors
                  ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600' : ''}
                `}
              >
                <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-800">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {getInitials(getOtherParticipantName(chat))}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold truncate">{getOtherParticipantName(chat)}</h3>
                    <span className="text-xs text-gray-500">
                      {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getInitials(getOtherParticipantName(selectedChat))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-bold leading-tight">{getOtherParticipantName(selectedChat)}</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs text-gray-500 capitalize">{getOtherParticipantRole(selectedChat).replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex"><Phone className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex"><Video className="w-5 h-5" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-5 h-5" /></Button>
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
            <footer className="p-4 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 max-w-5xl mx-auto"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full text-gray-500"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..." 
                    className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-full py-6 px-6 pr-12 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-gray-500"
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
                <Button 
                  type="submit" 
                  disabled={!messageInput.trim() || uploadingFile}
                  className="rounded-full w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-black">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
            <p className="text-gray-500 max-w-xs mb-8">
              Select a conversation from the sidebar or start a new one to begin chatting.
            </p>
            <Button 
              onClick={() => setIsSearchOpen(true)}
              className="rounded-full px-8 bg-blue-600 hover:bg-blue-700"
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

      {/* Delete Chat Confirmation */}
      <DeleteChatConfirmation
        isOpen={deleteConfirmation.isOpen}
        chatTitle={deleteConfirmation.chatTitle || ''}
        onConfirm={handleDeleteChat}
        onCancel={() => setDeleteConfirmation({ isOpen: false })}
      />
    </div>
  );
}
