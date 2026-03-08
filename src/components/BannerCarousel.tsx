/**
 * BannerCarousel – Real-time dashboard banners
 *
 * • Fetches from `dashboardBanners` collection via onSnapshot (live updates)
 * • Filters by targetRoles (shows banner only if user role matches or 'all')
 * • Auto-cycles every 5 s with smooth fade transition
 * • Supports image, video and url media types
 * • Placed at the very top of every dashboard (EXCEPT platform_admin — they manage banners, not view them)
 * • Banners are NON-DISMISSIBLE — users cannot close them; they disappear only when expired
 * • Full backward-compat with legacy imageUrl / link / linkType fields
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  Globe,
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawBanner {
  id: string;
  mediaType?: 'image' | 'video' | 'url';
  mediaUrl?: string;
  imageUrl?: string;          // legacy
  clickUrl?: string;
  link?: string;              // legacy
  clickUrlType?: 'internal' | 'external';
  linkType?: 'internal' | 'external' | 'none'; // legacy
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function BannerCarousel() {
  const navigate    = useNavigate();
  const { userRole } = useAuth();

  const [banners,   setBanners]  = useState<Banner[]>([]);
  const [current,   setCurrent]  = useState(0);
  const [autoPlay,  setAutoPlay] = useState(true);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [fade,      setFade]     = useState(true);

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);

  // ── Platform admin does NOT see banners (they create/manage them) ─────────
  if (userRole === 'platform_admin') return null;

  // ── Real-time Firestore listener ──────────────────────────────────────────
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

          // Expiry check — only the expiry date removes the banner
          if (raw.expiresAt) {
            const expDate = typeof raw.expiresAt.toDate === 'function'
              ? raw.expiresAt.toDate()
              : new Date(raw.expiresAt as unknown as string);
            if (expDate <= now) return null;
          }

          // Role check
          const roles: string[] = Array.isArray(raw.targetRoles)
            ? raw.targetRoles
            : [];

          if (roles.length === 0) return null;

          // Only show to target roles (not platform_admin — already returned null above)
          const visible =
            roles.includes('all') ||
            roles.includes(userRole);

          if (!visible) return null;

          // Resolve media URL
          const mediaUrl = (raw.mediaUrl || raw.imageUrl || '').trim();
          if (!mediaUrl) return null;

          // Resolve link
          const linkUrl  = (raw.clickUrl  || raw.link  || '').trim();
          const rawType  = raw.clickUrlType || raw.linkType;
          const linkType: 'internal' | 'external' | 'none' =
            rawType === 'internal' ? 'internal' :
            rawType === 'external' ? 'external' : 'none';

          return {
            id:        raw.id,
            mediaType: raw.mediaType || 'image',
            mediaUrl,
            linkUrl,
            linkType,
            title:   raw.title   || '',
            message: raw.message || '',
          } as Banner;
        })
        .filter((b): b is Banner => b !== null);

      setBanners(resolved);
      setCurrent(0);
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  // ── Auto-cycle ────────────────────────────────────────────────────────────
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

  // ── Pause-and-resume on manual interaction ────────────────────────────────
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

  const dot = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    pauseAndResume();
    setFade(false); setTimeout(() => setFade(true), 150);
    setCurrent(idx);
  };

  const handleClick = (banner: Banner) => {
    if (!banner.linkUrl || banner.linkType === 'none') return;
    if (banner.linkType === 'internal') {
      navigate(banner.linkUrl.startsWith('/') ? banner.linkUrl : '/' + banner.linkUrl);
    } else {
      window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const imgError = (id: string) =>
    setImgErrors(prev => new Set([...prev, id]));

  // ── Nothing to show ───────────────────────────────────────────────────────
  if (banners.length === 0) return null;

  const b       = banners[current] ?? banners[0];
  const hasLink = !!b.linkUrl && b.linkType !== 'none';
  const failed  = imgErrors.has(b.id);

  return (
    <div className="w-full mb-4">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg group select-none bg-gray-900">

        {/* ── Media area ─────────────────────────────────────── */}
        <div
          onClick={() => hasLink && handleClick(b)}
          className={[
            'relative w-full h-52 sm:h-64 md:h-80 lg:h-96 overflow-hidden',
            hasLink ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
        >
          {/* Fade wrapper */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: fade ? 1 : 0 }}
          >
            {b.mediaType === 'video' ? (
              <video
                key={b.id}
                src={b.mediaUrl}
                className="w-full h-full object-cover"
                autoPlay muted loop playsInline
                onError={() => imgError(b.id)}
              />
            ) : failed ? (
              /* Gradient fallback when image can't load */
              <div className="w-full h-full bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-800 flex flex-col items-center justify-center gap-3 px-8 text-center">
                <Globe className="w-10 h-10 text-white/60" />
                {b.title && <p className="text-white font-bold text-xl drop-shadow">{b.title}</p>}
                {b.message && <p className="text-white/80 text-sm">{b.message}</p>}
              </div>
            ) : (
              <img
                key={b.id}
                src={b.mediaUrl}
                alt={b.title || 'Banner'}
                className="w-full h-full object-cover"
                onError={() => imgError(b.id)}
              />
            )}
          </div>

          {/* Dark gradient overlay for readability */}
          {!failed && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
          )}

          {/* Title / message */}
          {(b.title || b.message) && !failed && (
            <div className="absolute bottom-3 left-4 right-4 pointer-events-none">
              {b.title   && <p className="text-white font-bold text-base sm:text-lg drop-shadow line-clamp-1">{b.title}</p>}
              {b.message && <p className="text-white/85 text-xs sm:text-sm drop-shadow line-clamp-2">{b.message}</p>}
            </div>
          )}

          {/* Link badge */}
          {hasLink && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-black/55 text-white text-xs rounded-full backdrop-blur-sm">
              <ExternalLink className="w-3 h-3" />
              {b.linkType === 'internal' ? 'View inside app' : 'Visit link'}
            </div>
          )}

          {/* Counter + play/pause — top right (no dismiss button) */}
          {banners.length > 1 && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              <button
                onClick={e => { e.stopPropagation(); pauseAndResume(); setAutoPlay(p => !p); }}
                className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                aria-label={autoPlay ? 'Pause' : 'Play'}
              >
                {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {current + 1}/{banners.length}
              </span>
            </div>
          )}

          {/* Prev / Next arrows (visible on hover) */}
          {banners.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-black p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-black p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* ── Dot indicators ─────────────────────────────────── */}
        {banners.length > 1 && (
          <div className="flex justify-center gap-1.5 py-2 bg-black/10 dark:bg-white/5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={e => dot(e, i)}
                className={[
                  'h-1.5 rounded-full transition-all duration-300',
                  i === current
                    ? 'w-6 bg-purple-500 dark:bg-purple-400'
                    : 'w-2 bg-gray-400 dark:bg-gray-600 hover:bg-gray-500',
                ].join(' ')}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
