import { useEffect, useMemo, useState } from 'react';
import GeminiSparkle from '@/components/GeminiSparkle';

type HannaStage = 'idle' | 'planning' | 'searching' | 'synthesizing' | 'ready' | 'partial' | 'streaming';

const STAGE_LABELS: Record<HannaStage, string[]> = {
  idle: ['Standing by', 'Ready to assist'],
  planning: ['Finishing preparing, please wait...', 'Synthesizing response...', 'Structuring insights...'],
  searching: ['Searching authoritative web sources...', 'Gathering citations...', 'Verifying data points...'],
  synthesizing: ['Synthesizing response...', 'Comparing evidence...', 'Polishing final insights...'],
  partial: ['Checking available information...', 'Formatting notes...', 'Just about to finish...'],
  streaming: ['Streaming response...', 'Finishing preparing, almost ready...', 'Compiling output...'],
  ready: ['Polishing final insights...', 'Just about to finish...', 'Finishing preparing, please wait...'],
};

export default function HannaActivityIndicator({ stage, compact = false }: { stage: HannaStage; compact?: boolean }) {
  const labels = useMemo(() => STAGE_LABELS[stage] || STAGE_LABELS.planning, [stage]);
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    setLabelIndex(0);
    if (labels.length < 2) return;
    const timer = window.setInterval(() => setLabelIndex(index => (index + 1) % labels.length), 1800);
    return () => window.clearInterval(timer);
  }, [labels]);

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`} role="status" aria-live="polite">
      <div className={`relative grid shrink-0 place-items-center rounded-2xl bg-[#1e1f20] ${compact ? 'h-8 w-8' : 'h-11 w-11'}`}>
        <GeminiSparkle size={compact ? 20 : 28} animating />
        <span className="absolute inset-0 rounded-2xl border border-[#4285F4]/40 animate-ping opacity-25" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-medium text-slate-700 dark:text-[#e3e3e3]`}>
          {labels[labelIndex]}
        </p>
        {!compact && <p className="mt-0.5 text-[10px] text-slate-400 dark:text-[#c4c7c5]">Gemini AI is generating your response</p>}
      </div>
    </div>
  );
}
