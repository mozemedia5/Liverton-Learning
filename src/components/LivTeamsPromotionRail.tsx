import { useEffect, useState } from 'react';
import { ArrowUpRight, Megaphone } from 'lucide-react';
import { subscribeToApprovedLivTeamPromotions, type LivTeamPromotion } from '@/services/livTeamsPromotionService';

export default function LivTeamsPromotionRail() {
  const [promotions, setPromotions] = useState<LivTeamPromotion[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToApprovedLivTeamPromotions(setPromotions, (error) => {
      console.error('Could not load approved Liv Team promotions:', error);
      setPromotions([]);
    });
    return unsubscribe;
  }, []);

  if (promotions.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Featured Liv Teams">
      <div className="flex items-center gap-2 px-1">
        <Megaphone className="h-4 w-4 text-emerald-500" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Featured Liv Teams</h2>
        <span className="text-xs text-slate-400">Platform-approved</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {promotions.map((promotion) => (
          <article key={promotion.id} className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-white shadow-sm dark:bg-slate-900">
            {promotion.imageUrl && <img src={promotion.imageUrl} alt="" className="h-36 w-full object-cover" loading="lazy" />}
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">{promotion.teamName}</span>
                <span className="text-[10px] text-slate-400">Featured</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{promotion.title}</h3>
              <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{promotion.description}</p>
              {promotion.destinationUrl && /^https?:\/\//i.test(promotion.destinationUrl) && (
                <a href={promotion.destinationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                  Explore <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
