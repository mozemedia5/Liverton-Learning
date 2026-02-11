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
  Save,
  Share2,
  Sheet,
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

import './editorStyles.css';

export default function SpreadsheetEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled Spreadsheet');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  const cols = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F'], []);
  const [rowCount, setRowCount] = useState(20);
  const [cells, setCells] = useState<Record<string, string>>({});

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

        if (doc.content?.kind === 'sheet') {
          setCells(doc.content.cells || {});
        } else {
          setCells({});
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
      } catch {
        toast.error('Failed to save spreadsheet');
      } finally {
        setSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasChanges, record, docId, currentUser, title, cells]);

  const setCell = (addr: string, value: string) => {
    setCells((prev) => ({ ...prev, [addr]: value }));
    setHasChanges(true);
  };

  const addRow = () => {
    setRowCount((r) => r + 10);
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

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push(cols.join(','));

    for (let r = 1; r <= rowCount; r++) {
      const row = cols.map((c) => {
        const v = cells[`${c}${r}`] ?? '';
        return `"${String(v).replaceAll('"', '""')}"`;
      });
      lines.push(row.join(','));
    }

    const csv = lines.join('\n');
    const el = window.document.createElement('a');
    el.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    el.setAttribute('download', `${title}.csv`);
    el.style.display = 'none';
    window.document.body.appendChild(el);
    el.click();
    window.document.body.removeChild(el);

    toast.success('Exported CSV');
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
      toast.success('Saved (new version)');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading spreadsheet...</p>
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
              <Sheet className="w-5 h-5 flex-shrink-0" />
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
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-900">
                <th className="border border-gray-200 dark:border-gray-800 px-3 py-2 text-left text-sm font-semibold w-12">
                  #
                </th>
                {cols.map((col) => (
                  <th
                    key={col}
                    className="border border-gray-200 dark:border-gray-800 px-3 py-2 text-left text-sm font-semibold min-w-32"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, idx) => {
                const r = idx + 1;
                return (
                  <tr key={r} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900">
                      {r}
                    </td>
                    {cols.map((c) => {
                      const addr = `${c}${r}`;
                      return (
                        <td key={addr} className="border border-gray-200 dark:border-gray-800 p-0">
                          <Input
                            value={cells[addr] ?? ''}
                            onChange={(e) => setCell(addr, e.target.value)}
                            className="border-0 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Button onClick={addRow} variant="outline" className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add rows
        </Button>
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
