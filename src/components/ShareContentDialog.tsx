/**
 * ShareContentDialog – Share professional content (Courses, Quizzes, Lessons, Events, Documents)
 *
 * • Share externally: WhatsApp, Facebook, Instagram, TikTok, Telegram, Threads, Messenger, Email
 * • Share in-app: Opens internal share sheet with contact search
 * • Professional design with real platform brand colors
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Share2,
  Copy,
  Check,
  X,
  Mail,
  MessageSquare,
  Search,
  Send,
  ExternalLink,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listenToUserChats, sendMessage } from '@/services/chatService';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ShareContentItem {
  type:        'course' | 'lesson' | 'quiz' | 'event' | 'document';
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

interface Platform {
  id: string;
  label: string;
  bg: string;
  icon: React.ReactNode;
  build: (text: string, url: string) => string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────

const APP_URL = 'https://liverton-learning.vercel.app';

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
    id: 'tiktok',
    label: 'TikTok',
    bg: 'bg-black',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.14 1.01.23 2.1 1.01 2.73.91.72 2.19.74 3.11.12.8-.54 1.29-1.43 1.42-2.39.13-1.62.07-3.25.1-4.88.01-4.56-.02-9.12.03-13.68z" />
      </svg>
    ),
    build: (_t, _u) => `https://www.tiktok.com/`, // TikTok sharing is primarily mobile-native
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
  }
];

// ─── Component ────────────────────────────────────────────────────────────

export default function ShareContentDialog({
  open,
  onClose,
  item,
}: ShareContentDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'external' | 'internal'>('external');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch contacts for internal share
  useEffect(() => {
    if (open && activeTab === 'internal' && user) {
      setLoading(true);
      const unsubscribe = listenToUserChats(user.uid, (chats) => {
        setContacts(chats);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [open, activeTab, user]);

  if (!item) return null;

  const label    = {
    course: 'Course',
    lesson: 'Live Lesson',
    quiz:   'Quiz',
    event:  'Event',
    document: 'Document'
  }[item.type];

  const emoji    = {
    course: '📚',
    lesson: '🎥',
    quiz:   '📝',
    event:  '📅',
    document: '📄'
  }[item.type];

  const path     = {
    course: `/student/courses`,
    lesson: `/student/zoom-lessons`,
    quiz:   `/student/quizzes`,
    event:  `/calendar`,
    document: `/dashboard/documents/${item.id}`
  }[item.type];

  const shareUrl  = `${APP_URL}${path}`;
  const shareText = `${emoji} Check out this ${label}: "${item.title}" on Liverton Learning!`;
  const fullMsg   = `${shareText}\n\n${shareUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullMsg);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  const handleExternalShare = (platform: Platform) => {
    const url = platform.build(shareText, shareUrl);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      handleNativeShare();
    }
  };

  const handleInternalShare = async (contact: any) => {
    if (!user) return;
    try {
      await sendMessage(contact.id, user.uid, fullMsg);
      toast.success(`Shared with ${contact.name}`);
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden bg-white dark:bg-gray-950 border-none shadow-2xl">

        {/* Header Section */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-2xl shadow-inner">
                {emoji}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  Share {label}
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{item.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl">
            <button
              onClick={() => setActiveTab('external')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'external'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Share2 className="w-4 h-4" />
              External
            </button>
            <button
              onClick={() => setActiveTab('internal')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'internal'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              In-App
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 pt-0">
          {activeTab === 'external' ? (
            <div className="space-y-6">
              {/* Native Share / Copy Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleNativeShare}
                  className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  System Share
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="h-12 px-6 rounded-2xl font-bold gap-2 border-2"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              {/* Platform Grid */}
              <div className="grid grid-cols-4 gap-4">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleExternalShare(platform)}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className={`w-14 h-14 ${platform.bg} text-white rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95 shadow-lg`}>
                      {platform.icon}
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                      {platform.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Preview Card */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Share Preview</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed italic">
                  "{shareText}"
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Internal Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 rounded-2xl border-none bg-gray-100 dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              {/* Contact List */}
              <ScrollArea className="h-[280px] -mx-2 px-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Loading contacts...</span>
                  </div>
                ) : filteredContacts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600">
                            {contact.photoURL ? (
                              <img src={contact.photoURL} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              contact.name?.[0]
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{contact.name}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleInternalShare(contact)}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[240px] text-gray-400 gap-3">
                    <MessageSquare className="w-12 h-12 opacity-20" />
                    <p className="text-sm font-medium">No active chats found</p>
                    <Button
                      variant="link"
                      onClick={() => navigate('/chat')}
                      className="text-blue-600 dark:text-blue-400 font-bold"
                    >
                      Go to Messages
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
