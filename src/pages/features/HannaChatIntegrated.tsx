import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { AskHannaIcon } from '@/components/AskHannaIcon';
import { HannaMarkdown } from '@/components/HannaMarkdown';
import { SEO } from '@/components/SEO';
import { streamHannaReply, isGeminiConfigured, generateSmartTitle, type HannaAttachment } from '@/lib/hannaGemini';
import { researchWithHanna, searchImagesForHanna, type HannaSource, type HannaImageResult } from '@/lib/hannaResearch';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import {
  addDoc, collection, deleteDoc, doc, increment, onSnapshot, query, serverTimestamp,
  updateDoc, where,
} from 'firebase/firestore';
import {
  Archive, ArrowUpRight, BookOpen, Check, ChevronLeft, ClipboardList, Copy, Download, ExternalLink,
  Globe2, Image as ImageIcon, Library, Loader2, Menu, MessageSquare, Paperclip, Pin, Plus,
  FolderPlus, Home, MoreVertical, Pencil, RefreshCw, Search, Send, Share2, Sparkles, StopCircle, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';

type TimestampLike = { toMillis?: () => number; toDate?: () => Date } | Date | null | undefined;
interface Message {
  id: string; chatId: string; senderId: string; senderName: string; senderRole: 'user' | 'hanna';
  content: string; attachments?: HannaAttachment[]; createdAt: TimestampLike; sources?: HannaSource[]; images?: HannaImageResult[];
}
interface ChatSession { id: string; userId: string; title: string; createdAt: TimestampLike; updatedAt: TimestampLike; messageCount: number; pinnedBy?: string[]; archived?: boolean; addedToHome?: boolean; teamIds?: string[] }

type ResearchStage = 'idle' | 'planning' | 'searching' | 'synthesizing' | 'ready' | 'partial';

const PROMPTS = [
  { icon: BookOpen, label: 'Explain a topic', prompt: 'Explain a difficult topic using a simple example and a short practice activity.' },
  { icon: ClipboardList, label: 'Build an assessment', prompt: 'Create a competency-based assessment with a marking rubric for my class.' },
  { icon: Library, label: 'Research the web', prompt: 'Research this topic using authoritative sources and show me the links: ' },
  { icon: Sparkles, label: 'Create a learning aid', prompt: 'Turn this topic into revision notes, flashcards, and three exam-style questions: ' },
];

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
    <button onClick={() => onOpen(source)} className="group w-full rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-[11px] font-black text-emerald-600 dark:text-emerald-300">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-100">{source.title || 'Untitled source'}</span>
          <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300"><Globe2 className="h-3 w-3" />{domain(source.url)}</span>
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-emerald-500" />
      </div>
      {source.citedText && <p className="mt-2 line-clamp-2 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400">{source.citedText}</p>}
    </button>
  );
}

function safeFilename(title: string) { return (title || 'hanna-image').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'hanna-image'; }

async function downloadImage(image: HannaImageResult) {
  const response = await fetch(image.url, { mode: 'cors' });
  if (!response.ok) throw new Error('Image download failed');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${safeFilename(image.title)}.${blob.type.split('/')[1] || 'jpg'}`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function exportImage(image: HannaImageResult) {
  if (!navigator.share) { await downloadImage(image); return 'downloaded'; }
  const response = await fetch(image.url, { mode: 'cors' });
  if (!response.ok) throw new Error('Image export failed');
  const blob = await response.blob();
  const file = new File([blob], `${safeFilename(image.title)}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type || 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: image.title, text: `Image from Hanna web search. Source: ${image.sourceUrl}` }); return 'shared'; }
  await downloadImage(image); return 'downloaded';
}

