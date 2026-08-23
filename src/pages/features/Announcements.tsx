import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  MoreHorizontal,
  Plus,
  Loader2,
  Trash2,
  User,
  Clock,
  Megaphone,
  Eye,
  EyeOff,
  BookOpen,
  Award,
  Sparkles,
  Inbox,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NotificationItem {
  id?: string;
  type: 'announcement' | 'quiz' | 'course' | 'reminder' | 'motivation';
  title: string;
  body: string;
  link?: string;
  targetAudience: string[];
  targetUsers?: string[];
  targetEmail?: string;
  sender: string;
  senderId: string;
  senderRole: string;
  createdAt: Date | Timestamp;
  expiresAt?: Date | Timestamp;
  isHidden?: boolean;
  hiddenBy?: string;
  hiddenAt?: Date | Timestamp;
  hideReason?: string;
  isRead?: boolean;
  readBy?: string[];
}

type TabCategory = 'all' | 'updates' | 'opportunities' | 'insights';

export default function Announcements() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabCategory>('all');
  const [sortAsc, setSortAsc] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [hideReason, setHideReason] = useState('');

  const isAdmin = userRole === 'platform_admin';
  const canCreate = userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';

  const getRoleAudienceKey = (role: string | null | undefined) => {
    switch (role) {
      case 'student': return 'students';
      case 'teacher': return 'teachers';
      case 'parent': return 'parents';
      case 'school_admin': return 'school_admins';
      default: return null;
    }
  };

  const tabs: { id: TabCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'updates', label: 'Updates' },
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'insights', label: 'Insights' },
  ];

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          type: d.type || 'announcement',
          title: d.title || '',
          body: d.body || d.message || '',
          link: d.link || d.redirectUrl || '',
          targetAudience: d.targetAudience || [],
          targetUsers: d.targetUsers || [],
          targetEmail: d.targetEmail || '',
          sender: d.sender || 'Unknown',
          senderId: d.senderId || '',
          senderRole: d.senderRole || '',
          createdAt: d.createdAt?.toDate() || new Date(),
          expiresAt: d.expiresAt?.toDate() || undefined,
          isHidden: d.isHidden || false,
          hiddenBy: d.hiddenBy || undefined,
          hiddenAt: d.hiddenAt?.toDate() || undefined,
          hideReason: d.hideReason || undefined,
          isRead: Boolean(d.isRead || (currentUser?.uid && Array.isArray(d.readBy) && d.readBy.includes(currentUser.uid))),
          readBy: Array.isArray(d.readBy) ? d.readBy : [],
        } as NotificationItem;
      });

      const now = new Date();
      let filtered = data;

      if (!isAdmin) {
        const myAudienceKey = getRoleAudienceKey(userRole);
        filtered = data.filter(a => {
          if (currentUser?.uid && a.senderId === currentUser.uid) return true;
          const notHidden = !a.isHidden;
          const notExpired = !a.expiresAt || (a.expiresAt instanceof Date ? a.expiresAt > now : true);

          if (a.targetUsers && a.targetUsers.length > 0) {
            return notHidden && notExpired && currentUser?.uid && a.targetUsers.includes(currentUser.uid);
          }
          if (a.targetEmail) {
            return notHidden && notExpired && currentUser?.email && a.targetEmail === currentUser.email.toLowerCase();
          }

          const targeted = a.targetAudience?.includes('all') || 
                           (myAudienceKey !== null && a.targetAudience?.includes(myAudienceKey));
          return notHidden && notExpired && targeted;
        });
      }

      setNotifications(filtered);
      setLoading(false);
    }, (error) => {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole, currentUser, isAdmin]);

  // Filter notifications based on tab category
  const filteredNotifications = notifications.filter(a => {
    if (activeTab === 'all') return true;
    if (activeTab === 'updates') {
      return a.type === 'announcement' || !a.type;
    }
    if (activeTab === 'opportunities') {
      return a.type === 'course' || a.type === 'quiz';
    }
    if (activeTab === 'insights') {
      return a.type === 'reminder' || a.type === 'motivation';
    }
    return true;
  }).sort((a, b) => {
    const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return sortAsc ? timeA - timeB : timeB - timeA;
  });

  const handleDelete = async () => {
    if (!selectedNotification?.id) return;
    try {
      await deleteDoc(doc(db, 'notifications', selectedNotification.id));
      toast.success('Notification deleted');
      setShowDeleteDialog(false);
      setSelectedNotification(null);
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleHide = async () => {
    if (!selectedNotification?.id || !currentUser?.uid) return;
    try {
      await updateDoc(doc(db, 'notifications', selectedNotification.id), {
        isHidden: true,
        hiddenBy: currentUser.uid,
        hiddenAt: Timestamp.now(),
        hideReason: hideReason || '',
      });
      toast.success('Notification hidden from users');
      setShowHideDialog(false);
      setHideReason('');
      setSelectedNotification(null);
    } catch (error) {
      toast.error('Failed to hide notification');
    }
  };

  const handleUnhide = async (a: NotificationItem) => {
    if (!a.id) return;
    try {
      await updateDoc(doc(db, 'notifications', a.id), {
        isHidden: false,
        hiddenBy: null,
        hiddenAt: null,
        hideReason: null,
      });
      toast.success('Notification restored');
    } catch (error) {
      toast.error('Failed to restore notification');
    }
  };

  const markNotificationAsRead = async (notification: NotificationItem) => {
    if (!notification.id || !currentUser?.uid || notification.isRead) return;
    try {
      await updateDoc(doc(db, 'notifications', notification.id), { readBy: arrayUnion(currentUser.uid) });
      setNotifications((current) => current.map(item => item.id === notification.id ? { ...item, isRead: true } : item));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'quiz':
        return { icon: Award, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/20', badge: 'secondary' as const, label: 'Quiz Alert' };
      case 'course':
        return { icon: BookOpen, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', badge: 'default' as const, label: 'New Course' };
      case 'reminder':
        return { icon: Clock, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-500/20', badge: 'secondary' as const, label: 'Reminder' };
      case 'motivation':
        return { icon: Sparkles, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-500/20', badge: 'outline' as const, label: 'Motivation' };
      default:
        return { icon: Megaphone, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', badge: 'outline' as const, label: 'Update' };
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* Top Header Bar matching screenshot structure */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full h-9 w-9 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <h1 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white">
            Notifications
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl glass-card">
              {canCreate && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/announcements/create')} className="gap-2 cursor-pointer">
                    <Plus className="w-4 h-4 text-emerald-500" />
                    <span>Create Notification</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => setSortAsc(!sortAsc)} className="gap-2 cursor-pointer">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Sort: {sortAsc ? 'Oldest First' : 'Recent First'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Notification Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter Pills / Chips Container */}
        <div className="max-w-3xl mx-auto pt-3 px-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 shrink-0 border
                    ${isActive
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State styled according to the screenshot layout */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-12 h-12 mb-4 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-800 dark:text-slate-200">
              <Inbox className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No notifications in {tabs.find(t => t.id === activeTab)?.label}
            </p>
          </div>
        ) : (
          /* Notifications List */
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const cfg = getTypeConfig(notif.type);
              const Icon = cfg.icon;

              return (
                <Card
                  key={notif.id}
                  className={`
                    group overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md
                    ${notif.isHidden
                      ? 'opacity-60 bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                      : notif.isRead
                        ? 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900/80 border-red-200 dark:border-red-900/70 shadow-sm shadow-red-100/60 dark:shadow-red-950/20'
                    }
                  `}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3.5">
                      {/* Category Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white leading-snug flex items-center gap-2">
                              {!notif.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" aria-label="Unread" />}
                              {notif.title}
                            </h4>
                            <Badge variant={cfg.badge} className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                              {cfg.label}
                            </Badge>
                            {notif.isHidden && (
                              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 rounded-full">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {notif.body}
                        </p>

                        {/* Metadata Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="flex items-center gap-1 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {notif.sender}
                            <span className="capitalize text-[10px] opacity-75">({notif.senderRole?.replace('_', ' ')})</span>
                          </span>

                          {/* Link Redirection */}
                          {notif.link && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                void markNotificationAsRead(notif);
                                if (notif.link?.startsWith('http')) {
                                  window.open(notif.link, '_blank', 'noopener,noreferrer');
                                } else {
                                  navigate(notif.link || '/');
                                }
                              }}
                              className="h-7 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium"
                            >
                              View Details →
                            </Button>
                          )}
                        </div>

                        {/* Admin / Sender Moderation Controls */}
                        {(isAdmin || currentUser?.uid === notif.senderId) && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            {isAdmin && (
                              notif.isHidden ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnhide(notif)}
                                  className="text-emerald-600 hover:text-emerald-700 h-7 text-xs px-2"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Unhide
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedNotification(notif);
                                    setShowHideDialog(true);
                                  }}
                                  className="text-amber-600 hover:text-amber-700 h-7 text-xs px-2"
                                >
                                  <EyeOff className="w-3.5 h-3.5 mr-1" />
                                  Hide
                                </Button>
                              )
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedNotification(notif);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-500 hover:text-red-600 h-7 text-xs px-2 ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Sticky Action Controls matching screenshot layout */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="rounded-xl px-6 h-10 border-slate-300 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 shadow-sm"
          >
            Back
          </Button>

          <Button
            variant="outline"
            onClick={() => setSortAsc(!sortAsc)}
            className="rounded-xl px-6 h-10 border-slate-300 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 shadow-sm"
          >
            {sortAsc ? 'Oldest' : 'Recent'}
          </Button>
        </div>
      </footer>

      {/* Hide Dialog */}
      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent className="rounded-2xl glass-card">
          <DialogHeader>
            <DialogTitle>Hide Notification</DialogTitle>
            <DialogDescription>
              Hiding this notification removes it from all non-admin user feeds immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label className="text-xs font-semibold text-slate-500">Moderation Reason</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700"
              placeholder="e.g. Outdated announcement details..."
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setShowHideDialog(false); setHideReason(''); }}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleHide}>Hide Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl glass-card">
          <DialogHeader>
            <DialogTitle>Delete Notification Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this notification? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}