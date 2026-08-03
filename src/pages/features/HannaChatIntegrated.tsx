import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Send, Loader2, MessageCircle, Plus, Trash2, MessageSquare, Menu, X,
  Paperclip, StopCircle, Copy, Check, FileText, GraduationCap,
  BookOpen, Lightbulb, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { AskHannaIcon } from '@/components/AskHannaIcon';
import { HannaMarkdown } from '@/components/HannaMarkdown';
import { db } from '@/lib/firebase';
import { SEO } from '@/components/SEO';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import { streamHannaReply, deriveChatTitle, isGeminiConfigured, type HannaAttachment } from '@/lib/hannaGemini';
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
  increment,
} from 'firebase/firestore';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'hanna';
  content: string;
  attachments?: { url: string; name: string; mimeType: string }[];
  createdAt: TimestampLike;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  messageCount: number;
}

interface PendingAttachment extends HannaAttachment {
  progress?: number;
}


type TimestampLike = { toMillis?: () => number; toDate?: () => Date } | Date | null | undefined;

function tsToMillis(ts: TimestampLike): number {
  if (!ts) return 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

const SUGGESTED_PROMPTS = [
  { icon: GraduationCap, title: 'Explain a topic', prompt: 'Explain photosynthesis in simple terms with an example.' },
  { icon: BookOpen, title: 'Make a revision plan', prompt: 'Create a 2-week revision plan for my biology exam.' },
  { icon: ClipboardList, title: 'Practice questions', prompt: 'Give me 5 practice questions on quadratic equations with answers.' },
  { icon: Lightbulb, title: 'Project ideas', prompt: 'Suggest 3 science fair project ideas I can build with local materials.' },
];

export default function HannaChatIntegrated() {
  const { userData, currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const geminiReady = isGeminiConfigured();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [inputValue]);

  /* ------------------------------ Sessions ------------------------------ */

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'hanna_chats'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ChatSession[];
      const sorted = sessions.sort((a, b) => tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt));
      setChatSessions(sorted);
      if (sessionParam) {
        setCurrentChatId(sessionParam);
      } else if (sorted.length > 0 && !currentChatId) {
        setCurrentChatId(sorted[0].id);
      }
    }, (error) => console.error('Error loading Hanna chats:', error));
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (!currentChatId) return;
    const q = query(collection(db, 'hanna_messages'), where('chatId', '==', currentChatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Message[];
      const sorted = msgs.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt));
      setMessages(sorted);
    }, (error) => console.error('Error loading messages:', error));
    return () => unsubscribe();
  }, [currentChatId]);

  /* ------------------------------ Actions ------------------------------ */

  const handleNewChat = async () => {
    if (!currentUser) return;
    try {
      const chatRef = await addDoc(collection(db, 'hanna_chats'), {
        userId: currentUser.uid,
        title: 'New conversation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
      });
      setCurrentChatId(chatRef.id);
      setMessages([]);
      setInputValue('');
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await deleteDoc(doc(db, 'hanna_chats', chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0 || !currentUser) return;

    setUploadingFiles(true);
    for (const file of files) {
      try {
        const url = await uploadToCloudinary(file, mapFileToCloudinaryType(file, file.name), { showErrorToast: false });
        setAttachments(prev => [...prev, { url, name: file.name, mimeType: file.type || 'application/octet-stream' }]);
      } catch (error) {
        console.error('Attachment upload failed:', error);
        toast.error(`Could not attach ${file.name}`);
      }
    }
    setUploadingFiles(false);
  };

  const removeAttachment = (url: string) => {
    setAttachments(prev => prev.filter(a => a.url !== url));
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if ((!text && attachments.length === 0) || !currentChatId || !currentUser || isGenerating) return;

    if (!geminiReady) {
      toast.error('Hanna is not configured yet. The Gemini API key is missing from the environment.');
      return;
    }

    const currentAttachments = attachments;
    setInputValue('');
    setAttachments([]);
    setIsGenerating(true);
    setStreamingText('');

    const isFirstExchange = messages.length === 0;

    try {
      // 1. Persist the user message
      await addDoc(collection(db, 'hanna_messages'), {
        chatId: currentChatId,
        senderId: currentUser.uid,
        senderName: userData?.fullName || 'You',
        senderRole: 'user',
        content: text || '(shared files)',
        attachments: currentAttachments.map(a => ({ url: a.url, name: a.name, mimeType: a.mimeType })),
        createdAt: serverTimestamp(),
      });

      // 2. Update session metadata (+ auto-title from the first message)
      const sessionUpdates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
        messageCount: increment(1),
      };
      if (isFirstExchange) {
        sessionUpdates.title = deriveChatTitle(text || currentAttachments[0]?.name || 'Chat with Hanna');
      }
      await updateDoc(doc(db, 'hanna_chats', currentChatId), sessionUpdates);

      // 3. Stream Hanna's reply from Gemini
      const history = messages.slice(-12).map(m => ({
        role: (m.senderRole === 'user' ? 'user' : 'hanna') as 'user' | 'hanna',
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      const reply = await streamHannaReply(
        history,
        text || 'Please describe the attached file(s).',
        currentAttachments,
        (partial) => setStreamingText(partial),
        controller.signal
      );

      // 4. Persist the reply
      const finalText = reply.trim() || 'I was interrupted — please ask me again.';
      await addDoc(collection(db, 'hanna_messages'), {
        chatId: currentChatId,
        senderId: 'hanna-ai',
        senderName: 'Hanna',
        senderRole: 'hanna',
        content: finalText,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'hanna_chats', currentChatId), {
        updatedAt: serverTimestamp(),
        messageCount: increment(1),
      });
    } catch (error) {
      console.error('Hanna reply failed:', error);
      const errName = error instanceof Error ? error.name : '';
      if (errName !== 'AbortError') {
        const friendly = String(error instanceof Error ? error.message : '').includes('API key')
          ? 'The Gemini API key looks invalid. Please check the environment configuration.'
          : 'Hanna could not respond right now. Please try again.';
        toast.error(friendly);
      }
    } finally {
      setIsGenerating(false);
      setStreamingText('');
      abortRef.current = null;
    }
  };

  const handleCopyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const formatTime = (timestamp: TimestampLike) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date
      ? timestamp
      : typeof timestamp.toDate === 'function'
        ? timestamp.toDate()
        : new Date(tsToMillis(timestamp));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeSession = chatSessions.find(s => s.id === currentChatId);

  /* ------------------------------ Render ------------------------------ */

  return (
    <>
      <SEO title="Hanna AI" description="Your AI study assistant on Liverton Learning. Ask questions, revise topics and get instant help." noIndex />
      <div className="flex h-screen bg-white dark:bg-[#0d0d0f] overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            fixed inset-y-0 left-0 z-30 w-full sm:w-80 lg:relative lg:translate-x-0
            bg-slate-50 dark:bg-[#141416] border-r border-gray-200 dark:border-white/5
            transition-transform duration-300 ease-in-out flex flex-col
          `}
        >
          <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <span className="w-7 h-7 flex items-center justify-center overflow-hidden rounded-lg bg-black">
                <span className="scale-[1.6] flex items-center justify-center">
                  <AskHannaIcon size={24} showText={false} />
                </span>
              </span>
              Hanna AI
            </h1>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="icon" onClick={handleNewChat} className="rounded-full" aria-label="New chat">
                <Plus className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {chatSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No conversations yet</p>
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
                    w-full p-2.5 flex items-center gap-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group
                    ${currentChatId === session.id ? 'bg-emerald-500/10 dark:bg-emerald-500/15' : ''}
                  `}
                >
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentChatId === session.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <span className="flex-1 text-left text-sm font-medium truncate">{session.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(session.id);
                    }}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <header className="px-4 py-3 border-b border-gray-200 dark:border-white/5 flex items-center gap-3 bg-white/80 dark:bg-[#0d0d0f]/80 backdrop-blur-md sticky top-0 z-20">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <AskHannaIcon size={32} showText={false} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm truncate">{activeSession?.title || 'Hanna AI'}</h2>
              <p className="text-[11px] text-gray-400">
                {geminiReady ? 'Powered by Gemini' : 'Configuration needed'}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={handleNewChat} aria-label="New chat">
              <Plus className="w-5 h-5" />
            </Button>
          </header>

          {currentChatId ? (
            <>
              {/* Conversation */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                  {messages.length === 0 && !streamingText && (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                      <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-xl">
                        <AskHannaIcon size={64} showText={false} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">How can I help you today?</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Ask about any subject, share notes, or plan your revision.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                        {SUGGESTED_PROMPTS.map((s) => (
                          <button
                            key={s.title}
                            onClick={() => { setInputValue(s.prompt); textareaRef.current?.focus(); }}
                            className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors text-left"
                          >
                            <s.icon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold">{s.title}</p>
                              <p className="text-xs text-gray-400 line-clamp-2">{s.prompt}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.senderRole === 'user' ? (
                        <div className="max-w-[85%] space-y-1.5">
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-end">
                              {message.attachments.map((att, i) => (
                                att.mimeType.startsWith('image/') ? (
                                  <img key={i} src={att.url} alt={att.name} className="max-w-[220px] max-h-40 rounded-xl object-cover border border-white/10" />
                                ) : (
                                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-xs">
                                    <FileText className="w-3.5 h-3.5 text-emerald-500" /> {att.name}
                                  </span>
                                )
                              ))}
                            </div>
                          )}
                          <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-[15px] whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <p className="text-[10px] text-gray-400 text-right">{formatTime(message.createdAt)}</p>
                        </div>
                      ) : (
                        <div className="flex gap-3 max-w-[92%] group">
                          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center flex-shrink-0 mt-1">
                            <AskHannaIcon size={28} showText={false} />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <HannaMarkdown text={message.content} />
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyMessage(message)}
                                className="text-[11px] text-gray-400 hover:text-emerald-500 flex items-center gap-1 transition-colors"
                              >
                                {copiedId === message.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                {copiedId === message.id ? 'Copied' : 'Copy'}
                              </button>
                              <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Live streaming reply */}
                  {isGenerating && (
                    <div className="flex gap-3 max-w-[92%]">
                      <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center flex-shrink-0 mt-1">
                        <AskHannaIcon size={28} showText={false} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {streamingText ? (
                          <div>
                            <HannaMarkdown text={streamingText} />
                            <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse rounded-sm ml-0.5 align-text-bottom" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 py-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="text-xs text-gray-400 ml-1">Hanna is thinking...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Composer */}
              <footer className="p-3 sm:p-4 bg-white dark:bg-[#0d0d0f]">
                <div className="max-w-3xl mx-auto space-y-2">
                  {(attachments.length > 0 || uploadingFiles) && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map(att => (
                        <span key={att.url} className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs">
                          {att.mimeType.startsWith('image/') ? (
                            <img src={att.url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className="max-w-[140px] truncate">{att.name}</span>
                          <button onClick={() => removeAttachment(att.url)} className="text-gray-400 hover:text-red-500" aria-label={`Remove ${att.name}`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {uploadingFiles && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                        </span>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex items-end gap-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 focus-within:border-emerald-500/60 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.csv,.doc,.docx"
                      className="hidden"
                      onChange={handleFilePick}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-xl flex-shrink-0 text-gray-400 hover:text-emerald-500"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles || isGenerating}
                      aria-label="Attach files"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Message Hanna..."
                      rows={1}
                      className="flex-1 bg-transparent border-0 outline-none resize-none text-[15px] py-2 px-1 max-h-40 placeholder:text-gray-400"
                      disabled={isGenerating}
                    />
                    {isGenerating ? (
                      <Button
                        type="button"
                        size="icon"
                        className="rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex-shrink-0"
                        onClick={handleStop}
                        aria-label="Stop generating"
                      >
                        <StopCircle className="w-5 h-5" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
                        disabled={(!inputValue.trim() && attachments.length === 0) || uploadingFiles}
                        aria-label="Send message"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    )}
                  </form>
                  <p className="text-[10px] text-center text-gray-400">Hanna can make mistakes. Verify important information.</p>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <AskHannaIcon size={80} showText={false} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Hanna AI</h2>
              <p className="text-gray-500 max-w-md mb-8">
                Your intelligent study assistant — ask questions, share your notes, and learn faster.
              </p>
              <Button onClick={handleNewChat} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Start a New Conversation
              </Button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
