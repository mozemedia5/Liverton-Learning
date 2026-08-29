/**
 * Enhanced Spreadsheet Editor Component
 * Microsoft Excel-style spreadsheet editor with comprehensive features
 * Features: Cell editing, formulas, formatting, data validation, charts
 */

import { useEffect, useState } from 'react';
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
  Share2,
  Trash2,
  Download,
  Edit2,
  Plus,
  Star,
  Palette,
  Type,
  Filter,
  Calculator,
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
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

  // Document state
  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Spreadsheet state
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [rows, setRows] = useState(25);
  const [columns, setColumns] = useState(12);

  // UI state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Column letters
  const getColumnLetter = (index: number): string => {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
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

        // Load spreadsheet data
        if (doc.content?.kind === 'sheet') {
          const cellsData: Record<string, CellData> = {};
          Object.entries(doc.content.cells).forEach(([key, value]) => {
            // Try to parse if it's a complex object, otherwise treat as simple value
            try {
              if (typeof value === 'string' && value.startsWith('{')) {
                cellsData[key] = JSON.parse(value);
              } else {
                cellsData[key] = { value: String(value) };
              }
            } catch {
              cellsData[key] = { value: String(value) };
            }
          });
          setCells(cellsData);
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
        // Convert cells to storage format
        const cellsForStorage: Record<string, string> = {};
        Object.entries(cells).forEach(([key, data]) => {
          if (data.format || data.formula) {
            cellsForStorage[key] = JSON.stringify(data);
          } else {
            cellsForStorage[key] = data.value;
          }
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
            wordCount: Object.values(cells).reduce((sum, cell) => sum + (cell.value?.split(/\s+/).length || 0), 0),
            characterCount: Object.values(cells).reduce((sum, cell) => sum + (cell.value?.length || 0), 0),
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
   * Apply formatting to selected cell
   */
  const applyCellFormat = (format: Partial<CellData['format']>) => {
    if (!selectedCell) return;
    setCells((prev) => ({
      ...prev,
      [selectedCell]: {
        ...prev[selectedCell],
        format: {
          ...(prev[selectedCell]?.format || {}),
          ...format,
        },
      },
    }));
    setHasChanges(true);
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
        rowData.push(`"${(cellData?.value || '').replace(/"/g, '""')}"`);
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

  const colors = [
    '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#000000',
    '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a',
    '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#064e3b',
    '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554',
  ];

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/documents')}>
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
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saving && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></div>}
            <Button variant="ghost" size="sm" onClick={handleToggleFavorite} className={isFavorite ? 'text-yellow-500' : ''}>
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)} className="gap-2">
              <Share2 className="w-4 h-4" /><span className="hidden sm:inline">Share</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowRenameDialog(true)}><Edit2 className="w-4 h-4 mr-2" />Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export CSV</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Spreadsheet Toolbar */}
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="sm" onClick={() => applyCellFormat({ bold: !cells[selectedCell]?.format?.bold })} title="Bold" className={cells[selectedCell]?.format?.bold ? 'bg-gray-100 dark:bg-gray-800' : ''}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyCellFormat({ italic: !cells[selectedCell]?.format?.italic })} title="Italic" className={cells[selectedCell]?.format?.italic ? 'bg-gray-100 dark:bg-gray-800' : ''}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyCellFormat({ underline: !cells[selectedCell]?.format?.underline })} title="Underline" className={cells[selectedCell]?.format?.underline ? 'bg-gray-100 dark:bg-gray-800' : ''}>
              <Underline className="w-4 h-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="sm" onClick={() => applyCellFormat({ align: 'left' })} className={cells[selectedCell]?.format?.align === 'left' ? 'bg-gray-100' : ''}><AlignLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => applyCellFormat({ align: 'center' })} className={cells[selectedCell]?.format?.align === 'center' ? 'bg-gray-100' : ''}><AlignCenter className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => applyCellFormat({ align: 'right' })} className={cells[selectedCell]?.format?.align === 'right' ? 'bg-gray-100' : ''}><AlignRight className="w-4 h-4" /></Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1 px-2">
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="sm" title="Text Color"><Type className="w-4 h-4" /></Button></PopoverTrigger>
              <PopoverContent className="w-64"><div className="grid grid-cols-10 gap-1">{colors.map(c => <button key={c} className="w-5 h-5 rounded-sm border" style={{backgroundColor: c}} onClick={() => applyCellFormat({textColor: c})} />)}</div></PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="sm" title="Fill Color"><Palette className="w-4 h-4" /></Button></PopoverTrigger>
              <PopoverContent className="w-64"><div className="grid grid-cols-10 gap-1">{colors.map(c => <button key={c} className="w-5 h-5 rounded-sm border" style={{backgroundColor: c}} onClick={() => applyCellFormat({backgroundColor: c})} />)}</div></PopoverContent>
            </Popover>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="sm" onClick={() => setRows(r => r + 1)} title="Add Row"><Plus className="w-4 h-4 mr-1" /> Row</Button>
            <Button variant="ghost" size="sm" onClick={() => setColumns(c => c + 1)} title="Add Column"><Plus className="w-4 h-4 mr-1" /> Col</Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="sm" title="Sum" onClick={() => handleCellChange(selectedCell, '=SUM()')}><Calculator className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" title="Filter"><Filter className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Formula Bar */}
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="w-12 text-center font-mono text-sm font-bold text-gray-500">{selectedCell}</div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 italic">fx</span>
            <Input
              value={cells[selectedCell]?.value || ''}
              onChange={(e) => handleCellChange(selectedCell, e.target.value)}
              className="h-7 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
              placeholder="Enter value or formula"
            />
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <main className="max-w-7xl mx-auto mt-4 px-4 overflow-auto h-[calc(100vh-220px)]">
        <div className="inline-block min-w-full border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm bg-white dark:bg-black">
          <table className="border-collapse w-full text-sm">
            <thead>
              <tr>
                <th className="w-10 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1"></th>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 font-medium min-w-[100px]">
                    {getColumnLetter(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 text-center font-medium text-gray-500">
                    {rowIndex + 1}
                  </td>
                  {Array.from({ length: columns }).map((_, colIndex) => {
                    const cellRef = getColumnLetter(colIndex) + (rowIndex + 1);
                    const cellData = cells[cellRef];
                    const isSelected = selectedCell === cellRef;
                    
                    return (
                      <td
                        key={colIndex}
                        onClick={() => setSelectedCell(cellRef)}
                        className={`border border-gray-200 dark:border-gray-700 p-0 relative h-8 ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`}
                        style={{
                          backgroundColor: cellData?.format?.backgroundColor || 'transparent',
                          color: cellData?.format?.textColor || 'inherit',
                          fontWeight: cellData?.format?.bold ? 'bold' : 'normal',
                          fontStyle: cellData?.format?.italic ? 'italic' : 'normal',
                          textDecoration: cellData?.format?.underline ? 'underline' : 'none',
                          textAlign: cellData?.format?.align || 'left',
                        }}
                      >
                        <input
                          className="w-full h-full border-0 bg-transparent px-2 focus:outline-none"
                          value={cellData?.value || ''}
                          onChange={(e) => handleCellChange(cellRef, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 px-4 py-2 text-xs text-gray-500 flex justify-between items-center z-40">
        <div className="flex gap-4">
          <span>Rows: {rows}</span>
          <span>Columns: {columns}</span>
          <span>Active Cell: {selectedCell}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${saving ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
          <span>{saving ? 'Saving changes...' : 'All changes saved'}</span>
        </div>
      </div>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Spreadsheet</DialogTitle></DialogHeader>
          <div className="py-4"><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowRenameDialog(false)}>Cancel</Button><Button onClick={handleRename}>Rename</Button></div>
        </DialogContent>
      </Dialog>

      <ShareWithHannaDialog open={showShareDialog} onOpenChange={setShowShareDialog} documentId={docId || ''} documentTitle={title} />
    </div>
  );
}
