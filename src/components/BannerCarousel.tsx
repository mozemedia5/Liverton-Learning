import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getBannerTheme } from '@/lib/bannerThemes';

interface Banner {
  id: string;
  mediaType?: 'image' | 'video' | 'url';
  mediaUrl?: string;
  imageUrl?: string; // legacy support
  clickUrl?: string;
  link?: string; // legacy support
  clickUrlType?: 'internal' | 'external';
  linkType?: 'internal' | 'external' | 'none'; // legacy support
  targetRoles?: string[];
  isActive?: boolean;
  expiresAt?: { toDate?: () => Date } | Date | null;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  theme?: string;
  message?: string;
}

/**
 * BannerCarousel - Premium Dallal "After" style deep-blue promotional banner carousel
 */
export default function BannerCarousel() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (!userRole) return;

    const q = query(
      collection(db, 'dashboardBanners'),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const resolved = snapshot.docs
        .map(doc => {
          const raw = { id: doc.id, ...doc.data() } as Banner;

          // Expiry check
          if (raw.expiresAt) {
            const expiry = raw.expiresAt;
            const expDate = expiry instanceof Date
              ? expiry
              : typeof expiry?.toDate === 'function'
                ? expiry.toDate()
                : new Date(expiry as unknown as string);
            if (expDate <= now) return null;
          }

          // Target audience validation
          const roles = Array.isArray(raw.targetRoles) ? raw.targetRoles : [];
          if (roles.length === 0) return null;

          const visible = roles.includes('all') || roles.includes(userRole);
          if (!visible) return null;

          return raw;
        })
        .filter((b): b is Banner => b !== null);

      setBanners(resolved);
      setCurrentIndex(0);
    }, (error) => {
      console.error("Failed to fetch dashboard banners:", error);
    });

    return () => unsubscribe();
  }, [userRole]);

  // Auto-scroll loop
  useEffect(() => {
    if (!isPlaying || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, banners.length]);

  if (userRole === 'platform_admin' || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  const theme = getBannerTheme(currentBanner.theme);
  const mediaUrl = (currentBanner.mediaUrl || currentBanner.imageUrl || '').trim();
  const redirectUrl = (currentBanner.clickUrl || currentBanner.link || '').trim();
  const rawType = currentBanner.clickUrlType || currentBanner.linkType;
  const isClickable = !!redirectUrl && rawType !== 'none';

  const handleBannerClick = () => {
    if (!isClickable) return;

    if (rawType === 'external' || redirectUrl.startsWith('http')) {
      const href = /^https?:\/\//i.test(redirectUrl) ? redirectUrl : `https://${redirectUrl}`;
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      const path = redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;
      navigate(path);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="w-full space-y-2">
      <Card
        onClick={handleBannerClick}
        className={`
          relative overflow-hidden rounded-[24px] border-none shadow-xl transition-all duration-300
          ${isClickable ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.01]' : ''}
          ${theme.gradient} text-white p-6 sm:p-8 min-h-[180px] sm:min-h-[220px] flex flex-col justify-between
        `}
      >
        {/* Background Decorative Circles */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-8 w-48 h-48 rounded-full bg-black/10 blur-2xl pointer-events-none" />

        {/* Banner Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center z-10 w-full">

          {/* Text content details */}
          <div className="md:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase text-white/90">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              LIVERTON EXCLUSIVE
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md leading-tight text-white">
                {currentBanner.title || 'Welcome to Liverton Learning'}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 max-w-lg font-medium drop-shadow-sm leading-snug">
                {currentBanner.subtitle || currentBanner.message || 'Expand your boundaries, master new courses, and communicate seamlessly with instructors worldwide.'}
              </p>
            </div>

            {isClickable && (
              <div>
                <Button
                  className={`${theme.cta} font-bold px-6 py-2.5 rounded-full text-xs sm:text-sm shadow-md transition-all hover:scale-105 border-0`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBannerClick();
                  }}
                >
                  {currentBanner.ctaLabel || 'Learn More'} →
                </Button>
              </div>
            )}
          </div>

          {/* Media Illustration Box */}
          <div className="md:col-span-5 flex justify-center md:justify-end relative">
            <div className="w-full sm:w-[280px] h-[140px] sm:h-[160px] rounded-2xl overflow-hidden bg-black/10 border border-white/10 shadow-lg relative group-hover:scale-[1.02] transition-transform duration-300">
              {currentBanner.mediaType === 'video' ? (
                <div className="w-full h-full relative">
                  <video
                    src={mediaUrl}
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
              ) : (
                <img
                  src={mediaUrl}
                  alt={currentBanner.title || 'Promo Banner'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%231e40af" width="400" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%2393c5fd"%3ELearning Program%3C/text%3E%3C/svg%3E';
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Play/Pause controls */}
        {banners.length > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10 z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <span className="text-[11px] font-bold text-blue-100 bg-white/10 px-2.5 py-0.5 rounded-full">
                {currentIndex + 1} / {banners.length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Next"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </Card>

      {/* Slide indicators */}
      {banners.length > 1 && (
        <div className="flex gap-1.5 justify-center pt-1.5">
          {banners.map((_, idx) => (
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