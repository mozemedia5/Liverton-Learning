import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Edit2,
  Loader2,
  MoreVertical,
  Plus,
  Presentation,
  Save,
  Share2,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';
import { deleteDocument, getDocument, renameDocument, updateDocumentContent } from '@/lib/documents';
import { ShareWithHannaDialog } from '@/components/ShareWithHannaDialog';
import type { DocumentContent, DocumentRecord, PresentationElement, PresentationSlide } from '@/types';

import './editorStyles.css';

function uid() {
  return crypto.randomUUID();
}

function createDefaultTextElement(text: string): PresentationElement {
  return {
    id: uid(),
    type: 'text',
    x: 8,
    y: 20,
    w: 84,
    h: 60,
    text,
    fontSize: 20,
    align: 'left',
  };
}

function createSlide(): PresentationSlide {
  return {
    id: uid(),
    title: 'New Slide',
    layout: 'title_content',
    elements: [createDefaultTextElement('Add your content here...')],
  };
}

function getSlideBody(slide: PresentationSlide) {
  const firstText = slide.elements.find((e) => e.type === 'text') as Extract<PresentationElement, { type: 'text' }> | undefined;
  return firstText?.text ?? '';
}

function setSlideBody(slide: PresentationSlide, body: string): PresentationSlide {
  const idx = slide.elements.findIndex((e) => e.type === 'text');
  if (idx === -1) {
    return { ...slide, elements: [...slide.elements, createDefaultTextElement(body)] };
  }
  const el = slide.elements[idx] as Extract<PresentationElement, { type: 'text' }>;
  const next = { ...el, text: body } as PresentationElement;
  const elements = slide.elements.slice();
  elements[idx] = next;
  return { ...slide, elements };
}

