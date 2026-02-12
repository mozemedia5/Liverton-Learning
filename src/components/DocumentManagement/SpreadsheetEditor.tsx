/**
 * Spreadsheet Editor Component
 * Microsoft Excel-style spreadsheet editor
 */

import React, { useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MicrosoftToolbar } from './MicrosoftToolbar';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface Cell {
  value: string;
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date';
}

interface SpreadsheetEditorProps {
  document?: EnhancedDocumentMeta;
  readOnly?: boolean;
  onSave?: (data: Cell[][], metadata: Partial<EnhancedDocumentMeta>) => void;
}

/**
 * Spreadsheet Editor with Excel-style interface
 * Supports cell editing, formatting, and data management
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
          .map(() => ({ value: '', format: 'text' as const }))
      )
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = data.map(r => [...r]);
    newData[row][col].value = value;
    setData(newData);

    // Auto-save
    if (onSave && document) {
      onSave(newData, {
        updatedAt: new Date(),
      });
    }
  };

  const handleAddRow = () => {
    const newRow = Array(10)
      .fill(null)
      .map(() => ({ value: '', format: 'text' as const }));
    setData([...data, newRow]);
  };

  const handleDeleteRow = (row: number) => {
    setData(data.filter((_, i) => i !== row));
  };

  const handleDownload = () => {
    // Convert to CSV
    const csv = data
      .map(row => row.map(cell => `"${cell.value}"`).join(','))
      .join('\n');

    // Use global document object to create download link
    const element = window.document.createElement('a');
    const file = new Blob([csv], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = `${document?.title || 'spreadsheet'}.csv`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  const columns = Array.from({ length: 10 }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  return (
    <div className="flex h-screen bg-slate-50 flex-col">
      {/* Toolbar */}
      <MicrosoftToolbar
        onDownload={handleDownload}
        readOnly={readOnly}
      />

      {/* Spreadsheet Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="w-12 h-8 border-r border-slate-200 text-center text-xs font-semibold text-slate-600 bg-slate-50">
                  #
                </th>
                {columns.map(col => (
                  <th
                    key={col}
                    className="w-32 h-8 border-r border-slate-200 text-center text-xs font-semibold text-slate-600 bg-slate-50 px-2"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-200 hover:bg-blue-50">
                  <td className="w-12 h-8 border-r border-slate-200 text-center text-xs font-semibold text-slate-600 bg-slate-50">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className="w-32 h-8 border-r border-slate-200 p-0"
                      onClick={() => {
                        setSelectedCell({ row: rowIndex, col: colIndex });
                        setEditingCell({ row: rowIndex, col: colIndex });
                      }}
                    >
                      {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                        <input
                          type="text"
                          value={cell.value}
                          onChange={e =>
                            handleCellChange(rowIndex, colIndex, e.target.value)
                          }
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
                            selectedCell?.row === rowIndex &&
                            selectedCell?.col === colIndex
                              ? 'bg-blue-100 border-2 border-blue-500'
                              : ''
                          }`}
                        >
                          {cell.value}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
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
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddRow}
            disabled={readOnly}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          {selectedCell && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteRow(selectedCell.row)}
              disabled={readOnly}
              className="h-8 gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete Row
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-8 gap-1"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetEditor;
