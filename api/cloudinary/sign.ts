import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json, parseBody, requireIdentity, safeString } from '../_lib/server';

const UPLOAD_TYPES = {
  image: { resourceType: 'image', maxBytes: 20 * 1024 * 1024 },
  course_video: { resourceType: 'video', maxBytes: 100 * 1024 * 1024 },
  short_video: { resourceType: 'video', maxBytes: 100 * 1024 * 1024 },
  audio: { resourceType: 'video', maxBytes: 100 * 1024 * 1024 },
  document: { resourceType: 'raw', maxBytes: 25 * 1024 * 1024 },
} as const;

type UploadType = keyof typeof UPLOAD_TYPES;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`SERVER_CONFIG_MISSING:${name}`);
  return value;
}

function isAllowedContentType(uploadType: UploadType, contentType: string, fileName: string) {
  const normalized = contentType.toLowerCase();
  if (uploadType === 'image') return normalized.startsWith('image/');
  if (uploadType === 'audio') return normalized.startsWith('audio/') || normalized === 'application/octet-stream';
  if (uploadType === 'course_video' || uploadType === 'short_video') return normalized.startsWith('video/');
  if (uploadType === 'document') {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    return normalized.startsWith('text/') || normalized === 'application/pdf' || normalized.includes('officedocument') ||
      ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'].includes(extension);
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const requestedType = safeString(body.uploadType, 30) as UploadType;
    const uploadType = requestedType || 'image';
    const policy = UPLOAD_TYPES[uploadType];
    const contentType = safeString(body.contentType, 120);
    const fileName = safeString(body.fileName, 180);
    const size = Number(body.size || 0);

    if (!policy) return json(res, 400, { error: 'Unsupported upload type' });
    if (!Number.isFinite(size) || size <= 0 || size > policy.maxBytes) {
      return json(res, 400, { error: `File size is not allowed for ${uploadType}` });
    }
    if (!contentType || !isAllowedContentType(uploadType, contentType, fileName)) {
      return json(res, 400, { error: `File type is not allowed for ${uploadType}` });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `liverton/${identity.uid}/${uploadType}`;
    const serialized = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1')
      .update(`${serialized}${required('CLOUDINARY_API_SECRET')}`)
      .digest('hex');

    return json(res, 200, {
      cloudName: required('CLOUDINARY_CLOUD_NAME'),
      apiKey: required('CLOUDINARY_API_KEY'),
      uploadType,
      resourceType: policy.resourceType,
      folder,
      timestamp,
      signature,
      params: { folder, timestamp },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    if (code === 'AUTH_REQUIRED' || code.includes('auth/')) return json(res, 401, { error: 'Authentication required' });
    if (code.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Cloudinary server configuration is incomplete' });
    console.error('Cloudinary signing error', { code });
    return json(res, 500, { error: 'Could not authorize upload' });
  }
}
