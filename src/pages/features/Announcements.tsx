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
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { type Announcement } from '@/services/announcementService';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showAnnouncementNotification, areNotificationsEnabled, requestNotificationPermission } from '@/services/notificationService';

const categories = ['All', 'General', 'Academic', 'Financial', 'Events', 'System', 'Urgent'];
const priorities = ['All', 'High', 'Normal', 'Low'];

export default function Announcements() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const previousAnnouncementsRef = useRef<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Check notification permission on mount
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
          createdAt: announcementData.createdAt?.toDate() || new Date()
        } as Announcement;
      });

      // Filter in memory based on role
      let filteredData = data;
      if (userRole && userRole !== 'platform_admin') {
        filteredData = data.filter(a => 
          a.targetAudience.includes('all') || 
          a.targetAudience.includes(userRole + 's') || 
          a.senderRole === userRole
        );
      }

      // Check for new announcements and show notifications (skip on initial load)
      if (!isInitialLoadRef.current && previousAnnouncementsRef.current.length > 0) {
        const newAnnouncements = filteredData.filter(
          a => a.id && !previousAnnouncementsRef.current.includes(a.id)
        );

        // Show notifications for new announcements
        newAnnouncements.forEach(announcement => {
          if (areNotificationsEnabled()) {
            showAnnouncementNotification(
              announcement.title,
              announcement.message,
              announcement.id || ''
            );
          }
        });
      }

      // Update the reference for next comparison
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
  }, [userRole]);

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
            filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{announcement.title}</h3>
                        <Badge className={getPriorityColor(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                        <Badge variant="outline">{announcement.category}</Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {announcement.message}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {announcement.sender} ({announcement.senderRole.replace('_', ' ')})
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(announcement.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bell className="w-4 h-4" />
                          For: {announcement.targetAudience.map(a => a.replace('_', ' ')).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
