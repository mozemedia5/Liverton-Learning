import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createDocx, createPdf, createPptx, normalizeExportText } from './_lib/hanna-artifact.js';

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

  it('generates a valid PPTX package with title and content slides', async () => {
    const buffer = await createPptx('Photosynthesis lesson', '# Overview\nPlants use light energy.\n\n## Key terms\n- Chlorophyll\n- Glucose');
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.byteLength).toBeGreaterThan(5000);
    expect(buffer.toString('latin1')).toContain('ppt/slides/slide1.xml');
  });

  it('applies the midnight template and calm fade transitions to every slide', async () => {
    const buffer = await createPptx('Night lesson', '# Overview\nA calm slide sequence.', { template: 'midnight', animation: 'calm' });
    const zip = await JSZip.loadAsync(buffer);
    const slide = await zip.file('ppt/slides/slide1.xml')?.async('string');
    expect(slide).toContain('<p:transition spd="slow" advClick="1"><p:fade/></p:transition>');
    expect(slide).toContain('38BDF8');
  });

  it('applies dynamic push transitions and leaves default exports without transitions', async () => {
    const dynamic = await createPptx('Dynamic lesson', '# Overview\nMove through the lesson.', { template: 'sunrise', animation: 'dynamic' });
    const dynamicZip = await JSZip.loadAsync(dynamic);
    const dynamicSlide = await dynamicZip.file('ppt/slides/slide1.xml')?.async('string');
    expect(dynamicSlide).toContain('<p:transition spd="fast" advClick="1"><p:push dir="l"/></p:transition>');
    expect(dynamicSlide).toContain('F97316');

    const plain = await createPptx('Plain lesson', '# Overview\nNo motion.');
    const plainZip = await JSZip.loadAsync(plain);
    const plainSlide = await plainZip.file('ppt/slides/slide1.xml')?.async('string');
    expect(plainSlide).not.toContain('<p:transition');
  });
});
