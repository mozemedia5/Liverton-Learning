import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json, parseBody, requireIdentity, safeString } from './_lib/server.js';

const IMAGE_MODELS = new Set([
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'nano-banana-pro-preview',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

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
