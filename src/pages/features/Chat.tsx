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
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  listenToUserChats, 
  listenToMessages, 
  sendMessage, 
  searchUsers, 
  getOrCreateChat,
  type ChatContact 
} from '@/services/chatService';
import type { Chat as ChatType, Message } from '@/types';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChatSettings } from '@/components/ChatSettings';
import { ViewUserProfile } from '@/components/ViewUserProfile';
import { DeleteChatConfirmation } from '@/components/DeleteChatConfirmation';
import { ChatMessage } from '@/components/ChatMessage';
import { groupMessagesByDate } from '@/lib/messageUtils';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { deleteChat, uploadFile } from '@/services/chatService';
import type { ChatSettings as ChatSettingsType } from '@/types/chat';

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
  
  // New state for enhanced features
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    theme: 'light',
    fontSize: 14,
    fontStyle: 'normal',
    wallpaper: '',
    notificationsEnabled: true,
    muteNotifications: false,
    encryptionEnabled: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSettingsChange = (newSettings: ChatSettingsType) => {
    setChatSettings(newSettings);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput((prev) => prev + emojiData.emoji);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat || !currentUser) return;

    try {
      const path = `chats/${selectedChat.id}/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);

      const type = file.type.startsWith('image/') ? 'image' : 'file';

      await sendMessage(
        selectedChat.id,
        currentUser.uid,
        userData?.fullName || 'Me',
        messageInput.trim(), // Can send text with file
        false,
        url,
        file.name,
        type
      );

      setMessageInput('');
      toast.success('File sent');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload file');
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChat) return;
    try {
      await deleteChat(selectedChat.id);
      setSelectedChat(null);
      setShowDeleteConfirm(false);
      toast.success('Chat deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete chat');
    }
  };

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

  const handleStartChat = async (contact: ChatContact) => {
    if (!currentUser || !userData) return;
    
    try {
      const chatId = await getOrCreateChat(
        currentUser.uid, 
        contact.uid, 
        userData, 
        contact
      );
      
      // Find the chat in our list or wait for it to appear via listener
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setSelectedChat(chat);
      } else {
        // If it's a brand new chat, we might need to wait for the listener
        // For now, let's just close search and wait
        toast.success('Starting new chat...');
      }
      
      setIsSearchOpen(false);
      setSearchTerm('');
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (error) {
      toast.error('Failed to start chat');
    }
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

  const messageGroups = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
                    <DropdownMenuItem className="gap-2" onClick={() => setShowProfile(true)}><Info className="w-4 h-4" /> View Profile</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => setShowSettings(true)}><Settings className="w-4 h-4" /> Chat Settings</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-red-600" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="w-4 h-4" /> Delete Chat</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/40"
              style={{
                backgroundImage: chatSettings.wallpaper ? `url(${chatSettings.wallpaper})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {messageGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  {/* Date Separator */}
                  {group.dateLabel && (
                    <div className="flex justify-center my-4 sticky top-0 z-10">
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm bg-opacity-80">
                        {group.dateLabel}
                      </span>
                    </div>
                  )}

                  {/* Messages */}
                  {group.messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isCurrentUser={msg.senderId === currentUser?.uid}
                      fontSize={chatSettings.fontSize}
                      fontStyle={chatSettings.fontStyle}
                      customColors={chatSettings.colors}
                    />
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <footer className="p-4 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 max-w-5xl mx-auto"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-gray-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..." 
                    className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-full py-6 px-6 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full text-gray-500"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  disabled={!messageInput.trim()}
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

      {/* Settings Modal */}
      {showSettings && (
        <ChatSettings
          currentSettings={chatSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* User Profile Modal */}
      {showProfile && selectedChat && (
        <ViewUserProfile
          profile={{
            id: selectedChat.participants.find(id => id !== currentUser?.uid) || '',
            name: getOtherParticipantName(selectedChat),
            role: getOtherParticipantRole(selectedChat) as any,
            joinedDate: new Date().toISOString(),
          }}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Delete Chat Confirmation */}
      {showDeleteConfirm && (
        <DeleteChatConfirmation
          onConfirm={handleDeleteChat}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

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
    </div>
  );
}


