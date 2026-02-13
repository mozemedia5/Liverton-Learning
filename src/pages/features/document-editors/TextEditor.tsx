import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bold,
  Download,
  Edit2,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  MoreVertical,
  Save,
  Share2,
  Trash2,
  Underline,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';
import { deleteDocument, getDocument, renameDocument, updateDocumentContent } from '@/lib/documents';
import { ShareWithHannaDialog } from '@/components/ShareWithHannaDialog';
import type { DocumentContent, DocumentRecord } from '@/types';

import './editorStyles.css';

export default function TextEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const editorRef = useRef<HTMLDivElement>(null);

  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

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

        if (editorRef.current) {
          if (doc.content?.kind === 'doc') editorRef.current.innerHTML = doc.content.html;
          else editorRef.current.innerHTML = '<p>Unsupported content format.</p>';
        }
      } catch (error) {
        toast.error('Failed to load document');
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
        const html = editorRef.current?.innerHTML || '';
        const content: DocumentContent = { kind: 'doc', html };
        await updateDocumentContent({
          docId,
          updatedBy: currentUser.uid,
          content,
          newTitle: title,
          bumpVersion: false,
        });
        setHasChanges(false);
      } catch {
        toast.error('Failed to save document');
      } finally {
        setSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasChanges, record, docId, currentUser, title]);

  const handleContentChange = () => setHasChanges(true);

  const handleRename = async () => {
    if (!newTitle.trim() || !docId) return;
    try {
      await renameDocument(docId, newTitle.trim());
      setTitle(newTitle.trim());
      setShowRenameDialog(false);
      toast.success('Document renamed');
    } catch {
      toast.error('Failed to rename document');
    }
  };

  const handleDelete = async () => {
    if (!docId) return;
    const confirmed = window.confirm('Are you sure you want to delete this document? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteDocument(docId);
      toast.success('Document deleted');
      navigate('/dashboard/documents');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleExport = () => {
    const html = editorRef.current?.innerHTML || '';
    const el = window.document.createElement('a');
    el.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
    el.setAttribute('download', `${title}.html`);
    el.style.display = 'none';
    window.document.body.appendChild(el);
    el.click();
    window.document.body.removeChild(el);
    toast.success('Document exported');
  };

  const applyFormat = (command: string, value?: string) => {
    window.document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Opening editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/documents')}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanges(true);
                }}
                className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-0"
                placeholder="Untitled"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saving && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {!saving && !hasChanges && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Save className="w-4 h-4" />
                <span>Saved</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as HTML
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

        {/* Toolbar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('bold')}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('italic')}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('underline')}
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </Button>
            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('formatBlock', 'h1')}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('formatBlock', 'h2')}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </Button>
            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('insertUnorderedList')}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('insertOrderedList')}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-0">
            <div
              ref={editorRef}
              contentEditable={canEdit}
              onInput={handleContentChange}
              className="min-h-96 p-6 focus:outline-none prose dark:prose-invert max-w-none"
              suppressContentEditableWarning
            />
          </CardContent>
        </Card>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>Enter a new name for your document</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Document name"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share with Hanna Dialog */}
      <ShareWithHannaDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        documentTitle={title}
        documentId={docId || ''}
      />
    </div>
  );
}
