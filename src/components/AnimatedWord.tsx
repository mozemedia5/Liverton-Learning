import { useEffect, useMemo, useState } from 'react';

interface AnimatedWordProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

export default function AnimatedWord({ words: inputWords, intervalMs = 2400, className = '' }: AnimatedWordProps) {
  const wordsKey = inputWords.join('|');
  const words = useMemo(() => inputWords.length ? inputWords : ['learn'], [inputWords]);
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(mediaQuery.matches);
    const updateVisibility = () => setVisible(document.visibilityState === 'visible');
    updateMotion();
    updateVisibility();
    mediaQuery.addEventListener?.('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      mediaQuery.removeEventListener?.('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => setIndex(0), [wordsKey]);

  useEffect(() => {
    if (reducedMotion || !visible || words.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % words.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, reducedMotion, visible, words.length, wordsKey]);

  return <span key={words[index]} aria-live="polite" className={`inline-block min-w-[5ch] whitespace-nowrap text-blue-600 drop-shadow-[0_0_10px_rgba(37,99,235,.35)] [will-change:transform,opacity] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-reduce:animate-none ${className}`}>{words[index]}</span>;
}
