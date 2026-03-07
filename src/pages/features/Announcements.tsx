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
  Loader2,
  ExternalLink,
  Trash2,
  EyeOff,
  Eye,
  Shield,
  Clock,
  Image as ImageIcon,
  Video,
  Play
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  type Announcement, 
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

export default function Announcements() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const previousAnnouncementsRef = useRef<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const isInitialLoadRef = useRef(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [filterAudience, setFilterAudience] = useState<string>('all');

  const isAdmin = userRole === 'platform_admin';

  const audienceFilters = [
    { id: 'all', label: 'All Audiences' },
    { id: 'students', label: 'Students' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'parents', label: 'Parents' },
    { id: 'school_admins', label: 'School Admins' },
  ];

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
                                   (userRole && a.targetAudience?.includes(userRole));
          
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
              'New Banner',
              `A new banner has been posted`,
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
    if (filterAudience === 'all') return true;
    return announcement.targetAudience?.includes(filterAudience);
  });

  const canCreateAnnouncement = userRole === 'school_admin' || userRole === 'teacher' || userRole === 'platform_admin';

  const handleEnableNotifications = async () => {
    const enabled = await requestNotificationPermission();
    if (enabled) {
      setNotificationsEnabled(true);
      toast.success('Notifications enabled! You will receive alerts for new banners.');
    } else {
      toast.error('Failed to enable notifications. Please check your browser settings.');
    }
  };

  const handleHideAnnouncement = async () => {
    if (!selectedAnnouncement?.id || !currentUser?.uid) return;
    
    try {
      await hideAnnouncement(selectedAnnouncement.id, currentUser.uid, hideReason);
      toast.success('Banner hidden from users');
      setShowHideDialog(false);
      setHideReason('');
      setSelectedAnnouncement(null);
    } catch (error) {
      toast.error('Failed to hide banner');
    }
  };

  const handleUnhideAnnouncement = async (announcement: Announcement) => {
    if (!announcement.id) return;
    
    try {
      await unhideAnnouncement(announcement.id);
      toast.success('Banner restored');
    } catch (error) {
      toast.error('Failed to restore banner');
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement?.id) return;
    
    try {
      await deleteAnnouncement(selectedAnnouncement.id);
      toast.success('Banner permanently deleted');
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const handleBannerClick = (announcement: Announcement) => {
    if (!announcement.redirectUrl) return;
    
    // Check if it's an external URL
    if (announcement.redirectUrl.startsWith('http://') || announcement.redirectUrl.startsWith('https://')) {
      if (announcement.openInNewTab) {
        window.open(announcement.redirectUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = announcement.redirectUrl;
      }
    } else {
      // Internal route
      const url = announcement.redirectUrl.startsWith('/') ? announcement.redirectUrl : '/' + announcement.redirectUrl;
      navigate(url);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExpiryText = (announcement: Announcement) => {
    if (!announcement.expiresAt) return null;
    const expiry = announcement.expiresAt instanceof Date 
      ? announcement.expiresAt 
      : new Date(announcement.expiresAt);
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
              <span className="font-semibold">Dashboard Banners</span>
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
                New Banner
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Filters */}
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

        {/* Admin Info Banner */}
        {isAdmin && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin View</span>
              <span className="text-sm text-blue-600 dark:text-blue-300">
                - You can see all banners including hidden and expired ones
              </span>
            </div>
          </div>
        )}

        {/* Banners Grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500">Loading banners...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold">No dashboard banners found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnnouncements.map((announcement) => {
                const expiryInfo = getExpiryText(announcement);
                const displayName = getAnnouncementDisplayName(announcement);
                const isExpired = isAnnouncementExpired(announcement);
                
                return (
                  <Card 
                    key={announcement.id} 
                    className={`
                      hover:shadow-xl transition-all overflow-hidden group
                      ${announcement.redirectUrl ? 'cursor-pointer hover:scale-105' : ''} 
                      ${announcement.isHidden ? 'opacity-60 border-red-200 dark:border-red-800' : ''} 
                      ${isExpired ? 'opacity-70' : ''}
                    `}
                    onClick={() => announcement.redirectUrl && handleBannerClick(announcement)}
                  >
                    {/* Media Preview */}
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden">
                      {announcement.mediaType === 'image' ? (
                        <img 
                          src={announcement.mediaUrl} 
                          alt="Banner"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3EImage Not Available%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <video 
                            src={announcement.mediaUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-12 h-12 text-white" />
                          </div>
                        </div>
                      )}
                      
                      {/* Media Type Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-black/60 text-white backdrop-blur-sm">
                          {announcement.mediaType === 'image' ? (
                            <><ImageIcon className="w-3 h-3 mr-1" /> Image</>
                          ) : (
                            <><Video className="w-3 h-3 mr-1" /> Video</>
                          )}
                        </Badge>
                      </div>

                      {/* Status Badges */}
                      <div className="absolute top-2 right-2 flex gap-1 flex-col items-end">
                        {announcement.isHidden && (
                          <Badge variant="destructive" className="backdrop-blur-sm">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="secondary" className="backdrop-blur-sm">
                            <Clock className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {announcement.redirectUrl && (
                          <Badge className="bg-blue-500 text-white backdrop-blur-sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Clickable
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Info Section */}
                    <CardContent className="p-4 space-y-3">
                      {/* Metadata */}
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{displayName}</span>
                          {announcement.senderRole !== 'platform_admin' && (
                            <span className="text-xs">
                              ({announcement.senderRole.replace('_', ' ')})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(announcement.createdAt)}</span>
                        </div>
                        
                        {expiryInfo && (
                          <div className={`flex items-center gap-2 ${expiryInfo.color}`}>
                            <Clock className="w-4 h-4" />
                            <span>{expiryInfo.text}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          <span>For: {announcement.targetAudience?.map(a => a.replace('_', ' ')).join(', ')}</span>
                        </div>
                        
                        {announcement.redirectUrl && (
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <ExternalLink className="w-4 h-4" />
                            <span className="truncate">{announcement.redirectUrl}</span>
                          </div>
                        )}
                      </div>

                      {/* Admin Moderation Controls */}
                      {isAdmin && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Hide Dialog */}
      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Banner</DialogTitle>
            <DialogDescription>
              This will hide the banner from regular users. The banner will still be visible to you and the creator.
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
              Hide Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Banner</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The banner will be permanently deleted from the system.
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
