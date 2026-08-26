import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Play, Video } from 'lucide-react';
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardAnnouncement } from '@/types/announcement';

type RoleAudience = 'students' | 'teachers' | 'parents' | 'school_admins';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function audienceForRole(role: string | null): RoleAudience | null {
  if (role === 'student') return 'students';
  if (role === 'teacher') return 'teachers';
  if (role === 'parent') return 'parents';
  if (role === 'school_admin') return 'school_admins';
  return null;
}

export default function RoleVideoUpdate() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [updates, setUpdates] = useState<DashboardAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  const audience = audienceForRole(userRole);

  useEffect(() => {
    if (!audience) {
      setUpdates([]);
      return;
    }

    const updatesQuery = query(
      collection(db, 'dashboardAnnouncements'),
      where('isActive', '==', true),
      where('status', '==', 'active'),
      where('type', '==', 'video'),
      where('expiresAt', '>', Timestamp.now()),
      where('targetRoles', 'array-contains-any', ['all', audience]),
    );

    return onSnapshot(updatesQuery, (snapshot) => {
      const now = new Date();
      const next = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as DashboardAnnouncement)
        .filter((item) => {
          const expiry = toDate(item.expiresAt);
          const roles = Array.isArray(item.targetRoles) && item.targetRoles.length > 0
            ? item.targetRoles
            : [item.targetAudience || 'all'];
          return Boolean(item.videoUrl) && (roles.includes('all') || roles.includes(audience)) && (!expiry || expiry > now);
        })
        .sort((left, right) => (right.priority || 0) - (left.priority || 0));
      setUpdates(next);
      setCurrentIndex(0);
      setAspectRatio(16 / 9);
    }, (error) => {
      console.error('Could not load role-targeted video updates:', error);
      setUpdates([]);
    });
  }, [audience]);

  const currentUpdate = updates[currentIndex];
  const safeIndex = updates.length ? currentIndex % updates.length : 0;
  const safeRedirect = useMemo(() => {
    const value = currentUpdate?.redirectUrl?.trim() || '';
    return value;
  }, [currentUpdate]);

  if (!currentUpdate || !audience) return null;

  const openUpdate = () => {
    if (!safeRedirect) return;
    if (/^https?:\/\//i.test(safeRedirect)) {
      window.open(safeRedirect, currentUpdate.openInNewTab === false ? '_self' : '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(safeRedirect.startsWith('/') ? safeRedirect : `/${safeRedirect}`);
  };

  const next = () => setCurrentIndex((index) => (index + 1) % updates.length);
  const previous = () => setCurrentIndex((index) => (index - 1 + updates.length) % updates.length);

  return (
    <section className="overflow-hidden rounded-[24px] border border-emerald-500/15 bg-slate-950 text-white shadow-[0_18px_60px_rgba(16,185,129,.12)]">
      <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_minmax(280px,48%)]">
        <div className="flex flex-col justify-center p-5 sm:p-7">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">
            <Video className="h-3.5 w-3.5" /> Liverton update
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{currentUpdate.title}</h2>
          {currentUpdate.description && <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">{currentUpdate.description}</p>}
          {safeRedirect && <button type="button" onClick={openUpdate} className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300"><Play className="h-3.5 w-3.5 fill-current" /> {currentUpdate.openInNewTab === false ? 'Open update' : 'Learn more'} <ExternalLink className="h-3.5 w-3.5" /></button>}
          <span className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">For {audience.replace('_', ' ')}</span>
        </div>
        <div className="relative flex items-center justify-center overflow-hidden bg-black/40 p-3 sm:p-5" style={{ aspectRatio }}>
          <video
            key={currentUpdate.id}
            src={currentUpdate.videoUrl}
            className="h-full w-full rounded-2xl object-contain"
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) setAspectRatio(video.videoWidth / video.videoHeight);
            }}
          />
          {updates.length > 1 && <>
            <button type="button" onClick={previous} aria-label="Previous update" className="absolute left-5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={next} aria-label="Next update" className="absolute right-5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"><ChevronRight className="h-5 w-5" /></button>
          </>}
        </div>
      </div>
      {updates.length > 1 && <div className="flex items-center justify-center gap-1.5 border-t border-white/10 px-4 py-3"><span className="mr-2 text-[10px] font-bold text-slate-500">{safeIndex + 1} / {updates.length}</span>{updates.map((update, index) => <button type="button" key={update.id} onClick={() => setCurrentIndex(index)} aria-label={`Show update ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === safeIndex ? 'w-7 bg-emerald-400' : 'w-1.5 bg-white/30 hover:bg-white/60'}`} />)}</div>}
    </section>
  );
}
