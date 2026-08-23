import { useMemo } from 'react';
import { ArrowLeft, Download, ExternalLink, FileAudio, FileImage, FileText, FileVideo, Presentation, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentRecord } from '@/types';
import { documentTypeLabel, getDocumentDownloadName } from '@/lib/documents';

interface DocumentFileViewerProps {
  doc: DocumentRecord;
  onBack: () => void;
}

function extension(name = '') {
  return name.toLowerCase().split('.').pop() || '';
}

function kindForDocument(doc: DocumentRecord): 'text' | 'sheet' | 'presentation' | 'pdf' | 'image' | 'video' | 'audio' | 'office' | 'file' {
  if (doc.content?.kind === 'doc') return 'text';
  if (doc.content?.kind === 'sheet') return 'sheet';
  if (doc.content?.kind === 'presentation') return 'presentation';
  const mime = (doc.mimeType || '').toLowerCase();
  const fileName = doc.fileName || doc.title;
  const ext = extension(fileName);
  if (doc.type === 'pdf' || mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (doc.type === 'image' || mime.startsWith('image/')) return 'image';
  if (doc.type === 'video' || mime.startsWith('video/')) return 'video';
  if (doc.type === 'audio' || mime.startsWith('audio/')) return 'audio';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) || mime.includes('officedocument') || mime.includes('msword') || mime.includes('msexcel') || mime.includes('mspowerpoint')) return 'office';
  return 'file';
}

type DocumentKind = ReturnType<typeof kindForDocument>;

function FileKindIcon({ kind, className }: { kind: DocumentKind; className?: string }) {
  if (kind === 'image') return <FileImage className={className} />;
  if (kind === 'video') return <FileVideo className={className} />;
  if (kind === 'audio') return <FileAudio className={className} />;
  if (kind === 'sheet') return <Table2 className={className} />;
  if (kind === 'presentation') return <Presentation className={className} />;
  return <FileText className={className} />;
}

export default function DocumentFileViewer({ doc, onBack }: DocumentFileViewerProps) {
  const kind = useMemo(() => kindForDocument(doc), [doc]);
  const downloadName = getDocumentDownloadName(doc);
  const fileUrl = doc.fileUrl;
  const content = (() => {
    if (kind === 'text' && doc.content?.kind === 'doc') {
      return (
        <article
          className="prose prose-slate dark:prose-invert max-w-none rounded-xl bg-white p-6 shadow-sm dark:bg-slate-950"
          dangerouslySetInnerHTML={{ __html: doc.content.html }}
        />
      );
    }

    if (kind === 'sheet' && doc.content?.kind === 'sheet') {
      const cells = Object.entries(doc.content.cells);
      return (
        <div className="overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full text-sm">
            <tbody>
              {cells.map(([cell, value]) => (
                <tr key={cell} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <th className="w-24 bg-slate-50 px-3 py-2 text-left font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">{cell}</th>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (kind === 'presentation' && doc.content?.kind === 'presentation') {
      return (
        <div className="space-y-4">
          {doc.content.slides.map((slide, index) => (
            <section key={slide.id} className="relative min-h-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Slide {index + 1}</p>
              <div className="space-y-3">
                {slide.elements.map((element) => element.type === 'text' ? (
                  <p key={element.id} className="whitespace-pre-wrap text-slate-800 dark:text-slate-100" style={{ fontSize: Math.max(14, Math.min(element.fontSize || 18, 36)), fontWeight: element.bold ? 700 : 400, textAlign: element.align || 'left' }}>
                    {element.text}
                  </p>
                ) : element.type === 'image' ? (
                  <img key={element.id} src={element.url} alt="Presentation element" className="max-h-72 max-w-full rounded-lg object-contain" />
                ) : null)}
              </div>
            </section>
          ))}
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
          <FileKindIcon kind={kind} className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">This document has no file attached yet.</p>
          <p className="mt-1 text-xs text-slate-500">Open the editor or upload a file to add content.</p>
        </div>
      );
    }

    if (kind === 'image') return <img src={fileUrl} alt={doc.title} className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-sm" />;
    if (kind === 'video') return <video src={fileUrl} controls preload="metadata" className="max-h-[70vh] w-full rounded-xl bg-black" />;
    if (kind === 'audio') return <audio src={fileUrl} controls preload="metadata" className="w-full" />;
    if (kind === 'pdf') return <iframe src={`${fileUrl}#toolbar=1&view=FitH`} title={doc.title} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800" />;
    if (kind === 'office') {
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      return <iframe src={officeUrl} title={doc.title} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800" />;
    }
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
        <FileKindIcon kind={kind} className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Preview is not available for this file type.</p>
        <p className="mt-1 text-xs text-slate-500">Download the original file to open it in a compatible application.</p>
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 dark:bg-[#17181d] dark:text-slate-100 lg:pb-4">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#17181d]/95 sm:px-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0" aria-label="Back to documents">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><FileKindIcon kind={kind} className="h-4 w-4" /></span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black sm:text-base" title={doc.title}>{doc.title}</h1>
              <p className="truncate text-[11px] font-medium text-slate-500">{documentTypeLabel(doc.type, doc.fileName || doc.title)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {fileUrl && <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 px-2.5 text-xs sm:px-3"><a href={fileUrl} download={downloadName}><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Download</span></a></Button>}
            {fileUrl && <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 px-2.5 text-xs sm:px-3"><a href={fileUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Open</span></a></Button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-100/70 p-2 dark:border-slate-800 dark:bg-slate-900/50">
          {content}
        </div>
      </main>
    </div>
  );
}
