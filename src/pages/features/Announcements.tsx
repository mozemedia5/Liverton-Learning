import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ArrowLeft, 
  Bell, 
  Calendar,
  User,
  Plus,
  Filter,
  Loader2,
  ExternalLink,
  Trash2,
  EyeOff,
  Eye,
  Shield,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  type Announcement, 
  getAnnouncements, 
  hideAnnouncement, 
  unhideAnnouncement,
  deleteAnnouncement,
  getAnnouncementDisplayName,
  isAnnouncementExpired
} from '@/services/announcementService';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showAnnouncementNotification, areNotificationsEnabled, requestNotificationPermission } from '@/services/notificationService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const categories = ['All', 'General', 'Academic', 'Financial', 'Events', 'System', 'Urgent'];
const priorities = ['All', 'High', 'Normal', 'Low'];

export default function Announcements() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const previousAnnouncementsRef = useRef<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const isInitialLoadRef = useRef(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [showHideDialog, setShowHideDialog] = useState(false);

  const isAdmin = userRole === 'platform_admin';

  useEffect(() => {
    setNotificationsEnabled(areNotificationsEnabled());
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const announcementData = doc.data();
        return {
          id: doc.id,
          ...announcementData,
          createdAt: announcementData.createdAt?.toDate() || new Date(),
          expiresAt: announcementData.expiresAt?.toDate() || undefined,
          hiddenAt: announcementData.hiddenAt?.toDate() || undefined,
        } as Announcement;
      });

      // Filter announcements based on role and ownership
      let filteredData = data;
      const now = new Date();
      
      if (!isAdmin) {
        filteredData = data.filter(a => {
          // User can see their own announcements (even if expired or hidden)
          if (currentUser?.uid && a.senderId === currentUser.uid) {
            return true;
          }
          
          // For others: show only non-hidden, non-expired announcements
          const isNotHidden = !a.isHidden;
          const isNotExpired = !a.expiresAt || a.expiresAt > now;
          const isTargetAudience = a.targetAudience?.includes('all') || 
                                   (userRole && a.targetAudience?.includes(userRole + 's'));
          
          return isNotHidden && isNotExpired && isTargetAudience;
        });
      }

      // Check for new announcements and show notifications
      if (!isInitialLoadRef.current && previousAnnouncementsRef.current.length > 0) {
        const newAnnouncements = filteredData.filter(
          a => a.id && !previousAnnouncementsRef.current.includes(a.id)
        );

        newAnnouncements.forEach(announcement => {
          if (areNotificationsEnabled() && !announcement.isHidden) {
            showAnnouncementNotification(
              announcement.title,
              announcement.message,
              announcement.id || ''
            );
          }
        });
      }

      previousAnnouncementsRef.current = filteredData.map(a => a.id || '').filter(id => id !== '');
      setAnnouncements(filteredData);
      setLoading(false);
      isInitialLoadRef.current = false;
    }, (error) => {
      console.error('Error listening to announcements:', error);
      toast.error('Failed to load announcements');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole, currentUser, isAdmin]);

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesCategory = selectedCategory === 'All' || announcement.category === selectedCategory;
    const matchesPriority = selectedPriority === 'All' || announcement.priority === selectedPriority.toLowerCase();
    return matchesCategory && matchesPriority;
  });

  const canCreateAnnouncement = userRole === 'school_admin' || userRole === 'teacher' || userRole === 'platform_admin';

  const handleEnableNotifications = async () => {
    const enabled = await requestNotificationPermission();
    if (enabled) {
      setNotificationsEnabled(true);
      toast.success('Notifications enabled! You will receive alerts for new announcements.');
    } else {
      toast.error('Failed to enable notifications. Please check your browser settings.');
    }
  };

  const handleHideAnnouncement = async () => {
    if (!selectedAnnouncement?.id || !currentUser?.uid) return;
    
    try {
      await hideAnnouncement(selectedAnnouncement.id, currentUser.uid, hideReason);
      toast.success('Announcement hidden from users');
      setShowHideDialog(false);
      setHideReason('');
      setSelectedAnnouncement(null);
    } catch (error) {
      toast.error('Failed to hide announcement');
    }
  };

  const handleUnhideAnnouncement = async (announcement: Announcement) => {
    if (!announcement.id) return;
    
    try {
      await unhideAnnouncement(announcement.id);
      toast.success('Announcement restored');
    } catch (error) {
      toast.error('Failed to restore announcement');
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement?.id) return;
    
    try {
      await deleteAnnouncement(selectedAnnouncement.id);
      toast.success('Announcement permanently deleted');
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const openLink = (link: string) => {
    if (!link) return;
    
    // Ensure link is properly formatted
    let url = link;
    if (!url.startsWith('http') && !url.startsWith('/')) {
      url = '/' + url;
    }
    
    if (url.startsWith('http')) {
      // External link - open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Internal link - use router navigation
      navigate(url);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return '';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getExpiryText = (announcement: Announcement) => {
    if (!announcement.expiresAt) return null;
    const expiry = announcement.expiresAt instanceof Date 
      ? announcement.expiresAt 
      : announcement.expiresAt.toDate();
    const now = new Date();
    
    if (expiry < now) {
      return { text: 'Expired', color: 'text-red-500' };
    }
    
    const hoursLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (hoursLeft <= 24) {
      return { text: `Expires in ${hoursLeft}h`, color: 'text-orange-500' };
    }
    
    const daysLeft = Math.ceil(hoursLeft / 24);
    return { text: `Expires in ${daysLeft} days`, color: 'text-gray-500' };
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
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Announcements</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!notificationsEnabled && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEnableNotifications}
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
            )}
            {canCreateAnnouncement && (
              <Button onClick={() => navigate('/announcements/create')}>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Filter className="w-5 h-5 mt-2 text-gray-500" />
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {priorities.map((priority) => (
              <Button
                key={priority}
                variant={selectedPriority === priority ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPriority(priority)}
                className="whitespace-nowrap"
              >
                {priority}
              </Button>
            ))}
          </div>
        </div>

        {/* Admin Info Banner */}
        {isAdmin && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin View</span>
              <span className="text-sm text-blue-600 dark:text-blue-300">
                - You can see all announcements including hidden and expired ones
              </span>
            </div>
          </div>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500">Loading announcements...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold">No announcements found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const expiryInfo = getExpiryText(announcement);
              const displayName = getAnnouncementDisplayName(announcement);
              const isExpired = isAnnouncementExpired(announcement);
              
              return (
                <Card 
                  key={announcement.id} 
                  className={`hover:shadow-md transition-all ${
                    announcement.link ? 'cursor-pointer hover:border-black dark:hover:border-white' : ''
                  } ${announcement.isHidden ? 'opacity-60 border-red-200 dark:border-red-800' : ''} ${isExpired ? 'opacity-70' : ''}`}
                  onClick={() => {
                    if (announcement.link) {
                      openLink(announcement.link);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{announcement.title}</h3>
                          {announcement.link && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              Has Link
                            </Badge>
                          )}
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                          <Badge variant="outline">{announcement.category}</Badge>
                          {announcement.isHidden && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              Hidden
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {announcement.message}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          {/* Show sender info - hide name for platform admin, show 'Liverton' instead */}
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {displayName}
                            {announcement.senderRole !== 'platform_admin' && (
                              <span className="text-xs text-gray-400">
                                ({announcement.senderRole.replace('_', ' ')})
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(announcement.createdAt)}
                          </span>
                          {expiryInfo && (
                            <span className={`flex items-center gap-1 ${expiryInfo.color}`}>
                              <Clock className="w-4 h-4" />
                              {expiryInfo.text}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Bell className="w-4 h-4" />
                            For: {announcement.targetAudience?.map(a => a.replace('_', ' ')).join(', ')}
                          </span>
                        </div>
                        {announcement.link && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              Click to visit: {announcement.link}
                            </p>
                          </div>
                        )}
                        {/* Admin Moderation Controls */}
                        {isAdmin && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2 flex-wrap">
                              {announcement.isHidden ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnhideAnnouncement(announcement);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Unhide
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAnnouncement(announcement);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Hide Dialog */}
      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Announcement</DialogTitle>
            <DialogDescription>
              This will hide the announcement from regular users. The announcement will still be visible to you and the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason (optional)</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded-md"
              placeholder="Enter reason for hiding..."
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHideDialog(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleHideAnnouncement}>
              Hide Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The announcement will be permanently deleted from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAnnouncement}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
