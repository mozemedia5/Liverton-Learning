import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import GeminiSparkle from '@/components/GeminiSparkle';
import GeminiShimmerLoader from '@/components/GeminiShimmerLoader';
import GeminiAudioPlayer from '@/components/GeminiAudioPlayer';
import GeminiMediaGrid from '@/components/GeminiMediaGrid';
import HannaActivityIndicator from '@/components/HannaActivityIndicator';
import { HannaMarkdown } from '@/components/HannaMarkdown';
import { SEO } from '@/components/SEO';
import {
  streamHannaReply,
  isGeminiConfigured,
  generateSmartTitle,
  exportHannaArtifact,
  generateHannaImage,
  type HannaAttachment,
  type HannaArtifactFormat,
  type HannaPptxTemplate,
  type HannaPptxAnimation,
  type HannaMode,
} from '@/lib/hannaGemini';
import { researchWithHanna, searchImagesForHanna, type HannaSource, type HannaImageResult } from '@/lib/hannaResearch';
import { IMAGE_CAPABLE_GEMINI_MODELS, SERVER_SUPPORTED_GEMINI_MODELS } from '@/lib/geminiModels';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import { filterHannaSessions } from '@/lib/hannaArchive';
import {
  addDoc, collection, deleteDoc, doc, increment, onSnapshot, query, serverTimestamp,
  updateDoc, where,
} from 'firebase/firestore';
import {
  Archive, ArrowUpRight, BookOpen, Camera, Check, Code2, ChevronDown, ChevronLeft, ClipboardList, Copy, Download, ExternalLink, FileDown,
  Globe2, Image as ImageIcon, Library, Menu, MessageSquare, Paperclip, Pin, Plus,
  FolderPlus, Home, Layers3, MoreVertical, Pencil, RefreshCw, Search, Send, Share2, Sparkles, StopCircle, Trash2, X,
  ThumbsUp, ThumbsDown, SlidersHorizontal, Mic, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

type TimestampLike = { toMillis?: () => number; toDate?: () => Date } | Date | null | undefined;
interface Message {
  id: string; chatId: string; senderId: string; senderName: string; senderRole: 'user' | 'hanna';
  content: string; attachments?: HannaAttachment[]; createdAt: TimestampLike; sources?: HannaSource[]; images?: HannaImageResult[]; audioUrl?: string;
}
interface ChatSession { id: string; userId: string; title: string; createdAt: TimestampLike; updatedAt: TimestampLike; messageCount: number; pinnedBy?: string[]; archived?: boolean; addedToHome?: boolean; teamIds?: string[] }

type ResearchStage = 'idle' | 'planning' | 'searching' | 'synthesizing' | 'ready' | 'partial';

const HANNA_MODE_OPTIONS: Array<{ value: HannaMode; label: string; description: string; icon: typeof BookOpen }> = [
  { value: 'web_search', label: 'Web search', description: 'Find current sources and cite them.', icon: Globe2 },
  { value: 'deep_think', label: 'Deep think', description: 'Reason carefully and verify assumptions.', icon: Sparkles },
  { value: 'studying', label: 'Studying', description: 'Learn step by step with practice.', icon: BookOpen },
  { value: 'deep_research', label: 'Deep research', description: 'Compare sources and synthesize evidence.', icon: Library },
  { value: 'coding', label: 'Coding', description: 'Plan, explain, and write clean code.', icon: Code2 },
  { value: 'artifacts', label: 'Artifacts', description: 'Prepare polished documents, tables, and slides.', icon: Layers3 },
];

const PROMPTS = [
  { icon: BookOpen, label: 'Explain a topic', prompt: 'Explain quantum computing using a simple everyday analogy and a short 3-question quiz.' },
  { icon: ClipboardList, label: 'Build an assessment', prompt: 'Create a competency-based test rubric with scoring criteria for my class.' },
  { icon: Library, label: 'Research the web', prompt: 'Research recent breakthroughs in renewable energy and summarize key sources.' },
  { icon: Sparkles, label: 'Create a study guide', prompt: 'Turn this topic into bullet revision notes, flashcards, and exam practice questions: ' },
];

const HANNA_CREATION_ACTIONS = [
  { label: 'Create slides', prompt: 'Create a clear educational slide deck about: ', icon: BookOpen },
  { label: 'Create image', prompt: 'Create an educational visual diagram about: ', icon: ImageIcon },
  { label: 'Create PDF', prompt: 'Create a polished PDF learning guide about: ', icon: FileDown },
  { label: 'Create document', prompt: 'Create a well-structured learning document about: ', icon: FileDown },
] as const;

const ROLE_PROMPTS: Record<string, typeof PROMPTS> = {
  student: [
    { icon: BookOpen, label: 'Study a topic', prompt: 'Analyze my current module and make clear revision notes with a practice quiz.' },
    { icon: Sparkles, label: 'Improve my progress', prompt: 'Review my learning progress and suggest the next three study actions.' },
    ...PROMPTS,
  ],
  teacher: [
    { icon: ClipboardList, label: 'Draft a module', prompt: 'Create a complete lesson plan draft with objectives, activities, and rubrics.' },
    { icon: Library, label: 'Review materials', prompt: 'Analyze teaching documents and suggest interactive classroom exercises.' },
    ...PROMPTS,
  ],
  parent: [
    { icon: BookOpen, label: 'Understand progress', prompt: 'Explain my learner’s progress in simple language and suggest supportive home activities.' },
    ...PROMPTS,
  ],
  school_admin: [
    { icon: Library, label: 'Review school evidence', prompt: 'Summarize learning metrics and identify practical improvement priorities.' },
    ...PROMPTS,
  ],
};

function AttachmentPreview({ attachment, onPreview }: { attachment: HannaAttachment; onPreview: (attachment: HannaAttachment) => void }) {
  const isImage = attachment.mimeType.startsWith('image/');
  if (isImage) return <button type="button" onClick={() => onPreview(attachment)} aria-label={`Preview ${attachment.name}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#1e1f20] text-left"><img src={attachment.url} alt="Attached image" className="h-24 w-32 object-cover transition group-hover:scale-105" /><span className="absolute inset-x-1.5 bottom-1 hidden rounded bg-black/65 px-1 py-0.5 text-[9px] text-white group-hover:block">Preview image</span></button>;
  if (attachment.mimeType.startsWith('video/')) return <div className="w-48 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-black p-1"><video src={attachment.url} controls preload="metadata" className="h-24 w-full rounded-xl object-cover" /><span className="block truncate px-1 py-1 text-[9px] text-white/80">{attachment.name}</span></div>;
  if (attachment.mimeType.startsWith('audio/')) return <div className="w-64 max-w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1e1f20] p-2"><audio src={attachment.url} controls preload="metadata" className="h-8 w-full" /><span className="mt-1 block truncate text-[9px] text-slate-500 dark:text-[#c4c7c5]">{attachment.name}</span></div>;
  return <span className="inline-flex items-center gap-1.5 rounded-xl bg-black/5 dark:bg-white/10 px-2.5 py-1 text-[11px] font-medium"><Paperclip className="h-3.5 w-3.5 text-[#4285F4]" />{attachment.name}</span>;
}

function millis(ts: TimestampLike) {
  if (!ts) return 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

function domain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'web source'; }
}

function SourceCard({ source, index, onOpen }: { source: HannaSource; index: number; onOpen: (source: HannaSource) => void }) {
  return (
    <button onClick={() => onOpen(source)} className="group w-full rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e1f20] p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#4285F4]/60 hover:shadow-md">
      <div className="flex items-start gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-[11px] font-bold text-[#4285F4]">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-xs font-semibold text-slate-800 dark:text-[#e3e3e3]">{source.title || 'Untitled source'}</span>
          <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#4285F4]"><Globe2 className="h-3 w-3" />{domain(source.url)}</span>
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-[#4285F4]" />
      </div>
      {source.citedText && <p className="mt-2 line-clamp-2 border-t border-slate-100 dark:border-white/10 pt-2 text-[10px] leading-relaxed text-slate-500 dark:text-[#c4c7c5]">{source.citedText}</p>}
    </button>
  );
}

export default function HannaChatIntegrated() {
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [autoResumeLatest, setAutoResumeLatest] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string | null>(searchParams.get('session'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [researchStage, setResearchStage] = useState<ResearchStage>('idle');
  const [hannaMode, setHannaMode] = useState<HannaMode>('web_search');
  const [selectedModelId, setSelectedModelId] = useState(SERVER_SUPPORTED_GEMINI_MODELS[0]?.id || 'gemini-3.6-flash');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [sources, setSources] = useState<HannaSource[]>([]);
  const [images, setImages] = useState<HannaImageResult[]>([]);
  const [selectedSource, setSelectedSource] = useState<HannaSource | null>(null);
  const [selectedImage, setSelectedImage] = useState<HannaImageResult | null>(null);
  const [openSessionActions, setOpenSessionActions] = useState<string | null>(null);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showArchivedSessions, setShowArchivedSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachments, setAttachments] = useState<HannaAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [openModifyMenuId, setOpenModifyMenuId] = useState<string | null>(null);
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [pendingCreationAction, setPendingCreationAction] = useState<'image' | 'slides' | null>(null);
  const [artifactFormat, setArtifactFormat] = useState<HannaArtifactFormat | null>(null);
  const [pptxTemplate, setPptxTemplate] = useState<HannaPptxTemplate>('liverton');
  const [pptxAnimation, setPptxAnimation] = useState<HannaPptxAnimation>('calm');

  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const geminiReady = isGeminiConfigured();
  const researchEnabled = hannaMode === 'web_search' || hannaMode === 'deep_research';
  const selectedMode = HANNA_MODE_OPTIONS.find(option => option.value === hannaMode) || HANNA_MODE_OPTIONS[0];
  const rolePrompts = ROLE_PROMPTS[userRole || 'student'] || PROMPTS;
  const visibleSessions = useMemo(() => filterHannaSessions(sessions, showArchivedSessions, searchQuery, currentUser?.uid || ''), [sessions, searchQuery, currentUser, showArchivedSessions]);
  const archivedSessionCount = useMemo(() => sessions.filter(session => session.archived).length, [sessions]);
  const latestHannaMessage = [...messages].reverse().find(m => m.senderRole === 'hanna');

  useEffect(() => {
    if (!currentUser) { setSessionsLoaded(true); return; }
    setSessionsLoaded(false);
    const q = query(collection(db, 'hanna_chats'), where('userId', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      setSessions(snap.docs.map(item => ({ id: item.id, ...item.data() }) as ChatSession).sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt)));
      setSessionsLoaded(true);
    }, () => setSessionsLoaded(true));
  }, [currentUser]);

  useEffect(() => {
    if (autoResumeLatest && sessionsLoaded && !currentChatId && sessions.some(session => !session.archived)) {
      const target = sessions.find(session => !session.archived);
      if (target) { setCurrentChatId(target.id); setSearchParams({ session: target.id }); }
    }
  }, [autoResumeLatest, currentChatId, sessions, sessionsLoaded, setSearchParams]);

  useEffect(() => {
    if (!currentChatId) { setMessages([]); return; }
    const q = query(collection(db, 'hanna_messages'), where('chatId', '==', currentChatId));
    return onSnapshot(q, snap => {
      const next = snap.docs.map(item => ({ id: item.id, ...item.data() }) as Message).sort((a, b) => millis(a.createdAt) - millis(b.createdAt));
      setMessages(next);
      const last = [...next].reverse().find(m => m.senderRole === 'hanna');
      if (last) { setSources(last.sources || []); setImages(last.images || []); }
    });
  }, [currentChatId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, streamingText]);

  const createSession = async () => {
    if (!currentUser) throw new Error('Please sign in to use Gemini AI.');
    const ref = await addDoc(collection(db, 'hanna_chats'), { userId: currentUser.uid, title: 'New chat', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), messageCount: 0 });
    setCurrentChatId(ref.id); setSearchParams({ session: ref.id }); return ref.id;
  };

  const newChat = () => { setAutoResumeLatest(false); setCurrentChatId(null); setSearchParams({}); setMessages([]); setSources([]); setImages([]); setInputValue(''); setAttachments([]); setIsSourceDrawerOpen(false); setSelectedSource(null); setOpenSessionActions(null); composerRef.current?.focus(); };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []); event.target.value = ''; if (!currentUser) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadToCloudinary(file, mapFileToCloudinaryType(file, file.name), { showErrorToast: false, userId: currentUser.uid, referenceId: currentChatId || 'gemini', purpose: file.type.startsWith('image/') ? 'hanna_image' : 'hanna_document' });
        setAttachments(prev => [...prev, { url, name: file.name, mimeType: file.type || 'application/octet-stream' }]);
      }
    } catch { toast.error('Could not attach that file.'); } finally { setUploading(false); }
  };

  const send = async (preset?: string) => {
    const text = (preset || inputValue).trim();
    if ((!text && attachments.length === 0) || isGenerating || !currentUser) return;
    if (!geminiReady) { toast.error('Gemini API is not configured for this environment.'); return; }
    setInputValue(''); setIsGenerating(true); setStreamingText(''); setResearchStage('planning');
    if (composerRef.current) composerRef.current.style.height = 'auto';
    const activeAttachments = attachments; setAttachments([]);
    let chatId = currentChatId;
    try {
      if (!chatId) chatId = await createSession();
      await addDoc(collection(db, 'hanna_messages'), { chatId, senderId: currentUser.uid, senderName: userData?.fullName || 'You', senderRole: 'user', content: text || '(shared files)', attachments: activeAttachments, createdAt: serverTimestamp() });
      const history = messages.slice(-16).map(m => ({ role: m.senderRole, content: m.content }));
      let researchBrief = '';
      let resultSources: HannaSource[] = [];
      let resultImages: HannaImageResult[] = [];
      if (pendingCreationAction === 'image' && text) {
        setResearchStage('synthesizing');
        const generated = await generateHannaImage(text.replace(/^Create an educational visual diagram about:\s*/i, ''), IMAGE_CAPABLE_GEMINI_MODELS[0]?.id);
        const generatedResponse = await fetch(generated.url);
        const generatedBlob = await generatedResponse.blob();
        const generatedFile = new File([generatedBlob], `gemini-${Date.now()}.png`, { type: generatedBlob.type || 'image/png' });
        const persistedUrl = await uploadToCloudinary(generatedFile, 'image', { showErrorToast: false, userId: currentUser.uid, referenceId: chatId, purpose: 'hanna_generated_image' });
        URL.revokeObjectURL(generated.url);
        resultImages = [{ ...generated, url: persistedUrl, thumbnailUrl: persistedUrl }];
        setImages(resultImages);
      }
      if (researchEnabled && text && pendingCreationAction !== 'image') {
        setResearchStage('searching');
        try { const result = await researchWithHanna(text); researchBrief = result.answer; resultSources = result.sources || []; resultImages = result.images || []; setSources(resultSources); setImages(resultImages); setResearchStage('synthesizing'); }
        catch { setResearchStage('partial'); }
      }
      const groundedPrompt = researchBrief ? `${text}\n\nResearch brief gathered for this request:\n${researchBrief}\n\nUse the research as evidence, cite the provided sources when relevant.` : text;
      const controller = new AbortController(); abortRef.current = controller;
      const reply = await streamHannaReply(history, groundedPrompt || 'Please analyze the attached files.', activeAttachments, partial => setStreamingText(partial), controller.signal, { userName: userData?.fullName || 'User', userRole: userRole || 'student', customInstructions: userData?.hannaPersonalization?.customInstructions || '' }, chatId, hannaMode, selectedModelId);
      const finalText = reply.trim();
      await addDoc(collection(db, 'hanna_messages'), { chatId, senderId: 'hanna-ai', senderName: 'Gemini', senderRole: 'hanna', content: finalText, sources: resultSources, images: resultImages, createdAt: serverTimestamp() });
      const existingSession = sessions.find(s => s.id === chatId);
      const title = existingSession?.title === 'New chat' || !existingSession?.title
        ? await generateSmartTitle(text || activeAttachments[0]?.name || 'Gemini conversation', { userName: userData?.fullName || 'User', userRole: userRole || 'student' })
        : existingSession.title;
      await updateDoc(doc(db, 'hanna_chats', chatId), { updatedAt: serverTimestamp(), messageCount: increment(2), title });
      setPendingCreationAction(null);
      setResearchStage(resultSources.length || resultImages.length ? 'ready' : researchStage === 'partial' ? 'partial' : 'idle');
    } catch (error) { if ((error as Error)?.name !== 'AbortError') toast.error(error instanceof Error ? error.message : 'Gemini could not complete this request.'); }
    finally { setIsGenerating(false); setStreamingText(''); abortRef.current = null; }
  };

  const modifyResponse = (msg: Message, type: 'shorter' | 'longer' | 'simpler' | 'casual' | 'professional') => {
    setOpenModifyMenuId(null);
    const prompts: Record<string, string> = {
      shorter: 'Make the response above significantly more concise and brief.',
      longer: 'Expand on the response above with more details, examples, and depth.',
      simpler: 'Explain the response above in much simpler terms suitable for a beginner.',
      casual: 'Rewrite the response above in a casual, warm, conversational tone.',
      professional: 'Rewrite the response above in a formal, highly professional academic style.',
    };
    setInputValue(prompts[type] || 'Modify the response.');
    composerRef.current?.focus();
  };

  const googleSearchResponse = (queryText: string) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(queryText.slice(0, 100))}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  const copyMessage = async (message: Message) => { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); setTimeout(() => setCopiedId(null), 1600); };
  const stop = () => abortRef.current?.abort();
  const openSource = (source: HannaSource) => { setSelectedSource(source); setIsSourceDrawerOpen(true); };
  const deleteChat = async (id: string) => { await deleteDoc(doc(db, 'hanna_chats', id)); if (id === currentChatId) newChat(); };
  const togglePin = async (session: ChatSession) => { if (!currentUser) return; const pinned = session.pinnedBy?.includes(currentUser.uid); await updateDoc(doc(db, 'hanna_chats', session.id), { pinnedBy: pinned ? (session.pinnedBy || []).filter(id => id !== currentUser.uid) : [...(session.pinnedBy || []), currentUser.uid] }); };
  const renameChat = async (session: ChatSession) => { const next = window.prompt('Rename conversation', session.title); if (next?.trim()) await updateDoc(doc(db, 'hanna_chats', session.id), { title: next.trim().slice(0, 80) }); };
  const toggleChatFlag = async (session: ChatSession, field: 'archived' | 'addedToHome') => { await updateDoc(doc(db, 'hanna_chats', session.id), { [field]: !session[field] }); };
  const shareChat = async (session: ChatSession, external: boolean) => { const link = `${window.location.origin}/features/hanna-ai?session=${session.id}`; if (external && navigator.share) await navigator.share({ title: session.title, text: 'A Gemini AI conversation', url: link }); else { await navigator.clipboard.writeText(link); toast.success('Share link copied to clipboard.'); } };

  return <>
    <SEO title="Google Gemini AI Interface" description="Google Gemini AI interface clone built with precision Material Design 3." noIndex />
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[#f0f4f9] dark:bg-[#131314] text-slate-900 dark:text-[#e3e3e3] font-sans">

      {/* 300px Collapsible Desktop Navigation Sidebar & Mobile Drawer Menu */}
      <aside className={`${isHistoryOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed inset-y-0 left-0 z-50 flex w-[300px] shrink-0 flex-col border-r border-slate-200/70 dark:border-white/10 bg-[#f0f4f9] dark:bg-[#1e1f20] transition-transform duration-300 lg:relative lg:z-20`}>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button onClick={newChat} className="flex items-center gap-2.5 rounded-full bg-slate-200/70 dark:bg-[#2d2e31] px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-[#e3e3e3] hover:bg-slate-300/80 dark:hover:bg-[#37393e] transition">
              <Plus className="h-4 w-4 text-[#4285F4]" />
              <span>New chat</span>
            </button>
            <button onClick={() => setIsHistoryOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 lg:hidden" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-[#c4c7c5]" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Recent chats" className="w-full rounded-full border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#131314] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#4285F4]" />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 scrollbar-thin">
          {visibleSessions.length ? visibleSessions.map(session => (
            <div key={session.id} className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-xs transition ${session.id === currentChatId ? 'bg-blue-500/10 font-bold text-[#4285F4]' : 'text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-white/5'}`}>
              <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => { setAutoResumeLatest(false); setCurrentChatId(session.id); setSearchParams({ session: session.id }); setIsHistoryOpen(false); setOpenSessionActions(null); }}>
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{session.title}</span>
                {session.pinnedBy?.includes(currentUser?.uid || '') && <Pin className="h-3 w-3 shrink-0 rotate-45 text-[#4285F4]" />}
              </button>
              <button onClick={() => setOpenSessionActions(openSessionActions === session.id ? null : session.id)} className="rounded-full p-1 text-slate-400 opacity-0 group-hover:opacity-100 transition hover:bg-slate-300 dark:hover:bg-white/10">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {openSessionActions === session.id && (
                <div className="absolute right-2 top-8 z-30 w-48 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e1f20] p-1.5 shadow-xl">
                  <button onClick={() => { void shareChat(session, false); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Share2 className="h-3.5 w-3.5" />Share</button>
                  <button onClick={() => { void togglePin(session); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Pin className="h-3.5 w-3.5" />{session.pinnedBy?.includes(currentUser?.uid || '') ? 'Unpin' : 'Pin'}</button>
                  <button onClick={() => { void renameChat(session); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Pencil className="h-3.5 w-3.5" />Rename</button>
                  <button onClick={() => { void deleteChat(session.id); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              )}
            </div>
          )) : (
            <div className="px-4 py-8 text-center text-xs text-slate-400">No chats found.</div>
          )}
        </div>

        <div className="border-t border-slate-200/70 dark:border-white/10 p-3 text-xs">
          <button onClick={() => navigate('/more')} className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/5">
            <ChevronLeft className="h-4 w-4" /> Exit to Dashboard
          </button>
        </div>
      </aside>
      {isHistoryOpen && <button aria-label="Close overlay" onClick={() => setIsHistoryOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}

      {/* Main Chat Window */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f0f4f9] dark:bg-[#131314]">
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 dark:border-white/5 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setIsHistoryOpen(true)} className="rounded-full p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <GeminiSparkle size={22} animating={isGenerating} />
              <span className="text-base font-medium tracking-tight text-slate-800 dark:text-[#e3e3e3]">Gemini</span>
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-[#4285F4]">3.6 Flash</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button aria-expanded={showModeMenu} onClick={() => setShowModeMenu(v => !v)} className="flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e1f20] px-3.5 py-1.5 text-xs font-medium transition hover:border-[#4285F4]">
                <selectedMode.icon className="h-3.5 w-3.5 text-[#4285F4]" />
                <span className="hidden sm:inline">{selectedMode.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {showModeMenu && (
                <div className="absolute right-0 top-10 z-30 w-64 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e1f20] p-2 shadow-2xl">
                  {HANNA_MODE_OPTIONS.map(option => (
                    <button type="button" key={option.value} onClick={() => { setHannaMode(option.value); setShowModeMenu(false); }} className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition ${option.value === hannaMode ? 'bg-blue-500/10 text-[#4285F4]' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                      <option.icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <span className="block text-xs font-semibold">{option.label}</span>
                        <span className="block text-[10px] text-slate-400">{option.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setIsSourceDrawerOpen(v => !v)} className="rounded-full p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10" aria-label="Sources">
              <Library className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Chat Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin">
          <div className="mx-auto max-w-[768px] pb-32">
            {!messages.length && !isGenerating ? (
              <div className="flex min-h-[60vh] flex-col justify-center">
                <div className="mb-8">
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] via-[#9B51E0] to-[#EA4335]">
                    Hello, {userData?.fullName?.split(' ')[0] || 'there'}
                  </h1>
                  <p className="mt-2 text-3xl font-normal text-slate-400 dark:text-[#c4c7c5]">
                    How can I help you today?
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rolePrompts.slice(0, 4).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setInputValue(item.prompt); composerRef.current?.focus(); }}
                      className="group flex flex-col justify-between rounded-[20px] border border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#1e1f20] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#4285F4]/40 hover:shadow-md"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-[#e3e3e3] line-clamp-2">{item.prompt}</span>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-[#2d2e31] group-hover:bg-blue-500/10 text-slate-500 group-hover:text-[#4285F4] transition">
                          <item.icon className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map(message => {
                  const isUser = message.senderRole === 'user';
                  return (
                    <article key={message.id} className="group flex flex-col gap-2">
                      <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isUser && (
                          <div className="mt-1">
                            <GeminiSparkle size={24} animating={false} />
                          </div>
                        )}
                        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
                          {/* Prompt / Response Text Box */}
                          <div className={`inline-block ${isUser ? 'bg-slate-200/80 dark:bg-[#2d2e31] text-slate-900 dark:text-[#e3e3e3] rounded-[24px] px-5 py-3 text-base font-normal max-w-[85%]' : 'w-full text-[15px] leading-relaxed text-slate-800 dark:text-[#e3e3e3]'}`}>
                            {message.attachments?.length ? (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {message.attachments.map(att => <AttachmentPreview key={att.url} attachment={att} onPreview={v => setSelectedImage({ title: v.name, url: v.url, thumbnailUrl: v.url, sourceUrl: v.url })} />)}
                              </div>
                            ) : null}
                            <HannaMarkdown text={message.content} />
                          </div>

                          {/* Responsive Image Divs (Media Grid) */}
                          {!isUser && message.images && message.images.length > 0 && (
                            <div className="mt-4">
                              <GeminiMediaGrid images={message.images} onPreview={setSelectedImage} />
                            </div>
                          )}

                          {/* Audio Spoken Response Player */}
                          {!isUser && message.audioUrl && (
                            <div className="mt-3">
                              <GeminiAudioPlayer src={message.audioUrl} title={message.content.slice(0, 30)} />
                            </div>
                          )}

                          {/* Action Bar Underneath Completed AI Responses */}
                          {!isUser && (
                            <div className="mt-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => setFeedbackGiven(prev => ({ ...prev, [message.id]: 'up' }))}
                                className={`rounded-full p-2 transition transform hover:scale-110 ${feedbackGiven[message.id] === 'up' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
                                aria-label="Good response"
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFeedbackGiven(prev => ({ ...prev, [message.id]: 'down' }))}
                                className={`rounded-full p-2 transition transform hover:scale-110 ${feedbackGiven[message.id] === 'down' ? 'text-red-500 bg-red-500/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
                                aria-label="Bad response"
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => copyMessage(message)}
                                className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition transform hover:scale-110"
                                aria-label="Copy text"
                              >
                                {copiedId === message.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => void shareChat({ id: message.chatId, title: message.content.slice(0, 30) } as any, true)}
                                className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition transform hover:scale-110"
                                aria-label="Share response"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>

                              {/* Modify Response Dropdown */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenModifyMenuId(openModifyMenuId === message.id ? null : message.id)}
                                  className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition transform hover:scale-110"
                                  aria-label="Modify response"
                                >
                                  <SlidersHorizontal className="h-4 w-4" />
                                </button>
                                {openModifyMenuId === message.id && (
                                  <div className="absolute left-0 bottom-8 z-30 w-40 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e1f20] p-1.5 shadow-2xl">
                                    <button onClick={() => modifyResponse(message, 'shorter')} className="w-full rounded-xl px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10">Shorter</button>
                                    <button onClick={() => modifyResponse(message, 'longer')} className="w-full rounded-xl px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10">Longer</button>
                                    <button onClick={() => modifyResponse(message, 'simpler')} className="w-full rounded-xl px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10">Simpler</button>
                                    <button onClick={() => modifyResponse(message, 'casual')} className="w-full rounded-xl px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10">Casual</button>
                                    <button onClick={() => modifyResponse(message, 'professional')} className="w-full rounded-xl px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10">Professional</button>
                                  </div>
                                )}
                              </div>

                              {/* Google Search "G" Icon */}
                              <button
                                type="button"
                                onClick={() => googleSearchResponse(message.content)}
                                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-[#4285F4] hover:bg-blue-500/10 transition transform hover:scale-110"
                                title="Search Google"
                                aria-label="Google Search"
                              >
                                <span className="text-sm font-black tracking-tighter text-[#4285F4]">G</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* Streaming Shimmer Animation Loader */}
                {isGenerating && (
                  <article className="flex items-start gap-3">
                    <GeminiSparkle size={24} animating />
                    <div className="flex-1">
                      {streamingText ? (
                        <div className="space-y-2">
                          <HannaMarkdown text={streamingText} />
                          <span className="inline-block h-4 w-1.5 animate-pulse rounded-full bg-[#4285F4]" />
                        </div>
                      ) : (
                        <GeminiShimmerLoader statusText="Finishing preparing, please wait..." />
                      )}
                    </div>
                  </article>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Pill Chat Input Box Anchored at Bottom Center */}
        <footer className="fixed bottom-0 inset-x-0 z-20 p-3 sm:pb-6 pointer-events-none">
          <div className="mx-auto max-w-[768px] w-full px-0 sm:px-4 pointer-events-auto">
            <form onSubmit={e => { e.preventDefault(); void send(); }} className="relative flex flex-col rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e1f20] p-3 shadow-xl transition focus-within:border-[#4285F4]/70">
              <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="hidden" onChange={handleFile} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

              {/* Attachments Preview Row */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2 px-2 border-b border-slate-100 dark:border-white/5 mb-1">
                  {attachments.map(att => (
                    <div key={att.url} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-[#2d2e31] px-3 py-1 text-xs font-medium text-slate-700 dark:text-[#e3e3e3]">
                      <Paperclip className="h-3.5 w-3.5 text-[#4285F4]" />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter(a => a.url !== att.url))} aria-label="Remove"><X className="h-3 w-3 hover:text-red-500" /></button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                ref={composerRef}
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder="Ask Gemini"
                className="w-full bg-transparent resize-none border-none outline-none px-4 py-1.5 text-base text-slate-900 dark:text-[#e3e3e3] placeholder:text-slate-400 dark:placeholder:text-[#c4c7c5] focus:ring-0 max-h-[200px]"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-between pt-1 px-1">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => fileRef.current?.click()} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:text-[#4285F4] hover:bg-slate-100 dark:hover:bg-white/5 transition" aria-label="Upload file">
                    <Plus className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:text-[#4285F4] hover:bg-slate-100 dark:hover:bg-white/5 transition" aria-label="Attach photo">
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => toast.info('Microphone voice input ready.')} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:text-[#4285F4] hover:bg-slate-100 dark:hover:bg-white/5 transition" aria-label="Voice input">
                    <Mic className="h-5 w-5" />
                  </button>
                </div>

                {isGenerating ? (
                  <button type="button" onClick={stop} className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-white dark:bg-white dark:text-black hover:scale-105 transition" aria-label="Stop">
                    <StopCircle className="h-5 w-5 text-red-500" />
                  </button>
                ) : (
                  <button type="submit" disabled={!inputValue.trim() && !attachments.length} className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-[#4285F4] to-[#9B51E0] text-white shadow-md disabled:opacity-30 transition transform hover:scale-105" aria-label="Send">
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </footer>
      </main>

      {/* Sources Drawer */}
      <aside className={`${isSourceDrawerOpen ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-50 flex w-[min(25rem,100vw)] flex-col border-l border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e1f20] transition-transform duration-300 lg:relative lg:z-20`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-[#4285F4]" />
            <span className="text-sm font-semibold">Sources & References</span>
          </div>
          <button onClick={() => setIsSourceDrawerOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sources.length ? sources.map((source, index) => <SourceCard key={source.url} source={source} index={index} onOpen={openSource} />) : <div className="py-12 text-center text-xs text-slate-400">No external sources used in this answer.</div>}
        </div>
      </aside>
    </div>
  </>;
}
