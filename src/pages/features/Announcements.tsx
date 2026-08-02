import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  ArrowLeft, 
  Plus,
  Loader2,
  Trash2,
  Shield,
  User,
  Calendar,
  Clock,
  Megaphone,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  BookOpen,
  Award,
  Sparkles
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

interface NotificationItem {
  id?: string;
  type: 'announcement' | 'quiz' | 'course' | 'reminder' | 'motivation';
  title: string;
  body: string;
  link?: string;
  targetAudience: string[];
  sender: string;
  senderId: string;
  senderRole: string;
  createdAt: Date | Timestamp;
  expiresAt?: Date | Timestamp;
  isHidden?: boolean;
  hiddenBy?: string;
  hiddenAt?: Date | Timestamp;
  hideReason?: string;
}

export default function Announcements() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAudience, setFilterAudience] = useState<string>('all');
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

  const audienceFilters = isAdmin ? [
    { id: 'all', label: 'All' },
    { id: 'students', label: 'Students' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'parents', label: 'Parents' },
    { id: 'school_admins', label: 'School Admins' },
  ] : [
    { id: 'all', label: 'All' },
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
          sender: d.sender || 'Unknown',
          senderId: d.senderId || '',
          senderRole: d.senderRole || '',
          createdAt: d.createdAt?.toDate() || new Date(),
          expiresAt: d.expiresAt?.toDate() || undefined,
          isHidden: d.isHidden || false,
          hiddenBy: d.hiddenBy || undefined,
          hiddenAt: d.hiddenAt?.toDate() || undefined,
          hideReason: d.hideReason || undefined,
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

  const filteredNotifications = notifications.filter(a => {
    if (filterAudience === 'all') return true;
    return a.targetAudience?.includes(filterAudience);
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

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'quiz':
        return { icon: Award, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/20', badge: 'warning' as const, label: '📝 Quiz Alert' };
      case 'course':
        return { icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20', badge: 'default' as const, label: '📚 New Course' };
      case 'reminder':
        return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20', badge: 'secondary' as const, label: '⏰ Reminder' };
      case 'motivation':
        return { icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/20', badge: 'outline' as const, label: '✨ Daily Motivation' };
      default:
        return { icon: Megaphone, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', badge: 'outline' as const, label: '📢 Announcement' };
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg">Notification Center</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button onClick={() => navigate('/announcements/create')} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Notification
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        
        {/* Role Notice */}
        {!isAdmin && userRole && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 text-sm">
              🔔
            </div>
            <div>
              <span className="font-semibold block text-sm text-gray-900 dark:text-white capitalize">
                {userRole.replace('_', ' ')} Workspace Alerts
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                You are viewing standard announcements and task notifications broadcasted directly to you.
              </span>
            </div>
          </div>
        )}

        {/* Admin Banner */}
        {isAdmin && (
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shrink-0 text-sm">
              🛡️
            </div>
            <div>
              <span className="font-semibold block text-sm text-gray-900 dark:text-white">Admin Moderation mode</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                You have power to review, hide, or permanently purge notifications created by teachers and school admins.
              </span>
            </div>
          </div>
        )}

        {/* Audience Filters */}
        <div className="flex flex-wrap gap-2">
          {audienceFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={filterAudience === filter.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterAudience(filter.id)}
              className="rounded-full"
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Notifications Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs text-gray-500">Loading alerts...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">All caught up!</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              No notifications available at this moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notif) => {
              const cfg = getTypeConfig(notif.type);
              const Icon = cfg.icon;

              return (
                <Card
                  key={notif.id}
                  className={`
                    group overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-md
                    ${notif.isHidden ? 'opacity-60 bg-gray-100 dark:bg-gray-900/40' : 'bg-white dark:bg-slate-900'}
                  `}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <Icon className={`w-6 h-6 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                            {notif.title}
                          </h4>
                          <Badge variant={cfg.badge} className="text-[10px] uppercase font-bold tracking-wider">
                            {cfg.label}
                          </Badge>
                          {notif.isHidden && (
                            <Badge variant="destructive" className="text-[10px]">
                              Hidden
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {notif.body}
                        </p>

                        {/* Metadata bar */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-800">
                          <span className="flex items-center gap-1 font-medium">
                            <User className="w-3.5 h-3.5" />
                            {notif.sender}
                            <span className="capitalize text-[10px] opacity-75">({notif.senderRole?.replace('_', ' ')})</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>

                        {/* Link redirection */}
                        {notif.link && (
                          <div className="pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (notif.link?.startsWith('http')) {
                                  window.open(notif.link, '_blank', 'noopener,noreferrer');
                                } else {
                                  navigate(notif.link || '/');
                                }
                              }}
                              className="rounded-full text-xs font-semibold"
                            >
                              Open Attachment Link →
                            </Button>
                          </div>
                        )}

                        {/* Admin / Owner Actions */}
                        {(isAdmin || currentUser?.uid === notif.senderId) && (
                          <div className="flex items-center gap-2 pt-3 flex-wrap">
                            {isAdmin && (
                              notif.isHidden ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnhide(notif)}
                                  className="text-emerald-600 hover:text-emerald-700 h-8"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
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
                                  className="text-amber-600 hover:text-amber-700 h-8"
                                >
                                  <EyeOff className="w-4 h-4 mr-1" />
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
                              className="text-red-500 hover:text-red-600 h-8"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete Alert
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

      {/* Hide Dialog */}
      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hide Notification</DialogTitle>
            <DialogDescription>
              Hiding this notification removes it from all non-admin user feeds immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label className="text-xs font-semibold text-gray-500">Moderation Reason</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded-xl bg-white dark:bg-gray-900"
              placeholder="e.g. Outdated announcement details..."
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setShowHideDialog(false); setHideReason(''); }}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={handleHide}>Hide Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl">
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