import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Play,
  Pause
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
 * DashboardBanner Component - Modern Media Advertisement Display
 *
 * Features:
 * - Image and video support
 * - Auto-scrolling carousel with manual navigation
 * - Click-to-redirect functionality
 * - External URL support
 * - Role-based targeting
 * - NON-DISMISSIBLE: banners stay until expiry date (set by platform admin)
 * - Platform admin does NOT see banners (they manage them)
 * - Mobile responsive
 * - Dark mode support
 */
export default function DashboardBanner({ 
  maxItems = 5, 
  showControls = true,
  autoScroll = true,
  autoScrollInterval = 5000 
}: DashboardBannerProps) {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // dismissedIds removed — banners are non-dismissible; only expiry date removes them
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
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
        
        // Check if announcement targets current user's role
        const isTargetAudience = a.targetAudience?.includes('all') || 
                                 (userRole && a.targetAudience?.includes(userRole));
        
        return isNotExpired && isTargetAudience && a.mediaUrl;
      }).slice(0, maxItems);

      setAnnouncements(filtered);
      
      // Reset index if it's out of bounds
      if (filtered.length > 0 && currentIndex >= filtered.length) {
        setCurrentIndex(0);
      }
    });

    return () => unsubscribe();
  }, [currentUser, userRole, maxItems, currentIndex]);

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || !isPlaying || announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [autoScroll, isPlaying, announcements.length, autoScrollInterval]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
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

  // Platform admin does not see banners — they create/manage them
  if (userRole === 'platform_admin') return null;

  if (announcements.length === 0) {
    return null; // Don't show anything if no announcements
  }

  const currentAnnouncement = announcements[currentIndex];
  const hasRedirect = !!currentAnnouncement.redirectUrl;

  return (
    <div className="w-full space-y-2">
      {/* Main Banner */}
      <Card 
        className={`
          relative overflow-hidden border-2 transition-all duration-300 
          ${hasRedirect ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.02]' : ''}
          bg-white dark:bg-gray-900
        `}
        onClick={() => hasRedirect && handleBannerClick(currentAnnouncement)}
      >
        {/* Redirect Indicator */}
        {hasRedirect && (
          <div className="absolute top-3 left-3 z-20 px-3 py-1.5 bg-black/60 text-white rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
            <ExternalLink className="w-3 h-3" />
            Click to visit
          </div>
        )}

        {/* Media Content */}
        <div className="relative w-full">
          {currentAnnouncement.mediaType === 'image' ? (
            <img 
              src={currentAnnouncement.mediaUrl} 
              alt="Dashboard Banner" 
              className="w-full h-auto max-h-[400px] object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%23f3f4f6" width="800" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%239ca3af"%3EImage Not Available%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="relative">
              <video 
                src={currentAnnouncement.mediaUrl}
                className="w-full h-auto max-h-[400px] object-cover"
                autoPlay
                muted
                loop
                playsInline
                onError={(e) => {
                  setVideoError('Video failed to load');
                  const target = e.target as HTMLVideoElement;
                  target.style.display = 'none';
                }}
              >
                Your browser does not support video playback.
              </video>
              
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <p className="text-gray-500">Video not available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls Overlay */}
        {showControls && announcements.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
            <div className="flex items-center justify-between">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <span className="text-white text-sm font-medium px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                  {currentIndex + 1} / {announcements.length}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Progress Indicators */}
      {announcements.length > 1 && (
        <div className="flex gap-2 justify-center px-4">
          {announcements.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${idx === currentIndex 
                  ? 'bg-black dark:bg-white w-8' 
                  : 'bg-gray-300 dark:bg-gray-700 w-6 hover:bg-gray-400 dark:hover:bg-gray-600'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}
