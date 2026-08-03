/**
 * Shared gradient themes for dashboard promo banners (CJ-style).
 * Used by the admin banner studio and the dashboard BannerCarousel.
 */

export interface BannerTheme {
  id: string;
  label: string;
  /** Tailwind gradient classes for the banner background */
  gradient: string;
  /** Swatch shown in the theme picker */
  swatch: string;
  /** Accent color for the CTA button */
  cta: string;
}

export const bannerThemes: BannerTheme[] = [
  {
    id: 'promo-orange',
    label: 'Promo Orange',
    gradient: 'bg-gradient-to-r from-orange-500 via-red-500 to-rose-500',
    swatch: 'linear-gradient(135deg,#f97316,#e11d48)',
    cta: 'bg-white text-orange-600',
  },
  {
    id: 'royal-purple',
    label: 'Royal Purple',
    gradient: 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600',
    swatch: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    cta: 'bg-white text-purple-700',
  },
  {
    id: 'emerald-fresh',
    label: 'Emerald Fresh',
    gradient: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600',
    swatch: 'linear-gradient(135deg,#10b981,#0891b2)',
    cta: 'bg-white text-emerald-700',
  },
  {
    id: 'ocean-blue',
    label: 'Ocean Blue',
    gradient: 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400',
    swatch: 'linear-gradient(135deg,#2563eb,#22d3ee)',
    cta: 'bg-white text-blue-700',
  },
  {
    id: 'sunset-gold',
    label: 'Sunset Gold',
    gradient: 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500',
    swatch: 'linear-gradient(135deg,#fbbf24,#f97316)',
    cta: 'bg-slate-900 text-amber-300',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    gradient: 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900',
    swatch: 'linear-gradient(135deg,#0f172a,#312e81)',
    cta: 'bg-amber-400 text-slate-900',
  },
];

export const DEFAULT_BANNER_THEME = 'ocean-blue';

export function getBannerTheme(id?: string): BannerTheme {
  return bannerThemes.find(t => t.id === id) || bannerThemes.find(t => t.id === DEFAULT_BANNER_THEME)!;
}
