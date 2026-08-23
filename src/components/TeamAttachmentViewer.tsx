import { Download, FileText, FileType2, Image as ImageIcon, Music2, PlaySquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamAttachmentViewerProps {
  url?: string;
  name?: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'zip';
  size?: string;
  isMine?: boolean;
}

function extension(name = '') {
  return name.toLowerCase().split('.').pop() || '';
}

function isPdf(name: string, url: string) {
  return extension(name) === 'pdf' || url.toLowerCase().includes('.pdf');
}

function isOfficeDocument(name: string) {
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension(name));
}

export default function TeamAttachmentViewer({ url, name = 'Shared file', type, size, isMine = false }: TeamAttachmentViewerProps) {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-3 text-xs text-slate-500 dark:text-slate-400">
        {name}
      </div>
    );
  }

  if (type === 'image') {
    return (
      <figure className="space-y-2">
        <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
          <img src={url} alt={name} loading="lazy" className="max-w-full max-h-72 w-auto rounded-xl object-contain" />
        </a>
        <figcaption className="flex items-center gap-2 text-xs opacity-80">
          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{name}</span>
        </figcaption>
      </figure>
    );
  }

  if (type === 'video') {
    return (
      <figure className="space-y-2">
        <video src={url} controls preload="metadata" className="max-w-full max-h-72 rounded-xl bg-black" />
        <figcaption className="flex items-center gap-2 text-xs opacity-80">
          <PlaySquare className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{name}</span>
        </figcaption>
      </figure>
    );
  }

  if (type === 'audio') {
    return (
      <figure className="min-w-[240px] max-w-full space-y-2">
        <audio src={url} controls preload="metadata" className="w-full h-10" />
        <figcaption className="flex items-center gap-2 text-xs opacity-80">
          <Music2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{name}</span>
        </figcaption>
      </figure>
    );
  }

  if (type === 'document' && isPdf(name, url)) {
    return (
      <div className="w-full max-w-xl space-y-2">
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-slate-900">
          <iframe src={`${url}#toolbar=1&view=FitH`} title={name} className="h-72 w-full" />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-2 opacity-80">
            <FileType2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{name}</span>
          </span>
          <a href={url} target="_blank" rel="noreferrer" className={isMine ? 'text-white underline' : 'text-emerald-600 dark:text-emerald-400'}>Open PDF</a>
        </div>
      </div>
    );
  }

  if (type === 'document' && isOfficeDocument(name)) {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
      <div className="w-full max-w-xl space-y-2">
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-slate-900">
          <iframe src={viewerUrl} title={name} className="h-72 w-full" />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-2 opacity-80">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{name}</span>
          </span>
          <a href={url} target="_blank" rel="noreferrer" className={isMine ? 'text-white underline' : 'text-emerald-600 dark:text-emerald-400'}>Download</a>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex max-w-full items-center gap-3 rounded-xl p-3 text-xs ${isMine ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'}`}>
      <FileText className="h-5 w-5 shrink-0 text-emerald-500" />
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-[10px] opacity-70">{size || 'File'}</p>
      </div>
      <Button asChild size="icon-sm" variant="ghost" className={`ml-auto shrink-0 ${isMine ? 'text-white hover:bg-white/10' : ''}`}>
        <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${name}`}>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
