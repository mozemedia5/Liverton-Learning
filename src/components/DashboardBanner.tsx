import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  Sparkles
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
 * DashboardBanner Component - Dallal "After" Style Premium Deep-Blue Banner
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const now = new Date();
    const q = query(
      collection(db, 'announcements'),
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc'),
      limit(maxItems * 2)
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

      const filtered = data.filter(a => {
        const isNotExpired = !a.expiresAt || a.expiresAt > now;
        const isTargetAudience = a.targetAudience?.includes('all') || 
                                 (userRole && a.targetAudience?.includes(userRole));
        return isNotExpired && isTargetAudience && a.mediaUrl;
      }).slice(0, maxItems);

      setAnnouncements(filtered);
      
      if (filtered.length > 0 && currentIndex >= filtered.length) {
        setCurrentIndex(0);
      }
    });

    return () => unsubscribe();
  }, [currentUser, userRole, maxItems, currentIndex]);

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

    if (announcement.redirectUrl.startsWith('http://') || announcement.redirectUrl.startsWith('https://')) {
      if (announcement.openInNewTab) {
        window.open(announcement.redirectUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = announcement.redirectUrl;
      }
    } else {
      const url = announcement.redirectUrl.startsWith('/') ? announcement.redirectUrl : '/' + announcement.redirectUrl;
      navigate(url);
    }
  };

  if (userRole === 'platform_admin') return null;

  if (announcements.length === 0) {
    return null;
  }

  const b = announcements[currentIndex];
  const hasRedirect = !!b.redirectUrl;

  return (
    <div className="w-full space-y-2">
      <Card 
        onClick={() => hasRedirect && handleBannerClick(b)}
        className={`
          relative overflow-hidden rounded-[24px] border-none shadow-xl transition-all duration-300
          ${hasRedirect ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.01]' : ''}
          bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-6 sm:p-8 min-h-[180px] sm:min-h-[220px] flex flex-col justify-between
        `}
      >
        {/* Background Decorative Circles */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-8 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        {/* Banner Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center z-10 w-full">

          {/* Text & Button Column */}
          <div className="md:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              Featured Advertisement
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md leading-tight text-white">
                {b.mediaType === 'image' ? 'Explore Premium Content' : 'Watch Feature Video'}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 max-w-lg font-medium drop-shadow-sm leading-snug">
                Exclusive insights, dynamic training classes, and interactive learning tools curated for your success.
              </p>
            </div>

            {hasRedirect && (
              <div>
                <Button
                  className="bg-white hover:bg-blue-50 text-blue-700 font-bold px-6 py-2.5 rounded-full text-xs sm:text-sm shadow-md transition-all hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBannerClick(b);
                  }}
                >
                  {b.openInNewTab ? 'Learn More →' : 'View Inside App'}
                </Button>
              </div>
            )}
          </div>

          {/* Media/Illustration Column (Dallal-style anti-cropped bounding box) */}
          <div className="md:col-span-5 flex justify-center md:justify-end relative">
            <div className="w-full sm:w-[280px] h-[140px] sm:h-[160px] rounded-2xl overflow-hidden bg-black/10 border border-white/10 shadow-lg relative group-hover:scale-[1.02] transition-transform duration-300">
              {b.mediaType === 'image' ? (
                <img
                  src={b.mediaUrl}
                  alt="Advertisement Banner"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%231e40af" width="400" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%2393c5fd"%3ELearning Material%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-full h-full relative">
                  <video
                    src={b.mediaUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    onError={() => setVideoError('Video failed to load')}
                  />
                  {videoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-900/40">
                      <p className="text-blue-100 text-xs">Video preview not available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carousel controls - neatly embedded at bottom */}
        {showControls && announcements.length > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10 z-10">
            {/* Nav Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <span className="text-[11px] font-bold text-blue-100 bg-white/10 px-2.5 py-0.5 rounded-full">
                {currentIndex + 1} / {announcements.length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Next"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Play / Pause toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </Card>

      {/* Slide indicators at the very bottom */}
      {announcements.length > 1 && (
        <div className="flex gap-1.5 justify-center pt-1.5">
          {announcements.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${idx === currentIndex 
                  ? 'bg-blue-600 dark:bg-blue-400 w-6'
                  : 'bg-gray-300 dark:bg-gray-700 w-1.5 hover:bg-gray-400'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}