function ImageStrip({ images, onPreview, onDownload, onExport }: { images: HannaImageResult[]; onPreview?: (image: HannaImageResult) => void; onDownload?: (image: HannaImageResult) => void; onExport?: (image: HannaImageResult) => void }) {
  if (!images.length) return null;
  return <section className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-3 dark:border-amber-300/10 dark:from-amber-300/[0.08] dark:to-white/[0.03]">
    <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-200"><ImageIcon className="h-4 w-4" /> Visual references</div><span className="text-[10px] text-slate-400">Attribution included</span></div>
    <div className="grid grid-cols-3 gap-2">
      {images.slice(0, 6).map(image => <button type="button" key={`${image.sourceUrl}-${image.url}`} onClick={() => onPreview?.(image)} className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white text-left dark:border-white/10 dark:bg-[#111115]"><img src={image.thumbnailUrl || image.url} alt={image.title} loading="lazy" className="h-20 w-full object-cover transition duration-300 group-hover:scale-105" /><span className="block truncate px-2 py-1.5 text-[9px] text-slate-600 dark:text-slate-300">{image.title}</span><span className="flex gap-1 px-2 pb-2"><span role="button" tabIndex={0} onClick={event => { event.stopPropagation(); onDownload?.(image); }} onKeyDown={event => { if (event.key === 'Enter') { event.stopPropagation(); onDownload?.(image); } }} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-1.5 py-1 text-[9px] font-bold text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-white/10 dark:text-slate-300"><Download className="h-3 w-3" />Save</span><span role="button" tabIndex={0} onClick={event => { event.stopPropagation(); onExport?.(image); }} onKeyDown={event => { if (event.key === 'Enter') { event.stopPropagation(); onExport?.(image); } }} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-1.5 py-1 text-[9px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"><Share2 className="h-3 w-3" />Export</span></span></button>)}
    </div>
  </section>;
}

export default function HannaChatIntegrated() {
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(searchParams.get('session'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [researchStage, setResearchStage] = useState<ResearchStage>('idle');
  const [researchEnabled, setResearchEnabled] = useState(true);
  const [sources, setSources] = useState<HannaSource[]>([]);
  const [images, setImages] = useState<HannaImageResult[]>([]);
  const [selectedSource, setSelectedSource] = useState<HannaSource | null>(null);
  const [selectedImage, setSelectedImage] = useState<HannaImageResult | null>(null);
  const [openSessionActions, setOpenSessionActions] = useState<string | null>(null);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachments, setAttachments] = useState<HannaAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isImageSearching, setIsImageSearching] = useState(false);
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const geminiReady = isGeminiConfigured();
  const filteredSessions = useMemo(() => sessions.filter(s => !s.archived && s.title.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => Number(b.pinnedBy?.includes(currentUser?.uid || '') || false) - Number(a.pinnedBy?.includes(currentUser?.uid || '') || false) || millis(b.updatedAt) - millis(a.updatedAt)), [sessions, searchQuery, currentUser]);
  const latestHannaMessage = [...messages].reverse().find(m => m.senderRole === 'hanna');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'hanna_chats'), where('userId', '==', currentUser.uid));
    return onSnapshot(q, snap => setSessions(snap.docs.map(item => ({ id: item.id, ...item.data() }) as ChatSession).sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt))));
  }, [currentUser]);

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
    if (!currentUser) throw new Error('Please sign in to use Hanna.');
    const ref = await addDoc(collection(db, 'hanna_chats'), { userId: currentUser.uid, title: 'New research conversation', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), messageCount: 0 });
    setCurrentChatId(ref.id); setSearchParams({ session: ref.id }); return ref.id;
  };

  const newChat = () => { setCurrentChatId(null); setSearchParams({}); setMessages([]); setSources([]); setImages([]); setInputValue(''); setAttachments([]); setIsSourceDrawerOpen(false); setSelectedSource(null); setOpenSessionActions(null); composerRef.current?.focus(); };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []); event.target.value = ''; if (!currentUser) return;
    setUploading(true);
    try { for (const file of files) { const url = await uploadToCloudinary(file, mapFileToCloudinaryType(file, file.name), { showErrorToast: false, userId: currentUser.uid, referenceId: currentChatId || 'hanna', purpose: file.type.startsWith('image/') ? 'hanna_image' : 'hanna_document' }); setAttachments(prev => [...prev, { url, name: file.name, mimeType: file.type || 'application/octet-stream' }]); } }
    catch { toast.error('Could not attach that file.'); } finally { setUploading(false); }
  };

  const send = async (preset?: string) => {
    const text = (preset || inputValue).trim();
    if ((!text && attachments.length === 0) || isGenerating || !currentUser) return;
    if (!geminiReady) { toast.error('Hanna is not configured for this environment.'); return; }
    setInputValue(''); setIsGenerating(true); setStreamingText(''); setResearchStage(researchEnabled ? 'planning' : 'idle');
    const activeAttachments = attachments; setAttachments([]);
    let chatId = currentChatId;
    try {
      if (!chatId) chatId = await createSession();
      await addDoc(collection(db, 'hanna_messages'), { chatId, senderId: currentUser.uid, senderName: userData?.fullName || 'You', senderRole: 'user', content: text || '(shared files)', attachments: activeAttachments, createdAt: serverTimestamp() });
      const history = messages.slice(-16).map(m => ({ role: m.senderRole, content: m.content }));
      let researchBrief = '';
      let resultSources: HannaSource[] = [];
      let resultImages: HannaImageResult[] = [];
      if (researchEnabled && text) {
        setResearchStage('searching');
        try { const result = await researchWithHanna(text); researchBrief = result.answer; resultSources = result.sources || []; resultImages = result.images || []; setSources(resultSources); setImages(resultImages); setResearchStage('synthesizing'); }
        catch { setResearchStage('partial'); }
      }
      const groundedPrompt = researchBrief ? `${text}\n\nResearch brief gathered for this request:\n${researchBrief}\n\nUse the research as evidence, cite the provided sources when relevant, and clearly state uncertainty.` : text;
      const controller = new AbortController(); abortRef.current = controller;
      const reply = await streamHannaReply(history, groundedPrompt || 'Please describe the attached files.', activeAttachments, partial => setStreamingText(partial), controller.signal, { userName: userData?.fullName || 'User', userRole: userRole || 'student' }, chatId);
      const finalText = reply.trim();
      await addDoc(collection(db, 'hanna_messages'), { chatId, senderId: 'hanna-ai', senderName: 'Hanna', senderRole: 'hanna', content: finalText, sources: resultSources, images: resultImages, createdAt: serverTimestamp() });
      const existingSession = sessions.find(s => s.id === chatId);
      const title = existingSession?.title === 'New research conversation' || !existingSession?.title
        ? await generateSmartTitle(text || activeAttachments[0]?.name || 'Learning conversation', { userName: userData?.fullName || 'User', userRole: userRole || 'student' })
        : existingSession.title;
      await updateDoc(doc(db, 'hanna_chats', chatId), { updatedAt: serverTimestamp(), messageCount: increment(2), title });
      setResearchStage(resultSources.length ? 'ready' : researchStage === 'partial' ? 'partial' : 'idle');
    } catch (error) { if ((error as Error)?.name !== 'AbortError') toast.error(error instanceof Error ? error.message : 'Hanna could not complete this request.'); }
    finally { setIsGenerating(false); setStreamingText(''); abortRef.current = null; }
  };

  const copyMessage = async (message: Message) => { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); setTimeout(() => setCopiedId(null), 1600); };
  const stop = () => abortRef.current?.abort();
  const openSource = (source: HannaSource) => { setSelectedSource(source); setIsSourceDrawerOpen(true); };
  const searchImages = async () => { if (!inputValue.trim() || isImageSearching) return; setIsImageSearching(true); try { const result = await searchImagesForHanna(inputValue.trim()); setImages(result.images || []); toast.success(`${result.images?.length || 0} visual references found`); } catch { toast.error('Image search is unavailable right now.'); } finally { setIsImageSearching(false); } };
  const handleDownloadImage = async (image: HannaImageResult) => { try { await downloadImage(image); toast.success('Image downloaded.'); } catch { window.open(image.url, '_blank', 'noopener,noreferrer'); toast.info('Opened the image in a new tab. Use your browser menu to save it.'); } };
  const handleExportImage = async (image: HannaImageResult) => { try { const mode = await exportImage(image); toast.success(mode === 'shared' ? 'Image shared.' : 'Image downloaded for export.'); } catch (error) { if ((error as Error)?.name !== 'AbortError') toast.error('Could not export this image.'); } };
  const deleteChat = async (id: string) => { await deleteDoc(doc(db, 'hanna_chats', id)); if (id === currentChatId) newChat(); };
  const togglePin = async (session: ChatSession) => { if (!currentUser) return; const pinned = session.pinnedBy?.includes(currentUser.uid); await updateDoc(doc(db, 'hanna_chats', session.id), { pinnedBy: pinned ? (session.pinnedBy || []).filter(id => id !== currentUser.uid) : [...(session.pinnedBy || []), currentUser.uid] }); };
  const renameChat = async (session: ChatSession) => { const next = window.prompt('Rename conversation', session.title); if (next?.trim()) await updateDoc(doc(db, 'hanna_chats', session.id), { title: next.trim().slice(0, 80) }); };
  const toggleChatFlag = async (session: ChatSession, field: 'archived' | 'addedToHome') => { await updateDoc(doc(db, 'hanna_chats', session.id), { [field]: !session[field] }); };
  const addToTeams = async (session: ChatSession) => { const teamId = window.prompt('Enter the Liv Teams ID or name'); if (teamId?.trim()) { await updateDoc(doc(db, 'hanna_chats', session.id), { teamIds: [...(session.teamIds || []), teamId.trim()] }); toast.success('Conversation added to Liv Teams.'); } };
  const shareChat = async (session: ChatSession, external: boolean) => { const link = `${window.location.origin}/features/hanna-ai?session=${session.id}`; if (external && navigator.share) await navigator.share({ title: session.title, text: 'A Hanna AI conversation from Liverton Learning', url: link }); else { await navigator.clipboard.writeText(link); toast.success(external ? 'Share link copied.' : 'Internal share link copied.'); } };

  return <>
    <SEO title="Hanna AI Research Workspace" description="Research, learn, and create with Hanna AI in Liverton Learning." noIndex />
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[#f7f8fb] text-slate-900 dark:bg-[#080a0f] dark:text-slate-100">
      <aside className={`${isHistoryOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-1rem))] flex-col border-r border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-200 dark:border-white/10 dark:bg-[#0c1018]/95 lg:relative lg:z-20 lg:shadow-none`}>
        <div className="border-b border-slate-200/80 p-4 dark:border-white/10"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-950 shadow-lg"><AskHannaIcon size={24} showText={false} /></div><div><p className="text-sm font-black">Hanna AI</p><p className="text-[10px] text-slate-400">Learning research studio</p></div></div><button onClick={() => setIsHistoryOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-white/10" aria-label="Close history"><X className="h-4 w-4" /></button></div><button onClick={newChat} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[.98]"><Plus className="h-4 w-4" /> New research chat</button><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/[.04]" /></div></div>
        <div className="flex-1 overflow-y-auto p-3">{filteredSessions.length ? filteredSessions.map(session => <div key={session.id} className={`group relative mb-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs transition ${session.id === currentChatId ? 'bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}><button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => { setCurrentChatId(session.id); setSearchParams({ session: session.id }); setIsHistoryOpen(false); setOpenSessionActions(null); }}><MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{session.title}</span>{session.pinnedBy?.includes(currentUser?.uid || '') && <Pin className="h-3 w-3 shrink-0 rotate-45 text-emerald-500" />}</button><button onClick={() => setOpenSessionActions(openSessionActions === session.id ? null : session.id)} className="rounded-lg p-1 text-slate-400 opacity-70 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-white/10" aria-label={`Actions for ${session.title}`}><MoreVertical className="h-4 w-4" /></button>{openSessionActions === session.id && <div className="absolute right-2 top-10 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#11151d]"><button onClick={() => { void shareChat(session, false); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><Share2 className="h-3.5 w-3.5" />Share in Liverton</button><button onClick={() => { void shareChat(session, true); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><ExternalLink className="h-3.5 w-3.5" />Share externally</button><button onClick={() => { void togglePin(session); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><Pin className="h-3.5 w-3.5" />{session.pinnedBy?.includes(currentUser?.uid || '') ? 'Unpin chat' : 'Pin chat'}</button><button onClick={() => { void toggleChatFlag(session, 'addedToHome'); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><Home className="h-3.5 w-3.5" />{session.addedToHome ? 'Remove from home' : 'Add to home'}</button><button onClick={() => { void renameChat(session); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><Pencil className="h-3.5 w-3.5" />Rename</button><button onClick={() => { void addToTeams(session); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><FolderPlus className="h-3.5 w-3.5" />Add to Liv Teams</button><button onClick={() => { void toggleChatFlag(session, 'archived'); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><Archive className="h-3.5 w-3.5" />Archive</button><button onClick={() => { void deleteChat(session.id); setOpenSessionActions(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>}</div>) : <div className="px-4 py-12 text-center text-xs text-slate-400"><MessageSquare className="mx-auto mb-2 h-7 w-7 opacity-30" />No saved research chats yet.</div>}</div>
        <div className="border-t border-slate-200/80 p-3 text-[11px] dark:border-white/10"><button onClick={() => navigate('/more')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><ChevronLeft className="h-3.5 w-3.5" /> Back to Liverton</button></div>
      </aside>
      {isHistoryOpen && <button aria-label="Close history overlay" onClick={() => setIsHistoryOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" />}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#080a0f]/80 sm:px-7"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setIsHistoryOpen(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-white/10" aria-label="Open conversation history"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-black"><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" /> Hanna research workspace</p><p className="truncate text-[11px] text-slate-400">{currentChatId ? (sessions.find(s => s.id === currentChatId)?.title || 'Current conversation') : 'A grounded learning partner for Liverton'}</p></div></div><div className="flex items-center gap-2"><button aria-pressed={researchEnabled} onClick={() => setResearchEnabled(value => !value)} className={`hidden items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition sm:flex ${researchEnabled ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}><span className={`relative h-4 w-7 rounded-full transition ${researchEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${researchEnabled ? 'left-3.5' : 'left-0.5'}`} /></span><Globe2 className="h-3.5 w-3.5" /> Web search</button><button onClick={() => setIsSourceDrawerOpen(true)} className={`rounded-xl border p-2 transition ${isSourceDrawerOpen ? 'border-emerald-400 bg-emerald-500/10 text-emerald-600' : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5'}`} aria-label="Open sources"><Library className="h-4 w-4" /></button><button onClick={() => navigate('/more')} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5" aria-label="Close Hanna"><X className="h-4 w-4" /></button></div></header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl pb-20">
          {!messages.length && !isGenerating ? <div className="flex min-h-[58vh] flex-col items-center justify-center text-center"><div className="relative grid h-24 w-24 place-items-center rounded-[30px] bg-slate-950 shadow-2xl shadow-emerald-900/20"><AskHannaIcon size={44} showText={false} /><span className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-2xl border-4 border-[#f7f8fb] bg-amber-400 text-slate-950 dark:border-[#080a0f]"><Sparkles className="h-4 w-4" /></span></div><p className="mt-7 text-[11px] font-black uppercase tracking-[.22em] text-emerald-600">Research, learn, create</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">What are you working on?</h1><p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500 dark:text-slate-400">Hanna combines Liverton context with transparent web research, source cards, visual references, and practical learning artifacts.</p><div className="mt-9 grid w-full max-w-2xl gap-3 sm:grid-cols-2">{PROMPTS.map(item => <button key={item.label} onClick={() => { setInputValue(item.prompt); composerRef.current?.focus(); }} className="group flex items-start gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-md dark:border-white/10 dark:bg-white/[.04]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition group-hover:scale-105 dark:text-emerald-300"><item.icon className="h-4 w-4" /></span><span><span className="block text-xs font-black">{item.label}</span><span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{item.prompt}</span></span></button>)}</div></div> : <div className="space-y-7">{messages.map(message => { const isUser = message.senderRole === 'user'; return <article key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[92%] ${isUser ? 'order-first' : ''}`}><div className={`mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${isUser ? 'justify-end' : ''}`}>{!isUser && <span className="grid h-5 w-5 place-items-center rounded-lg bg-slate-950"><AskHannaIcon size={14} showText={false} /></span>}{isUser ? 'You' : 'Hanna'}<span className="font-normal normal-case tracking-normal">{message.createdAt ? new Date(millis(message.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span></div><div className={`rounded-[26px] px-4 py-3.5 text-sm leading-relaxed shadow-sm ${isUser ? 'rounded-tr-md bg-emerald-600 text-white' : 'rounded-tl-md border border-slate-200/80 bg-white text-slate-800 dark:border-white/10 dark:bg-white/[.045] dark:text-slate-100'}`}>{message.attachments?.length ? <div className="mb-3 flex flex-wrap gap-2">{message.attachments.map(att => att.mimeType.startsWith('image/') ? <button type="button" key={att.url} onClick={() => setSelectedImage({ title: att.name, url: att.url, thumbnailUrl: att.url, sourceUrl: att.url })} className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white text-left dark:border-white/10 dark:bg-[#111115]"><img src={att.url} alt={att.name} className="h-28 w-36 object-cover transition group-hover:scale-105" /><span className="block truncate px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">{att.name}</span></button> : <span key={att.url} className="inline-flex items-center gap-1.5 rounded-xl bg-black/5 px-2.5 py-1.5 text-[10px] dark:bg-white/10"><Paperclip className="h-3 w-3" />{att.name}</span>)}</div> : null}<HannaMarkdown text={message.content} /></div>{!isUser && (message.sources?.length || message.images?.length) ? <div className="mt-3 space-y-3">{message.images?.length ? <ImageStrip images={message.images} onPreview={setSelectedImage} onDownload={handleDownloadImage} onExport={handleExportImage} /> : null}<div className="flex flex-wrap gap-2">{(message.sources || []).slice(0, 4).map((source, index) => <button key={source.url} onClick={() => openSource(source)} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[8px] text-white">{index + 1}</span><span className="max-w-[180px] truncate">{source.title}</span></button>)}</div></div> : null}<div className={`mt-2 flex items-center gap-3 text-[10px] text-slate-400 ${isUser ? 'justify-end' : ''}`}>{!isUser && <button onClick={() => copyMessage(message)} className="inline-flex items-center gap-1 hover:text-emerald-500">{copiedId === message.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}{copiedId === message.id ? 'Copied' : 'Copy'}</button>}{!isUser && message.sources?.length ? <button onClick={() => setIsSourceDrawerOpen(true)} className="inline-flex items-center gap-1 hover:text-emerald-500"><Library className="h-3 w-3" />{message.sources.length} sources</button> : null}</div></div></article>; })}
          {isGenerating && <article className="flex gap-3"><div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-slate-950"><AskHannaIcon size={19} showText={false} /></div><div className="max-w-[92%] rounded-[26px] rounded-tl-md border border-slate-200/80 bg-white px-4 py-3.5 text-sm shadow-sm dark:border-white/10 dark:bg-white/[.045]">{researchStage !== 'idle' && !streamingText ? <div className="space-y-2"><div className="flex items-center gap-2 text-xs font-bold"><Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />{researchStage === 'planning' ? 'Understanding your question' : researchStage === 'searching' ? 'Searching focused sources' : researchStage === 'synthesizing' ? 'Comparing evidence' : 'Web research partially available'}</div><div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500" /></div></div> : streamingText ? <><HannaMarkdown text={streamingText} /><span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-500" /></> : <div className="flex gap-1.5 py-1"><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" /><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" /></div>}</div></article>}
          </div>}
        </div></div>

        {latestHannaMessage && <div className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-lg backdrop-blur sm:flex dark:border-white/10 dark:bg-[#11151d]/90"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {researchStage === 'ready' ? `${sources.length} sources ready` : 'Ask a follow-up to continue'}</div>}
        <footer className="border-t border-slate-200/80 bg-white/85 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#080a0f]/85 sm:p-5"><div className="mx-auto max-w-3xl"><div className="mb-2 flex items-center justify-between text-[10px] text-slate-400"><span className="font-semibold text-blue-600 dark:text-blue-300">Web search {researchEnabled ? 'on' : 'off'}</span><button onClick={() => setResearchEnabled(value => !value)} className={`font-bold sm:hidden ${researchEnabled ? 'text-blue-600' : 'text-slate-500'}`}>Web search {researchEnabled ? 'on' : 'off'}</button></div>{attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{attachments.map(att => <span key={att.url} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{att.name}<button onClick={() => setAttachments(prev => prev.filter(item => item.url !== att.url))} aria-label={`Remove ${att.name}`}><X className="h-3 w-3" /></button></span>)}</div>}<form onSubmit={event => { event.preventDefault(); void send(); }} className="relative flex items-end gap-2 rounded-[25px] border border-slate-200 bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,.08)] focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-white/10 dark:bg-white/[.05]"><input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} /><button type="button" onClick={() => fileRef.current?.click()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-white/10" aria-label="Attach files"><Paperclip className="h-4 w-4" /></button><textarea ref={composerRef} value={inputValue} onChange={event => setInputValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={1} placeholder="Ask Hanna anything..." className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400" disabled={isGenerating} /><div className="relative flex items-center gap-1"><button type="button" onClick={() => setShowPromptMenu(value => !value)} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-white/10" aria-label="More Hanna tools"><Sparkles className="h-4 w-4" /></button>{showPromptMenu && <div className="absolute bottom-12 right-0 z-20 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#11151d]"><button type="button" onClick={() => { void searchImages(); setShowPromptMenu(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><ImageIcon className="h-4 w-4 text-amber-500" />Find visual references</button><button type="button" onClick={() => { setInputValue('Create an educational visual for: ' + inputValue); setShowPromptMenu(false); composerRef.current?.focus(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><Sparkles className="h-4 w-4 text-emerald-500" />Draft an image prompt</button><button type="button" onClick={() => { setIsSourceDrawerOpen(true); setShowPromptMenu(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10"><Library className="h-4 w-4 text-blue-500" />Review sources</button></div>}</div>{isGenerating ? <button type="button" onClick={stop} className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900" aria-label="Stop generating"><StopCircle className="h-4 w-4 text-emerald-400" /></button> : <button type="submit" disabled={!inputValue.trim() && !attachments.length || uploading} className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition hover:scale-105 disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button>}</form></div></footer>
      </main>

      <aside className={`${isSourceDrawerOpen ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-50 flex w-[min(25rem,100vw)] flex-col border-l border-slate-200/80 bg-white/97 shadow-2xl backdrop-blur-xl transition-transform duration-200 dark:border-white/10 dark:bg-[#0c1018]/98 lg:relative lg:z-20 lg:shadow-none`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-white/10"><div><p className="flex items-center gap-2 text-sm font-black"><Library className="h-4 w-4 text-emerald-500" /> Source drawer</p><p className="mt-1 text-[10px] text-slate-400">Verify, open, and reuse Hanna’s evidence.</p></div><button onClick={() => setIsSourceDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close source drawer"><X className="h-4 w-4" /></button></div>
        {selectedSource ? <div className="border-b border-slate-200/80 p-4 dark:border-white/10"><button onClick={() => setSelectedSource(null)} className="mb-3 text-[10px] font-bold text-emerald-600">← All sources</button><p className="text-sm font-black leading-snug">{selectedSource.title}</p><p className="mt-1 text-[10px] font-bold text-emerald-600">{domain(selectedSource.url)}</p>{selectedSource.citedText && <blockquote className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-white/[.05] dark:text-slate-300">“{selectedSource.citedText}”</blockquote>}<a href={selectedSource.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white hover:bg-emerald-700">Open source <ExternalLink className="h-3.5 w-3.5" /></a></div> : <div className="flex-1 overflow-y-auto p-4"><div className="mb-5 rounded-2xl bg-emerald-500/10 p-3 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200"><p className="font-black">Research trace</p><p className="mt-1">Hanna’s response is grounded with links you can inspect. Open a card to see the supporting passage.</p></div>{sources.length ? <div className="space-y-2.5">{sources.map((source, index) => <SourceCard key={`${source.url}-${index}`} source={source} index={index} onOpen={openSource} />)}</div> : <div className="py-16 text-center text-xs text-slate-400"><Globe2 className="mx-auto mb-3 h-8 w-8 opacity-30" /><p>No sources in this conversation yet.</p><p className="mt-1 text-[10px]">Turn on web research and ask Hanna a question.</p></div>}{images.length ? <div className="mt-5"><ImageStrip images={images} onPreview={setSelectedImage} onDownload={handleDownloadImage} onExport={handleExportImage} /></div> : null}</div>}
        <div className="border-t border-slate-200/80 p-4 dark:border-white/10"><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => { setInputValue('Compare the sources used in the last answer and identify disagreements.'); setIsSourceDrawerOpen(false); composerRef.current?.focus(); }} className="h-9 rounded-xl text-[10px] font-bold"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Compare</Button><Button variant="outline" onClick={() => { setInputValue('Use only official or primary sources for the next answer.'); setIsSourceDrawerOpen(false); composerRef.current?.focus(); }} className="h-9 rounded-xl text-[10px] font-bold"><Pin className="mr-1.5 h-3.5 w-3.5" /> Official only</Button></div></div>
      </aside>
      {isSourceDrawerOpen && <button aria-label="Close sources overlay" onClick={() => setIsSourceDrawerOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" />}
      {selectedImage && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setSelectedImage(null)}><div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#11151d] shadow-2xl" onClick={event => event.stopPropagation()}><button onClick={() => setSelectedImage(null)} className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80" aria-label="Close image preview"><X className="h-4 w-4" /></button><img src={selectedImage.url} alt={selectedImage.title} className="max-h-[70vh] w-full object-contain" /><div className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-black text-white">{selectedImage.title}</p><p className="mt-1 text-[10px] text-slate-400">{selectedImage.creator ? `By ${selectedImage.creator}` : 'Image preview'}</p></div><div className="flex shrink-0 items-center gap-2"><button onClick={() => void handleDownloadImage(selectedImage)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/10"><Download className="h-3.5 w-3.5" /> Download</button><button onClick={() => void handleExportImage(selectedImage)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-2 text-xs font-black text-white hover:bg-blue-600"><Share2 className="h-3.5 w-3.5" /> Export</button><a href={selectedImage.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900 hover:bg-emerald-50">Learn more <ExternalLink className="h-3.5 w-3.5" /></a></div></div></div></div>}
    </div>
  </>;
}
