/**
 * ShareAppDialog – Share the Liverton Learning application
 *
 * Design:
 *  • Uses the official URL: liverton-learning.vercel.app
 *  • Role-aware link — directs new users to the correct registration page
 *  • Clean "Share" button that triggers the native Web Share API (mobile)
 *    or falls back gracefully to a manual share sheet on desktop
 *  • Copy Link button for quick clipboard access
 *  • Professional, concise share message
 *  • No cluttered social media icon grid
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
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareAppDialogProps {
  open: boolean;
  onClose: () => void;
}

// ─── App constants ─────────────────────────────────────────────────────────────

const APP_BASE_URL = 'https://liverton-learning.vercel.app';
const APP_NAME     = 'Liverton Learning';

// Role-specific landing pages
const ROLE_PATHS: Record<string, string> = {
  student:        '/get-started',
  teacher:        '/get-started',
  school_admin:   '/get-started',
  parent:         '/get-started',
  platform_admin: '/get-started',
};

// Professional share messages per role
const SHARE_MESSAGES: Record<string, string> = {
  student:
    `I've been using Liverton Learning — an advanced education platform that makes studying smarter and more effective. Join me today and take your learning to the next level.`,
  teacher:
    `Liverton Learning is transforming how educators teach. Create courses, manage students, conduct live lessons, and track progress — all in one powerful platform. Come explore it with me.`,
  school_admin:
    `Liverton Learning provides schools with a complete digital infrastructure — from student enrolment and class management to analytics and parent communication. Discover how it can elevate your institution.`,
  parent:
    `I've found a great platform to support my child's education. Liverton Learning keeps parents informed and involved in their child's academic journey. See what it's all about.`,
  platform_admin:
    `Liverton Learning is a comprehensive educational platform connecting students, teachers, schools, and parents for seamless, modern learning. Explore the platform today.`,
};

const DEFAULT_MESSAGE =
  `Liverton Learning is a comprehensive educational platform connecting students, teachers, schools, and parents for seamless, modern learning. Explore the platform today.`;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ShareAppDialog({ open, onClose }: ShareAppDialogProps) {
  const { userRole } = useAuth();
  const [copied, setCopied] = useState(false);

  const regPath    = ROLE_PATHS[userRole || 'student'] ?? '/get-started';
  const shareUrl   = `${APP_BASE_URL}${regPath}`;
  const shareText  = SHARE_MESSAGES[userRole || ''] ?? DEFAULT_MESSAGE;
  const fullMessage = `${shareText}\n\n${shareUrl}`;

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  const copyToClipboard = async (value?: string) => {
    const text = value ?? shareUrl;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Unable to copy. Please copy the link manually.');
    }
  };

  // ── Native Web Share (mobile / modern browsers) ────────────────────────────
  const nativeShare = async () => {
    if (!navigator.share) {
      // Fallback: copy to clipboard
      await copyToClipboard(fullMessage);
      return;
    }
    try {
      await navigator.share({
        title: APP_NAME,
        text:  shareText,
        url:   shareUrl,
      });
    } catch {
      // User dismissed or share failed — silent
    }
  };

  // ── Email share ────────────────────────────────────────────────────────────
  const shareByEmail = () => {
    const subject = encodeURIComponent(`Join me on ${APP_NAME}`);
    const body    = encodeURIComponent(fullMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // ── WhatsApp share ─────────────────────────────────────────────────────────
  const shareWhatsApp = () => {
    const text = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* App icon */}
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                <img
                  src="/icons/icon-96x96.png"
                  alt="Liverton Learning"
                  className="w-9 h-9 object-contain"
                  onError={e => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = 'none';
                    if (t.parentElement) {
                      t.parentElement.innerHTML =
                        '<span class="text-purple-700 font-extrabold text-sm">LL</span>';
                    }
                  }}
                />
              </div>
              <div>
                <DialogTitle className="text-white text-base font-bold leading-tight">
                  Share {APP_NAME}
                </DialogTitle>
                <p className="text-white/80 text-xs mt-0.5">
                  Invite others to join the platform
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5">

          {/* ── Share message preview ─────────────────────────────────────── */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2 border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {shareText}
            </p>
            <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1 hover:underline break-all"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {shareUrl}
              </a>
            </div>
          </div>

          {/* ── Primary action buttons ────────────────────────────────────── */}
          <div className="space-y-2">

            {/* Share button (native Web Share / mobile) */}
            <Button
              onClick={nativeShare}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl gap-2 h-11 font-semibold"
            >
              <Share2 className="w-4 h-4" />
              Share Now
            </Button>

            {/* Copy Link */}
            <Button
              onClick={() => copyToClipboard()}
              variant="outline"
              className="w-full rounded-xl gap-2 h-11"
            >
              {copied
                ? <Check className="w-4 h-4 text-green-500" />
                : <Copy className="w-4 h-4" />
              }
              {copied ? 'Link Copied!' : 'Copy Link'}
            </Button>
          </div>

          {/* ── Quick share shortcuts ─────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Share via
            </p>
            <div className="flex gap-2">
              {/* WhatsApp */}
              <button
                onClick={shareWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>

              {/* Email */}
              <button
                onClick={shareByEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
