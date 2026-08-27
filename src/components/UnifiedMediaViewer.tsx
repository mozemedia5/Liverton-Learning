import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

export interface UnifiedMediaItem {
  url: string;
  name: string;
  mimeType?: string;
  type?: 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'office' | 'file';
}

interface UnifiedMediaViewerProps {
  item: UnifiedMediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function mediaKind(item: UnifiedMediaItem) {
  if (item.type) return item.type;
  if (item.mimeType?.startsWith('image/')) return 'image';
  if (item.mimeType?.startsWith('video/')) return 'video';
  if (item.mimeType?.startsWith('audio/')) return 'audio';
  if (item.mimeType === 'application/pdf') return 'pdf';
  if (item.mimeType?.includes('word') || item.mimeType?.includes('text')) return 'document';
  if (item.mimeType?.includes('sheet') || item.mimeType?.includes('excel') || item.mimeType === 'text/csv') return 'spreadsheet';
  if (item.mimeType?.includes('presentation') || item.mimeType?.includes('powerpoint')) return 'presentation';
  return 'file';
}

export function UnifiedMediaViewer({ item, open, onOpenChange }: UnifiedMediaViewerProps) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const kind = item ? mediaKind(item) : 'file';
  const captions = kind === 'image' ? ['Make ideas visible', 'Learn together', 'Keep your momentum'] : kind === 'video' ? ['Watch, pause, understand', 'Every frame can teach', 'Keep going'] : ['Your learning, in focus', 'Open knowledge clearly', 'Move one step further'];
  useEffect(() => {
    if (!open) return;
    setPdfPreviewFailed(false);
    setPdfLoading(kind === 'pdf');
    const timer = window.setInterval(() => setCaptionIndex(index => (index + 1) % captions.length), 1000);
    const pdfTimeout = kind === 'pdf' ? window.setTimeout(() => {
      setPdfLoading(false);
      setPdfPreviewFailed(true);
    }, 8000) : undefined;
    return () => {
      window.clearInterval(timer);
      if (pdfTimeout) window.clearTimeout(pdfTimeout);
    };
  }, [open, captions.length, kind, item?.url]);
  if (!item) return null;
  const kindForViewer = mediaKind(item);
  const office = ['document', 'spreadsheet', 'presentation', 'office'].includes(kindForViewer);
  const viewerUrl = office ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.url)}` : item.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden rounded-3xl border-slate-200 bg-white p-0 dark:border-white/10 dark:bg-[#0c1017]">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-black text-slate-900 dark:text-white">{item.name}</DialogTitle>
              <DialogDescription className="mt-1">Viewing securely inside Liverton Learning</DialogDescription>
            </div>
            <a href={item.url} download={item.name} target="_blank" rel="noopener noreferrer" aria-label={`Download ${item.name}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10 dark:text-slate-300">
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        </DialogHeader>
        <div className="flex max-h-[calc(92vh-92px)] min-h-[18rem] items-center justify-center overflow-auto bg-slate-100 p-4 dark:bg-black/30">
          {kindForViewer === 'image' && <img src={item.url} alt={item.name} className="max-h-[calc(92vh-130px)] max-w-full rounded-2xl object-contain shadow-2xl" />}
          {kindForViewer === 'video' && <video src={item.url} controls autoPlay playsInline className="max-h-[calc(92vh-130px)] max-w-full rounded-2xl bg-black shadow-2xl" />}
          {kindForViewer === 'audio' && <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl dark:bg-[#11151d]"><div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-600"><FileText className="h-9 w-9" /></div><p className="mb-5 font-bold text-slate-800 dark:text-white">{item.name}</p><audio src={item.url} controls autoPlay className="w-full" /></div>}
          {kindForViewer === 'pdf' && (pdfPreviewFailed ? (
            <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl dark:bg-[#11151d]">
              <FileText className="mx-auto mb-4 h-12 w-12 text-amber-500" />
              <p className="font-bold text-slate-900 dark:text-white">The in-app PDF preview could not be opened.</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Open the original PDF in a new browser tab or download it instead. This fallback also works when a file host blocks iframe embedding.</p>
              <div className="mt-5 flex justify-center gap-2">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" /> Open PDF</a>
                <a href={item.url} download={item.name} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"><Download className="h-4 w-4" /> Download</a>
              </div>
            </div>
          ) : <div className="relative h-[calc(92vh-130px)] min-h-[30rem] w-full">
            {pdfLoading && <div className="absolute inset-0 z-10 grid place-items-center bg-white/90 text-sm font-semibold text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading PDF…</div>}
            <iframe src={`${item.url}#toolbar=1&view=FitH`} title={item.name} onLoad={() => { setPdfLoading(false); setPdfPreviewFailed(false); }} onError={() => { setPdfLoading(false); setPdfPreviewFailed(true); }} className="h-full w-full rounded-2xl bg-white shadow-2xl" />
          </div>)}
          {office && <div className="h-[calc(92vh-130px)] min-h-[30rem] w-full overflow-hidden rounded-2xl bg-white shadow-2xl"><iframe src={viewerUrl} title={item.name} className="h-full w-full" /></div>}
          {kindForViewer === 'file' && <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl dark:bg-[#11151d]"><FileText className="mx-auto mb-4 h-12 w-12 text-emerald-500" /><p className="font-bold text-slate-900 dark:text-white">Preview unavailable for this file type.</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use the download action above to open it with a compatible application.</p><a href={item.url} download={item.name} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" /> Open file</a></div>}
          <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-slate-950/75 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur transition-all duration-300">{captions[captionIndex]}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UnifiedMediaViewer;
