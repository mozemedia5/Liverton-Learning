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
  EyeOff
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

interface TextAnnouncement {
  id?: string;
  title: string;
  message: string;
  priority: 'normal' | 'urgent' | 'info';
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
  const [announcements, setAnnouncements] = useState<TextAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<TextAnnouncement | null>(null);
  const [hideReason, setHideReason] = useState('');

  const isAdmin = userRole === 'platform_admin';
  const canCreate = userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';

  // Map userRole to the audience key used in targetAudience array
  const getRoleAudienceKey = (role: string | null | undefined) => {
    switch (role) {
      case 'student': return 'students';
      case 'teacher': return 'teachers';
      case 'parent': return 'parents';
      case 'school_admin': return 'school_admins';
      default: return null;
    }
  };

  // For admins: show all filter options. For others: only show their own category
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
    const q = query(collection(db, 'textAnnouncements'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: d.title || '',
          message: d.message || '',
          priority: d.priority || 'normal',
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
        } as TextAnnouncement;
      });

      const now = new Date();
      let filtered = data;

      if (!isAdmin) {
        const myAudienceKey = getRoleAudienceKey(userRole);
        filtered = data.filter(a => {
          // User can always see their own announcements
          if (currentUser?.uid && a.senderId === currentUser.uid) return true;
          // Must not be hidden
          const notHidden = !a.isHidden;
          // Must not be expired (2-day window from createdAt)
          const notExpired = !a.expiresAt || (a.expiresAt instanceof Date ? a.expiresAt > now : true);
          // STRICT role targeting: only see announcements for own role OR 'all'
          // e.g. students ONLY see announcements targeted at 'students' or 'all'
          // teachers ONLY see announcements targeted at 'teachers' or 'all'
          const targeted = a.targetAudience?.includes('all') || 
                           (myAudienceKey !== null && a.targetAudience?.includes(myAudienceKey));
          return notHidden && notExpired && targeted;
        });
      }

      setAnnouncements(filtered);
      setLoading(false);
    }, (error) => {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole, currentUser, isAdmin]);

  const filteredAnnouncements = announcements.filter(a => {
    if (filterAudience === 'all') return true;
    return a.targetAudience?.includes(filterAudience);
  });

  const handleDelete = async () => {
    if (!selectedAnnouncement?.id) return;
    try {
      await deleteDoc(doc(db, 'textAnnouncements', selectedAnnouncement.id));
      toast.success('Announcement deleted');
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const handleHide = async () => {
    if (!selectedAnnouncement?.id || !currentUser?.uid) return;
    try {
      await updateDoc(doc(db, 'textAnnouncements', selectedAnnouncement.id), {
        isHidden: true,
        hiddenBy: currentUser.uid,
        hiddenAt: Timestamp.now(),
        hideReason: hideReason || '',
      });
      toast.success('Announcement hidden from users');
      setShowHideDialog(false);
      setHideReason('');
      setSelectedAnnouncement(null);
    } catch (error) {
      toast.error('Failed to hide announcement');
    }
  };

  const handleUnhide = async (a: TextAnnouncement) => {
    if (!a.id) return;
    try {
      await updateDoc(doc(db, 'textAnnouncements', a.id), {
        isHidden: false,
        hiddenBy: null,
        hiddenAt: null,
        hideReason: null,
      });
      toast.success('Announcement restored');
    } catch (error) {
      toast.error('Failed to restore announcement');
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', badge: 'destructive' as const, label: '🚨 Urgent' };
      case 'info':
        return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', badge: 'secondary' as const, label: 'ℹ️ Info' };
      default:
        return { icon: Megaphone, color: 'text-gray-700', bg: 'bg-white dark:bg-gray-900', border: 'border-gray-200 dark:border-gray-800', badge: 'outline' as const, label: '📢 Announcement' };
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getExpiryText = (a: TextAnnouncement) => {
    if (!a.expiresAt) return null;
    const expiry = a.expiresAt instanceof Date ? a.expiresAt : new Date((a.expiresAt as any).seconds * 1000);
    const now = new Date();
    if (expiry < now) return { text: 'Expired', color: 'text-red-500' };
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { text: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, color: 'text-gray-500' };
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
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Announcements</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button onClick={() => navigate('/announcements/create')}>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-4">
        
        {/* Role-based notice for non-admins */}
        {!isAdmin && userRole && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
              <Bell className="w-5 h-5" />
              <span className="font-medium capitalize">
                {userRole.replace('_', ' ')} Announcements
              </span>
              <span className="text-sm text-indigo-600 dark:text-indigo-300">
                — Showing announcements relevant to your role only
              </span>
            </div>
          </div>
        )}

        {/* Admin Info Banner */}
        {isAdmin && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin View</span>
              <span className="text-sm text-blue-600 dark:text-blue-300">
                — You can see all announcements including hidden and expired ones
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
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Loading announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">No announcements yet</h3>
            <p className="text-gray-500 dark:text-gray-500 mt-1">
              {canCreate ? 'Click "New Announcement" to create one.' : 'Check back later for updates.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => {
              const config = getPriorityConfig(announcement.priority);
              const PriorityIcon = config.icon;
              const expiryInfo = getExpiryText(announcement);
              const isExpired = expiryInfo?.text === 'Expired';

              return (
                <Card
                  key={announcement.id}
                  className={`
                    border transition-all
                    ${config.border}
                    ${config.bg}
                    ${announcement.isHidden ? 'opacity-60' : ''}
                    ${isExpired ? 'opacity-70' : ''}
                  `}
                >
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      {/* Top Row: Priority + Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PriorityIcon className={`w-5 h-5 ${config.color} flex-shrink-0`} />
                          <h3 className="font-bold text-base text-gray-900 dark:text-white">
                            {announcement.title}
                          </h3>
                          <Badge variant={config.badge} className="text-xs">
                            {config.label}
                          </Badge>
                          {announcement.isHidden && (
                            <Badge variant="destructive" className="text-xs">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {announcement.message}
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {announcement.sender}
                          <span className="capitalize opacity-70">({announcement.senderRole?.replace('_', ' ')})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(announcement.createdAt)}
                        </span>
                        {expiryInfo && (
                          <span className={`flex items-center gap-1 ${expiryInfo.color}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {expiryInfo.text}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5" />
                          For: {announcement.targetAudience?.map(a => a.replace('_', ' ')).join(', ')}
                        </span>
                      </div>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          {announcement.isHidden ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnhide(announcement)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Unhide
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAnnouncement(announcement);
                                setShowHideDialog(true);
                              }}
                            >
                              <EyeOff className="w-4 h-4 mr-1" />
                              Hide
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}

                      {/* Own announcement controls (for teachers/school admins) */}
                      {!isAdmin && currentUser?.uid === announcement.senderId && (
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Announcement</DialogTitle>
            <DialogDescription>
              This will hide the announcement from regular users. It will still be visible to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason (optional)</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
              placeholder="Enter reason for hiding..."
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowHideDialog(false); setHideReason(''); }}>
              Cancel
            </Button>
            <Button onClick={handleHide}>Hide Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The announcement will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
