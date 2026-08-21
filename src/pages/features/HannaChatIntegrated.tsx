import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Send, Loader2, MessageCircle, Plus, Trash2, MessageSquare, X,
  Paperclip, StopCircle, Copy, Check, FileText, GraduationCap,
  BookOpen, Lightbulb, ClipboardList, ChevronLeft, Sparkles, Settings, Info, RefreshCw, Pin, Search,
  History
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
  arrayUnion,
  arrayRemove,
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
  pinnedBy?: string[];
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

const SUGGESTIONS = [
  { id: 'explain', label: 'Explain Concept', icon: GraduationCap, prompt: 'Explain a difficult concept: ' },
  { id: 'summarize', label: 'Summarize Notes', icon: BookOpen, prompt: 'Summarize this educational text: ' },
  { id: 'quiz', label: 'Build Quiz', icon: ClipboardList, prompt: 'Build a practice quiz on: ' },
  { id: 'study', label: 'Study Plan', icon: RefreshCw, prompt: 'Create a highly effective study routine for: ' },
  { id: 'ideas', label: 'Brainstorm Ideas', icon: Lightbulb, prompt: 'Give me creative ideas for my project: ' },
  { id: 'continue', label: 'Continue Task', icon: Plus, prompt: 'Help me continue with this learning task: ' },
];

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024); // Default true on desktop for premium left sidebar
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Modals / Dialogs state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'about' | 'instructions'>('about');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [targetDeleteChatId, setTargetDeleteChatId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const prevChatIdRef = useRef<string | null>(null);
  const userJustSentRef = useRef<boolean>(false);

  const [typewriterText, setTypewriterText] = useState('');
  const fullStreamedTextRef = useRef('');
  const displayedTextRef = useRef('');
  const isStreamActiveRef = useRef(false);
  const typewriterIntervalRef = useRef<any>(null);
  const onTypewriterCompleteRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, []);

  const startTypewriter = (onComplete: () => void) => {
    setTypewriterText('');
    fullStreamedTextRef.current = '';
    displayedTextRef.current = '';
    isStreamActiveRef.current = true;
    onTypewriterCompleteRef.current = onComplete;

    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
    }

    typewriterIntervalRef.current = setInterval(() => {
      const target = fullStreamedTextRef.current;
      const current = displayedTextRef.current;

      if (current === target && !isStreamActiveRef.current) {
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
          typewriterIntervalRef.current = null;
        }
        if (onTypewriterCompleteRef.current) {
          onTypewriterCompleteRef.current();
          onTypewriterCompleteRef.current = null;
        }
        return;
      }

      // Append next words or catch up
      const targetWords = target.split(' ');
      const currentWords = current ? current.split(' ') : [];

      const lag = targetWords.length - currentWords.length;
      if (lag > 0) {
        let increment = 1;
        if (lag > 12) increment = 4;
        else if (lag > 6) increment = 2;

        const nextWordsCount = Math.min(currentWords.length + increment, targetWords.length);
        const nextText = targetWords.slice(0, nextWordsCount).join(' ');

        displayedTextRef.current = nextText;
        setTypewriterText(nextText);
      } else if (!isStreamActiveRef.current && target.length > current.length) {
        displayedTextRef.current = target;
        setTypewriterText(target);
      }
    }, 45);
  };

  const geminiReady = isGeminiConfigured();

  const handleTogglePinChat = async (chatId: string, isCurrentlyPinned: boolean) => {
    if (!currentUser) return;
    try {
      const chatRef = doc(db, 'hanna_chats', chatId);
      if (isCurrentlyPinned) {
        await updateDoc(chatRef, { pinnedBy: arrayRemove(currentUser.uid) });
        toast.success('Chat unpinned');
      } else {
        await updateDoc(chatRef, { pinnedBy: arrayUnion(currentUser.uid) });
        toast.success('Chat pinned to top');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to pin/unpin chat');
    }
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setIsNearBottom(true);
  }, []);

  const handleMessageScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setIsNearBottom(container.scrollHeight - container.scrollTop - container.clientHeight < 160);
  }, []);

  // Handle scrolling dynamically based on context to ensure zero jitter and no slow glides on switch
  useEffect(() => {
    if (!currentChatId) return;

    const container = scrollContainerRef.current;

    if (currentChatId !== prevChatIdRef.current) {
      // Switched chat session: instantly scroll to bottom so there's no gliding animation
      scrollToBottom('auto');
      prevChatIdRef.current = currentChatId;
      userJustSentRef.current = false;
      return;
    }

    if (userJustSentRef.current) {
      // User sent a message: do a smooth scroll to bottom once
      scrollToBottom('smooth');
      userJustSentRef.current = false; // Reset
      return;
    }

    // AI streaming or normal update: scroll ONLY if user is already near the bottom
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isAtBottom) {
        scrollToBottom('auto');
      }
    } else {
      scrollToBottom('auto');
    }
  }, [messages, typewriterText, currentChatId, scrollToBottom]);


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
      const sorted = sessions.sort((a, b) => {
        const aPinned = a.pinnedBy?.includes(currentUser.uid) ? 1 : 0;
        const bPinned = b.pinnedBy?.includes(currentUser.uid) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt);
      });
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

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0 || !currentUser) return;

    setUploadingFiles(true);
    for (const file of files) {
      try {
        const cType = mapFileToCloudinaryType(file, file.name);
        let purpose = 'hanna_document';
        if (file.type.startsWith('image/')) purpose = 'hanna_image';
        else if (file.type.startsWith('audio/')) purpose = 'hanna_audio';
        else if (file.type.startsWith('video/')) purpose = 'hanna_video';

        const url = await uploadToCloudinary(file, cType, {
          showErrorToast: false,
          userId: currentUser.uid,
          referenceId: currentChatId || 'hanna',
          purpose
        });
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
    isStreamActiveRef.current = false;
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    const finalContent = fullStreamedTextRef.current.trim() || displayedTextRef.current.trim() || 'I was stopped.';
    displayedTextRef.current = finalContent;
    setTypewriterText(finalContent);
    if (onTypewriterCompleteRef.current) {
      onTypewriterCompleteRef.current();
      onTypewriterCompleteRef.current = null;
    }
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
    setTypewriterText('');
    userJustSentRef.current = true; // Mark that user just sent a message for smooth scrolling

    const isFirstExchange = messages.length === 0;

    // Load custom instructions from localStorage
    const savedInstructions = localStorage.getItem(`hanna_instructions_${currentUser.uid}`) || '';

    let smartTitle = '';

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

      // Start the typewriter loop immediately!
      startTypewriter(async () => {
        try {
          const finalText = displayedTextRef.current.trim() || 'I was interrupted — please ask me again.';
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
        } catch (err) {
          console.error('Error saving typewriter text:', err);
        } finally {
          setIsGenerating(false);
          setTypewriterText('');
          abortRef.current = null;
        }
      });

      const replyPromise = streamHannaReply(
        history,
        text || 'Please describe the attached file(s).',
        currentAttachments,
        (partial) => {
          fullStreamedTextRef.current = partial;
        },
        controller.signal,
        {
          userName: userData?.fullName || 'User',
          userRole: userRole || 'student',
          customInstructions: savedInstructions
        },
        currentChatId
      );

      // 3. Smart title generation in background if first message
      if (isFirstExchange) {
        generateSmartTitle(text || currentAttachments[0]?.name || 'Chat with Hanna').then(async (title) => {
          smartTitle = title;
          await updateDoc(doc(db, 'hanna_chats', currentChatId), {
            title: title
          });
          toast.success(`Hanna renamed this chat to: "${title}"`);
        }).catch(err => {
          console.warn('Background smart title failed:', err);
        });
      }

      await replyPromise;
      isStreamActiveRef.current = false;

    } catch (error) {
      console.error('Hanna reply failed:', error);
      isStreamActiveRef.current = false;
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }
      setIsGenerating(false);
      setTypewriterText('');
      abortRef.current = null;

      const errName = error instanceof Error ? error.name : '';
      if (errName !== 'AbortError') {
        const friendly = String(error instanceof Error ? error.message : '').includes('API key')
          ? 'The Gemini API key looks invalid. Please check the environment configuration.'
          : 'Hanna could not respond right now. Please try again.';
        toast.error(friendly);
      }
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

  const filteredSessions = chatSessions.filter(session => {
    return session.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getDashboardRedirect = () => {
    if (!userRole) return '/';
    if (userRole === 'platform_admin') return '/admin/dashboard';
    if (userRole === 'school_admin') return '/school-admin/dashboard';
    if (userRole === 'teacher') return '/teacher/dashboard';
    if (userRole === 'parent') return '/parent/dashboard';
    return '/student/dashboard';
  };

  const renderSessionCard = (session: ChatSession) => {
    const isActive = currentChatId === session.id;
    const isPinned = session.pinnedBy?.includes(currentUser?.uid || '') || false;
    return (
      <div
        key={session.id}
        className={`
          w-full p-2.5 flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group relative border text-left
          ${isActive
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
            : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'}
        `}
        onClick={() => {
          setCurrentChatId(session.id);
          setSearchParams({ session: session.id });
          if (window.innerWidth < 1024) setIsSidebarOpen(false);
        }}
      >
        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
        <span className="flex-1 text-xs truncate pr-12">{session.title}</span>

        {/* Hover/Action Buttons (Pin & Delete) */}
        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
          <Button
            variant="ghost"
            size="icon"
            className={`w-5 h-5 rounded-md ${isPinned ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePinChat(session.id, isPinned);
            }}
            title={isPinned ? "Unpin chat" : "Pin chat to top"}
          >
            <Pin className={`w-3 h-3 ${isPinned ? 'fill-current rotate-45' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-slate-400 hover:text-red-500 rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              triggerDeleteChat(session.id);
            }}
            title="Delete conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <SEO title="Hanna AI Chat" description="Interactive, lightning-fast chatbot companion on Liverton Learning." noIndex />
      <div className="flex h-[100dvh] min-h-0 bg-[#fafafc] dark:bg-[#0c0d12] text-slate-900 dark:text-slate-100 overflow-hidden relative">

        {/* Background Decorative Blobs for high-fidelity glassmorphism depth */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 dark:bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none z-0" />

        {/* Dynamic Slide-out Sidebar for Conversation History resembling ChatGPT app */}
        <div
          className={`
            fixed inset-y-0 left-0 z-40 bg-white/95 dark:bg-[#0c0d12]/95 backdrop-blur-md border-r border-slate-200/50 dark:border-white/5
            transition-all duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
            ${isSidebarOpen
              ? 'translate-x-0 w-[min(20rem,calc(100vw-1rem))] opacity-100'
              : '-translate-x-full opacity-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0 lg:translate-x-0'
            }
            lg:relative lg:bg-white/40 lg:dark:bg-[#0c0d12]/40
          `}
        >
          {/* ChatGPT-style Sidebar Header with Prominent "+ New Chat" button at the top */}
          <div className="p-4 border-b border-slate-200/50 dark:border-white/5 flex flex-col gap-3 bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h1 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                Hanna History
              </h1>
              {isSidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden rounded-full w-8 h-8 hover:bg-slate-200 dark:hover:bg-white/10"
                  onClick={() => setIsSidebarOpen(false)}
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* ChatGPT-style Big Prominent "+ New Chat" Button */}
            <Button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl py-5 font-bold text-xs shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </Button>

            {/* Search conversations */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-600 text-xs">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pinned Group */}
                {filteredSessions.some(s => s.pinnedBy?.includes(currentUser?.uid || '')) && (
                  <div className="space-y-1">
                    <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Pin className="w-3 h-3 fill-current text-emerald-500 rotate-45" /> Pinned
                    </p>
                    {filteredSessions
                      .filter(s => s.pinnedBy?.includes(currentUser?.uid || ''))
                      .map(session => renderSessionCard(session))}
                  </div>
                )}

                {/* Recent Group */}
                <div className="space-y-1">
                  {filteredSessions.some(s => s.pinnedBy?.includes(currentUser?.uid || '')) && (
                    <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Recent
                    </p>
                  )}
                  {filteredSessions
                    .filter(s => !s.pinnedBy?.includes(currentUser?.uid || ''))
                    .map(session => renderSessionCard(session))}
                </div>
              </div>
            )}
          </div>

          {/* Unified Action Bar inside the Sidebar */}
          <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col gap-1 text-xs">
            <button
              onClick={() => {
                setSettingsTab('about');
                setIsSettingsOpen(true);
              }}
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
        </div>

        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Take.app-style Focus Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative z-10">

          {/* Custom Overlapping Avatars Header resembling Gemini in Firebase Cloud Console */}
          <header className="px-2.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-[#111115] text-white">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Back Button with brand logo */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(getDashboardRedirect())}
                className="rounded-full w-8 h-8 hover:bg-white/10"
                title="Back to Dashboard"
              >
                <ChevronLeft className="w-4 h-4 text-slate-300" />
              </Button>

              {/* Overlapping Brand + AskHanna Avatars */}
              <div className="relative flex items-center">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center overflow-hidden z-10">
                  <img src="/logo.png" alt="Liverton" className="w-[85%] h-[85%] object-contain" />
                </div>
                <div className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center overflow-hidden -ml-3 z-20 shadow-md">
                  <div className="scale-[1.6]">
                    <AskHannaIcon size={20} showText={false} />
                  </div>
                </div>
              </div>

              {/* Title & Brand Typography */}
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-bold text-sm text-slate-100">Hanna</span>
                <span className="hidden sm:inline text-[11px] text-slate-400 font-medium truncate">in Liverton</span>
              </div>
            </div>

            {/* Responsive Actions resembling the Firebase Cloud Console header (+, history, settings, X) */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="rounded-full w-9 h-9 text-slate-300 hover:text-white hover:bg-white/10"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className="rounded-full w-9 h-9 text-slate-300 hover:text-white hover:bg-white/10"
                title="Conversation History"
              >
                <History className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigate('/profile');
                }}
                className="rounded-full w-9 h-9 text-slate-300 hover:text-white hover:bg-white/10"
                title="Personalization Settings"
              >
                <Settings className="w-4 h-4 text-emerald-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(getDashboardRedirect())}
                className="rounded-full w-9 h-9 text-slate-300 hover:text-white hover:bg-white/10"
                title="Close"
              >
                <X className="w-4.5 h-4.5" />
              </Button>
            </div>
          </header>


          {currentChatId ? (
            <>
              {/* Conversation Area (Take.app interactively centered max-w-2xl viewport) */}
              <div ref={scrollContainerRef} onScroll={handleMessageScroll} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 scrollbar-thin overscroll-contain">
                <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">

                  {/* Empty state: Suggested prompts for streamlined user guidance */}
                  {messages.length === 0 && !typewriterText && (
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

                      {/* Suggested prompts in a high-fidelity minimalist Jumia grid with smooth wavy staggered animations */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                        {SUGGESTED_PROMPTS.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInputValue(item.prompt);
                              textareaRef.current?.focus();
                            }}
                            className="group flex items-start gap-3.5 p-4 rounded-3xl border border-slate-200/60 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left animate-in fade-in slide-in-from-bottom-4 duration-500 suggestion-card-animate shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                            style={{
                              animationDelay: `${i * 200}ms`,
                              animationFillMode: 'both'
                            }}
                          >
                            <span className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                              <item.icon className="w-4 h-4" />
                            </span>
                            <div>
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
                        <div className={`flex gap-2.5 sm:gap-3 max-w-[92%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

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
                                    <img key={i} src={att.url} alt={att.name} className="max-w-[min(200px,78vw)] max-h-40 rounded-2xl object-cover border border-slate-200/50 dark:border-white/10 shadow-sm" />
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
                                px-3.5 sm:px-4 py-3 text-[13px] sm:text-sm leading-relaxed break-words shadow-sm
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
                          {typewriterText ? (
                            <div>
                              <HannaMarkdown text={typewriterText} />
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

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {!isNearBottom && messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-white/95 dark:bg-[#111115]/95 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-lg backdrop-blur-md transition-transform hover:-translate-y-0.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5 -rotate-90" />
                  Jump to latest
                </button>
              )}

              {/* Composer Box (Clean modern layout position at bottom centered) */}
              <footer className="sticky bottom-0 p-2 sm:p-4 bg-[#fafafc]/95 dark:bg-[#0c0d12]/95 backdrop-blur-md border-t border-slate-200/50 dark:border-white/5 relative z-20 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pb-4">
                <div className="max-w-2xl mx-auto space-y-3">

                  {/* Subtle Animated Suggestion Action Pills */}
                  {messages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none py-1 select-none animate-in fade-in duration-300">
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setInputValue(s.prompt);
                            textareaRef.current?.focus();
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all whitespace-nowrap shadow-sm hover:shadow-glow"
                        >
                          <s.icon className="w-3.5 h-3.5" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

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
                    className="flex items-end gap-1.5 sm:gap-2.5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/95 shadow-xl p-2.5 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all duration-200"
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
                      className="rounded-full w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
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
                      className="flex-1 min-w-0 bg-transparent border-0 outline-none resize-none text-[16px] sm:text-[14px] leading-relaxed py-2 px-1 max-h-40 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100"
                      disabled={isGenerating}
                    />

                    {/* Action button */}
                    {isGenerating ? (
                      <Button
                        type="button"
                        size="icon"
                        className="rounded-full w-9 h-9 sm:w-10 sm:h-10 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 flex-shrink-0 transition-transform"
                        onClick={handleStop}
                        title="Stop generating"
                      >
                        <StopCircle className="w-5 h-5 animate-pulse" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-full w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0 shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
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
