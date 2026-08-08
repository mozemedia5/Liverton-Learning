/**
 * HannaButton / HannaAIWidget Component
 *
 * Re-architected to implement a two-state overlay experience:
 * 1. Quick Access (Floating trigger + Compact AI drawer/panel)
 * 2. Full Immersive Experience (Expanded fullscreen workspace)
 *
 * Continuous chat sessions, full Firestore integration, automatic contextual
 * awareness (detecting courses, lessons, quizzes, PDFs/documents), high-fidelity
 * overlapping avatars header, voice recognition simulator, and dynamic contextual chips.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { AskHannaIcon } from '@/components/AskHannaIcon';
import { HannaMarkdown } from '@/components/HannaMarkdown';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import { streamHannaReply, deriveChatTitle, isGeminiConfigured, type HannaAttachment } from '@/lib/hannaGemini';
import { DeleteChatConfirmation } from '@/components/DeleteChatConfirmation';
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
import {
  Minimize2,
  Maximize2,
  Send,
  Paperclip,
  X,
  Sparkles,
  FileText,
  Loader2,
  StopCircle,
  ChevronLeft,
  Mic,
  Check,
  Copy,
  History,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'hanna';
  content: string;
  attachments?: { url: string; name: string; mimeType: string }[];
  createdAt: any;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  messageCount: number;
}

interface PendingAttachment extends HannaAttachment {
  progress?: number;
}

interface PageContext {
  type: 'lesson' | 'quiz' | 'course' | 'document' | 'dashboard' | 'general';
  title: string;
  subTitle?: string;
  courseName?: string;
  lessonName?: string;
}

/**
 * Parses current location pathname & DOM to derive active learning context
 */
function getActivePageContext(pathname: string): PageContext {
  const h1Text = document.querySelector('h1')?.textContent?.trim() || '';
  const h2Text = document.querySelector('h2')?.textContent?.trim() || '';
  const cardTitleText = document.querySelector('.card-title')?.textContent?.trim() || '';
  const activeLessonText = document.querySelector('[data-active-lesson]')?.textContent?.trim() ||
                           document.querySelector('.active-lesson')?.textContent?.trim() || '';

  const detectedTitle = h1Text || h2Text || cardTitleText || activeLessonText;

  if (pathname.includes('/zoom-lessons/') || pathname.includes('/zoom-lessons') || pathname.includes('/lessons/')) {
    const lessonId = pathname.split('/').pop() || '';
    return {
      type: 'lesson',
      title: detectedTitle || `Lesson ${lessonId}`,
      lessonName: detectedTitle || `Lesson ${lessonId}`,
      courseName: h2Text || h1Text || 'Active Course'
    };
  }

  if (pathname.includes('/quiz') || pathname.includes('/quizzes') || pathname.includes('/student/quiz/')) {
    const quizId = pathname.split('/').pop() || '';
    return {
      type: 'quiz',
      title: detectedTitle || `Quiz ${quizId}`,
      subTitle: 'Concept Practice & Test'
    };
  }

  if (pathname.includes('/courses/') || pathname.includes('/student/courses') || pathname.includes('/teacher/courses')) {
    const courseId = pathname.split('/').pop() || '';
    return {
      type: 'course',
      title: detectedTitle || `Course ${courseId}`,
      courseName: detectedTitle || `Course ${courseId}`
    };
  }

  if (pathname.includes('/documents/') || pathname.includes('/dashboard/documents') || pathname.includes('/features/books/')) {
    const docId = pathname.split('/').pop() || '';
    return {
      type: 'document',
      title: detectedTitle || `Document ${docId}`,
      subTitle: 'Reading & Annotation'
    };
  }

  if (pathname.includes('/dashboard')) {
    return {
      type: 'dashboard',
      title: 'Dashboard',
      subTitle: 'Your Liverton Learning Hub'
    };
  }

  return {
    type: 'general',
    title: detectedTitle || 'Liverton Learning',
    subTitle: 'Interactive Assistant'
  };
}

/**
 * Returns customized prompt action chips depending on active learning context
 */
