import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { AlignmentType, Document, Footer, Header, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { applyCors, json, parseBody, requireIdentity, safeString } from './_lib/server.js';

const MAX_CONTENT = 60_000;
const MAX_TITLE = 120;

type ArtifactFormat = 'pdf' | 'docx';

const UNICODE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\u2212/g, '-'], [/\u2013|\u2014/g, '-'], [/\u2018|\u2019/g, "'"], [/\u201C|\u201D/g, '"'],
  [/\u00A0/g, ' '], [/\u00D7/g, ' x '], [/\u00F7/g, ' / '], [/\u2264/g, '<='], [/\u2265/g, '>='],
  [/\u2260/g, '!='], [/\u2192/g, '->'], [/\u2190/g, '<-'], [/\u2026/g, '...'],
  [/\u03B1/g, 'alpha'], [/\u03B2/g, 'beta'], [/\u03B3/g, 'gamma'], [/\u03B4/g, 'delta'],
  [/\u03B8/g, 'theta'], [/\u03BB/g, 'lambda'], [/\u03BC/g, 'mu'], [/\u03C0/g, 'pi'], [/\u03C3/g, 'sigma'],
  [/\u03C6/g, 'phi'], [/\u03C9/g, 'omega'], [/\u221E/g, 'infinity'],
  [/\u2070/g, '^0'], [/\u00B9/g, '^1'], [/\u00B2/g, '^2'], [/\u00B3/g, '^3'], [/\u2074/g, '^4'],
  [/\u2075/g, '^5'], [/\u2076/g, '^6'], [/\u2077/g, '^7'], [/\u2078/g, '^8'], [/\u2079/g, '^9'],
];

export function normalizeExportText(markdown: string): string {
  let text = markdown
    .replace(/\\\(([^\n]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/[{}]/g, '');
  for (const [pattern, replacement] of UNICODE_REPLACEMENTS) text = text.replace(pattern, replacement);
  return text
    .replace(/[#$*\\]{3,}/g, '')
    .replace(/[¥€]{2,}/g, '')
    .split('').filter((character) => { const code = character.charCodeAt(0); return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126); }).join('')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainText(markdown: string): string {
  return normalizeExportText(markdown)
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[>*_`~]/g, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function paragraphsFromMarkdown(markdown: string): Paragraph[] {
  const lines = normalizeExportText(markdown).split(/\r?\n/);
  return lines.flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [new Paragraph({ text: '' })];
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const levels: Record<number, typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      };
      return [new Paragraph({ text: plainText(heading[2]), heading: levels[Math.min(3, heading[1].length)] })];
    }
    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    return [new Paragraph({
      text: bullet ? plainText(bullet[1]) : plainText(trimmed),
      bullet: bullet ? { level: 0 } : undefined,
    })];
  });
}

function wrapLine(line: string, font: PDFFont, size: number, maxWidth: number) {
  const words = line.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function drawBrand(page: PDFPage, width: number, height: number, font: PDFFont) {
  page.drawText('HANNA AI  |  LIVERTON LEARNING', {
    x: width - 225, y: height - 28, size: 7, font, color: rgb(0.45, 0.52, 0.60), opacity: 0.72,
  });
  page.drawText('Hanna AI  -  Liverton Learning', {
    x: width / 2 - 70, y: 24, size: 7, font, color: rgb(0.55, 0.60, 0.66), opacity: 0.55,
  });
}

export async function createPdf(title: string, content: string): Promise<Buffer> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28;
  const height = 841.89;
  const margin = 54;
  const bodySize = 10.5;
  const lineHeight = 15;
  let page = document.addPage([width, height]);
  let y = height - 72;
  drawBrand(page, width, height, regular);

  const nextPage = () => {
    page = document.addPage([width, height]);
    y = height - 54;
    drawBrand(page, width, height, regular);
  };
  const write = (text: string, font: PDFFont, size: number, gap = 5) => {
    const wrapped = wrapLine(text, font, size, width - margin * 2);
    for (const line of wrapped) {
      if (y < margin + lineHeight) nextPage();
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.16, 0.21, 0.28) });
      y -= lineHeight;
    }
    y -= gap;
  };

  page.drawText(normalizeExportText(title), { x: margin, y, size: 20, font: bold, color: rgb(0.04, 0.12, 0.22) });
  y -= 28;
  page.drawText('Prepared by Hanna AI', { x: margin, y, size: 8, font: regular, color: rgb(0.32, 0.42, 0.52) });
  y -= 28;

  for (const sourceLine of plainText(content).split('\n')) {
    const line = sourceLine.trim();
    if (!line) { y -= 7; continue; }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) write(heading[1], bold, 13, 7);
    else write(line, regular, bodySize, 4);
  }
  return Buffer.from(await document.save());
}

export async function createDocx(title: string, content: string): Promise<Buffer> {
  const document = new Document({
    creator: 'Hanna AI - Liverton Learning',
    title: normalizeExportText(title),
    sections: [{
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'HANNA AI  |  LIVERTON LEARNING', color: '94A3B8', size: 16, bold: true })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Prepared by Hanna AI  -  Liverton Learning', color: '94A3B8', size: 14, italics: true })] })] }) },
      children: [
        new Paragraph({ text: normalizeExportText(title), heading: HeadingLevel.TITLE }),
        ...paragraphsFromMarkdown(content),
      ],
    }],
  });
  return Packer.toBuffer(document);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const format = safeString(body.format, 10).toLowerCase() as ArtifactFormat;
    if (format !== 'pdf' && format !== 'docx') return json(res, 400, { error: 'Choose PDF or DOCX.' });
    const title = safeString(body.title, MAX_TITLE).trim() || 'Hanna learning document';
    const content = safeString(body.content, MAX_CONTENT).trim();
    if (!content) return json(res, 400, { error: 'Document content is required.' });

    const buffer = format === 'pdf' ? await createPdf(title, content) : await createDocx(title, content);
    const extension = format;
    const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'hanna-document';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${extension}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Hanna-Artifact-Owner', identity.uid);
    return res.status(200).send(buffer);
  } catch (error) {
    return json(res, (error as { statusCode?: number }).statusCode || 500, { error: error instanceof Error ? error.message : 'Artifact generation failed.' });
  }
}
