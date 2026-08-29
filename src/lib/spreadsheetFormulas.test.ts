import { describe, it, expect } from 'vitest';
import { evaluateFormula, formatComputed } from './spreadsheetFormulas';

const cells: Record<string, string> = {
  A1: '10',
  A2: '20',
  A3: '30',
  B1: '5',
  B2: '15',
};

const get = (ref: string) => cells[ref] || '';

describe('spreadsheet formula engine', () => {
  it('sums ranges with =SUM', () => {
    expect(evaluateFormula('=SUM(A1:A3)', get)).toBe(60);
    expect(evaluateFormula('=SUM(A1:B2)', get)).toBe(50);
  });

  it('averages ranges with =AVERAGE', () => {
    expect(evaluateFormula('=AVERAGE(A1:A3)', get)).toBe(20);
  });

  it('supports MIN/MAX/COUNT', () => {
    expect(evaluateFormula('=MIN(A1:A3)', get)).toBe(10);
    expect(evaluateFormula('=MAX(A1:A3)', get)).toBe(30);
    expect(evaluateFormula('=COUNT(A1:A3)', get)).toBe(3);
  });

  it('evaluates arithmetic with cell references', () => {
    expect(evaluateFormula('=A1+A2', get)).toBe(30);
    expect(evaluateFormula('=A3*2+A1', get)).toBe(70);
    expect(evaluateFormula('=(A1+A2)/A3', get)).toBe(1);
    expect(evaluateFormula('=A3*0.1', get)).toBeCloseTo(3);
  });

  it('resolves chained formula cells', () => {
    const chained: Record<string, string> = { A1: '10', B1: '=A1*2', C1: '=B1+A1' };
    const getChained = (ref: string) => chained[ref] || '';
    expect(evaluateFormula('=C1', getChained)).toBe(30);
  });

  it('returns 0 for invalid input', () => {
    expect(evaluateFormula('=', get)).toBe(0);
    expect(evaluateFormula('=A99', get)).toBe(0);
    expect(evaluateFormula('=SUM()', get)).toBe(0);
  });

  it('formats computed values', () => {
    expect(formatComputed(3)).toBe('3');
    expect(formatComputed(3.14159)).toBe('3.14');
    expect(formatComputed(10 / 3)).toBe('3.33');
  });
});
