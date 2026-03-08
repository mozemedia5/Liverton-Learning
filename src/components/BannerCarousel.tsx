import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Play, Pause, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface Banner {
  id: string;
  title?: string;
  message?: string;
  // Support both legacy and new field names
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'url';
  backgroundColor?: string;
  textColor?: string;
  linkType?: 'internal' | 'external' | 'none';
  link?: string;
  clickUrl?: string;
  clickUrlType?: 'internal' | 'external';
  targetRoles?: string[];
  isActive?: boolean;
  expiresAt?: { toDate: () => Date } | Date | null;
}

// Resolved banner with unified fields for rendering
interface ResolvedBanner extends Banner {
  resolvedMediaUrl: string;
  resolvedLink: string;
  resolvedLinkType: 'internal' | 'external' | 'none';
}

export default function BannerCarousel() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [banners, setBanners] = useState<ResolvedBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (userRole) {
      loadBanners();
    }
  }, [userRole]);

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length]);

  // Reset index when banners change
  useEffect(() => {
    setCurrentIndex(0);
  }, [banners.length]);

  const loadBanners = async () => {
    if (!userRole) return;
    try {
      const q = query(
        collection(db, 'dashboardBanners'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const now = new Date();

      const allBanners: ResolvedBanner[] = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data();

          // Resolve expiry
          let expiresAt: Date | null = null;
          if (data.expiresAt) {
            expiresAt =
              typeof data.expiresAt.toDate === 'function'
                ? data.expiresAt.toDate()
                : new Date(data.expiresAt);
          }

          // Unified media URL: prefer mediaUrl (new), fall back to imageUrl (legacy)
          const resolvedMediaUrl: string =
            data.mediaUrl || data.imageUrl || '';

          // Unified link: prefer clickUrl (new), fall back to link (legacy)
          const resolvedLink: string =
            data.clickUrl || data.link || '';

          // Unified link type
          const resolvedLinkType: 'internal' | 'external' | 'none' =
            data.clickUrlType || data.linkType || 'none';

          return {
            id: docSnap.id,
            ...data,
            expiresAt,
            resolvedMediaUrl,
            resolvedLink,
            resolvedLinkType,
          } as ResolvedBanner;
        })
        .filter(banner => {
          // Must have media to display
          if (!banner.resolvedMediaUrl) return false;

          // Must not be expired
          if (banner.expiresAt && (banner.expiresAt as Date) <= now) return false;

          // Must not be dismissed
          if (dismissedIds.includes(banner.id)) return false;

          // Role filtering: show if targetRoles contains user's role OR 'all'
          // Platform admins see all active banners (for preview/testing)
          const roles = Array.isArray(banner.targetRoles) ? banner.targetRoles : [];
          if (roles.length === 0) return false;
          if (userRole === 'platform_admin') return true;
          return roles.includes('all') || roles.includes(userRole);
        });

      setBanners(allBanners);
    } catch (error) {
      console.error('Error loading banners:', error);
    }
  };

  const handleBannerClick = (banner: ResolvedBanner) => {
    if (!banner.resolvedLink || banner.resolvedLinkType === 'none') return;
    if (banner.resolvedLinkType === 'internal') {
      const path = banner.resolvedLink.startsWith('/')
        ? banner.resolvedLink
        : '/' + banner.resolvedLink;
      navigate(path);
    } else {
      window.open(banner.resolvedLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedIds(prev => [...prev, id]);
    setBanners(prev => prev.filter(b => b.id !== id));
    setCurrentIndex(0);
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex(prev => (prev + 1) % banners.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToSlide = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleImgError = (id: string) => {
    setImgErrors(prev => ({ ...prev, [id]: true }));
  };

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  if (!currentBanner) return null;

  const hasLink =
    !!currentBanner.resolvedLink && currentBanner.resolvedLinkType !== 'none';

  const mediaType: 'image' | 'video' | 'url' =
    currentBanner.mediaType || 'image';

  const imgFailed = imgErrors[currentBanner.id];

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-lg group select-none mb-4">
      {/* ── Main Banner ── */}
      <div
        onClick={() => hasLink && handleBannerClick(currentBanner)}
        className={`relative w-full h-56 sm:h-72 md:h-80 lg:h-96 bg-gray-900 ${
          hasLink ? 'cursor-pointer' : ''
        }`}
      >
        {/* ── Media ── */}
        {mediaType === 'video' ? (
          <video
            ref={videoRef}
            key={currentBanner.id}
            src={currentBanner.resolvedMediaUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onError={() => handleImgError(currentBanner.id)}
          />
        ) : (
          <>
            {!imgFailed ? (
              <img
                key={currentBanner.id}
                src={currentBanner.resolvedMediaUrl}
                alt={currentBanner.title || 'Banner'}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => handleImgError(currentBanner.id)}
              />
            ) : (
              /* Fallback: gradient background when image fails */
              <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-blue-700 to-indigo-900 flex items-center justify-center">
                <div className="text-center text-white px-6">
                  {currentBanner.title && (
                    <p className="text-xl font-bold drop-shadow mb-2">
                      {currentBanner.title}
                    </p>
                  )}
                  {currentBanner.message && (
                    <p className="text-sm opacity-90">{currentBanner.message}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Subtle dark gradient overlay so text is readable */}
        {!imgFailed && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        )}

        {/* ── Dismiss button ── */}
        <button
          onClick={e => handleDismiss(e, currentBanner.id)}
          className="absolute top-3 right-3 z-20 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all backdrop-blur-sm"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* ── External link indicator ── */}
        {hasLink && (
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-black/60 text-white rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
            <ExternalLink className="w-3 h-3" />
            {currentBanner.resolvedLinkType === 'internal' ? 'View' : 'Visit'}
          </div>
        )}

        {/* ── Banner title / message overlay (bottom) ── */}
        {(currentBanner.title || currentBanner.message) && !imgFailed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10 pointer-events-none">
            {currentBanner.title && (
              <h3 className="text-white font-bold text-base sm:text-lg drop-shadow line-clamp-1">
                {currentBanner.title}
              </h3>
            )}
            {currentBanner.message && (
              <p className="text-white/90 text-xs sm:text-sm drop-shadow line-clamp-2">
                {currentBanner.message}
              </p>
            )}
          </div>
        )}

        {/* ── Navigation arrows (show on hover) ── */}
        {banners.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-black p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-black p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Next banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* ── Counter + Play/Pause ── */}
        {banners.length > 1 && (
          <div className="absolute top-3 right-12 z-20 flex items-center gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); setIsAutoPlaying(p => !p); }}
              className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all"
              aria-label={isAutoPlaying ? 'Pause auto-play' : 'Resume auto-play'}
            >
              {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
              {currentIndex + 1}/{banners.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Dot indicators ── */}
      {banners.length > 1 && (
        <div className="flex gap-1.5 justify-center py-2 bg-transparent">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={e => goToSlide(e, idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'bg-purple-600 dark:bg-purple-400 w-6'
                  : 'bg-gray-300 dark:bg-gray-600 w-2 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
