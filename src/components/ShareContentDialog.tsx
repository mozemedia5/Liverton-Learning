/**
 * ShareContentDialog – Share a course or live lesson
 *
 * • Share externally: WhatsApp, Telegram, Twitter/X, Facebook, LinkedIn, Email, copy
 * • Share in-app: opens the in-app Chat and pre-fills the message
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Share2,
  Copy,
  Check,
  X,
  Mail,
  MessageSquare,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ShareContentItem {
  type:        'course' | 'lesson';
  id:          string;
  title:       string;
  description?: string;
  teacherName?: string;
  subject?:    string;
}

interface ShareContentDialogProps {
  open:    boolean;
  onClose: () => void;
  item:    ShareContentItem | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const APP_URL = 'https://liverton-learning.vercel.app';

interface ExternalPlatform {
  id:    string;
  label: string;
  color: string;
  bg:    string;
  icon:  string;
  build: (text: string, url: string) => string | null;
}

const externalPlatforms: ExternalPlatform[] = [
  {
    id: 'whatsapp', label: 'WhatsApp', color: 'text-white', bg: 'bg-[#25D366]',
    icon: '💬',
    build: (t, u) => `https://wa.me/?text=${encodeURIComponent(`${t}\n${u}`)}`,
  },
  {
    id: 'telegram', label: 'Telegram', color: 'text-white', bg: 'bg-[#229ED9]',
    icon: '✈️',
    build: (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    id: 'twitter', label: 'Twitter / X', color: 'text-white', bg: 'bg-black',
    icon: '𝕏',
    build: (t, u) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  },
  {
    id: 'facebook', label: 'Facebook', color: 'text-white', bg: 'bg-[#1877F2]',
    icon: 'f',
    build: (_t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    id: 'linkedin', label: 'LinkedIn', color: 'text-white', bg: 'bg-[#0A66C2]',
    icon: 'in',
    build: (t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}&summary=${encodeURIComponent(t)}`,
  },
  {
    id: 'email', label: 'Email', color: 'text-white', bg: 'bg-gray-600',
    icon: '✉️',
    build: (t, u) => `mailto:?subject=${encodeURIComponent('Check this out on Liverton Learning')}&body=${encodeURIComponent(`${t}\n\n${u}`)}`,
  },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function ShareContentDialog({
  open,
  onClose,
  item,
}: ShareContentDialogProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const label    = item.type === 'course' ? 'Course' : 'Live Lesson';
  const emoji    = item.type === 'course' ? '📚' : '🎥';
  const path     = item.type === 'course'
    ? `/student/courses`
    : `/student/zoom-lessons`;
  const shareUrl  = `${APP_URL}${path}`;

  const teacherLine = item.teacherName ? ` by ${item.teacherName}` : '';
  const subjLine    = item.subject     ? ` · ${item.subject}`       : '';

  const shareText =
    `${emoji} Check out "${item.title}"${teacherLine}${subjLine} on Liverton Learning!\n` +
    (item.description ? `\n${item.description.slice(0, 120)}${item.description.length > 120 ? '…' : ''}\n` : '');

  const fullMsg = `${shareText}\n${shareUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullMsg);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy – please copy manually.');
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) { copyToClipboard(); return; }
    try {
      await navigator.share({ title: item.title, text: shareText, url: shareUrl });
    } catch { /* cancelled */ }
  };

  const handleExternal = (platform: ExternalPlatform) => {
    const url = platform.build(shareText, shareUrl);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else { copyToClipboard(); toast.success(`Link copied! Paste into ${platform.label}.`); }
  };

  const shareInAppChat = () => {
    // Navigate to chat and pass the share content via query param
    const encoded = encodeURIComponent(fullMsg);
    navigate(`/chat?share=${encoded}`);
    onClose();
    toast.success('Opening chat — paste your message to share!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className={`p-5 pb-3 text-white ${item.type === 'course' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-green-600 to-teal-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {emoji}
              </div>
              <div>
                <DialogTitle className="text-white text-base font-bold leading-tight line-clamp-1">
                  Share {label}
                </DialogTitle>
                <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{item.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">

          {/* Preview card */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 space-y-1">
            <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
            {item.teacherName && (
              <p className="text-xs text-gray-500">👩‍🏫 {item.teacherName}{item.subject ? ` · ${item.subject}` : ''}</p>
            )}
            {item.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
            )}
          </div>

          {/* In-app Chat share */}
          <button
            onClick={shareInAppChat}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Share in App Chat</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Send to a friend inside Liverton Learning</p>
            </div>
          </button>

          {/* External platforms */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Share externally</p>
            <div className="grid grid-cols-3 gap-2">
              {externalPlatforms.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleExternal(p)}
                  className={`${p.bg} ${p.color} flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all hover:opacity-90 active:scale-95 shadow-sm`}
                >
                  <span className="text-base leading-none">{p.icon}</span>
                  <span className="text-[9px] font-semibold leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy + native share */}
          <div className="flex gap-2">
            {'share' in navigator && (
              <Button
                onClick={nativeShare}
                size="sm"
                className={`flex-1 rounded-xl gap-1.5 text-white ${item.type === 'course' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            )}
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              onClick={() => handleExternal(externalPlatforms.find(p => p.id === 'email')!)}
              variant="outline"
              size="icon"
              className="rounded-xl flex-shrink-0 h-8 w-8"
              aria-label="Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
