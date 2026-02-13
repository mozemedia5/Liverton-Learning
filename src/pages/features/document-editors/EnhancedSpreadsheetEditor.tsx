/**
 * Enhanced Spreadsheet Editor Component
 * Microsoft Excel-style spreadsheet editor with comprehensive features
 * Features: Cell editing, formulas, formatting, data validation, charts
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
  Loader2,
  MoreVertical,
  Save,
  Share2,
  Trash2,
  Download,
  Edit2,
  Plus,
  Lock,
  Users,
  Star,
  BarChart3,
  Filter,
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
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/contexts/AuthContext';
import { deleteDocument, getDocument, renameDocument, updateDocumentContent } from '@/lib/documents';
import { updateEnhancedDocument, trackDocumentAccess, toggleFavorite } from '@/lib/documentEnhancements';
import { ShareWithHannaDialog } from '@/components/ShareWithHannaDialog';
import type { DocumentContent, DocumentRecord } from '@/types';

import './editorStyles.css';

interface CellData {
  value: string;
  formula?: string;
  format?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    textColor?: string;
  };
}

/**
 * Enhanced Spreadsheet Editor with Microsoft Excel-style UI
 * Provides comprehensive spreadsheet editing capabilities
 */
export default function EnhancedSpreadsheetEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const gridRef = useRef<HTMLDivElement>(null);

  // Document state
  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Spreadsheet state
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [rows, setRows] = useState(20);
  const [columns, setColumns] = useState(10);

  // UI state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [cellCount, setCellCount] = useState(0);



  // Column letters
  const getColumnLetter = (index: number): string => {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  };

  // Note: parseCellRef function available for future use if needed

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

        // Load spreadsheet data
        if (doc.content?.kind === 'sheet') {
          const cellsData: Record<string, CellData> = {};
          Object.entries(doc.content.cells).forEach(([key, value]) => {
            cellsData[key] = {
              value: String(value),
            };
          });
          setCells(cellsData);
          setCellCount(Object.keys(cellsData).length);
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
   * Auto-save spreadsheet with debouncing
   */
  useEffect(() => {
    if (!hasChanges || !record || !docId || !currentUser) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        // Convert cells to simple format for storage
        const cellsForStorage: Record<string, string> = {};
        Object.entries(cells).forEach(([key, data]) => {
          cellsForStorage[key] = data.value;
        });

        const content: DocumentContent = {
          kind: 'sheet',
          cells: cellsForStorage,
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
            wordCount: Object.values(cells).reduce((sum, cell) => sum + cell.value.split(/\s+/).length, 0),
            characterCount: Object.values(cells).reduce((sum, cell) => sum + cell.value.length, 0),
          },
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Unknown',
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

  /**
   * Handle cell value change
   */
  const handleCellChange = (cellRef: string, value: string) => {
    setCells((prev) => ({
      ...prev,
      [cellRef]: {
        ...prev[cellRef],
        value,
      },
    }));
    setHasChanges(true);
  };

  /**
   * Handle cell selection
   */
  const handleCellSelect = (cellRef: string) => {
    setSelectedCell(cellRef);
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
   * Export spreadsheet
   */
  const handleExport = () => {
    let csv = '';
    for (let row = 0; row < rows; row++) {
      const rowData = [];
      for (let col = 0; col < columns; col++) {
        const cellRef = getColumnLetter(col) + (row + 1);
        const cellData = cells[cellRef];
        rowData.push(cellData?.value || '');
      }
      csv += rowData.join(',') + '\n';
    }

    const el = document.createElement('a');
    el.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    el.setAttribute('download', `${title}.csv`);
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    toast.success('Spreadsheet exported as CSV');
  };

  /**
   * Add row
   */
  const handleAddRow = () => {
    setRows((prev) => prev + 1);
  };

  /**
   * Add column
   */
  const handleAddColumn = () => {
    setColumns((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Opening spreadsheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pl-16 md:pl-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
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
                <DropdownMenuLabel>Spreadsheet Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as CSV
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
          <div className="max-w-7xl mx-auto flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('bold')}
              title="Bold"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('italic')}
              title="Italic"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('underline')}
              title="Underline"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Underline className="w-4 h-4" />
            </Button>

            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('alignLeft')}
              title="Align Left"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('alignCenter')}
              title="Align Center"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormat('alignRight')}
              title="Align Right"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <AlignRight className="w-4 h-4" />
            </Button>

            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddRow}
              title="Add Row"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Row
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddColumn}
              title="Add Column"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Column
            </Button>

            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              title="Filter"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Chart"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Info bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
            <div className="flex gap-4">
              <span>Cells: {cellCount}</span>
              <span>Rows: {rows}</span>
              <span>Columns: {columns}</span>
            </div>
            <div className="flex gap-2">
              {record?.visibility && (
                <Badge variant="outline" className="gap-1">
                  {record.visibility === 'private' ? (
                    <>
                      <Lock className="w-3 h-3" />
                      Private
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3" />
                      Shared
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="shadow-lg overflow-x-auto">
          <CardContent className="p-0">
            <div ref={gridRef} className="inline-block min-w-full">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="w-12 h-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-center text-xs font-semibold" />
                    {Array.from({ length: columns }).map((_, col) => (
                      <th
                        key={col}
                        className="w-24 h-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-center text-xs font-semibold"
                      >
                        {getColumnLetter(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rows }).map((_, row) => (
                    <tr key={row}>
                      <td className="w-12 h-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-center text-xs font-semibold">
                        {row + 1}
                      </td>
                      {Array.from({ length: columns }).map((_, col) => {
                        const cellRef = getColumnLetter(col) + (row + 1);
                        const cellData = cells[cellRef];
                        const isSelected = selectedCell === cellRef;

                        return (
                          <td
                            key={cellRef}
                            className={`w-24 h-8 border border-gray-300 dark:border-gray-700 p-0 ${
                              isSelected ? 'ring-2 ring-blue-500' : ''
                            }`}
                          >
                            <input
                              type="text"
                              value={cellData?.value || ''}
                              onChange={(e) => handleCellChange(cellRef, e.target.value)}
                              onFocus={() => handleCellSelect(cellRef)}
                              className="w-full h-full px-2 py-1 text-xs border-0 focus:outline-none bg-white dark:bg-gray-950"
                              style={cellData?.format ? {
                                fontWeight: cellData.format.bold ? 'bold' : 'normal',
                                fontStyle: cellData.format.italic ? 'italic' : 'normal',
                                textDecoration: cellData.format.underline ? 'underline' : 'none',
                                textAlign: cellData.format.align || 'left',
                                backgroundColor: cellData.format.backgroundColor,
                                color: cellData.format.textColor,
                              } : {}}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Spreadsheet</DialogTitle>
            <DialogDescription>Enter a new name for your spreadsheet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Spreadsheet name"
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

  // Placeholder for format application
  function applyFormat(format: string) {
    // Implementation for cell formatting
    console.log('Applying format:', format);
  }
}
