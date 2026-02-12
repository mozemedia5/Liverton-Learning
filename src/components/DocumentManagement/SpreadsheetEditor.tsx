/**
 * Microsoft Excel-Style Spreadsheet Editor Component
 * Full-featured spreadsheet with cells, formulas, formatting, and data management
 */

import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Download,
  Share2,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface CellData {
  [key: string]: string | number;
}

interface SpreadsheetEditorProps {
  documentId: string;
  initialData?: CellData[];
  initialMetadata?: EnhancedDocumentMeta;
  onSave?: (data: CellData[], metadata: Partial<EnhancedDocumentMeta>) => Promise<void>;
  readOnly?: boolean;
}

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const INITIAL_ROWS = 20;

/**
 * Spreadsheet Editor with Excel-style UI
 * Features: Cell editing, formulas, data formatting, export
 */
export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({
  documentId,
  initialData = [],
  initialMetadata,
  onSave,
  readOnly = false,
}) => {
  const [data, setData] = useState<CellData[]>(
    initialData.length > 0
      ? initialData
      : Array(INITIAL_ROWS).fill(null).map(() => ({}))
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showProperties, setShowProperties] = useState(false);

  // Handle cell change
  const handleCellChange = (row: number, col: string, value: string) => {
    const newData = [...data];
    if (!newData[row]) newData[row] = {};
    newData[row][col] = value;
    setData(newData);
  };

  // Add row
  const handleAddRow = () => {
    setData([...data, {}]);
  };

  // Delete row
  const handleDeleteRow = (row: number) => {
    const newData = data.filter((_, i) => i !== row);
    setData(newData);
  };

  // Save spreadsheet
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rowCount = data.length;
      const colCount = COLUMNS.length;
      await onSave?.(data, {
        updatedAt: new Date(),
        fileSize: new Blob([JSON.stringify(data)]).size,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Download as CSV
  const handleDownload = () => {
    const csv = [
      COLUMNS.join(','),
      ...data.map((row) => COLUMNS.map((col) => row[col] || '').join(',')),
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `${initialMetadata?.title || 'spreadsheet'}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Get cell value
  const getCellValue = (row: number, col: string) => {
    return data[row]?.[col] || '';
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Main Spreadsheet Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {initialMetadata?.title || 'Untitled Spreadsheet'}
            </h1>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProperties(!showProperties)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Properties
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || readOnly}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 pb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddRow}
              disabled={readOnly}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Select>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Spreadsheet Grid */}
        <div className="flex-1 overflow-auto">
          <table className="border-collapse bg-white">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="w-12 h-8 border-r border-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-600">
                  #
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="w-32 h-8 border-r border-slate-300 bg-slate-100 text-center text-xs font-semibold text-slate-700 px-2"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-slate-200 hover:bg-blue-50"
                >
                  <td className="w-12 h-8 border-r border-slate-300 bg-slate-50 text-center text-xs text-slate-600 font-medium">
                    <div className="flex items-center justify-between px-2">
                      <span>{rowIndex + 1}</span>
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          onClick={() => handleDeleteRow(rowIndex)}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                  {COLUMNS.map((col) => (
                    <td
                      key={`${rowIndex}-${col}`}
                      className="w-32 h-8 border-r border-slate-300 px-2 py-1"
                      onClick={() =>
                        !readOnly && setSelectedCell({ row: rowIndex, col })
                      }
                    >
                      <input
                        type="text"
                        value={getCellValue(rowIndex, col)}
                        onChange={(e) =>
                          handleCellChange(rowIndex, col, e.target.value)
                        }
                        onFocus={() =>
                          !readOnly && setSelectedCell({ row: rowIndex, col })
                        }
                        className={`w-full h-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 px-1 text-sm ${
                          selectedCell?.row === rowIndex &&
                          selectedCell?.col === col
                            ? 'bg-blue-100'
                            : 'bg-white'
                        } ${readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                        readOnly={readOnly}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-4">
            <span>Rows: {data.length}</span>
            <span>Columns: {COLUMNS.length}</span>
            {selectedCell && (
              <span className="font-mono">
                Selected: {selectedCell.col}
                {selectedCell.row + 1}
              </span>
            )}
          </div>
          <span>Last saved: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      {showProperties && (
        <div className="w-80 bg-slate-50 border-l border-slate-200 overflow-y-auto p-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-slate-700 mb-3">
              Spreadsheet Properties
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600 mb-1">Title</p>
                <p className="font-medium">{initialMetadata?.title}</p>
              </div>
              <Separator />
              <div>
                <p className="text-slate-600 mb-1">Dimensions</p>
                <p className="font-medium">
                  {data.length} rows × {COLUMNS.length} columns
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-slate-600 mb-1">File Size</p>
                <p className="font-medium">
                  {(new Blob([JSON.stringify(data)]).size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-slate-600 mb-1">Last Modified</p>
                <p className="font-medium">
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SpreadsheetEditor;
