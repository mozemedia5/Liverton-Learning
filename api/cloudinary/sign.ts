import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json, parseBody, requireIdentity, safeString } from '../_lib/server';

const RESOURCE_TYPES = new Set(['image', 'video', 'raw']);
const MAX_BYTES = 100 * 1024 * 1024;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`SERVER_CONFIG_MISSING:${name}`);
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const resourceType = safeString(body.resourceType, 20) || 'image';
    const contentType = safeString(body.contentType, 120);
    const size = Number(body.size || 0);
    if (!RESOURCE_TYPES.has(resourceType)) return json(res, 400, { error: 'Unsupported resource type' });
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return json(res, 400, { error: 'File size is not allowed' });
    if (!contentType || contentType.length > 120) return json(res, 400, { error: 'A valid content type is required' });

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `liverton/${identity.uid}/${resourceType}`;
    const params = { folder, timestamp };
    const serialized = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1').update(`${serialized}${required('CLOUDINARY_API_SECRET')}`).digest('hex');

    return json(res, 200, {
      cloudName: required('CLOUDINARY_CLOUD_NAME'),
      apiKey: required('CLOUDINARY_API_KEY'),
      resourceType,
      folder,
      timestamp,
      signature,
      params,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    if (code === 'AUTH_REQUIRED' || code.includes('auth/')) return json(res, 401, { error: 'Authentication required' });
    if (code.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Cloudinary server configuration is incomplete' });
    console.error('Cloudinary signing error', { code });
    return json(res, 500, { error: 'Could not authorize upload' });
  }
}
