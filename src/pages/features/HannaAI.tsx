import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Send, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const AI_RESPONSES = [
  "That's an interesting question! Let me think about that...",
  "I'd be happy to help you with that. Here's what I know...",
  "Great question! This is something many people wonder about...",
  "Let me provide you with some insights on this topic...",
  "That's a thoughtful inquiry. Consider this perspective...",
  "Absolutely! This is an important concept to understand...",
  "I appreciate your curiosity. Here's my analysis...",
  "That's a complex topic, but I can break it down for you...",
];

export default function HannaAI() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      loadSessions();
      startNewSession();
    }
  }, [currentUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadSessions = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'chatSessions'),
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const sess = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatSession[];
      setSessions(sess);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const startNewSession = async () => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'chatSessions'), {
        userId: currentUser.uid,
        title: 'New Chat',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setCurrentSessionId(docRef.id);
      setMessages([]);
      loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create chat session');
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const q = query(
        collection(db, 'chatMessages'),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat history');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentUser || !currentSessionId) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Save user message
      const userMsgRef = await addDoc(collection(db, 'chatMessages'), {
        sessionId: currentSessionId,
        userId: currentUser.uid,
        role: 'user',
        content: userMessage,
        timestamp: Timestamp.now(),
      });

      setMessages(prev => [...prev, {
        id: userMsgRef.id,
        userId: currentUser.uid,
        role: 'user',
        content: userMessage,
        timestamp: Timestamp.now(),
      }]);

      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate AI response
      const aiResponse = generateAIResponse(userMessage);

      const aiMsgRef = await addDoc(collection(db, 'chatMessages'), {
        sessionId: currentSessionId,
        userId: currentUser.uid,
        role: 'assistant',
        content: aiResponse,
        timestamp: Timestamp.now(),
      });

      setMessages(prev => [...prev, {
        id: aiMsgRef.id,
        userId: currentUser.uid,
        role: 'assistant',
        content: aiResponse,
        timestamp: Timestamp.now(),
      }]);

      // Update session title if it's the first message
      if (messages.length === 0) {
        const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
        await updateDoc(doc(db, 'chatSessions', currentSessionId), {
          title,
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const randomResponse = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
    
    // Simple keyword-based responses
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      return "Hello! I'm Hanna, your AI assistant. How can I help you today?";
    }
    
    if (userMessage.toLowerCase().includes('help')) {
      return "I'm here to help! You can ask me questions about learning, productivity, or anything else. What would you like to know?";
    }

    if (userMessage.toLowerCase().includes('how are you')) {
      return "I'm doing great, thank you for asking! I'm here and ready to assist you with whatever you need.";
    }

    if (userMessage.toLowerCase().includes('what can you do')) {
      return "I can help you with:\n• Answering questions\n• Providing explanations\n• Offering suggestions\n• Having conversations\n• And much more!\n\nFeel free to ask me anything!";
    }

    return randomResponse + " " + generateContextualResponse(userMessage);
  };

  const generateContextualResponse = (userMessage: string): string => {
    const words = userMessage.toLowerCase().split(' ');
    
    if (words.some(w => ['learn', 'study', 'education'].includes(w))) {
      return "Learning is a continuous journey. I'm here to support your educational goals!";
    }
    
    if (words.some(w => ['code', 'programming', 'develop'].includes(w))) {
      return "Programming is a valuable skill. Keep practicing and building projects!";
    }
    
    if (words.some(w => ['time', 'schedule', 'plan'].includes(w))) {
      return "Time management is key to success. Would you like help organizing your tasks?";
    }

    return "Feel free to ask me more questions or let me know how I can assist you further!";
  };

  const handleClearChat = async () => {
    if (confirm('Are you sure you want to clear this chat?')) {
      setMessages([]);
      await startNewSession();
      toast.success('Chat cleared');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Chat History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={startNewSession}
                className="w-full gap-2"
              >
                <Zap className="w-4 h-4" />
                New Chat
              </Button>

              <div className="space-y-2 mt-4">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSessionMessages(session.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.updatedAt.toMillis()).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    Hanna AI Assistant
                  </CardTitle>
                  <CardDescription>Your intelligent learning companion</CardDescription>
                </div>
                <Button
                  onClick={handleClearChat}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 mb-4 pr-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Zap className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Hanna AI</h3>
                        <p className="text-gray-600">Start a conversation by typing a message below</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-gray-200 text-gray-900 rounded-bl-none'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.timestamp.toMillis()).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
