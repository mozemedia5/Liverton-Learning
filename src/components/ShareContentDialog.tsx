import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Copy, Link2, MessageSquare, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listenToUserChats } from '@/services/chatService';
import type { Chat } from '@/types';

export interface ShareContentItem {
  type: 'course' | 'module' | 'lesson' | 'resource' | 'book';
  id: string;
  title: string;
  description?: string;
  teacherName?: string;
  subject?: string;
  path?: string;
  coverUrl?: string;
  isFree?: boolean;
  price?: number;
  currency?: string;
}

interface ShareContentDialogProps { open: boolean; onClose: () => void; item: ShareContentItem | null; }
const APP_URL = 'https://liverton-learning.vercel.app';

export default function ShareContentDialog({ open, onClose, item }: ShareContentDialogProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!open || !currentUser?.uid) return;
    return listenToUserChats(currentUser.uid, setChats);
  }, [open, currentUser?.uid]);

  const shareUrl = useMemo(() => {
    if (!item) return APP_URL;
    const fallback = item.type === 'lesson' ? `/zoom-lessons/${item.id}` : item.type === 'resource' || item.type === 'book' ? `/features/books/${item.id}` : `/courses/${item.id}`;
    return `${APP_URL}${item.path || fallback}`;
  }, [item]);
  if (!item) return null;

  const label = item.type === 'lesson' ? 'Lesson' : item.type === 'resource' || item.type === 'book' ? 'Resource' : 'Module';
  const shareText = `Explore ${label.toLowerCase()} “${item.title}”${item.teacherName ? ` by ${item.teacherName}` : ''}${item.subject ? ` · ${item.subject}` : ''} on Liverton Learning.`;
  const fullMsg = `${shareText}\n${shareUrl}`;

  const copyToClipboard = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); toast.success('Product link copied.'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Could not copy the product link.'); }
  };

  const chatLabel = (chat: Chat) => {
    if (chat.title) return chat.title;
    const names = Object.entries(chat.participantNames || {}).filter(([id]) => id !== currentUser?.uid).map(([, name]) => name);
    return names.join(', ') || 'Liverton conversation';
  };

  const getRecentSnippet = (chat: Chat): string => {
    if (typeof chat.lastMessage === 'string') return chat.lastMessage;
    if (chat.lastMessage && typeof (chat.lastMessage as any).content === 'string') return (chat.lastMessage as any).content;
    return chat.participants.length > 2 ? 'Team conversation' : 'Direct conversation';
  };

  const shareInChat = (chat: Chat) => {
    const metadata = encodeURIComponent(JSON.stringify(item));
    navigate(`/chat/${chat.id}?share=${encodeURIComponent(fullMsg)}&shareMeta=${metadata}`);
    onClose();
    toast.success(`Ready to share in ${chatLabel(chat)}.`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-4 bg-slate-950 text-white">
          <div className="flex items-center justify-between">
            <div className="pr-4 min-w-0">
              <DialogTitle className="text-white text-base font-bold">Share {label}</DialogTitle>
              <p className="text-white/70 text-xs mt-1 truncate">{item.title}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
            <div className="flex items-start gap-3">
              <Link2 className="w-5 h-5 mt-0.5 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-tight">{item.title}</p>
                {item.price && item.price > 0 ? (
                  <span className="inline-block mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    Paid Module · {item.currency || 'UGX'} {item.price.toLocaleString()}
                  </span>
                ) : (
                  <span className="inline-block mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Free Module
                  </span>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  A secure Liverton link opens this {label.toLowerCase()}.
                </p>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Share in Liverton</p>
              <span className="text-[10px] text-slate-400">People and teams</span>
            </div>
            {chats.length === 0 ? (
              <p className="text-xs text-slate-500 rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
                No conversations yet. Start a chat first, then return here to share this product.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {chats.filter(chat => chat.type !== 'hanna').map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => shareInChat(chat)}
                    className="w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 grid place-items-center flex-shrink-0">
                      {chat.participants.length > 2 ? <Users className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm truncate leading-tight">{chatLabel(chat)}</strong>
                      <small className="block text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {getRecentSnippet(chat)}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button onClick={onClose} variant="outline" className="rounded-xl">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
