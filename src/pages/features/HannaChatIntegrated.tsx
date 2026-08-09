import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Send, Loader2, MessageCircle, Plus, Trash2, MessageSquare, Menu, X,
  Paperclip, StopCircle, Copy, Check, FileText, GraduationCap,
  Lightbulb, ClipboardList, Sparkles, Settings, Info, RefreshCw,
  Pin, Search, BookMarked, PenLine, ListChecks
} from 'lucide-react';
import { toast } from 'sonner';
import { AskHannaIcon } from '@/components/AskHannaIcon';
import { HannaMarkdown } from '@/components/HannaMarkdown';
import { db } from '@/lib/firebase';
import { SEO } from '@/components/SEO';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import { streamHannaReply, generateSmartTitle, isGeminiConfigured, type HannaAttachment } from '@/lib/hannaGemini';
import { DeleteChatConfirmation } from '@/components/DeleteChatConfirmation';
import { HannaSettingsDialog } from '@/components/HannaSettingsDialog';
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
  writeBatch,
  getDocs,
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
  pinned?: boolean;
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
  { icon: ClipboardList, title: 'Summarize notes', prompt: 'Summarize the key points of the water cycle for my exam revision.' },
  { icon: ListChecks, title: 'Create a quiz', prompt: 'Create a 5-question quiz on quadratic equations with answers.' },
  { icon: BookMarked, title: 'Help me study', prompt: 'Make a 2-week revision plan for my biology exam.' },
  { icon: Lightbulb, title: 'Generate ideas', prompt: 'Suggest 3 science fair project ideas I can build with local materials.' },
  { icon: PenLine, title: 'Continue a task', prompt: 'Help me write an introduction for my essay on climate change in Africa.' },
];

