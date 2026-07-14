/**
 * ShareAppDialog – Professional app-wide sharing
 *
 * Design:
 *  • Real platform brand colors and SVGs
 *  • Role-aware sharing messages
 *  • Native Web Share API integration
 *  • High-end professional UI
 */

import React, { useState } from 'react';
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
  ExternalLink,
  Smartphone,
  Globe
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────

const APP_BASE_URL = 'https://liverton-learning.vercel.app';
const APP_NAME     = 'Liverton Learning';

const ROLE_PATHS: Record<string, string> = {
  student:        '/get-started',
  teacher:        '/get-started',
  school_admin:   '/get-started',
  parent:         '/get-started',
  platform_admin: '/get-started',
};

const SHARE_MESSAGES: Record<string, string> = {
  student:
    `I've been using Liverton Learning — an advanced education platform that makes studying smarter. Join me today!`,
  teacher:
    `Liverton Learning is transforming how educators teach. Create courses, manage students, and more. Come explore it with me.`,
  school_admin:
    `Liverton Learning provides schools with complete digital infrastructure. Discover how it can elevate your institution.`,
  parent:
    `I've found a great platform to support my child's education. Liverton Learning keeps parents informed and involved.`,
  platform_admin:
    `Liverton Learning is a comprehensive educational platform connecting students, teachers, schools, and parents.`,
};

const DEFAULT_MESSAGE =
  `Liverton Learning is a comprehensive educational platform for seamless, modern learning. Explore it today!`;

interface Platform {
  id: string;
  label: string;
  bg: string;
  icon: React.ReactNode;
  build: (text: string, url: string) => string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    bg: 'bg-[#25D366]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    build: (t, u) => `https://wa.me/?text=${encodeURIComponent(`${t}\n${u}`)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    bg: 'bg-[#1877F2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    build: (_t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    id: 'messenger',
    label: 'Messenger',
    bg: 'bg-[#00B2FF]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.112.309 2.298.474 3.443.474 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.291 14.174l-3.041-3.243-5.93 3.243 6.522-6.93 3.125 3.243 5.845-3.243-6.521 6.93z" />
      </svg>
    ),
    build: (_t, u) => `fb-messenger://share/?link=${encodeURIComponent(u)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    bg: 'bg-[#229ED9]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.944 0C5.347 0 0 5.347 0 11.944c0 6.597 5.347 11.944 11.944 11.944 6.597 0 11.944-5.347 11.944-11.944C23.888 5.347 18.541 0 11.944 0zm5.83 8.163l-2.022 9.535c-.15.674-.551.841-1.116.523l-3.078-2.27-1.485 1.428c-.164.164-.301.301-.617.301l.221-3.136 5.71-5.158c.248-.221-.053-.344-.384-.124l-7.056 4.443-3.039-.95c-.661-.206-.674-.661.138-.977l11.879-4.579c.551-.206 1.034.124.843.987z" />
      </svg>
    ),
    build: (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    id: 'threads',
    label: 'Threads',
    bg: 'bg-black',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.164 0C5.446 0 0 5.446 0 12.164s5.446 12.164 12.164 12.164 12.164-5.446 12.164-12.164S18.882 0 12.164 0zm0 17.525c-3.036 0-5.508-2.472-5.508-5.508s2.472-5.508 5.508-5.508 5.508 2.472 5.508 5.508-2.472 5.508-5.508 5.508zm2.496-5.508c0 1.378-1.118 2.496-2.496 2.496s-2.496-1.118-2.496-2.496 1.118-2.496 2.496-2.496 2.496 1.118 2.496 2.496z" />
      </svg>
    ),
    build: (t, u) => `https://threads.net/intent/post?text=${encodeURIComponent(`${t}\n${u}`)}`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    bg: 'bg-black',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.14 1.01.23 2.1 1.01 2.73.91.72 2.19.74 3.11.12.8-.54 1.29-1.43 1.42-2.39.13-1.62.07-3.25.1-4.88.01-4.56-.02-9.12.03-13.68z" />
      </svg>
    ),
    build: () => `https://www.tiktok.com/`,
  }
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function ShareAppDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { userRole } = useAuth();
  const [copied, setCopied] = useState(false);

  const regPath    = ROLE_PATHS[userRole || 'student'] ?? '/get-started';
  const shareUrl   = `${APP_BASE_URL}${regPath}`;
  const shareText  = SHARE_MESSAGES[userRole || ''] ?? DEFAULT_MESSAGE;
  const fullMessage = `${shareText}\n\n${shareUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy automatically');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: APP_NAME,
          text:  shareText,
          url:   shareUrl,
        });
      } catch (err) {
        console.log('Native share cancelled');
      }
    } else {
      copyToClipboard();
    }
  };

  const handleExternalShare = (platform: Platform) => {
    const url = platform.build(shareText, shareUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden bg-white dark:bg-gray-950 border-none shadow-2xl">

        {/* Modern Header */}
        <div className="p-8 bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white">
          <div className="flex justify-between items-start mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl">
              <img src="/icons/icon-512x512.png" className="w-12 h-12 object-contain" alt="LL" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight mb-2">
            Invite to {APP_NAME}
          </DialogTitle>
          <p className="text-white/80 text-sm font-medium leading-relaxed max-w-[240px]">
            Help your friends and colleagues discover the future of education.
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Action Grid */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleNativeShare}
              className="h-16 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <Smartphone className="w-6 h-6" />
              Share Now
            </button>
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="h-16 rounded-3xl border-2 font-bold text-base gap-3 transition-all active:scale-95"
            >
              {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          </div>

          {/* Social Platforms */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quick Social</span>
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleExternalShare(platform)}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className={`w-12 h-12 ${platform.bg} rounded-[18px] flex items-center justify-center text-white transition-all group-hover:scale-110 group-hover:-rotate-6 shadow-xl`}>
                    {platform.icon}
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter transition-colors group-hover:text-gray-900 dark:group-hover:text-white">
                    {platform.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Preview */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-[24px] p-5 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Share Preview</span>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed italic">
              "{shareText}"
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
