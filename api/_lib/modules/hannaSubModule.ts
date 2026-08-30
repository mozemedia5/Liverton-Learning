import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json, parseBody, requireIdentity, safeString } from '../server.js';
import { getApplicationKnowledgeParts } from '../appKnowledge.js';
import { formatResearchContext, performWebResearch, searchImages, type WebImage, type WebSource } from '../webResearch.js';
import { getModelName } from '../gemini.js';
import { createDocx, createPdf, createPptx, type PptxAnimation, type PptxTemplate } from '../hanna-artifact.js';

const IMAGE_MODELS = new Set([
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'nano-banana-pro-preview',
]);

function normalizePptxTemplate(value: unknown): PptxTemplate {
  return value === 'minimal' || value === 'midnight' || value === 'sunrise' ? value : 'liverton';
}

function normalizePptxAnimation(value: unknown): PptxAnimation {
  return value === 'calm' || value === 'dynamic' ? value : 'none';
}

export async function handleHannaMedia(req: VercelRequest, res: VercelResponse) {
  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const prompt = safeString(body.prompt, 4000);
    const requestedModel = safeString(body.model, 120);
    const model = IMAGE_MODELS.has(requestedModel) ? requestedModel : 'gemini-3-pro-image';
    if (!prompt) return json(res, 400, { error: 'An image prompt is required.' });
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) return json(res, 503, { error: 'Hanna image generation is not configured on the server.' });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Create a safe, classroom-appropriate educational visual. Do not include decorative symbol noise or unrequested text.\n\n${prompt}` }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
    const providerBody = await response.json().catch(() => ({}));
    const parts = providerBody?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData?.data);
    if (!response.ok || !imagePart?.inlineData?.data) {
      console.error('Hanna image generation failed', { status: response.status, model, userId: identity.uid, message: providerBody?.error?.message });
      return json(res, 502, { error: 'Hanna could not create an image with that model.' });
    }
    return json(res, 200, {
      model,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
      data: imagePart.inlineData.data,
      text: parts.find((part: { text?: string }) => part.text)?.text || '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    return json(res, 500, { error: 'Hanna image generation failed.' });
  }
}

export async function handleHannaArtifact(req: VercelRequest, res: VercelResponse) {
  try {
    await requireIdentity(req);
    const body = parseBody(req);
    const format = safeString(body.format, 10).toLowerCase();
    const markdown = safeString(body.markdown || body.content, 60_000);
    const title = safeString(body.title, 120) || 'Hanna Artifact';
    const template = normalizePptxTemplate(body.template);
    const animation = normalizePptxAnimation(body.animation);

    if (!markdown) return json(res, 400, { error: 'Artifact markdown content is required' });

    let buffer: Buffer;
    let mimeType: string;

    if (format === 'pdf') {
      buffer = await createPdf(markdown, title);
      mimeType = 'application/pdf';
    } else if (format === 'docx') {
      buffer = await createDocx(markdown, title);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (format === 'pptx') {
      buffer = await createPptx(markdown, title, { template, animation });
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
      return json(res, 400, { error: 'Unsupported format. Use pdf, docx, or pptx.' });
    }

    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'hanna-document';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${format}"`);
    res.setHeader('Content-Length', String(buffer.byteLength));
    return res.status(200).send(buffer);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    if (code === 'AUTH_REQUIRED' || code.includes('auth/')) return json(res, 401, { error: 'Authentication required' });
    console.error('Hanna artifact export error', { code });
    return json(res, 500, { error: 'Hanna artifact generation failed' });
  }
}

export async function handleHannaResearch(req: VercelRequest, res: VercelResponse) {
  try {
    await requireIdentity(req);
    const body = parseBody(req);
    const query = safeString(body.query, 800);
    const mode = body.mode === 'images' ? 'images' : 'web';
    if (!query) return json(res, 400, { error: 'A research question is required' });

    if (mode === 'images') {
      const images: WebImage[] = await searchImages(query);
      return json(res, 200, { answer: '', sources: [] as WebSource[], images, searched: true, model: getModelName() });
    }

    const parts = await getApplicationKnowledgeParts(false);
    const knowledge = parts.map(part => 'text' in part ? part.text : '').filter(Boolean).join('\n');
    const result = await performWebResearch(query, knowledge);
    return json(res, 200, {
      answer: result.searched ? result.answer : formatResearchContext(result),
      sources: result.sources,
      images: result.images,
      searched: result.searched,
      model: getModelName(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    if (code === 'AUTH_REQUIRED' || code.includes('auth/')) return json(res, 401, { error: 'Authentication required' });
    console.error('Hanna research error', { code });
    return json(res, 502, { error: 'Hanna could not access external information right now' });
  }
}
