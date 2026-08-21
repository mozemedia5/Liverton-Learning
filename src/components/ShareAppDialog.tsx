/**
 * ShareAppDialog – Pinterest-style sharing container for Liverton Learning
 *
 * Design features:
 *  • Smooth fluid overlay matching Pinterest's signature rounded cards (rounded-[2.5rem])
 *  • Real-time friend/email search input ("Search by name or email")
 *  • Firestore-backed Liverton member search with chat handoff
 *  • Premium social circle icon carousel featuring signature brand colors:
 *    - Pinterest Red (#E60023)
 *    - WhatsApp Green (#25D366)
 *    - Messenger Gradient (#0084FF)
 *    - Facebook Blue (#1877F2)
 *    - Twitter/X Black (#000000)
 *    - Email Cyan (#00A86B)
 *    - Copy Link Gray
 *  • Role-aware link and message generation preserved
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Search,
  Copy,
  Check,
  X,
  Mail,
  MessageCircle,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareAppDialogProps {
  open: boolean;
  onClose: () => void;
}

// ─── App constants ─────────────────────────────────────────────────────────────

const APP_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
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
    `Liverton Learning gives education organizations a complete digital workspace — from learner programs and collaboration to analytics and community communication. Discover how it can elevate your organization.`,
  parent:
    `I've found a great platform to support my child's education. Liverton Learning keeps parents informed and involved in their child's academic journey. See what it's all about.`,
  platform_admin:
    `Liverton Learning is a comprehensive learning platform connecting students, educators, organizations, and families for seamless, modern learning. Explore the platform today.`,
};

const DEFAULT_MESSAGE =
  `Liverton Learning is a comprehensive learning platform connecting students, educators, organizations, and families for seamless, modern learning. Explore the platform today.`;

interface ShareContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatar?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ShareAppDialog({ open, onClose }: ShareAppDialogProps) {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  const regPath    = ROLE_PATHS[userRole || 'student'] ?? '/get-started';
  const shareUrl   = `${APP_BASE_URL}${regPath}`;
  const shareText  = SHARE_MESSAGES[userRole || ''] ?? DEFAULT_MESSAGE;
  const fullMessage = `${shareText}\n\n${shareUrl}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadContacts = async () => {
      setIsLoadingContacts(true);
      try {
        const snapshot = await getDocs(query(collection(db, 'users'), limit(30)));
        const nextContacts = snapshot.docs
          .filter((userDoc) => userDoc.id !== currentUser?.uid)
          .map((userDoc) => {
            const data = userDoc.data() as { fullName?: string; name?: string; role?: string; email?: string; profilePicture?: string; profileImageUrl?: string };
            return {
              id: userDoc.id,
              name: data.fullName || data.name || data.email || 'Liverton member',
              role: (data.role || 'member').replace('_', ' '),
              email: data.email,
              avatar: data.profilePicture || data.profileImageUrl,
            };
          });
        if (!cancelled) setContacts(nextContacts);
      } catch (error) {
        console.error('Unable to load Liverton contacts:', error);
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setIsLoadingContacts(false);
      }
    };
    loadContacts();
    return () => { cancelled = true; };
  }, [open, currentUser?.uid]);

  const filteredContacts = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) => `${contact.name} ${contact.role} ${contact.email || ''}`.toLowerCase().includes(normalized));
  }, [contacts, searchQuery]);

  const handleSendToFriend = (id: string, name: string) => {
    if (sentStatus[id]) return;
    setSentStatus((prev) => ({ ...prev, [id]: true }));
    navigate(`/chat?recipient=${encodeURIComponent(id)}&share=${encodeURIComponent(fullMessage)}`);
    toast.success(`Opening a chat with ${name}`);
    onClose();
  };

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

  // ── WhatsApp share ─────────────────────────────────────────────────────────
  const shareWhatsApp = () => {
    const text = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // ── Email share ────────────────────────────────────────────────────────────
  const shareByEmail = () => {
    const subject = encodeURIComponent(`Join me on ${APP_NAME}`);
    const body    = encodeURIComponent(fullMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // ── Messenger share ────────────────────────────────────────────────────────
  const shareMessenger = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/dialog/send?app_id=123456789&link=${url}&redirect_uri=${url}`, '_blank');
  };

  // ── Facebook share ─────────────────────────────────────────────────────────
  const shareFacebook = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  // ── Twitter / X share ──────────────────────────────────────────────────────
  const shareTwitter = () => {
    const text = encodeURIComponent(fullMessage);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  // ── Pinterest share ────────────────────────────────────────────────────────
  const sharePinterest = () => {
    const url = encodeURIComponent(shareUrl);
    const desc = encodeURIComponent(shareText);
    const media = encodeURIComponent(`${APP_BASE_URL}/icons/liverton-icon-512.png`);
    window.open(`https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${desc}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl transition-all duration-300">

        {/* Header section with absolute close */}
        <div className="p-6 pb-2 flex flex-col items-center relative border-b border-gray-50 dark:border-zinc-900">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-all duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">
            Send to friends
          </h2>
        </div>

        {/* Search Bar section */}
        <div className="px-6 py-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            <Input
              type="text"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 bg-gray-50 dark:bg-zinc-900/60 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-[#00A86B] text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Scrollable Friends/Classmates list */}
        <div className="px-6 max-h-[180px] overflow-y-auto space-y-3 scrollbar-none">
          {isLoadingContacts ? (
            <div className="text-center py-6"><p className="text-xs text-gray-500">Loading Liverton members…</p></div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => {
              const sent = sentStatus[contact.id];
              return (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shadow-sm bg-violet-100 text-violet-700">
                      {contact.avatar ? <img src={contact.avatar} alt="" className="h-full w-full object-cover" /> : contact.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                        {contact.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {contact.role}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSendToFriend(contact.id, contact.name)}
                    className={`rounded-full px-4 h-9 text-xs font-bold transition-all duration-300 ${
                      sent
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 cursor-default flex items-center gap-1'
                        : 'bg-[#E60023] hover:bg-[#ad001a] text-white shadow-sm hover:scale-105 active:scale-95'
                    }`}
                  >
                    {sent ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent
                      </>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-gray-500">No Liverton members match this search yet.</p>
            </div>
          )}
        </div>

        {/* Horizontal Carousel of Social Icons */}
        <div className="px-6 py-5 border-t border-gray-50 dark:border-zinc-900/50 mt-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            Share on other networks
          </p>
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth">

            {/* Copy Link */}
            <button
              onClick={() => copyToClipboard()}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm border border-gray-100/30 group-hover:scale-110 active:scale-90 transition-all duration-200">
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                Copy
              </span>
            </button>

            {/* Pinterest */}
            <button
              onClick={sharePinterest}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#E60023] flex items-center justify-center shadow-md group-hover:scale-110 active:scale-90 transition-all duration-200 text-white font-black text-xl">
                {/* Custom SVG Pinterest P Logo */}
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.16-.1-.95-.19-2.42.04-3.46.21-.94 1.37-5.8 1.37-5.8s-.35-.7-.35-1.74c0-1.63.95-2.85 2.13-2.85 1 0 1.49.75 1.49 1.66 0 1-.64 2.5-1 3.89-.28 1.18.59 2.14 1.76 2.14 2.11 0 3.74-2.23 3.74-5.45 0-2.85-2.05-4.84-4.97-4.84-3.39 0-5.38 2.54-5.38 5.17 0 1.02.39 2.12.88 2.72.1.12.11.23.08.35-.09.38-.3 1.23-.34 1.4-.06.24-.2.33-.46.21-1.72-.8-2.8-3.32-2.8-5.34 0-4.35 3.16-8.34 9.1-8.34 4.78 0 8.5 3.4 8.5 7.96 0 4.75-3 8.58-7.16 8.58-1.4 0-2.71-.73-3.16-1.59l-.86 3.28c-.31 1.2-.15 2.68-.08 2.87.1.08.2.1.2.1C18.84 24 24 18.84 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                Pinterest
              </span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={shareWhatsApp}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md group-hover:scale-110 active:scale-90 transition-all duration-200">
                <MessageCircle className="w-6 h-6 fill-current" />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                WhatsApp
              </span>
            </button>

            {/* Messenger */}
            <button
              onClick={shareMessenger}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#FF0099] flex items-center justify-center text-white shadow-md group-hover:scale-110 active:scale-90 transition-all duration-200">
                <MessageSquare className="w-6 h-6 fill-current" />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                Messenger
              </span>
            </button>

            {/* Facebook */}
            <button
              onClick={shareFacebook}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-md group-hover:scale-110 active:scale-90 transition-all duration-200">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                Facebook
              </span>
            </button>

            {/* Twitter / X */}
            <button
              onClick={shareTwitter}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white shadow-md border border-zinc-800/20 group-hover:scale-110 active:scale-90 transition-all duration-200">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                Twitter
              </span>
            </button>

            {/* Email */}
            <button
              onClick={shareByEmail}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#00A86B] flex items-center justify-center text-white shadow-md group-hover:scale-110 active:scale-90 transition-all duration-200">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                Email
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Message preview or close anchor */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
          <span className="truncate max-w-[280px]">Link: {shareUrl}</span>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#00A86B] font-semibold hover:underline flex items-center gap-0.5 shrink-0"
          >
            Visit <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </DialogContent>
    </Dialog>
  );
}
