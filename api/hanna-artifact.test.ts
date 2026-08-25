import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createDocx, createPdf, normalizeExportText } from './hanna-artifact';

describe('Hanna artifact exports', () => {
  it('normalizes LaTeX delimiters and removes malformed decoration without destroying equations', () => {
    const result = normalizeExportText('### Solve $f(x)=x^2$ $$$###***\\\\{{{}}}¥¥€€');
    expect(result).toContain('f(x)=x^2');
    expect(result).not.toContain('$$$');
    expect(result).not.toContain('¥¥');
    expect(result).not.toContain('{{{');
  });

  it('generates a valid PDF with embedded standard fonts without pdfkit font resolution', async () => {
    const buffer = await createPdf('Quadratic lesson', 'We know: $f(x)=x^3-6x^2+9x+2$\n\nTherefore -1 < x < 0.');
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    const document = await PDFDocument.load(new Uint8Array(buffer));
    expect(document.getPageCount()).toBe(1);
    expect(buffer.toString('latin1').toLowerCase()).not.toContain('pdfkit');
  });

  it('generates a branded DOCX package', async () => {
    const buffer = await createDocx('Study notes', '## Key idea\nUse a worked example and practice question.');
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
