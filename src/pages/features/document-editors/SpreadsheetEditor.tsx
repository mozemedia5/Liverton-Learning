import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Edit2,
  Loader2,
  MoreVertical,
  Save,
  Share2,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { DocumentContent, DocumentRecord } from '@/types';

export default function SpreadsheetEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled Spreadsheet');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number>(0);

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  const [cells, setCells] = useState<Record<string, string>>({});
  const rows = 10;
  const cols = 5;

  const canEdit = !!currentUser && !!docId;

  useEffect(() => {
    const loadDoc = async () => {
      if (!docId || !currentUser) return;
      try {
        const doc = await getDocument(docId);
        if (!doc) throw new Error('Document not found');

        setRecord(doc);
        setTitle(doc.title);
        setNewTitle(doc.title);

        if (doc.content?.kind === 'sheet') {
          setCells(doc.content.cells ?? {});
        }
      } catch {
        toast.error('Failed to load spreadsheet');
        navigate('/dashboard/documents');
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [docId, currentUser, navigate]);

  // Auto-save with debouncing
  useEffect(() => {
    if (!hasChanges || !record || !docId || !currentUser) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const content: DocumentContent = { kind: 'sheet', cells };
        await updateDocumentContent({
          docId,
          updatedBy: currentUser.uid,
          content,
          newTitle: title,
          bumpVersion: false,
        });
        setHasChanges(false);
        setLastSavedTime(Date.now());
      } catch {
        toast.error('Failed to save spreadsheet');
      } finally {
        setSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasChanges, record, docId, currentUser, title, cells]);

  const handleCellChange = useCallback((rowIdx: number, colIdx: number, value: string) => {
    const key = `${rowIdx},${colIdx}`;
    setCells((prev) => {
      const updated = { ...prev };
      if (value.trim()) {
        updated[key] = value;
      } else {
        delete updated[key];
      }
      return updated;
    });
    setHasChanges(true);
  }, []);

  const getCellValue = (rowIdx: number, colIdx: number): string => {
    return cells[`${rowIdx},${colIdx}`] ?? '';
  };

  const handleRename = async () => {
    if (!newTitle.trim() || !docId) return;
    try {
      await renameDocument(docId, newTitle.trim());
      setTitle(newTitle.trim());
      setShowRenameDialog(false);
      toast.success('Spreadsheet renamed');
    } catch {
      toast.error('Failed to rename spreadsheet');
    }
  };

  const handleDelete = async () => {
    if (!docId) return;
    const ok = window.confirm('Are you sure you want to delete this spreadsheet? This cannot be undone.');
    if (!ok) return;

    try {
      await deleteDocument(docId);
      toast.success('Spreadsheet deleted');
      navigate('/dashboard/documents');
    } catch {
      toast.error('Failed to delete spreadsheet');
    }
  };

  const saveVersionNow = async () => {
    if (!docId || !currentUser) return;
    try {
      setSaving(true);
      await updateDocumentContent({
        docId,
        updatedBy: currentUser.uid,
        content: { kind: 'sheet', cells },
        newTitle: title,
        bumpVersion: true,
      });
      setHasChanges(false);
      setLastSavedTime(Date.now());
      toast.success('Version saved successfully');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows_arr = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => getCellValue(r, c)).join(',')
    );
    const csv = rows_arr.join('\n');
    const el = document.createElement('a');
    el.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    el.setAttribute('download', `${title}.csv`);
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    toast.success('Exported CSV');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Opening spreadsheet...</p>
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

            {!hasChanges && !saving && lastSavedTime > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Save className="w-4 h-4" />
                All saved
              </div>
            )}

            <Button variant="outline" size="sm" onClick={saveVersionNow} disabled={!canEdit || saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Version
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
                <DropdownMenuItem onClick={exportCsv}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
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

      <main className="px-4 lg:px-6 py-6">
        <div className="overflow-x-auto">
          <table className="border-collapse w-full text-sm">
            <thead>
              <tr>
                <th className="w-12 h-8 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-semibold"></th>
                {Array.from({ length: cols }, (_, i) => (
                  <th
                    key={i}
                    className="h-8 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-center min-w-24"
                  >
                    {String.fromCharCode(65 + i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, r) => (
                <tr key={r}>
                  <td className="w-12 h-8 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-center">
                    {r + 1}
                  </td>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={`${r}-${c}`} className="border border-gray-200 dark:border-gray-800">
                      <input
                        type="text"
                        value={getCellValue(r, c)}
                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                        className="w-full h-8 px-2 bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Spreadsheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Spreadsheet title" />
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
