import type { VercelRequest, VercelResponse } from '@vercel/node';
import PDFDocument from 'pdfkit';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { applyCors, json, parseBody, requireIdentity, safeString } from './_lib/server.js';

const MAX_CONTENT = 60_000;
const MAX_TITLE = 120;

type ArtifactFormat = 'pdf' | 'docx';

function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/i, '').replace(/```$/, ''))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[>*_`~]/g, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function paragraphsFromMarkdown(markdown: string): Paragraph[] {
  const lines = markdown.split(/\r?\n/);
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

async function createPdf(title: string, content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 54, size: 'A4', info: { Title: title, Author: 'Hanna AI — Liverton Learning' } });
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.fontSize(20).font('Helvetica-Bold').text(title, { align: 'left' });
    pdf.moveDown(0.8);
    pdf.fontSize(10).font('Helvetica').fillColor('#334155');
    const lines = plainText(content).split('\n');
    lines.forEach((line) => {
      if (/^•\s/.test(line)) pdf.text(line, { indent: 14, paragraphGap: 4 });
      else pdf.text(line, { paragraphGap: line ? 6 : 2 });
    });
    pdf.end();
  });
}

async function createDocx(title: string, content: string): Promise<Buffer> {
  const document = new Document({
    creator: 'Hanna AI — Liverton Learning',
    title,
    sections: [{ children: [
      new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
      ...paragraphsFromMarkdown(content),
    ] }],
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
