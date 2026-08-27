import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';

interface DashboardHeroProps {
  eyebrow: string;
  title: string;
  rotatingWords?: string[];
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ElementType;
  children?: ReactNode;
}

export default function DashboardHero({
  eyebrow,
  title,
  rotatingWords = ['learn', 'create', 'connect', 'grow'],
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  children,
}: DashboardHeroProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const wordsKey = rotatingWords.join('|');
  const words = useMemo(() => rotatingWords.length ? rotatingWords : ['learn'], [wordsKey]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    const updatePageVisibility = () => setIsPageVisible(document.visibilityState === 'visible');
    updateMotionPreference();
    updatePageVisibility();
    mediaQuery.addEventListener?.('change', updateMotionPreference);
    document.addEventListener('visibilitychange', updatePageVisibility);
    return () => {
      mediaQuery.removeEventListener?.('change', updateMotionPreference);
      document.removeEventListener('visibilitychange', updatePageVisibility);
    };
  }, []);

  useEffect(() => {
    setWordIndex(0);
  }, [wordsKey]);

  useEffect(() => {
    if (prefersReducedMotion || !isPageVisible || words.length < 2) return;
    const interval = window.setInterval(() => setWordIndex((current) => (current + 1) % words.length), 2400);
    return () => window.clearInterval(interval);
  }, [isPageVisible, prefersReducedMotion, words.length, wordsKey]);

  return (
    <section className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-black tracking-[0.2em] text-blue-200 drop-shadow-[0_0_14px_rgba(147,197,253,.7)]">liverton learning</span>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(147,197,253,.9)]" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{eyebrow}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{title} <span key={words[wordIndex]} aria-live="polite" className="inline-block min-w-[6ch] whitespace-nowrap text-blue-200 drop-shadow-[0_0_18px_rgba(147,197,253,.65)] [will-change:transform,opacity] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none">{words[wordIndex]}</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-blue-100/80 sm:text-base">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {children}
          {actionLabel && onAction && <button type="button" onClick={onAction} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-blue-50 active:scale-[.98]">{ActionIcon && <ActionIcon size={16} />} {actionLabel}</button>}
        </div>
      </div>
    </section>
  );
}
