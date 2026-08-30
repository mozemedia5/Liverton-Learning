import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { AlignmentType, Document, Footer, Header, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
import { applyCors, json, parseBody, requireIdentity, safeString } from './server.js';

const MAX_CONTENT = 60_000;
const MAX_TITLE = 120;

type ArtifactFormat = 'pdf' | 'docx' | 'pptx';
export type PptxTemplate = 'liverton' | 'minimal' | 'midnight' | 'sunrise';
export type PptxAnimation = 'none' | 'calm' | 'dynamic';

type PptxTheme = { background: string; accent: string; heading: string; body: string; muted: string };

const PPTX_THEMES: Record<PptxTemplate, PptxTheme> = {
  liverton: { background: 'F8FAFC', accent: '10B981', heading: '0F172A', body: '334155', muted: '64748B' },
  minimal: { background: 'FFFFFF', accent: '64748B', heading: '111827', body: '374151', muted: '6B7280' },
  midnight: { background: '0F172A', accent: '38BDF8', heading: 'F8FAFC', body: 'E2E8F0', muted: '94A3B8' },
  sunrise: { background: 'FFF7ED', accent: 'F97316', heading: '431407', body: '7C2D12', muted: '9A3412' },
};

function normalizePptxTemplate(value: unknown): PptxTemplate {
  return value === 'minimal' || value === 'midnight' || value === 'sunrise' ? value : 'liverton';
}

function normalizePptxAnimation(value: unknown): PptxAnimation {
  return value === 'calm' || value === 'dynamic' ? value : 'none';
}

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

async function applyPptxTransitions(buffer: Buffer, animation: PptxAnimation): Promise<Buffer> {
  if (animation === 'none') return buffer;
  const zip = await JSZip.loadAsync(buffer);
  const transition = animation === 'dynamic'
    ? '<p:transition spd="fast" advClick="1"><p:push dir="l"/></p:transition>'
    : '<p:transition spd="slow" advClick="1"><p:fade/></p:transition>';
  const slidePaths = Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path));
  await Promise.all(slidePaths.map(async path => {
    const file = zip.file(path);
    if (!file) return;
    const xml = await file.async('string');
    if (!xml.includes('<p:transition')) zip.file(path, xml.replace('</p:sld>', `${transition}</p:sld>`));
  }));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function createPptx(title: string, content: string, options: { template?: PptxTemplate; animation?: PptxAnimation } = {}): Promise<Buffer> {
  const template = normalizePptxTemplate(options.template);
  const animation = normalizePptxAnimation(options.animation);
  const theme = PPTX_THEMES[template];
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Hanna AI - Liverton Learning';
  pptx.company = 'Liverton Learning';
  pptx.subject = 'Educational learning artifact';
  pptx.title = normalizeExportText(title);
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
  };

  const addFooter = (slide: PptxGenJS.Slide) => {
    slide.addText('HANNA AI  |  LIVERTON LEARNING', {
      x: 0.65, y: 7.08, w: 12.0, h: 0.18, fontFace: 'Aptos', fontSize: 7,
      color: theme.muted, margin: 0, align: 'right', breakLine: false,
    });
  };
  const addAccent = (slide: PptxGenJS.Slide) => {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: theme.accent }, line: { color: theme.accent } });
  };

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: theme.background };
  addAccent(titleSlide);
  titleSlide.addText(normalizeExportText(title), {
    x: 0.8, y: 1.55, w: 11.75, h: 1.25, fontFace: 'Aptos Display', fontSize: 30,
    bold: true, color: theme.heading, margin: 0, fit: 'shrink', breakLine: false,
  });
  titleSlide.addText('Prepared by Hanna AI', {
    x: 0.82, y: 3.05, w: 5.5, h: 0.35, fontFace: 'Aptos', fontSize: 15,
    color: theme.accent, margin: 0, breakLine: false,
  });
  titleSlide.addText('Liverton Learning educational artifact', {
    x: 0.82, y: 3.48, w: 6.5, h: 0.3, fontFace: 'Aptos', fontSize: 11,
    color: theme.muted, margin: 0, breakLine: false,
  });
  addFooter(titleSlide);

  const sections: Array<{ heading: string; bullets: string[] }> = [];
  let current = { heading: 'Key points', bullets: [] as string[] };
  for (const rawLine of normalizeExportText(content).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading && current.bullets.length) {
      sections.push(current);
      current = { heading: plainText(heading[1]).slice(0, 100), bullets: [] };
    } else if (heading) {
      current.heading = plainText(heading[1]).slice(0, 100);
    } else {
      current.bullets.push(plainText(line).replace(/^[-*+]\s+/, '').slice(0, 420));
    }
  }
  if (current.bullets.length || !sections.length) sections.push(current);

  for (const section of sections) {
    for (let start = 0; start < section.bullets.length; start += 6) {
      const slide = pptx.addSlide();
      slide.background = { color: theme.background };
      addAccent(slide);
      slide.addText(section.heading, {
        x: 0.75, y: 0.62, w: 11.8, h: 0.62, fontFace: 'Aptos Display', fontSize: 24,
        bold: true, color: theme.heading, margin: 0, fit: 'shrink', breakLine: false,
      });
      const bullets = section.bullets.slice(start, start + 6);
      slide.addText(bullets.map(item => ({ text: item, options: { bullet: { indent: 18 }, hanging: 4 } })), {
        x: 0.95, y: 1.55, w: 11.0, h: 4.9, fontFace: 'Aptos', fontSize: 18,
        color: theme.body, breakLine: true, paraSpaceAfter: 14, valign: 'top', margin: 0.05,
        fit: 'shrink', bullet: { indent: 18 },
      });
      addFooter(slide);
    }
  }

  const output = await pptx.write({ outputType: 'nodebuffer' });
  let buffer: Buffer;
  if (Buffer.isBuffer(output)) buffer = output;
  else if (output instanceof Uint8Array) buffer = Buffer.from(output);
  else if (output instanceof ArrayBuffer) buffer = Buffer.from(new Uint8Array(output));
  else if (typeof output === 'string') buffer = Buffer.from(output, 'binary');
  else throw new Error('PPTX generation returned an unsupported output type.');
  return applyPptxTransitions(buffer, animation);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const format = safeString(body.format, 10).toLowerCase() as ArtifactFormat;
    if (format !== 'pdf' && format !== 'docx' && format !== 'pptx') return json(res, 400, { error: 'Choose PDF, DOCX, or PPTX.' });
    const title = safeString(body.title, MAX_TITLE).trim() || 'Hanna learning document';
    const content = safeString(body.content, MAX_CONTENT).trim();
    if (!content) return json(res, 400, { error: 'Document content is required.' });
    const template = normalizePptxTemplate(body.template);
    const animation = normalizePptxAnimation(body.animation);
    if (format === 'pptx' && typeof body.template === 'string' && !Object.prototype.hasOwnProperty.call(PPTX_THEMES, body.template)) return json(res, 400, { error: 'Choose a supported PPTX template.' });
    if (format === 'pptx' && typeof body.animation === 'string' && !['none', 'calm', 'dynamic'].includes(body.animation)) return json(res, 400, { error: 'Choose a supported PPTX animation setting.' });

    const buffer = format === 'pdf' ? await createPdf(title, content) : format === 'docx' ? await createDocx(title, content) : await createPptx(title, content, { template, animation });
    const extension = format;
    const mime = format === 'pdf'
      ? 'application/pdf'
      : format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
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
