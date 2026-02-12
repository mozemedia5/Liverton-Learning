/**
 * Enhanced Text Editor Component
 * Microsoft Word-style text editor with comprehensive formatting features
 * Features: Rich text editing, formatting toolbar, document statistics, collaboration
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Loader2,
  MoreVertical,
  Save,
  Share2,
  Trash2,
  Download,
  Edit2,
  Star,
  RotateCcw,
  RotateCw,
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
  DropdownMenuLabel,
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
import { updateEnhancedDocument, trackDocumentAccess, toggleFavorite } from '@/lib/documentEnhancements';
import { ShareWithHannaDialog } from '@/components/ShareWithHannaDialog';
import type { DocumentContent, DocumentRecord } from '@/types';

import './editorStyles.css';

/**
 * Enhanced Text Editor with Microsoft Word-style UI
 * Provides comprehensive text editing capabilities with formatting toolbar
 */
export default function EnhancedTextEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const editorRef = useRef<HTMLDivElement>(null);

  // Document state
  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Editor state
  const [html, setHtml] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  // UI state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  /**
   * Calculate word and character counts from HTML content
   */
  const updateCounts = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
    const chars = text.length;
    setWordCount(words);
    setCharacterCount(chars);
  };

  /**
   * Load document on mount
   */
  useEffect(() => {
    const loadDoc = async () => {
      if (!docId || !currentUser) return;
      try {
        const doc = await getDocument(docId);
        if (!doc) throw new Error('Document not found');

        setRecord(doc);
        setTitle(doc.title);
        setNewTitle(doc.title);
        setIsFavorite(doc.isFavorite || false);

        // Track access
        await trackDocumentAccess({
          docId,
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Unknown',
        });

        // Load document content
        if (doc.content?.kind === 'doc') {
          setHtml(doc.content.html);
          updateCounts(doc.content.html);
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

  /**
   * Auto-save document with debouncing
   */
  useEffect(() => {
    if (!hasChanges || !record || !docId || !currentUser) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const content: DocumentContent = {
          kind: 'doc',
          html,
        };

        await updateDocumentContent({
          docId,
          updatedBy: currentUser.uid,
          content,
          newTitle: title,
          bumpVersion: false,
        });

        // Update enhanced metadata
        await updateEnhancedDocument({
          docId,
          updates: {
            wordCount,
            characterCount,
          },
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Unknown',
        });

        setHasChanges(false);
      } catch {
        toast.error('Failed to save document');
      } finally {
        setSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasChanges, record, docId, currentUser, title, html, wordCount, characterCount]);

  /**
   * Handle content change
   */
  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newHtml = e.currentTarget.innerHTML;
    setHtml(newHtml);
    updateCounts(newHtml);
    setHasChanges(true);
  };

  /**
   * Apply formatting command
   */
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  /**
   * Handle rename
   */
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

  /**
   * Handle delete
   */
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

  /**
   * Handle favorite toggle
   */
  const handleToggleFavorite = async () => {
    if (!docId) return;
    try {
      const newFavoriteState = !isFavorite;
      await toggleFavorite({
        docId,
        isFavorite: newFavoriteState,
        userId: currentUser?.uid || '',
        userName: currentUser?.displayName || 'Unknown',
      });
      setIsFavorite(newFavoriteState);
      toast.success(newFavoriteState ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorite status');
    }
  };

  /**
   * Export document as HTML
   */
  const handleExport = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
    element.setAttribute('download', `${title}.html`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Document exported as HTML');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Opening document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Back button and title */}
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

          {/* Status and action buttons */}
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
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className={isFavorite ? 'text-yellow-500' : ''}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>

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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Document Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
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

        {/* Formatting Toolbar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-1">
            {/* Text formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('bold')}
              title="Bold (Ctrl+B)"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('italic')}
              title="Italic (Ctrl+I)"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('underline')}
              title="Underline (Ctrl+U)"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Underline className="w-4 h-4" />
            </Button>

            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            {/* Alignment */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('justifyLeft')}
              title="Align Left"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('justifyCenter')}
              title="Align Center"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('justifyRight')}
              title="Align Right"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <AlignRight className="w-4 h-4" />
            </Button>

            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            {/* Lists */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('insertUnorderedList')}
              title="Bullet List"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('insertOrderedList')}
              title="Numbered List"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>

            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('undo')}
              title="Undo (Ctrl+Z)"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('redo')}
              title="Redo (Ctrl+Y)"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-500">
            <div className="flex gap-4">
              <span>Words: {wordCount}</span>
              <span>Characters: {characterCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleContentChange}
              className="min-h-96 focus:outline-none prose prose-sm dark:prose-invert max-w-none"
              style={{
                fontSize: '16px',
                lineHeight: '1.6',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
              }}
            >
              {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : 'Start typing...'}
            </div>
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

      {/* Share Dialog */}
      <ShareWithHannaDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        documentTitle={title}
        documentId={docId || ''}
      />
    </div>
  );
}
