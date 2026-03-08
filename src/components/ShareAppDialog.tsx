/**
 * ShareAppDialog – Share the Liverton Learning application
 *
 * Platforms: WhatsApp, Telegram, Twitter/X, Facebook, LinkedIn,
 *            Instagram (copy), Reddit, Discord (copy), Email,
 *            and native Web Share API.
 *
 * The dialog shows:
 *  • App name + short description
 *  • Role-specific registration link
 *  • Grid of share platform buttons
 *  • Copy-to-clipboard
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface ShareAppDialogProps {
  open: boolean;
  onClose: () => void;
}

// ─── App meta ─────────────────────────────────────────────────────────────

const APP_URL  = 'https://liverton-learning.pages.dev';
const APP_NAME = 'Liverton Learning';
const APP_DESC =
  'A comprehensive educational platform connecting students, teachers, schools and parents for seamless learning, live lessons, quizzes, and progress tracking.';

// Role-specific registration landing
const REGISTER_PATHS: Record<string, string> = {
  student:       '/register/student',
  teacher:       '/register/teacher',
  school_admin:  '/register/school-admin',
  parent:        '/register/parent',
  platform_admin: '/get-started',
};

// ─── Share platforms ──────────────────────────────────────────────────────

interface Platform {
  id:    string;
  label: string;
  color: string;
  bg:    string;
  icon:  string;
  build: (text: string, url: string) => string | null; // null = copy-only
}

const platforms: Platform[] = [
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
    id: 'reddit', label: 'Reddit', color: 'text-white', bg: 'bg-[#FF4500]',
    icon: '🔴',
    build: (t, u) => `https://reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
  },
  {
    id: 'email', label: 'Email', color: 'text-white', bg: 'bg-gray-600',
    icon: '✉️',
    build: (t, u) => `mailto:?subject=${encodeURIComponent(APP_NAME)}&body=${encodeURIComponent(`${t}\n\n${u}`)}`,
  },
  {
    id: 'instagram', label: 'Instagram', color: 'text-white',
    bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    icon: '📸',
    build: () => null, // copy only
  },
  {
    id: 'discord', label: 'Discord', color: 'text-white', bg: 'bg-[#5865F2]',
    icon: '🎮',
    build: () => null, // copy only
  },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function ShareAppDialog({ open, onClose }: ShareAppDialogProps) {
  const { userRole } = useAuth();
  const [copied, setCopied] = useState(false);

  // Build share text + URL
  const regPath  = REGISTER_PATHS[userRole || 'student'] ?? '/get-started';
  const shareUrl = `${APP_URL}${regPath}`;
  const shareText =
    `🎓 Join me on ${APP_NAME}!\n\n${APP_DESC}\n\nSign up here 👇`;

  const fullMessage = `${shareText}\n${shareUrl}`;

  // Copy to clipboard
  const copyToClipboard = async (value?: string) => {
    const text = value ?? fullMessage;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy – please copy manually.');
    }
  };

  // Web Share API (mobile)
  const nativeShare = async () => {
    if (!navigator.share) {
      copyToClipboard();
      return;
    }
    try {
      await navigator.share({
        title: APP_NAME,
        text:  `${shareText}`,
        url:   shareUrl,
      });
    } catch {
      // user cancelled or not supported – silent
    }
  };

  const handlePlatform = (platform: Platform) => {
    const url = platform.build(shareText, shareUrl);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // copy-only platform
      copyToClipboard(fullMessage);
      toast.success(`Link copied! Paste it into ${platform.label}.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="p-5 pb-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold leading-tight">
                  Share Liverton Learning
                </DialogTitle>
                <p className="text-white/80 text-xs mt-0.5">Invite friends & family</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5">

          {/* App description card */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <span className="text-white dark:text-black font-bold text-xs">LL</span>
              </div>
              <span className="font-bold text-sm">{APP_NAME}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {APP_DESC}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium truncate">
                {shareUrl}
              </span>
            </div>
          </div>

          {/* Share platforms grid */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Share via
            </p>
            <div className="grid grid-cols-3 gap-2">
              {platforms.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePlatform(p)}
                  className={`${p.bg} ${p.color} flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center transition-all hover:opacity-90 active:scale-95 shadow-sm`}
                >
                  <span className="text-lg leading-none">{p.icon}</span>
                  <span className="text-[10px] font-semibold leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {/* Native share (mobile) */}
            {'share' in navigator && (
              <Button
                onClick={nativeShare}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            )}

            {/* Copy link */}
            <Button
              onClick={() => copyToClipboard()}
              variant="outline"
              className="flex-1 rounded-xl gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>

            {/* Email */}
            <Button
              onClick={() => handlePlatform(platforms.find(p => p.id === 'email')!)}
              variant="outline"
              size="icon"
              className="rounded-xl flex-shrink-0"
              aria-label="Share via email"
            >
              <Mail className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
