import { useEffect, useMemo, useState } from 'react';
import { AskHannaIcon } from '@/components/AskHannaIcon';

type HannaStage = 'idle' | 'planning' | 'searching' | 'synthesizing' | 'ready' | 'partial' | 'streaming';

const STAGE_LABELS: Record<Exclude<HannaStage, 'idle'>, string[]> = {
  planning: ['Thinking', 'Sharpening the pencil', 'Planning the response'],
  searching: ['Searching the Web', 'Gathering info', 'Checking sources'],
  synthesizing: ['Noting', 'Compiling', 'Comparing evidence'],
  partial: ['Gathering info', 'Checking what is available', 'Preparing a useful answer'],
  streaming: ['Implementing', 'Writing the answer', 'Putting it together'],
  ready: ['Compiling', 'Finishing the response', 'Almost ready'],
};

export default function HannaActivityIndicator({ stage, compact = false }: { stage: HannaStage; compact?: boolean }) {
  const labels = useMemo(() => STAGE_LABELS[stage] || STAGE_LABELS.planning, [stage]);
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    setLabelIndex(0);
    if (labels.length < 2) return;
    const timer = window.setInterval(() => setLabelIndex(index => (index + 1) % labels.length), 1700);
    return () => window.clearInterval(timer);
  }, [labels]);

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`} role="status" aria-live="polite">
      <div className={`relative grid shrink-0 place-items-center rounded-2xl bg-slate-950 ${compact ? 'h-8 w-8' : 'h-11 w-11'}`}>
        <AskHannaIcon size={compact ? 24 : 34} active alt="Hanna is working" />
        <span className="absolute inset-0 rounded-2xl border border-cyan-300/40 animate-ping opacity-20" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-black text-slate-700 dark:text-slate-100`}>{labels[labelIndex]}</p>
        {!compact && <p className="mt-0.5 text-[10px] text-slate-400">Hanna is showing what she is doing</p>}
      </div>
    </div>
  );
}
