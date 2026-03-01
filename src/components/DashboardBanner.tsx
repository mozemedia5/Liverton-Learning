import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  X, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Announcement } from '@/services/announcementService';

interface DashboardBannerProps {
  maxItems?: number;
  showControls?: boolean;
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

/**
 * DashboardBanner Component
 * 
 * Professional banner component for displaying announcements on dashboards
 * Features:
 * - Auto-scrolling carousel of announcements
 * - Priority-based styling (high, normal, low)
 * - Category badges
 * - Link support (internal and external)
 * - Dismissible banners
 * - Mobile responsive
 * - Dark mode support
 */
export default function DashboardBanner({ 
  maxItems = 3, 
  showControls = true,
  autoScroll = true,
  autoScrollInterval = 5000 
}: DashboardBannerProps) {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const now = new Date();
    const q = query(
      collection(db, 'announcements'),
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc'),
      limit(maxItems * 2) // Fetch more to ensure we have enough after filtering
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const announcementData = doc.data();
        return {
          id: doc.id,
          ...announcementData,
          createdAt: announcementData.createdAt?.toDate() || new Date(),
          expiresAt: announcementData.expiresAt?.toDate() || undefined,
        } as Announcement;
      });

      // Filter by role, expiry, and dismissed status
      const filtered = data.filter(a => {
        const isNotExpired = !a.expiresAt || a.expiresAt > now;
        const isTargetAudience = a.targetAudience?.includes('all') || 
                                 (userRole && a.targetAudience?.includes(userRole + 's'));
        const isNotDismissed = !dismissedIds.includes(a.id || '');
        
        return isNotExpired && isTargetAudience && isNotDismissed;
      }).slice(0, maxItems);

      setAnnouncements(filtered);
      
      // Reset index if it's out of bounds
      if (filtered.length > 0 && currentIndex >= filtered.length) {
        setCurrentIndex(0);
      }
    });

    return () => unsubscribe();
  }, [currentUser, userRole, maxItems, dismissedIds, currentIndex]);

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [autoScroll, announcements.length, autoScrollInterval]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds([...dismissedIds, id]);
  };

  const handleClick = (announcement: Announcement) => {
    if (announcement.link) {
      if (announcement.link.startsWith('http')) {
        window.open(announcement.link, '_blank', 'noopener,noreferrer');
      } else {
        const url = announcement.link.startsWith('/') ? announcement.link : '/' + announcement.link;
        navigate(url);
      }
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-5 h-5" />;
      case 'normal':
        return <Info className="w-5 h-5" />;
      case 'low':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          icon: 'text-red-600 dark:text-red-400',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
      case 'normal':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          icon: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        };
      case 'low':
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-900 dark:text-gray-100',
          icon: 'text-gray-600 dark:text-gray-400',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          icon: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        };
    }
  };

  if (announcements.length === 0) {
    return null; // Don't show anything if no announcements
  }

  const currentAnnouncement = announcements[currentIndex];
  const colors = getPriorityColors(currentAnnouncement.priority);

  return (
    <Card 
      className={`${colors.bg} ${colors.border} border-2 overflow-hidden transition-all duration-300 hover:shadow-lg ${
        currentAnnouncement.link ? 'cursor-pointer' : ''
      }`}
      onClick={() => currentAnnouncement.link && handleClick(currentAnnouncement)}
    >
      <CardContent className="p-4 relative">
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss(currentAnnouncement.id || '');
          }}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 pr-8">
          {/* Icon */}
          <div className={`${colors.icon} flex-shrink-0 mt-1`}>
            {getPriorityIcon(currentAnnouncement.priority)}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-semibold text-lg ${colors.text}`}>
                {currentAnnouncement.title}
              </h3>
            </div>

            <p className={`text-sm ${colors.text} opacity-90`}>
              {currentAnnouncement.message}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={colors.badge}>
                {currentAnnouncement.priority}
              </Badge>
              <Badge variant="outline" className={colors.text}>
                {currentAnnouncement.category}
              </Badge>
              {currentAnnouncement.link && (
                <Badge variant="outline" className={`${colors.text} flex items-center gap-1`}>
                  <ExternalLink className="w-3 h-3" />
                  Has Link
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        {showControls && announcements.length > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-current/10">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className={colors.text}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={`text-sm ${colors.text}`}>
                {currentIndex + 1} / {announcements.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className={colors.text}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/announcements');
              }}
              className={colors.text}
            >
              View All
            </Button>
          </div>
        )}

        {/* Progress indicators */}
        {announcements.length > 1 && (
          <div className="flex gap-1 mt-3">
            {announcements.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-current opacity-100' : 'bg-current opacity-20'
                }`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