function getContextActionChips(type: string): string[] {
  switch (type) {
    case 'lesson':
      return [
        'Explain this lesson simply',
        'Summarize this lesson',
        'Test me on this topic',
        'Show me a diagram',
      ];
    case 'quiz':
      return [
        'Explain my answer',
        'Why was I wrong?',
        'Teach me this concept',
        'Give a similar practice question',
      ];
    case 'course':
      return [
        'What should I study next?',
        'Summarize my progress',
        'Create a revision plan',
        'Quiz me on this course',
      ];
    case 'document':
      return [
        'Explain this page',
        'Summarize this document',
        'Ask questions from this',
        'Create revision flashcards',
      ];
    case 'dashboard':
    default:
      return [
        'Start studying',
        'Create a study plan',
        'Find something to learn',
        'How do I earn points on Liverton?',
      ];
  }
}

/**
 * Returns dynamic action chips after Hanna responds based on message content
 */
function getFeedbackChips(lastMessageText: string): string[] {
  const text = lastMessageText.toLowerCase();
  if (text.includes('math') || text.includes('equation') || text.includes('calculat')) {
    return ['Show formula', 'Give calculation step', 'Give practice quiz'];
  }
  if (text.includes('biology') || text.includes('cell') || text.includes('organ') || text.includes('nephron')) {
    return ['Show diagram details', 'Label structures', 'Test me now'];
  }
  if (text.includes('code') || text.includes('javascript') || text.includes('python') || text.includes('html')) {
    return ['Explain the code', 'Fix syntax bugs', 'Give exercise challenge'];
  }
  return ['Explain simply', 'Go deeper', 'Give an example', 'Test my understanding'];
}

