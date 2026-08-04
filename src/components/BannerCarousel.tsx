import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles,
  GraduationCap,
  CalendarDays,
  Sparkle,
  BookOpen,
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
  badge?: string;
}

/**
 * Built-in dynamic promo slides (Jumia / AliExpress style): always shown
 * when the admin has not published Firestore banners, so every dashboard
 * has a lively, dynamic banner rail out of the box.
 */
function getDefaultBanners(role: string | null): Banner[] {
  const isTeacher = role === 'teacher';
  return [
    {
      id: 'default-welcome',
      title: isTeacher ? 'Share what you know, earn while you teach' : 'Learn anything, anywhere',
      subtitle: isTeacher
        ? 'Publish courses and quizzes, host live lessons and reach students across the globe.'
        : 'Browse top courses, join live lessons and track your progress in one place.',
      ctaLabel: isTeacher ? 'Create a Course' : 'Browse Courses',
      clickUrl: isTeacher ? '/teacher/courses/create' : '/student/courses',
      clickUrlType: 'internal',
      theme: 'ocean-blue',
      badge: 'LIVERTON SPOTLIGHT',
      targetRoles: ['all'],
    },
    {
      id: 'default-events',
      title: 'Never miss a school event',
      subtitle: 'Classes, exams, workshops and meetups — check the events rail and stay in the loop.',
      ctaLabel: 'View Events',
      clickUrl: '/events',
      clickUrlType: 'internal',
      theme: 'emerald-fresh',
      badge: 'HAPPENING NOW',
      targetRoles: ['all'],
    },
    {
      id: 'default-hanna',
      title: 'Meet Hanna, your AI study buddy',
      subtitle: 'Summaries, quiz practice, document help and instant answers — right inside Liverton.',
      ctaLabel: 'Ask Hanna',
      clickUrl: '/features/hanna-ai',
      clickUrlType: 'internal',
      theme: 'royal-purple',
      badge: 'AI POWERED',
      targetRoles: ['all'],
    },
  ];
}

const DEFAULT_ICONS = [GraduationCap, CalendarDays, Sparkle];

/**
 * BannerCarousel - dynamic marketplace-style promo banner rail
 * (CJ Dropshipping / AliExpress / Jumia pattern):
 * - Auto-rotating gradient slides with CTA buttons
 * - Admin-published Firestore banners take priority
 * - Built-in dynamic slides as fallback so the rail is never empty
 * - Dot indicators, arrows, play/pause and touch swipe
 */
export default function BannerCarousel() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [remoteBanners, setRemoteBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

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

      setRemoteBanners(resolved);
      setCurrentIndex(0);
    }, (error) => {
      console.error("Failed to fetch dashboard banners:", error);
    });

    return () => unsubscribe();
  }, [userRole]);

  // Firestore banners take priority; otherwise use dynamic built-ins
  const banners = useMemo(() => {
    if (remoteBanners.length > 0) return remoteBanners;
    return getDefaultBanners(userRole);
  }, [remoteBanners, userRole]);

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

  const safeIndex = currentIndex % banners.length;
  const currentBanner = banners[safeIndex];
  const theme = getBannerTheme(currentBanner.theme);
  const mediaUrl = (currentBanner.mediaUrl || currentBanner.imageUrl || '').trim();
  const redirectUrl = (currentBanner.clickUrl || currentBanner.link || '').trim();
  const rawType = currentBanner.clickUrlType || currentBanner.linkType;
  const isClickable = !!redirectUrl && rawType !== 'none';
  const DefaultIcon = DEFAULT_ICONS[safeIndex % DEFAULT_ICONS.length] || BookOpen;

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

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) handleNext(); else handlePrev();
    }
    touchStartX.current = null;
  };

  return (
    <div className="w-full space-y-2">
      <Card
        onClick={handleBannerClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
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
              {currentBanner.badge || 'LIVERTON EXCLUSIVE'}
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
            {mediaUrl ? (
              <div className="w-full sm:w-[280px] h-[140px] sm:h-[160px] rounded-2xl overflow-hidden bg-black/10 border border-white/10 shadow-lg relative transition-transform duration-300 hover:scale-[1.02]">
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
            ) : (
              <div className="hidden sm:flex w-[280px] h-[160px] rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm items-center justify-center shadow-lg">
                <DefaultIcon className="w-20 h-20 text-white/80 drop-shadow-lg" strokeWidth={1.25} />
              </div>
            )}
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
                {safeIndex + 1} / {banners.length}
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
                ${idx === safeIndex
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
