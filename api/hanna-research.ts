import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json, parseBody, requireIdentity, safeString } from './_lib/server.js';
import { getApplicationKnowledgeParts } from './_lib/appKnowledge.js';
import { formatResearchContext, performWebResearch, searchImages, type WebImage, type WebSource } from './_lib/webResearch.js';
import { getModelName } from './_lib/gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
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
