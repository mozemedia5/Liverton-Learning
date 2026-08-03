/**
 * Lightweight spreadsheet formula engine for the document editors.
 * Supports: =SUM(A1:A10), =AVERAGE(...), =MIN(...), =MAX(...), =COUNT(...),
 * arithmetic with + - * / and parentheses, and cell references (A1, B2...).
 */

export type CellValueGetter = (cellRef: string) => string;

const RANGE_FUNCTIONS = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'] as const;

function columnToIndex(col: string): number {
  let index = 0;
  for (const ch of col.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  return { col: columnToIndex(match[1]), row: parseInt(match[2], 10) - 1 };
}

function cellRefFromCoords(col: number, row: number): string | null {
  if (col < 0 || row < 0) return null;
  let letters = '';
  let c = col + 1;
  while (c > 0) {
    const rem = (c - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    c = Math.floor((c - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

function numericValue(raw: string): number {
  const n = parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function rangeValues(startRef: string, endRef: string, getValue: CellValueGetter, depth: number): number[] {
  const start = parseCellRef(startRef);
  const end = parseCellRef(endRef);
  if (!start || !end) return [];

  const values: number[] = [];
  for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row++) {
    for (let col = Math.min(start.col, end.col); col <= Math.max(start.col, end.col); col++) {
      const ref = cellRefFromCoords(col, row);
      if (!ref) continue;
      values.push(resolveNumeric(ref, getValue, depth + 1));
    }
  }
  return values;
}

function resolveNumeric(cellRef: string, getValue: CellValueGetter, depth: number): number {
  if (depth > 10) return 0; // cycle guard
  const raw = getValue(cellRef);
  if (typeof raw === 'string' && raw.trim().startsWith('=')) {
    return evaluateFormula(raw, getValue, depth + 1);
  }
  return numericValue(raw);
}

/**
 * Evaluate a formula string (must start with '=').
 * Returns 0 for invalid formulas.
 */
export function evaluateFormula(formula: string, getValue: CellValueGetter, depth = 0): number {
  if (!formula || !formula.startsWith('=')) return numericValue(formula);
  if (depth > 10) return 0;

  let expression = formula.substring(1).toUpperCase().replace(/\s+/g, '');

  // Range functions: SUM(A1:A5), AVERAGE(...), MIN, MAX, COUNT
  for (const fn of RANGE_FUNCTIONS) {
    const pattern = new RegExp(`${fn}\\(([A-Z]+\\d+):([A-Z]+\\d+)\\)`, 'g');
    expression = expression.replace(pattern, (_m, startRef: string, endRef: string) => {
      const values = rangeValues(startRef, endRef, getValue, depth);
      if (values.length === 0) return '0';
      switch (fn) {
        case 'SUM': return String(values.reduce((a, b) => a + b, 0));
        case 'AVERAGE': return String(values.reduce((a, b) => a + b, 0) / values.length);
        case 'MIN': return String(Math.min(...values));
        case 'MAX': return String(Math.max(...values));
        case 'COUNT': return String(values.filter(v => v !== 0).length);
        default: return '0';
      }
    });
  }

  // Individual cell references
  expression = expression.replace(/([A-Z]+\d+)/g, (_m, ref: string) => {
    return String(resolveNumeric(ref, getValue, depth));
  });

  // Sanitize: only allow digits, operators, parentheses, decimal points
  if (!/^[\d+\-*/().\s]*$/.test(expression)) {
    return 0;
  }

  try {
    const result = new Function(`"use strict"; return (${expression});`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

/** Format a computed number for display (max 2 decimals, trimmed). */
export function formatComputed(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}
