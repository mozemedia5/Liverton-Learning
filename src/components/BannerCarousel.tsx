/**
 * BannerCarousel – SALAF-style Real-time Dashboard Banners
 *
 * • Fetches from `dashboardBanners` collection via onSnapshot
 * • Filters by targetRoles
 * • Displays in the signature SALAF Blue Gradient Banner style:
 *   - Soft blue gradient background
 *   - Clean rounded white CTA button
 *   - Smooth 3D graphics and auto-cycling transitions
 * • Placed at top of user dashboards
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface RawBanner {
  id: string;
  mediaType?: 'image' | 'video' | 'url';
  mediaUrl?: string;
  imageUrl?: string;
  clickUrl?: string;
  link?: string;
  clickUrlType?: 'internal' | 'external';
  linkType?: 'internal' | 'external' | 'none';
  targetRoles?: string[];
  isActive?: boolean;
  expiresAt?: { toDate: () => Date } | null;
  order?: number;
  title?: string;
  message?: string;
}

interface Banner {
  id: string;
  mediaType: 'image' | 'video' | 'url';
  mediaUrl: string;
  linkUrl: string;
  linkType: 'internal' | 'external' | 'none';
  title: string;
  message: string;
}

export default function BannerCarousel() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [fade, setFade] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (userRole === 'platform_admin') return null;

  useEffect(() => {
    if (!userRole) return;

    const q = query(
      collection(db, 'dashboardBanners'),
      where('isActive', '==', true),
      orderBy('order', 'asc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();

      const resolved: Banner[] = snap.docs
        .map((d) => {
          const raw = { id: d.id, ...d.data() } as RawBanner;

          if (raw.expiresAt) {
            const expDate = typeof raw.expiresAt.toDate === 'function'
              ? raw.expiresAt.toDate()
              : new Date(raw.expiresAt as unknown as string);
            if (expDate <= now) return null;
          }

          const roles: string[] = Array.isArray(raw.targetRoles) ? raw.targetRoles : [];

          const visible = roles.length === 0 || roles.includes('all') || roles.includes(userRole);
          if (!visible) return null;

          const mediaUrl = (raw.mediaUrl || raw.imageUrl || '').trim();
          const linkUrl = (raw.clickUrl || raw.link || '').trim();
          const rawType = raw.clickUrlType || raw.linkType;
          const linkType: 'internal' | 'external' | 'none' =
            rawType === 'internal' ? 'internal' :
            rawType === 'external' ? 'external' : 'none';

          return {
            id: raw.id,
            mediaType: raw.mediaType || 'image',
            mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
            linkUrl,
            linkType,
            title: raw.title || 'Discover Premium Learning Courses',
            message: raw.message || 'Explore interactive lessons, quizzes, and live classes on Liverton Learning.',
          } as Banner;
        })
        .filter((b): b is Banner => b !== null);

      setBanners(resolved);
      setCurrent(0);
    });

    return () => unsub();
  }, [userRole]);

  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % banners.length;
        setFade(false);
        setTimeout(() => setFade(true), 150);
        return next;
      });
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoPlay, banners.length]);

  const pauseAndResume = () => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    setAutoPlay(false);
    pauseTimer.current = setTimeout(() => setAutoPlay(true), 10_000);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseAndResume();
    setCurrent(c => {
      const next = (c - 1 + banners.length) % banners.length;
      setFade(false); setTimeout(() => setFade(true), 150);
      return next;
    });
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseAndResume();
    setCurrent(c => {
      const n = (c + 1) % banners.length;
      setFade(false); setTimeout(() => setFade(true), 150);
      return n;
    });
  };

  const handleClick = (banner: Banner) => {
    if (!banner.linkUrl || banner.linkType === 'none') {
      navigate('/student/courses');
      return;
    }
    if (banner.linkType === 'internal') {
      navigate(banner.linkUrl.startsWith('/') ? banner.linkUrl : '/' + banner.linkUrl);
    } else {
      window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (banners.length === 0) return null;

  const b = banners[current] ?? banners[0];

  return (
    <div className="w-full mb-6">
      <div className="relative w-full rounded-3xl overflow-hidden shadow-lg group select-none bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-6 sm:p-8 min-h-[160px] sm:min-h-[180px] flex items-center justify-between gap-4">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none transform translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-indigo-400/20 rounded-full blur-xl pointer-events-none" />

        {/* Content Side */}
        <div className="relative z-10 flex-1 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Featured Banner</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
            {b.title || 'Upgrade Your Learning Journey'}
          </h2>

          <p className="text-xs sm:text-sm text-blue-100 line-clamp-2 max-w-md font-normal leading-relaxed">
            {b.message || 'Access top-rated educational materials, video lessons, and interactive quizzes today.'}
          </p>

          <div className="pt-1">
            <button
              onClick={() => handleClick(b)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-blue-600 font-bold text-xs sm:text-sm shadow-md hover:bg-blue-50 transition-all active:scale-95 cursor-pointer"
            >
              <span>Explore Now</span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>

        {/* Media / 3D Graphic Side */}
        <div className="relative z-10 hidden sm:flex items-center justify-center w-36 h-36 flex-shrink-0">
          {b.mediaUrl && !imgErrors.has(b.id) ? (
            <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 transform rotate-3 hover:rotate-0 transition-transform">
              <img
                src={b.mediaUrl}
                alt="Banner Graphic"
                className="w-full h-full object-cover"
                onError={() => setImgErrors(prev => new Set([...prev, b.id]))}
              />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl transform rotate-6">
              <Sparkles className="w-12 h-12 text-yellow-300 animate-pulse" />
            </div>
          )}
        </div>

        {/* Carousel Controls */}
        {banners.length > 1 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); pauseAndResume(); setAutoPlay(p => !p); }}
              className="p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-colors"
              aria-label={autoPlay ? 'Pause' : 'Play'}
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={prev}
              className="p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={next}
              className="p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
