import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FileDown,
  Plus,
  Minus,
  Bold,
  Italic,
  Underline,
  Sigma,
} from 'lucide-react';
import type { DocumentContent } from '@/types';

function colName(idx: number) {
  // 0 -> A, 25 -> Z, 26 -> AA
  let n = idx;
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function parseCellRef(ref: string) {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { col: m[1], row: Number(m[2]) };
}

function toIndexFromCol(col: string) {
  // A -> 0, Z -> 25, AA -> 26
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function cellKey(colIdx: number, rowIdx: number) {
  return `${colName(colIdx)}${rowIdx + 1}`;
}

function getNumber(val: string) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function evaluateFormula(formula: string, cells: Record<string, string>) {
  const f = formula.trim().toUpperCase();
  const m = f.match(/^=(SUM|AVERAGE|MIN|MAX)\(([^\)]+)\)$/);
  if (!m) return null;

  const fn = m[1];
  const range = m[2].trim();

  // Support A1:B3 range
  const parts = range.split(':').map((s) => s.trim());
  if (parts.length !== 2) return null;

  const a = parseCellRef(parts[0]);
  const b = parseCellRef(parts[1]);
  if (!a || !b) return null;

  const c1 = toIndexFromCol(a.col);
  const c2 = toIndexFromCol(b.col);
  const r1 = a.row - 1;
  const r2 = b.row - 1;

  const minC = Math.min(c1, c2);
  const maxC = Math.max(c1, c2);
  const minR = Math.min(r1, r2);
  const maxR = Math.max(r1, r2);

  const values: number[] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const k = cellKey(c, r);
      values.push(getNumber(cells[k] ?? '0'));
    }
  }

  if (values.length === 0) return 0;

  if (fn === 'SUM') return values.reduce((a2, b2) => a2 + b2, 0);
  if (fn === 'AVERAGE') return values.reduce((a2, b2) => a2 + b2, 0) / values.length;
  if (fn === 'MIN') return Math.min(...values);
  if (fn === 'MAX') return Math.max(...values);
  return null;
}

function toCsv(cols: number, rows: number, cells: Record<string, string>) {
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const rowVals: string[] = [];
    for (let c = 0; c < cols; c++) {
      const v = cells[cellKey(c, r)] ?? '';
      const safe = `"${String(v).replace(/\"/g, '""')}"`;
      rowVals.push(safe);
    }
    lines.push(rowVals.join(','));
  }
  return lines.join('\n');
}

export function SpreadsheetEditor(props: {
  content: Extract<DocumentContent, { kind: 'sheet' }>;
  onChange: (next: Extract<DocumentContent, { kind: 'sheet' }>) => void;
  saving: boolean;
}) {
  const [cols, setCols] = useState(10);
  const [rows, setRows] = useState(30);
  const [selected, setSelected] = useState<string>('A1');

  const cells = props.content.cells;

  const formulaValue = useMemo(() => {
    const raw = cells[selected] ?? '';
    if (raw.startsWith('=')) {
      const computed = evaluateFormula(raw, cells);
      if (computed == null) return '';
      return String(computed);
    }
    return '';
  }, [cells, selected]);

  const setCell = (key: string, value: string) => {
    props.onChange({ kind: 'sheet', cells: { ...cells, [key]: value } });
  };

  const onExportCsv = () => {
    const csv = toCsv(cols, rows, cells);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheet.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onExportExcel = () => {
    // A true .xlsx needs a library. Provide CSV fallback for now.
    toast.message('Excel export uses CSV for now.');
    onExportCsv();
  };

  const onFormat = (kind: 'bold' | 'italic' | 'underline') => {
    const v = cells[selected] ?? '';
    if (!v) return;
    // Simple markdown-like formatting inside cell.
    if (kind === 'bold') setCell(selected, `**${v}**`);
    if (kind === 'italic') setCell(selected, `*${v}*`);
    if (kind === 'underline') setCell(selected, `__${v}__`);
  };

  return (
    <div className="space-y-4">
      {/* Ribbon */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">{selected}</div>
            <Input
              value={cells[selected] ?? ''}
              onChange={(e) => setCell(selected, e.target.value)}
              className="w-64 h-9"
              placeholder="Value or =SUM(A1:B2)"
            />
            {formulaValue ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <Sigma className="w-3.5 h-3.5 inline-block mr-1" />
                {formulaValue}
              </div>
            ) : null}
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onFormat('bold')}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onFormat('italic')}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onFormat('underline')}>
              <Underline className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRows((r) => r + 1)}>
              <Plus className="w-4 h-4 mr-2" />
              Row
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRows((r) => Math.max(1, r - 1))}>
              <Minus className="w-4 h-4 mr-2" />
              Row
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCols((c) => c + 1)}>
              <Plus className="w-4 h-4 mr-2" />
              Col
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCols((c) => Math.max(1, c - 1))}>
              <Minus className="w-4 h-4 mr-2" />
              Col
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExportCsv}>
              <FileDown className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onExportExcel}>
              <FileDown className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="px-3 pb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            Tip: formulas like <span className="font-mono">=SUM(A1:B3)</span>, <span className="font-mono">=AVERAGE(A1:A5)</span>
          </div>
          <div className="font-medium">{props.saving ? 'Saving…' : 'Saved'}</div>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-auto">
        <table className="min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 bg-white dark:bg-black z-10">
            <tr>
              <th className="w-12 border-b border-gray-200 dark:border-gray-800"></th>
              {Array.from({ length: cols }).map((_, c) => (
                <th
                  key={c}
                  className="min-w-[120px] border-b border-gray-200 dark:border-gray-800 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300"
                >
                  {colName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                <td className="w-12 border-b border-gray-200 dark:border-gray-800 px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {r + 1}
                </td>
                {Array.from({ length: cols }).map((_, c) => {
                  const k = cellKey(c, r);
                  const v = cells[k] ?? '';
                  const isSelected = selected === k;
                  const computed = v.startsWith('=') ? evaluateFormula(v, cells) : null;

                  return (
                    <td
                      key={k}
                      className="border-b border-gray-200 dark:border-gray-800 px-1 py-1"
                      onClick={() => setSelected(k)}
                    >
                      <input
                        value={v}
                        onChange={(e) => setCell(k, e.target.value)}
                        className={
                          'w-full h-9 px-2 rounded-md bg-transparent outline-none ' +
                          (isSelected
                            ? 'ring-2 ring-black/40 dark:ring-white/40'
                            : 'focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20')
                        }
                      />
                      {computed != null && (
                        <div className="px-2 -mt-1 pb-1 text-[11px] text-gray-400 dark:text-gray-500">
                          = {computed}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
