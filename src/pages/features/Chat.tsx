import { useState } from 'react';
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
  Smile
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ChatUser {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
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
  useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');

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
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    selectedChat?.id === chat.id 
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
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedChat.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedChat.name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedChat.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {mockMessages.map((message) => (
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
                ))}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button onClick={handleSendMessage}>
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
                <p className="text-gray-600 dark:text-gray-400">Choose from your existing conversations</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