export function HannaButton() {
  const { currentUser, userData } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Hanna overlay state: 'button' | 'compact' | 'expanded'
  const [widgetState, setWidgetState] = useState<'button' | 'compact' | 'expanded'>('button');

  // Core chat session state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Previous chats toggle state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<ChatSession | null>(null);

  // Active Workspace Mode: 'Conversation' | 'Explanation' | 'Visuals' | 'Practice'
  const [workspaceMode, setWorkspaceMode] = useState<'Conversation' | 'Explanation' | 'Visuals' | 'Practice'>('Conversation');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const geminiReady = isGeminiConfigured();
  const context = getActivePageContext(location.pathname);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (widgetState !== 'button') {
      scrollToBottom();
    }
  }, [messages, streamingText, widgetState, scrollToBottom]);

  // Handle route session query sync
  const sessionParam = searchParams.get('session');
  useEffect(() => {
    if (sessionParam) {
      setCurrentChatId(sessionParam);
      setWidgetState('expanded');
    }
  }, [sessionParam]);

  // Load the sessions from Firestore on mount
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'hanna_chats'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ChatSession[];
      const sorted = sessions.sort((a, b) => {
        const tA = a.updatedAt?.toMillis?.() || a.updatedAt?.toDate?.()?.getTime() || 0;
        const tB = b.updatedAt?.toMillis?.() || b.updatedAt?.toDate?.()?.getTime() || 0;
        return tB - tA;
      });
      setChatSessions(sorted);
      // Select the most recent session if none selected yet
      if (!currentChatId && sorted.length > 0) {
        setCurrentChatId(sorted[0].id);
      }
    }, (error) => console.error('Error loading chats:', error));
    return () => unsubscribe();
  }, [currentUser, currentChatId]);

  // Subscribe to messages when a chat ID is active
  useEffect(() => {
    if (!currentChatId) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, 'hanna_messages'), where('chatId', '==', currentChatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Message[];
      const sorted = msgs.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() || a.createdAt?.toDate?.()?.getTime() || 0;
        const tB = b.createdAt?.toMillis?.() || b.createdAt?.toDate?.()?.getTime() || 0;
        return tA - tB;
      });
      setMessages(sorted);
    }, (error) => console.error('Error loading messages:', error));
    return () => unsubscribe();
  }, [currentChatId]);

  // Hide the floating widget on dedicated Hanna AI full-page view to avoid overlay duplicates
  const isDedicatedHannaPage = location.pathname === '/features/hanna-ai';
  if (isDedicatedHannaPage) {
    return null;
  }

  // Adjust textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [inputValue]);

  // Create fresh Firestore chat session
  const createNewSession = async (): Promise<string> => {
    if (!currentUser) throw new Error('User not authenticated');
    const docRef = await addDoc(collection(db, 'hanna_chats'), {
      userId: currentUser.uid,
      title: `Hanna Session — ${new Date().toLocaleDateString()}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messageCount: 0,
    });
    return docRef.id;
  };

  // Start Voice input simulation / Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Voice input is not supported directly in this browser. Simulating mic input...', { duration: 3000 });
      setIsRecording(true);
      setTimeout(() => {
        setInputValue(prev => prev + (prev ? ' ' : '') + 'Explain cell functions.');
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
      toast.info('Hanna is listening... Speak now!', { id: 'voice-toast' });
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
        setInputValue(prev => prev + (prev ? ' ' : '') + result);
        toast.success('Voice recognized successfully!', { id: 'voice-toast' });
      }
    };

    recognition.start();
  };

  // File picker handler
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0 || !currentUser) return;

    setUploadingFiles(true);
    for (const file of files) {
      try {
        const url = await uploadToCloudinary(file, mapFileToCloudinaryType(file, file.name), { showErrorToast: false });
        setAttachments(prev => [...prev, { url, name: file.name, mimeType: file.type || 'application/octet-stream' }]);
        toast.success(`Attached ${file.name}`);
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

  const handleStopGeneration = () => {
    abortRef.current?.abort();
  };

  // Central Send Message Function
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if ((!text && attachments.length === 0) || isGenerating) return;

    if (!geminiReady) {
      toast.error('Hanna AI is offline. The Gemini API key is missing from the environment configuration.');
      return;
    }

    setInputValue('');
    const currentAttachments = attachments;
    setAttachments([]);
    setIsGenerating(true);
    setStreamingText('');

    let chatId = currentChatId;

    try {
      // 1. Ensure chat session exists in Firestore. If not, create it on-demand (No Lag on click!)
      if (!chatId) {
        chatId = await createNewSession();
        setCurrentChatId(chatId);
      }

      // 2. Append route context to prompt for context-awareness (Biology → Cell Biology → explain this)
      let fullyContextualPrompt = text;
      if (context.type !== 'general') {
        fullyContextualPrompt = `[Context: I am currently viewing a ${context.type} page on Liverton Learning. Page Title: "${context.title}". Subtitle/Meta: "${context.subTitle || ''}". Course Name: "${context.courseName || ''}". Lesson Name: "${context.lessonName || ''}"]\n\nUser Question: ${text}`;
      }

      // 3. Persist user message to firestore (We display the clean text to user, but pass context to AI)
      await addDoc(collection(db, 'hanna_messages'), {
        chatId,
        senderId: currentUser?.uid || 'guest',
        senderName: userData?.fullName || 'You',
        senderRole: 'user',
        content: text || '(shared files)',
        attachments: currentAttachments.map(a => ({ url: a.url, name: a.name, mimeType: a.mimeType })),
        createdAt: serverTimestamp(),
      });

      // 4. Update session metadata (+ auto-title on first message)
      const sessionUpdates: Record<string, any> = {
        updatedAt: serverTimestamp(),
        messageCount: increment(1),
      };
      if (messages.length === 0) {
        sessionUpdates.title = deriveChatTitle(text || currentAttachments[0]?.name || 'Chat with Hanna');
      }
      await updateDoc(doc(db, 'hanna_chats', chatId), sessionUpdates);

      // 5. Build conversation history
      const history = messages.slice(-12).map(m => ({
        role: (m.senderRole === 'user' ? 'user' : 'hanna') as 'user' | 'hanna',
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      // 6. Stream reply
      const reply = await streamHannaReply(
        history,
        fullyContextualPrompt,
        currentAttachments,
        (partial) => setStreamingText(partial),
        controller.signal
      );

      // 7. Persist reply
      const finalText = reply.trim() || 'I was interrupted — please ask me again.';
      await addDoc(collection(db, 'hanna_messages'), {
        chatId,
        senderId: 'hanna-ai',
        senderName: 'Hanna',
        senderRole: 'hanna',
        content: finalText,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'hanna_chats', chatId), {
        updatedAt: serverTimestamp(),
        messageCount: increment(1),
      });

    } catch (error) {
      console.error('Hanna reply failed:', error);
      const errName = error instanceof Error ? error.name : '';
      if (errName !== 'AbortError') {
        toast.error('Hanna is experiencing high response demand. Please try again.');
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
      toast.success('Message copied!');
    } catch { /* Clipboard fallback */ }
  };

  const handleClearSession = async () => {
    if (!currentChatId) return;
    const session = chatSessions.find(s => s.id === currentChatId);
    if (session) {
      setDeleteConfirmSession(session);
    } else {
      setCurrentChatId(null);
      setMessages([]);
      setInputValue('');
    }
  };

  const handleStartFreshSession = async () => {
    try {
      const freshId = await createNewSession();
      setCurrentChatId(freshId);
      setMessages([]);
      setInputValue('');
      toast.success('Started a fresh conversation session!');
    } catch (e) {
      toast.error('Could not create a new conversation');
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts instanceof Date
      ? ts
      : typeof ts.toDate === 'function'
        ? ts.toDate()
        : new Date(ts.toMillis?.() || Date.now());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // State 1: Floating Trigger Button
  if (widgetState === 'button') {
    return (
      <button
        onClick={() => setWidgetState('compact')}
        title="Ask Hanna AI"
        className="
          fixed bottom-24 right-5 z-40 lg:bottom-6
          flex items-center gap-2
          p-1.5 pr-4 rounded-full
          bg-black hover:bg-zinc-900
          text-white font-bold text-xs
          shadow-[0_12px_32px_rgba(16,185,129,0.3)]
          hover:shadow-[0_16px_40px_rgba(245,158,11,0.4)]
          transition-all duration-300 ease-in-out
          hover:scale-110 active:scale-95
          border border-emerald-500/30
          animate-bounce-slow
        "
      >
        <div className="relative flex-shrink-0 scale-95">
          <AskHannaIcon size={36} showText={false} className="rounded-full shadow-md" />
        </div>
        <span className="whitespace-nowrap font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300">
          Hanna ✨
        </span>
      </button>
    );
  }

  // State 2: Compact AI Panel / Bottom Drawer
  if (widgetState === 'compact') {
    const chips = getContextActionChips(context.type);
    return (
      <div
        className="
          fixed z-50
          /* Mobile Panel (bottom sheet) */
          inset-x-0 bottom-0 h-[80vh] rounded-t-[32px]
          /* Desktop Panel (floating card) */
          lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[410px] lg:h-[620px] lg:rounded-[36px]
          flex flex-col border border-slate-200/60 dark:border-white/10
          bg-white/95 dark:bg-[#09090d]/95 backdrop-blur-2xl shadow-2xl
          animate-in slide-in-from-bottom duration-300
        "
      >
        {/* Dynamic Overlapping Brand + Hanna Header */}
        <header className="px-5 py-4 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden z-10">
                <img src="/logo.png" alt="Liverton" className="w-[85%] h-[85%] object-contain" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-black border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden -ml-3.5 z-20 shadow-md">
                <div className="scale-[1.6]">
                  <AskHannaIcon size={24} showText={false} />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#09090d] rounded-full z-30 animate-pulse" />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">Hanna AI</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                <span>Active Lesson Context:</span>
                <span className="text-emerald-500 font-bold truncate max-w-[120px]">{context.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Expand to Immersive screen with stylish modern look */}
            <button
              onClick={() => setWidgetState('expanded')}
              className="
                p-1.5 rounded-lg border border-slate-200/60 dark:border-white/10
                bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/5
                text-slate-400 hover:text-slate-900 dark:hover:text-white
                transition-all duration-300 shadow-sm hover:scale-105 active:scale-95
              "
              title="Expand to Full Workspace"
            >
              <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            {/* Minimize / Close */}
            <button
              onClick={() => setWidgetState('button')}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              title="Minimize Hanna"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin flex flex-col justify-between">

          {messages.length > 0 ? (
            <div className="space-y-4 mb-4">
              {messages.map((m) => {
                const isHanna = m.senderRole === 'hanna';
                return (
                  <div key={m.id} className={`flex ${isHanna ? 'justify-start' : 'justify-end'} animate-in fade-in duration-200`}>
                    <div className={`flex gap-2 max-w-[85%] ${isHanna ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {isHanna ? (
                          <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center overflow-hidden border border-white/5">
                            <div className="scale-[1.5]">
                              <AskHannaIcon size={20} showText={false} />
                            </div>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-white font-black text-[9px]">
                            {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className={`
                          px-3 py-2 rounded-2xl text-xs leading-relaxed
                          ${isHanna
                            ? 'bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                            : 'bg-emerald-600 text-white rounded-tr-sm font-medium'}
                        `}>
                          <HannaMarkdown text={m.content} />
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block text-right">
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isGenerating && (
                <div className="flex justify-start animate-in fade-in duration-150">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center overflow-hidden border border-white/5 mt-0.5">
                      <div className="scale-[1.5]">
                        <AskHannaIcon size={20} showText={false} />
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-2xl rounded-tl-sm text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-white/5 text-slate-800 dark:text-slate-100">
                      {streamingText ? (
                        <div>
                          <HannaMarkdown text={streamingText} />
                          <span className="inline-block w-1.5 h-3 bg-emerald-500 animate-pulse ml-0.5" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="my-auto text-center space-y-6 py-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto shadow-md border border-white/5">
                <div className="scale-[2]">
                  <AskHannaIcon size={24} showText={false} />
                </div>
              </div>
              <div className="space-y-1.5">
                <h4 className="font-black text-lg text-slate-900 dark:text-white">What can I help you learn?</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                  I can synthesize concepts, design instant quizzes, and explain lessons for your Ugandan curricula modules.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-1">
              Suggestions based on {context.type}
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pb-2 scrollbar-thin">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isGenerating}
                  className="
                    px-3 py-1.5 text-[11px] rounded-full text-left font-medium
                    bg-emerald-500/10 hover:bg-emerald-500/15
                    border border-emerald-500/20 hover:border-emerald-500/30
                    text-emerald-600 dark:text-emerald-400
                    hover:scale-102 transition-all active:scale-98
                  "
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Composer (Compact State) */}
        <footer className="p-4 border-t border-slate-200/50 dark:border-white/5">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 p-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all"
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask Hanna anything..."
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-[13px] leading-relaxed px-2 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 max-h-24"
              disabled={isGenerating}
            />

            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isGenerating}
              className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0 ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-emerald-500'}`}
              title="Voice Input"
            >
              <Mic className="w-4 h-4" />
            </button>

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center transition-transform hover:scale-105"
              >
                <StopCircle className="w-4 h-4 animate-pulse text-emerald-500" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim() || uploadingFiles}
                className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </footer>
      </div>
    );
  }

  // State 3: Full Immersive Experience (Expanded Workspace)
  const feedbackChips = messages.length > 0 ? getFeedbackChips(messages[messages.length - 1].content) : [];

  return (
    <div
      className="
        fixed z-50
        /* Mobile: Fullscreen */
        inset-0
        /* Desktop: Minimised elegant vertical half-screen workspace on bottom-right of the window */
        lg:top-auto lg:right-6 lg:bottom-6 lg:left-auto lg:w-[500px] lg:h-[70vh] lg:max-h-[660px] lg:rounded-[28px]
        flex flex-col border border-slate-200/50 dark:border-white/10
        bg-white dark:bg-[#07070a] shadow-2xl animate-in fade-in duration-300 overflow-hidden
      "
    >
      {/* Decorative backdrop blobs within immersive view */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-yellow-500/5 dark:bg-yellow-500/5 blur-[130px] rounded-full pointer-events-none z-0" />

      {/* Expanded Header */}
      <header className="px-5 py-3 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-white/70 dark:bg-[#07070a]/70 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-2">
          {/* Back Button / Compact Mode Toggle */}
          <button
            onClick={() => setWidgetState('compact')}
            className="p-1.5 rounded-full border border-slate-200/50 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Back to compact view"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Toggle Previous Chats History Sidebar */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`p-1.5 rounded-lg border border-slate-200/50 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all ${isHistoryOpen ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' : 'text-slate-400'}`}
            title="Toggle Previous Chats"
          >
            <History className="w-4 h-4" />
          </button>

          <div className="relative flex items-center ml-1">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden z-10">
              <img src="/logo.png" alt="Liverton" className="w-[85%] h-[85%] object-contain" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-black border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden -ml-4 z-20 shadow-md">
              <div className="scale-[1.6]">
                <AskHannaIcon size={24} showText={false} />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#07070a] rounded-full z-30 animate-pulse" />
          </div>

          <div className="min-w-0 ml-1">
            <h2 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">Hanna Study Hub</h2>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[130px] mt-0.5">
              Context: <span className="text-emerald-500 font-bold">{context.title}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* New Chat Session trigger */}
          <button
            onClick={handleStartFreshSession}
            className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] transition-all hover:scale-103"
            title="Start New Chat"
          >
            New Chat +
          </button>

          {/* Reset/Delete current session button */}
          {messages.length > 0 && (
            <button
              onClick={handleClearSession}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete Current Session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Minimize button to return to floating button with stylish design */}
          <button
            onClick={() => setWidgetState('button')}
            className="
              p-1.5 rounded-lg border border-slate-200/60 dark:border-white/10
              bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/5
              text-slate-400 hover:text-slate-900 dark:hover:text-white
              transition-all duration-300 shadow-sm hover:scale-105 active:scale-95
            "
            title="Minimize to Widget"
          >
            <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Previous Chats Sidebar/Panel inside Hanna AI Widget */}
      {isHistoryOpen && (
        <div className="absolute inset-y-0 left-0 w-[240px] bg-white/98 dark:bg-[#0a0a0f]/98 border-r border-slate-200/60 dark:border-white/10 z-30 flex flex-col animate-in slide-in-from-left duration-200 rounded-l-[28px] shadow-2xl">
          <div className="p-3 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Previous Sessions</span>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {chatSessions.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-8">No saved chats</p>
            ) : (
              chatSessions.map((session) => {
                const isActive = currentChatId === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setCurrentChatId(session.id);
                      setIsHistoryOpen(false);
                    }}
                    className={`
                      p-2 rounded-xl cursor-pointer flex items-center justify-between group transition-all border text-[11px]
                      ${isActive
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}
                    `}
                  >
                    <span className="truncate flex-1 pr-2 leading-snug">{session.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmSession(session);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mode Selector - Seamless transformations inside Workspace (State-aware tabs) */}
      <div className="px-5 py-2 border-b border-slate-200/40 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-1.5 relative z-10">
        {(['Conversation', 'Explanation', 'Visuals', 'Practice'] as const).map((mode) => {
          const isActive = workspaceMode === mode;
          return (
            <button
              key={mode}
              onClick={() => {
                setWorkspaceMode(mode);
                if (mode === 'Practice') {
                  handleSendMessage('Create a 3-question interactive practice quiz for me on this topic.');
                } else if (mode === 'Explanation') {
                  handleSendMessage('Explain the main concept step-by-step with simplified subheadings.');
                } else if (mode === 'Visuals') {
                  handleSendMessage('Give me a text-based ASCII flowchart or detailed outline of the diagram/structure.');
                }
              }}
              className={`
                px-3 py-1.5 text-[10px] rounded-full font-bold transition-all duration-200
                ${isActive
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}
              `}
            >
              {mode}
            </button>
          );
        })}
      </div>

      {/* Immersive Chat Message Area */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 relative z-10 scrollbar-thin">
        {messages.length === 0 && !streamingText ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-5 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-black rounded-[22px] flex items-center justify-center shadow-lg border border-white/5 relative">
              <div className="scale-[2]">
                <AskHannaIcon size={28} showText={false} />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-slate-950 p-1 rounded-lg border border-white/10 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Hanna Premium AI Companion
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] max-w-[280px] mx-auto leading-relaxed">
                Unlock instant diagrams, calculations, custom practice exams, and step-by-step study breakdowns inside the Liverton curriculum.
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 max-w-[280px] mx-auto text-[11px] font-bold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse flex-shrink-0" />
              <span className="leading-snug text-left">Context "{context.title}" is loaded. Click suggestions to start.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => {
              const isHanna = m.senderRole === 'hanna';
              return (
                <div key={m.id} className={`flex ${isHanna ? 'justify-start' : 'justify-end'} animate-in fade-in duration-300`}>
                  <div className={`flex gap-2.5 max-w-[85%] ${isHanna ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {isHanna ? (
                        <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center overflow-hidden border border-white/5 shadow-md">
                          <div className="scale-[1.6]">
                            <AskHannaIcon size={22} showText={false} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-extrabold text-[9px] shadow-sm">
                          {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {m.attachments && m.attachments.length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 ${isHanna ? 'justify-start' : 'justify-end'}`}>
                          {m.attachments.map((att, i) => (
                            att.mimeType.startsWith('image/') ? (
                              <img key={i} src={att.url} alt={att.name} className="max-w-[200px] max-h-36 rounded-xl object-cover border border-slate-200/50 dark:border-white/10 shadow-sm" />
                            ) : (
                              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-[10px]">
                                <FileText className="w-3.5 h-3.5 text-emerald-500" /> {att.name}
                              </span>
                            )
                          ))}
                        </div>
                      )}

                      <div className={`
                        px-3.5 py-2.5 text-xs leading-relaxed shadow-sm
                        ${isHanna
                          ? 'bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-[20px] rounded-tl-[4px]'
                          : 'bg-emerald-600 text-white rounded-[20px] rounded-tr-[4px] font-medium'}
                      `}>
                        <HannaMarkdown text={m.content} />
                      </div>

                      <div className={`flex items-center gap-2.5 text-[9px] text-slate-400 dark:text-slate-500 mt-1 ${isHanna ? 'justify-start' : 'justify-end'}`}>
                        <span>{formatTime(m.createdAt)}</span>
                        {isHanna && (
                          <button
                            onClick={() => handleCopyMessage(m)}
                            className="hover:text-emerald-500 flex items-center gap-0.5 transition-colors"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-500" />
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

            {isGenerating && (
              <div className="flex gap-2.5 max-w-[85%] justify-start animate-in fade-in duration-150">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center overflow-hidden border border-white/5 shadow-md">
                    <div className="scale-[1.6]">
                      <AskHannaIcon size={22} showText={false} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-[20px] rounded-tl-[4px] px-3.5 py-2.5 text-xs leading-relaxed shadow-sm min-w-[100px]">
                    {streamingText ? (
                      <div>
                        <HannaMarkdown text={streamingText} />
                        <span className="inline-block w-1.5 h-3 bg-emerald-500 animate-pulse ml-0.5" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Expanded bottom workspace console */}
      <footer className="p-4 border-t border-slate-200/50 dark:border-white/5 relative z-10 bg-white/50 dark:bg-[#07070a]/50 backdrop-blur-md">
        <div className="space-y-3.5">

          {feedbackChips.length > 0 && !isGenerating && (
            <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-200">
              {feedbackChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(chip)}
                  className="
                    px-3 py-1 text-[10px] rounded-full font-bold
                    bg-slate-100 hover:bg-emerald-500/10 hover:text-emerald-500
                    border border-slate-200 hover:border-emerald-500/20
                    text-slate-600 dark:text-slate-400 dark:bg-white/5 dark:border-white/5
                    transition-all hover:scale-103
                  "
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {(attachments.length > 0 || uploadingFiles) && (
            <div className="flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {attachments.map(att => (
                <span key={att.url} className="inline-flex items-center gap-1 pl-1 pr-1.5 py-1 rounded-xl bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-[10px] shadow-sm">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={att.url} alt="" className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span className="max-w-[110px] truncate text-slate-700 dark:text-slate-300">{att.name}</span>
                  <button onClick={() => removeAttachment(att.url)} className="text-slate-400 hover:text-red-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {uploadingFiles && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-[#111115] border border-slate-200/60 dark:border-white/5 text-[10px] text-slate-400 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Uploading...</span>
                </span>
              )}
            </div>
          )}

          {/* Main Premium Composer Box */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-end gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/95 shadow-lg p-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all duration-200"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.csv,.doc,.docx"
              className="hidden"
              onChange={handleFilePick}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles || isGenerating}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
              title="Attach File"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask Hanna anything..."
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-xs leading-relaxed py-1.5 px-0.5 max-h-24 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100"
              disabled={isGenerating}
            />

            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isGenerating}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isRecording ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
              title="Voice Input"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                title="Stop generation"
              >
                <StopCircle className="w-4.5 h-4.5 animate-pulse text-emerald-500" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!inputValue.trim() && attachments.length === 0) || uploadingFiles}
                className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <p className="text-[9px] text-center text-slate-400 dark:text-slate-500">
            Hanna AI Study Hub synthesizes information safely. Consult core course syllabi for grading criteria.
          </p>
        </div>
      </footer>

      {/* Custom Delete Confirmation Dialogue */}
      <DeleteChatConfirmation
        isOpen={deleteConfirmSession !== null}
        chatTitle={deleteConfirmSession?.title || ''}
        onConfirm={async () => {
          if (!deleteConfirmSession) return;
          try {
            await deleteDoc(doc(db, 'hanna_chats', deleteConfirmSession.id));
            if (currentChatId === deleteConfirmSession.id) {
              setCurrentChatId(null);
              setMessages([]);
            }
            toast.success('Conversation deleted');
          } catch (error) {
            console.error('Error deleting chat:', error);
            toast.error('Failed to delete conversation');
          } finally {
            setDeleteConfirmSession(null);
            setIsHistoryOpen(false);
          }
        }}
        onCancel={() => setDeleteConfirmSession(null)}
      />
    </div>
  );
}

export default HannaButton;
