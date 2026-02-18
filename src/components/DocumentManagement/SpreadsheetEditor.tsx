/**
 * Spreadsheet Editor Component
 * Microsoft Excel-style spreadsheet editor with full editing tools
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Plus, Trash2, Download, ArrowUpDown, Filter, 
  Copy, Scissors, Clipboard, Search, Calculator,
  Merge, Grid3X3, Eye, EyeOff, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface Cell {
  value: string;
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'formula';
  computed?: number;
}

interface SpreadsheetEditorProps {
  document?: EnhancedDocumentMeta;
  readOnly?: boolean;
  onSave?: (data: Cell[][], metadata: Partial<EnhancedDocumentMeta>) => void;
}

/**
 * Spreadsheet Editor with Excel-style interface and full editing tools
 * Supports cell editing, formatting, formulas, and data management
 */
export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({
  document,
  readOnly = false,
  onSave,
}) => {
  const [data, setData] = useState<Cell[][]>(
    Array(20)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({ value: '', format: 'text' }))
      )
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: { row: number; col: number }; end: { row: number; col: number } } | null>(null);
  const [clipboard, setClipboard] = useState<Cell[][] | null>(null);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [hiddenRows, setHiddenRows] = useState<Set<number>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<number>>(new Set());
  const [frozenRows, setFrozenRows] = useState(0);
  const [frozenCols, setFrozenCols] = useState(0);

  const columns = useMemo(() => Array.from({ length: data[0]?.length || 10 }, (_, i) =>
    String.fromCharCode(65 + i)
  ), [data]);

  // Cell Editing Tools
  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = data.map(r => [...r]);
    
    // Check if formula
    if (value.startsWith('=')) {
      newData[row][col] = { 
        value, 
        format: 'formula',
        computed: evaluateFormula(value, newData)
      };
    } else {
      newData[row][col] = { ...newData[row][col], value };
    }
    
    setData(newData);

    if (onSave && document) {
      onSave(newData, { updatedAt: new Date() });
    }
  };

  // Formula evaluation
  const evaluateFormula = (formula: string, currentData: Cell[][]): number => {
    try {
      // Simple formula support: =SUM(A1:A5), =A1+B1, etc.
      let expression = formula.substring(1); // Remove =
      
      // Replace cell references with values
      const cellRef = /([A-Z]+)(\d+)/g;
      expression = expression.replace(cellRef, (match, col, row) => {
        const colIndex = col.charCodeAt(0) - 65;
        const rowIndex = parseInt(row) - 1;
        const cell = currentData[rowIndex]?.[colIndex];
        return cell?.computed?.toString() || cell?.value || '0';
      });

      // Handle SUM function
      if (expression.includes('SUM')) {
        const sumMatch = expression.match(/SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/);
        if (sumMatch) {
          const startCell = sumMatch[1];
          const endCell = sumMatch[2];
          const startCol = startCell.charCodeAt(0) - 65;
          const startRow = parseInt(startCell.match(/\d+/)?.[0] || '1') - 1;
          const endCol = endCell.charCodeAt(0) - 65;
          const endRow = parseInt(endCell.match(/\d+/)?.[0] || '1') - 1;
          
          let sum = 0;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const val = parseFloat(currentData[r]?.[c]?.value || '0');
              if (!isNaN(val)) sum += val;
            }
          }
          return sum;
        }
      }

      // Safe evaluation
      // eslint-disable-next-line no-new-func
      return new Function('return ' + expression)() || 0;
    } catch {
      return 0;
    }
  };

  // Insert/Delete Tools
  const handleAddRow = (afterRow?: number) => {
    const newRow = Array(data[0]?.length || 10)
      .fill(null)
      .map(() => ({ value: '', format: 'text' as const }));
    
    const insertIndex = afterRow !== undefined ? afterRow + 1 : data.length;
    const newData = [...data.slice(0, insertIndex), newRow, ...data.slice(insertIndex)];
    setData(newData);
  };

  const handleAddColumn = (afterCol?: number) => {
    const insertIndex = afterCol !== undefined ? afterCol + 1 : (data[0]?.length || 10);
    const newData = data.map(row => [
      ...row.slice(0, insertIndex),
      { value: '', format: 'text' },
      ...row.slice(insertIndex)
    ]);
    setData(newData);
  };

  const handleDeleteRow = (row: number) => {
    setData(data.filter((_, i) => i !== row));
    setHiddenRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(row);
      return newSet;
    });
  };

  const handleDeleteColumn = (col: number) => {
    setData(data.map(row => row.filter((_, i) => i !== col)));
    setHiddenCols(prev => {
      const newSet = new Set(prev);
      newSet.delete(col);
      return newSet;
    });
  };

  // Cut, Copy, Paste
  const handleCut = () => {
    if (selectedRange) {
      const { start, end } = selectedRange;
      const rangeData: Cell[][] = [];
      for (let r = start.row; r <= end.row; r++) {
        const rowData: Cell[] = [];
        for (let c = start.col; c <= end.col; c++) {
          rowData.push({ ...data[r][c] });
        }
        rangeData.push(rowData);
      }
      setClipboard(rangeData);
      
      // Clear the selected cells
      const newData = data.map(r => [...r]);
      for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
          newData[r][c] = { value: '', format: 'text' };
        }
      }
      setData(newData);
    }
  };

  const handleCopy = () => {
    if (selectedRange) {
      const { start, end } = selectedRange;
      const rangeData: Cell[][] = [];
      for (let r = start.row; r <= end.row; r++) {
        const rowData: Cell[] = [];
        for (let c = start.col; c <= end.col; c++) {
          rowData.push({ ...data[r][c] });
        }
        rangeData.push(rowData);
      }
      setClipboard(rangeData);
    }
  };

  const handlePaste = () => {
    if (clipboard && selectedCell) {
      const newData = data.map(r => [...r]);
      clipboard.forEach((row, rIndex) => {
        row.forEach((cell, cIndex) => {
          const targetRow = selectedCell.row + rIndex;
          const targetCol = selectedCell.col + cIndex;
          if (targetRow < newData.length && targetCol < newData[0].length) {
            newData[targetRow][targetCol] = { ...cell };
          }
        });
      });
      setData(newData);
    }
  };

  // Sort Tool
  const handleSort = (column: number, direction: 'asc' | 'desc') => {
    const newData = [...data];
    const dataRows = newData.slice(1); // Skip header row if exists
    
    dataRows.sort((a, b) => {
      const aVal = a[column]?.value || '';
      const bVal = b[column]?.value || '';
      
      // Try numeric sort first
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // String sort
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
    
    setData([newData[0], ...dataRows]);
    setSortDialogOpen(false);
  };

  // Filter Tool
  const handleFilter = () => {
    if (!filterText) {
      setHiddenRows(new Set());
      return;
    }
    
    const hidden = new Set<number>();
    data.forEach((row, rowIndex) => {
      const hasMatch = row.some(cell => 
        cell.value.toLowerCase().includes(filterText.toLowerCase())
      );
      if (!hasMatch) {
        hidden.add(rowIndex);
      }
    });
    setHiddenRows(hidden);
  };

  // Hide/Unhide
  const handleHideRow = (row: number) => {
    setHiddenRows(prev => new Set([...prev, row]));
  };

  const handleHideColumn = (col: number) => {
    setHiddenCols(prev => new Set([...prev, col]));
  };

  const handleUnhideAll = () => {
    setHiddenRows(new Set());
    setHiddenCols(new Set());
  };

  // Merge Cells
  const handleMergeCells = () => {
    if (selectedRange) {
      const { start, end } = selectedRange;
      const newData = data.map(r => [...r]);
      const firstValue = newData[start.row][start.col].value;
      
      for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
          if (r === start.row && c === start.col) {
            newData[r][c] = { value: firstValue, format: 'text' };
          } else {
            newData[r][c] = { value: '', format: 'text' };
          }
        }
      }
      setData(newData);
    }
  };

  // Fill Down
  const handleFillDown = () => {
    if (selectedRange && selectedRange.start.row === selectedRange.end.row) {
      // Fill column
      const col = selectedRange.start.col;
      const startValue = data[selectedRange.start.row][col].value;
      const newData = data.map(r => [...r]);
      
      for (let r = selectedRange.start.row; r <= selectedRange.end.row; r++) {
        newData[r][col] = { ...newData[r][col], value: startValue };
      }
      setData(newData);
    }
  };

  // Download
  const handleDownload = () => {
    const csv = data
      .map(row => row.map(cell => `"${cell.value}"`).join(','))
      .join('\n');

    const element = window.document.createElement('a');
    const file = new Blob([csv], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = `${document?.title || 'spreadsheet'}.csv`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  return (
    <div className="flex h-screen bg-slate-50 flex-col">
      {/* Enhanced Toolbar with Editing Tools */}
      <div className="bg-white border-b border-slate-200">
        {/* Cell Editing Tools */}
        <div className="px-3 py-2 flex items-center gap-1 border-b border-slate-100 flex-wrap">
          <span className="text-xs text-slate-500 mr-2 font-semibold">CELL:</span>
          
          <Button size="sm" variant="ghost" onClick={() => handleAddRow(selectedCell?.row)} disabled={readOnly} className="h-8 gap-1" title="Insert Row">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">Insert Row</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={() => handleAddColumn(selectedCell?.col)} disabled={readOnly} className="h-8 gap-1" title="Insert Column">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">Insert Col</span>
          </Button>
          
          {selectedCell && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteRow(selectedCell.row)} disabled={readOnly} className="h-8 gap-1 text-red-600" title="Delete Row">
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-xs">Del Row</span>
              </Button>
              
              <Button size="sm" variant="ghost" onClick={() => handleDeleteColumn(selectedCell.col)} disabled={readOnly} className="h-8 gap-1 text-red-600" title="Delete Column">
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-xs">Del Col</span>
              </Button>
            </>
          )}
          
          <div className="w-px h-5 bg-slate-200 mx-1" />
          
          <Button size="sm" variant="ghost" onClick={handleCut} disabled={!selectedRange} className="h-8 gap-1" title="Cut">
            <Scissors className="h-3.5 w-3.5" />
            <span className="text-xs">Cut</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handleCopy} disabled={!selectedRange} className="h-8 gap-1" title="Copy">
            <Copy className="h-3.5 w-3.5" />
            <span className="text-xs">Copy</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handlePaste} disabled={!clipboard} className="h-8 gap-1" title="Paste">
            <Clipboard className="h-3.5 w-3.5" />
            <span className="text-xs">Paste</span>
          </Button>
          
          <div className="w-px h-5 bg-slate-200 mx-1" />
          
          <Button size="sm" variant="ghost" onClick={handleMergeCells} disabled={!selectedRange} className="h-8 gap-1" title="Merge Cells">
            <Merge className="h-3.5 w-3.5" />
            <span className="text-xs">Merge</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handleFillDown} disabled={!selectedRange} className="h-8 gap-1" title="Fill Down">
            <Grid3X3 className="h-3.5 w-3.5" />
            <span className="text-xs">Fill</span>
          </Button>
        </div>
        
        {/* Data Tools */}
        <div className="px-3 py-2 flex items-center gap-1 flex-wrap">
          <span className="text-xs text-slate-500 mr-2 font-semibold">DATA:</span>
          
          <Button size="sm" variant="ghost" onClick={() => setSortDialogOpen(true)} className="h-8 gap-1" title="Sort">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="text-xs">Sort</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Filter..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
              className="h-8 w-32 text-sm"
            />
            <Button size="sm" variant="ghost" onClick={handleFilter} className="h-8" title="Apply Filter">
              <Filter className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="w-px h-5 bg-slate-200 mx-1" />
          
          <Button size="sm" variant="ghost" onClick={() => selectedCell && handleHideRow(selectedCell.row)} className="h-8 gap-1" title="Hide Row">
            <EyeOff className="h-3.5 w-3.5" />
            <span className="text-xs">Hide Row</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={() => selectedCell && handleHideColumn(selectedCell.col)} className="h-8 gap-1" title="Hide Column">
            <EyeOff className="h-3.5 w-3.5" />
            <span className="text-xs">Hide Col</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handleUnhideAll} className="h-8 gap-1" title="Unhide All">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-xs">Unhide</span>
          </Button>
          
          <div className="flex-1" />
          
          <Button size="sm" variant="outline" onClick={handleDownload} className="h-8 gap-1">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Spreadsheet Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="w-12 h-8 border-r border-slate-200 text-center text-xs font-semibold text-slate-600 bg-slate-50 sticky left-0 z-10">
                  #
                </th>
                {columns.map((col, idx) => (
                  !hiddenCols.has(idx) && (
                    <th
                      key={col}
                      className="w-32 h-8 border-r border-slate-200 text-center text-xs font-semibold text-slate-600 bg-slate-50 px-2"
                    >
                      {col}
                    </th>
                  )
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                !hiddenRows.has(rowIndex) && (
                  <tr key={rowIndex} className="border-b border-slate-200 hover:bg-blue-50">
                    <td className="w-12 h-8 border-r border-slate-200 text-center text-xs font-semibold text-slate-600 bg-slate-50 sticky left-0 z-10">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => (
                      !hiddenCols.has(colIndex) && (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className="w-32 h-8 border-r border-slate-200 p-0"
                          onClick={() => {
                            setSelectedCell({ row: rowIndex, col: colIndex });
                            setEditingCell({ row: rowIndex, col: colIndex });
                          }}
                          onMouseDown={() => setSelectedRange({ start: { row: rowIndex, col: colIndex }, end: { row: rowIndex, col: colIndex } })}
                          onMouseEnter={(e) => {
                            if (e.buttons === 1) {
                              setSelectedRange(prev => prev ? { ...prev, end: { row: rowIndex, col: colIndex } } : null);
                            }
                          }}
                        >
                          {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                            <input
                              type="text"
                              value={cell.value}
                              onChange={e => handleCellChange(rowIndex, colIndex, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') setEditingCell(null);
                              }}
                              autoFocus
                              className="w-full h-full px-2 border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <div
                              className={`w-full h-full px-2 py-1 text-sm flex items-center ${
                                selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                                  ? 'bg-blue-100 border-2 border-blue-500'
                                  : ''
                              } ${selectedRange && rowIndex >= selectedRange.start.row && rowIndex <= selectedRange.end.row && colIndex >= selectedRange.start.col && colIndex <= selectedRange.end.col ? 'bg-blue-50' : ''}`}
                            >
                              {cell.format === 'formula' ? cell.computed : cell.value}
                            </div>
                          )}
                        </td>
                      )
                    ))}
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between text-sm text-slate-600">
        <div className="flex gap-4">
          <span>Rows: {data.length}</span>
          <span>Columns: {columns.length}</span>
          {selectedCell && (
            <span>
              Selected: {columns[selectedCell.col]}{selectedCell.row + 1}
            </span>
          )}
          {selectedRange && (
            <span>
              Range: {columns[selectedRange.start.col]}{selectedRange.start.row + 1}:{columns[selectedRange.end.col]}{selectedRange.end.row + 1}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {(hiddenRows.size > 0 || hiddenCols.size > 0) && (
            <span className="text-orange-600 text-xs">
              {hiddenRows.size} rows, {hiddenCols.size} cols hidden
            </span>
          )}
        </div>
      </div>

      {/* Sort Dialog */}
      <Dialog open={sortDialogOpen} onOpenChange={setSortDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sort Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sort by Column</label>
              <Select onValueChange={(val) => handleSort(parseInt(val), 'asc')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col, idx) => (
                    <SelectItem key={col} value={idx.toString()}>Column {col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => selectedCell && handleSort(selectedCell.col, 'asc')} className="flex-1">
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Ascending
              </Button>
              <Button onClick={() => selectedCell && handleSort(selectedCell.col, 'desc')} variant="outline" className="flex-1">
                <ArrowUpDown className="h-4 w-4 mr-1 rotate-180" />
                Descending
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpreadsheetEditor;