export default function PresentationEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled Presentation');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  const [slides, setSlides] = useState<PresentationSlide[]>([createSlide()]);
  const [selectedSlide, setSelectedSlide] = useState<string>('');

  const selected = useMemo(() => slides.find((s) => s.id === selectedSlide) ?? slides[0], [slides, selectedSlide]);
  const selectedBody = useMemo(() => getSlideBody(selected), [selected]);

  const canEdit = useMemo(() => !!currentUser && !!docId, [currentUser, docId]);

  useEffect(() => {
    const loadDoc = async () => {
      if (!docId || !currentUser) return;
      try {
        const doc = await getDocument(docId);
        if (!doc) throw new Error('Document not found');

        setRecord(doc);
        setTitle(doc.title);
        setNewTitle(doc.title);

        if (doc.content?.kind === 'presentation') {
          const incoming = doc.content.slides ?? [];
          const normalized: PresentationSlide[] = (incoming.length ? incoming : [createSlide()]).map((s) => ({
            id: s.id || uid(),
            title: s.title ?? 'Slide',
            layout: s.layout ?? 'title_content',
            elements:
              s.elements && s.elements.length
                ? s.elements
                : [createDefaultTextElement('Add your content here...')],
          }));
          setSlides(normalized);
          setSelectedSlide(normalized[0].id);
        } else {
          const s = createSlide();
          setSlides([s]);
          setSelectedSlide(s.id);
        }
      } catch {
        toast.error('Failed to load presentation');
        navigate('/dashboard/documents');
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [docId, currentUser, navigate]);

  useEffect(() => {
    if (!hasChanges || !record || !docId || !currentUser) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const content: DocumentContent = { kind: 'presentation', slides };
        await updateDocumentContent({
          docId,
          updatedBy: currentUser.uid,
          content,
          newTitle: title,
          bumpVersion: false,
        });
        setHasChanges(false);
      } catch {
        toast.error('Failed to save presentation');
      } finally {
        setSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasChanges, record, docId, currentUser, title, slides]);

  const updateSlide = (id: string, patch: Partial<PresentationSlide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setHasChanges(true);
  };

  const updateSelectedBody = (body: string) => {
    setSlides((prev) => prev.map((s) => (s.id === selected.id ? setSlideBody(s, body) : s)));
    setHasChanges(true);
  };

  const addSlide = () => {
    const s = createSlide();
    setSlides((prev) => [...prev, s]);
    setSelectedSlide(s.id);
    setHasChanges(true);
  };

  const removeSelectedSlide = () => {
    if (slides.length <= 1) return;
    const idx = slides.findIndex((s) => s.id === selected.id);
    const next = slides.filter((s) => s.id !== selected.id);
    setSlides(next);
    setSelectedSlide(next[Math.max(0, idx - 1)].id);
    setHasChanges(true);
  };

  const exportHtml = () => {
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; margin:0; padding:24px; background:#0b0b0b; color:#fff;}
  .slide{border:1px solid #2a2a2a; border-radius:16px; padding:28px; margin-bottom:20px; background:#111;}
  .slide h2{margin:0 0 12px 0; font-size:28px;}
  .slide pre{margin:0; white-space:pre-wrap; font-size:18px; color:#ddd; font-family:inherit;}
</style>
</head>
<body>
${slides
  .map((s) => {
    const body = getSlideBody(s);
    return `<section class="slide"><h2>${escapeHtml(s.title ?? '')}</h2><pre>${escapeHtml(body)}</pre></section>`;
  })
  .join('\n')}
</body>
</html>`;

    const el = window.document.createElement('a');
    el.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
    el.setAttribute('download', `${title}.html`);
    el.style.display = 'none';
    window.document.body.appendChild(el);
    el.click();
    window.document.body.removeChild(el);
    toast.success('Exported HTML');
  };

  const handleRename = async () => {
    if (!newTitle.trim() || !docId) return;
    try {
      await renameDocument(docId, newTitle.trim());
      setTitle(newTitle.trim());
      setShowRenameDialog(false);
      toast.success('Presentation renamed');
    } catch {
      toast.error('Failed to rename presentation');
    }
  };

  const handleDelete = async () => {
    if (!docId) return;
    const ok = window.confirm('Are you sure you want to delete this presentation? This cannot be undone.');
    if (!ok) return;

    try {
      await deleteDocument(docId);
      toast.success('Presentation deleted');
      navigate('/dashboard/documents');
    } catch {
      toast.error('Failed to delete presentation');
    }
  };

  const saveVersionNow = async () => {
    if (!docId || !currentUser) return;
    try {
      setSaving(true);
      await updateDocumentContent({
        docId,
        updatedBy: currentUser.uid,
        content: { kind: 'presentation', slides },
        newTitle: title,
        bumpVersion: true,
      });
      setHasChanges(false);
      toast.success('Saved (new version)');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startPresent = () => {
    if (!docId) return;
    window.open(`/present/${docId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading presentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <header className="sticky top-0 z-40 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/documents')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Presentation className="w-5 h-5 flex-shrink-0" />
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanges(true);
                }}
                className="border-0 text-lg font-semibold focus-visible:ring-0 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saving && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
            {hasChanges && !saving && <div className="text-sm text-orange-500">Unsaved changes</div>}

            <Button variant="outline" size="sm" onClick={saveVersionNow} disabled={!canEdit}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            <Button variant="outline" size="sm" onClick={startPresent} disabled={!docId}>
              Present
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportHtml}>
                  <Download className="w-4 h-4 mr-2" />
                  Export HTML
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-6 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Slides</div>
            <Button variant="outline" size="sm" onClick={addSlide}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {slides.map((s, idx) => {
              const active = s.id === selected.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSlide(s.id)}
                  className={
                    'w-full text-left rounded-md border px-3 py-2 transition ' +
                    (active
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900')
                  }
                >
                  <div className="text-xs text-gray-500">Slide {idx + 1}</div>
                  <div className="font-medium truncate">{s.title ?? 'Slide'}</div>
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={removeSelectedSlide}
            disabled={slides.length <= 1}
          >
            Remove slide
          </Button>
        </aside>

        <section className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="space-y-4">
            <Input
              value={selected.title ?? ''}
              onChange={(e) => updateSlide(selected.id, { title: e.target.value })}
              className="text-xl font-semibold"
              placeholder="Slide title"
            />
            <Textarea
              value={selectedBody}
              onChange={(e) => updateSelectedBody(e.target.value)}
              className="min-h-64"
              placeholder="Slide content"
            />

            <div className="text-xs text-gray-500">Tip: Use "Present" to open a full-screen viewer in a new tab.</div>
          </div>
        </section>
      </main>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Presentation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Presentation title" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShareWithHannaDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        documentTitle={title}
        documentId={docId || ''}
      />
    </div>
  );
}

function escapeHtml(v: string) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