function SessionRow({
  session,
  isActive,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={`
        w-full px-3 py-2.5 flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group relative border
        ${isActive
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
          : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'}
      `}
      onClick={onSelect}
    >
      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
      <span className="flex-1 text-xs truncate">{session.title}</span>
      {session.pinned && (
        <Pin className="w-3 h-3 text-amber-500 fill-current flex-shrink-0" />
      )}
      {/* Action buttons — appear on hover, stop propagation */}
      <div className="absolute right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-400 hover:text-amber-500 transition-colors"
          title={session.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className={`w-3.5 h-3.5 ${session.pinned ? 'text-amber-500 fill-current' : ''}`} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function HannaChatIntegrated() {
  const navigate = useNavigate();
  const { userData, currentUser, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default on all viewports; opens as overlay drawer
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');

  // Modals / Dialogs state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'about' | 'instructions'>('about');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [targetDeleteChatId, setTargetDeleteChatId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const prevChatIdRef = useRef<string | null>(null);
  const userJustSentRef = useRef<boolean>(false);
  const isNearBottomRef = useRef<boolean>(true);

  const geminiReady = isGeminiConfigured();

  // Scroll the chat container to the bottom — only affects the chat scroll area,
  // never parent/ancestor containers (unlike scrollIntoView which cascades up).
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Track whether the user is near the bottom of the chat (within threshold).
  // When the user scrolls up to read older messages we stop auto-scrolling.
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 120;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Smart scroll: only auto-scroll when the user is near the bottom (follow mode).
  // On chat switch we always jump to bottom instantly. When the user sends a message
  // we force-scroll to bottom once. During streaming we only follow if already near bottom.
  useEffect(() => {
    if (!currentChatId) return;

    if (currentChatId !== prevChatIdRef.current) {
      // Switched chat session: instantly jump to bottom, reset follow state
      isNearBottomRef.current = true;
      // Use requestAnimationFrame so the new messages have rendered
      requestAnimationFrame(() => scrollToBottom('auto'));
      prevChatIdRef.current = currentChatId;
      userJustSentRef.current = false;
      return;
    }

    if (userJustSentRef.current) {
      // User sent a message: scroll to bottom once, then follow naturally
      isNearBottomRef.current = true;
      scrollToBottom('smooth');
      userJustSentRef.current = false;
      return;
    }

    // AI streaming or normal message update: only follow if user is near bottom
    if (isNearBottomRef.current) {
      scrollToBottom('auto');
    }
  }, [messages, streamingText, currentChatId, scrollToBottom]);


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
      setSearchParams({ session: chatRef.id });
      setMessages([]);
      setInputValue('');
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    }
  };

  const triggerDeleteChat = (chatId: string) => {
    setTargetDeleteChatId(chatId);
    setIsDeleteOpen(true);
  };

  const handleDeleteChatConfirm = async () => {
    if (!targetDeleteChatId) return;
    try {
      await deleteDoc(doc(db, 'hanna_chats', targetDeleteChatId));
      if (currentChatId === targetDeleteChatId) {
        setCurrentChatId(null);
        setSearchParams({});
        setMessages([]);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setIsDeleteOpen(false);
      setTargetDeleteChatId(null);
    }
  };

  const handleClearCurrentMessages = async () => {
    if (!currentChatId || !currentUser) return;
    try {
      const q = query(collection(db, 'hanna_messages'), where('chatId', '==', currentChatId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      await updateDoc(doc(db, 'hanna_chats', currentChatId), {
        messageCount: 0,
        updatedAt: serverTimestamp()
      });
      toast.success('Conversation messages cleared');
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast.error('Could not clear messages');
    }
  };

  const handleTogglePin = async (chatId: string) => {
    try {
      const session = chatSessions.find(s => s.id === chatId);
      const newPinned = !session?.pinned;
      await updateDoc(doc(db, 'hanna_chats', chatId), { pinned: newPinned });
      toast.success(newPinned ? 'Conversation pinned' : 'Conversation unpinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Could not update pin status');
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
    userJustSentRef.current = true; // Mark that user just sent a message for smooth scrolling

    const isFirstExchange = messages.length === 0;

    // Load custom instructions from localStorage
    const savedInstructions = localStorage.getItem(`hanna_instructions_${currentUser.uid}`) || '';

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

      // 2. Stream Hanna's reply from Gemini (passing name, role & custom instructions)
      const history = messages.slice(-12).map(m => ({
        role: (m.senderRole === 'user' ? 'user' : 'hanna') as 'user' | 'hanna',
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      const replyPromise = streamHannaReply(
        history,
        text || 'Please describe the attached file(s).',
        currentAttachments,
        (partial) => setStreamingText(partial),
        controller.signal,
        {
          userName: userData?.fullName || 'User',
          userRole: userRole || 'student',
          customInstructions: savedInstructions
        }
      );

      // 3. Smart title generation in background if first message
      let smartTitle = '';
      if (isFirstExchange) {
        smartTitle = await generateSmartTitle(text || currentAttachments[0]?.name || 'Chat with Hanna');
      }

      const reply = await replyPromise;

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

      const sessionUpdates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
        messageCount: increment(2),
      };
      if (isFirstExchange && smartTitle) {
        sessionUpdates.title = smartTitle;
      }
      await updateDoc(doc(db, 'hanna_chats', currentChatId), sessionUpdates);

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

  // Filter and sort chat sessions: pinned first, then by updatedAt.
  // Search matches title (and falls back to message content search when available).
  const filteredSortedSessions = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    const filtered = q
      ? chatSessions.filter(s => (s.title || '').toLowerCase().includes(q))
      : chatSessions;
    return [...filtered].sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt);
    });
  }, [chatSessions, chatSearch]);

  const pinnedSessions = useMemo(() => filteredSortedSessions.filter(s => s.pinned), [filteredSortedSessions]);
  const unpinnedSessions = useMemo(() => filteredSortedSessions.filter(s => !s.pinned), [filteredSortedSessions]);

  const getDashboardRedirect = () => {
    if (!userRole) return '/';
    if (userRole === 'platform_admin') return '/admin/dashboard';
    if (userRole === 'school_admin') return '/school-admin/dashboard';
    if (userRole === 'teacher') return '/teacher/dashboard';
    if (userRole === 'parent') return '/parent/dashboard';
    return '/student/dashboard';
  };

  return (
    <>
      <SEO title="Hanna AI Chat" description="Interactive, lightning-fast chatbot companion on Liverton Learning." noIndex />
      <div className="flex h-full bg-[#fafafc] dark:bg-[#07070a] text-slate-900 dark:text-slate-100 overflow-hidden relative">

        {/* Background Decorative Blobs for high-fidelity glassmorphism depth */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 dark:bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none z-0" />

        {/* Collapsible Side Navigation — overlay drawer on all viewports (ChatGPT-style) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-[280px] sm:w-80 bg-white/95 dark:bg-[#0a0a0f]/95 backdrop-blur-md border-r border-slate-200/50 dark:border-white/5
            transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Sidebar Header — compact, with close button */}
          <div className="p-3 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                <div className="scale-[1.4]">
                  <AskHannaIcon size={20} showText={false} />
                </div>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-white">Hanna</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8 hover:bg-slate-200 dark:hover:bg-white/10"
              onClick={() => setIsSidebarOpen(false)}
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* New Chat button — compact */}
          <div className="p-3">
            <Button
              onClick={() => { handleNewChat(); }}
              className="w-full flex items-center justify-center gap-2 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl py-2.5 font-bold text-xs shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {/* Search field */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={chatSearch}
                onChange={e => setChatSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-emerald-500/40 transition-colors"
              />
              {chatSearch && (
                <button
                  onClick={() => setChatSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sessions List — pinned section + history */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {chatSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-600 text-xs">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No conversations yet</p>
              </div>
            ) : filteredSortedSessions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-600 text-xs">
                <p>No matches for "{chatSearch}"</p>
              </div>
            ) : (
              <>
                {/* Pinned conversations */}
                {pinnedSessions.length > 0 && (
                  <div className="pt-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Pinned
                    </p>
                    {pinnedSessions.map((session) => {
                      const isActive = currentChatId === session.id;
                      return (
                        <SessionRow
                          key={session.id}
                          session={session}
                          isActive={isActive}
                          onSelect={() => {
                            setCurrentChatId(session.id);
                            setSearchParams({ session: session.id });
                            setIsSidebarOpen(false);
                          }}
                          onDelete={() => triggerDeleteChat(session.id)}
                          onTogglePin={() => handleTogglePin(session.id)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* History */}
                {unpinnedSessions.length > 0 && (
                  <div className="pt-2">
                    {pinnedSessions.length > 0 && (
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        History
                      </p>
                    )}
                    {unpinnedSessions.map((session) => {
                      const isActive = currentChatId === session.id;
                      return (
                        <SessionRow
                          key={session.id}
                          session={session}
                          isActive={isActive}
                          onSelect={() => {
                            setCurrentChatId(session.id);
                            setSearchParams({ session: session.id });
                            setIsSidebarOpen(false);
                          }}
                          onDelete={() => triggerDeleteChat(session.id)}
                          onTogglePin={() => handleTogglePin(session.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Action Bar — settings, clear, delete */}
          <div className="p-3 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col gap-0.5 text-xs">
            <button
              onClick={() => { setSettingsTab('instructions'); setIsSettingsOpen(true); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Settings className="w-4 h-4 text-emerald-500" />
              Custom Instructions
            </button>
            <button
              onClick={() => { setSettingsTab('about'); setIsSettingsOpen(true); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Info className="w-4 h-4 text-amber-500" />
              About Hanna AI
            </button>
            {currentChatId && (
              <>
                <button
                  onClick={handleClearCurrentMessages}
                  className="w-full text-left px-3 py-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  Clear Messages
                </button>
                <hr className="my-1 border-slate-200/50 dark:border-white/5" />
                <button
                  onClick={() => triggerDeleteChat(currentChatId)}
                  className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-500 rounded-xl flex items-center gap-2 font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Conversation
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Main Take.app-style Focus Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative z-10">

          {/* Compact ChatGPT-style Header */}
          <header className="px-3 py-2.5 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-white/70 dark:bg-[#07070a]/70 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Sidebar toggle — compact menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className="rounded-full w-9 h-9 hover:bg-slate-100 dark:hover:bg-white/5 flex-shrink-0"
                title="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Hanna brand avatar */}
              <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center overflow-hidden flex-shrink-0">
                <div className="scale-[1.5]">
                  <AskHannaIcon size={22} showText={false} />
                </div>
              </div>

              {/* Chat title */}
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                  {activeSession?.title || 'Hanna AI'}
                </h2>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>{geminiReady ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>

            {/* Compact actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="rounded-full w-9 h-9 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                title="New chat"
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(getDashboardRedirect())}
                className="rounded-full w-9 h-9 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                title="Exit to Dashboard"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </header>


          {currentChatId ? (
            <>
              {/* Conversation Area (Take.app interactively centered max-w-2xl viewport) */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin overscroll-contain"
              >
                <div className="max-w-2xl mx-auto space-y-6">

                  {/* Empty state: Suggested prompts for streamlined user guidance */}
                  {messages.length === 0 && !streamingText && (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="w-20 h-20 bg-slate-950 dark:bg-black rounded-[28px] flex items-center justify-center shadow-xl border border-white/5 relative">
                        <div className="scale-[2.4]">
                          <AskHannaIcon size={32} showText={false} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-slate-950 p-1.5 rounded-xl shadow-lg border border-white/10">
                          <Sparkles className="w-4 h-4 fill-slate-950" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                          Meet Hanna AI
                        </h2>
                        <p className="text-slate-400 dark:text-slate-500 text-xs max-w-md mx-auto">
                          Ask questions, revise syllabus modules, co-draft summaries, and get helper breakdowns on homework instantly.
                        </p>
                      </div>

                      {/* Suggested prompts — subtle staggered animation, easy to tap on mobile */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full max-w-2xl">
                        {SUGGESTED_PROMPTS.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInputValue(item.prompt);
                              textareaRef.current?.focus();
                            }}
                            className="group flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left animate-in fade-in slide-in-from-bottom-3 duration-400 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                            style={{
                              animationDelay: `${i * 80}ms`,
                              animationFillMode: 'both'
                            }}
                          >
                            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                              <item.icon className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">
                                {item.prompt}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Bubbles - Asymmetric 3D Glassmorphic Experience */}
                  {messages.map((message) => {
                    const isUser = message.senderRole === 'user';
                    return (
                      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                        <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                          {/* Avatar */}
                          <div className="flex-shrink-0 mt-1">
                            {isUser ? (
                              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm">
                                {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-xl bg-slate-950 dark:bg-black flex items-center justify-center overflow-hidden border border-white/5 shadow-md">
                                <div className="scale-[1.6]">
                                  <AskHannaIcon size={24} showText={false} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Content Bubble with Asymmetric take.app corners */}
                          <div className="space-y-1">
                            {message.attachments && message.attachments.length > 0 && (
                              <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                {message.attachments.map((att, i) => (
                                  att.mimeType.startsWith('image/') ? (
                                    <img key={i} src={att.url} alt={att.name} className="max-w-[200px] max-h-32 rounded-2xl object-cover border border-slate-200/50 dark:border-white/10 shadow-sm" />
                                  ) : (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-[11px]">
                                      <FileText className="w-3.5 h-3.5 text-emerald-500" /> {att.name}
                                    </span>
                                  )
                                ))}
                              </div>
                            )}

                            {/* Asymmetric Corners */}
                            <div
                              className={`
                                px-4 py-3 text-sm leading-relaxed shadow-sm
                                ${isUser
                                  ? 'bg-emerald-600 dark:bg-emerald-600 text-white rounded-[24px] rounded-tr-[4px] font-medium'
                                  : 'bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-[24px] rounded-tl-[4px]'}
                              `}
                            >
                              <HannaMarkdown text={message.content} />
                            </div>

                            {/* Actions and Timestamp */}
                            <div className={`flex items-center gap-2.5 text-[10px] text-slate-400 dark:text-slate-500 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                              <span>{formatTime(message.createdAt)}</span>
                              {!isUser && (
                                <button
                                  onClick={() => handleCopyMessage(message)}
                                  className="hover:text-emerald-500 flex items-center gap-0.5 transition-colors"
                                >
                                  {copiedId === message.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span className="text-emerald-500">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Streaming Response Bubble */}
                  {isGenerating && (
                    <div className="flex gap-3 max-w-[85%] justify-start animate-in fade-in duration-150">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-7 h-7 rounded-xl bg-slate-950 dark:bg-black flex items-center justify-center overflow-hidden border border-white/5 shadow-md">
                          <div className="scale-[1.6]">
                            <AskHannaIcon size={24} showText={false} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-[24px] rounded-tl-[4px] px-4 py-3 text-sm leading-relaxed shadow-sm min-w-[100px]">
                          {streamingText ? (
                            <div>
                              <HannaMarkdown text={streamingText} />
                              <span className="inline-block w-2.5 h-4 bg-emerald-500 animate-pulse rounded-sm ml-0.5 align-text-bottom" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 py-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div />
                </div>
              </div>

              {/* Composer — bottom-anchored with safe-area insets, stable during keyboard/viewport changes */}
              <footer
                className="px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-white/80 dark:bg-[#07070a]/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 relative z-20 flex-shrink-0"
              >
                <div className="max-w-2xl mx-auto space-y-3">

                  {/* Attachments preview list */}
                  {(attachments.length > 0 || uploadingFiles) && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {attachments.map(att => (
                        <span key={att.url} className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-2xl bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-xs shadow-sm">
                          {att.mimeType.startsWith('image/') ? (
                            <img src={att.url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className="max-w-[140px] truncate text-slate-700 dark:text-slate-300">{att.name}</span>
                          <button onClick={() => removeAttachment(att.url)} className="text-slate-400 hover:text-red-500 ml-1" aria-label={`Remove ${att.name}`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {uploadingFiles && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-xs text-slate-400 shadow-sm">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Input Form with modern floating focus borders */}
                  <form
                    onSubmit={handleSend}
                    className="flex items-end gap-2.5 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/95 shadow-xl p-2.5 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all duration-200"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.csv,.doc,.docx"
                      className="hidden"
                      onChange={handleFilePick}
                    />

                    {/* Attach Trigger */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full w-10 h-10 flex-shrink-0 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles || isGenerating}
                      title="Attach file"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>

                    {/* Text Composer */}
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
                      className="flex-1 bg-transparent border-0 outline-none resize-none text-[14px] leading-relaxed py-2 px-1 max-h-40 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100"
                      disabled={isGenerating}
                    />

                    {/* Action button */}
                    {isGenerating ? (
                      <Button
                        type="button"
                        size="icon"
                        className="rounded-full w-10 h-10 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 flex-shrink-0 transition-transform"
                        onClick={handleStop}
                        title="Stop generating"
                      >
                        <StopCircle className="w-5 h-5 animate-pulse" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-full w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0 shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
                        disabled={(!inputValue.trim() && attachments.length === 0) || uploadingFiles}
                        title="Send message"
                      >
                        <Send className="w-4.5 h-4.5" />
                      </Button>
                    )}
                  </form>

                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-600 leading-normal">
                    Hanna AI is built on safe learning models. Check key facts before quoting.
                  </p>
                </div>
              </footer>
            </>
          ) : (
            // No selected chat view: welcome dashboard
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-slate-950 dark:bg-black rounded-[36px] flex items-center justify-center mb-8 shadow-2xl relative border border-white/5">
                <div className="scale-[2.6]">
                  <AskHannaIcon size={32} showText={false} />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-yellow-500 to-amber-400 text-slate-950 p-2 rounded-2xl shadow-lg border border-white/10">
                  <Sparkles className="w-4.5 h-4.5 fill-slate-950" />
                </div>
              </div>
              <h2 className="text-3xl font-black mb-2.5 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Hanna AI Companion
              </h2>
              <p className="text-slate-400 dark:text-slate-500 max-w-sm mb-8 text-xs leading-relaxed">
                Unlock rapid concept summaries, practice test builders, notes translation, and study routines personalized for you.
              </p>
              <Button
                onClick={handleNewChat}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 h-12 rounded-3xl shadow-xl shadow-emerald-500/10 hover:scale-105 active:scale-95 transition-all font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start a New Conversation
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteChatConfirmation
        isOpen={isDeleteOpen}
        chatTitle={chatSessions.find(s => s.id === targetDeleteChatId)?.title || ''}
        onConfirm={handleDeleteChatConfirm}
        onCancel={() => {
          setIsDeleteOpen(false);
          setTargetDeleteChatId(null);
        }}
      />

      {/* Hanna Settings & Instructions Dialogue */}
      <HannaSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={currentUser?.uid || ''}
        defaultTab={settingsTab}
      />
    </>
  );
}
