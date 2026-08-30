import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json } from './_lib/server.js';
import { handleCloudinarySign } from './_lib/modules/cloudinaryModule.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url || '', 'http://localhost');
  const pathname = url.pathname.replace(/\/+$/, '');
  const action = req.query?.action;

  if (pathname.endsWith('/sign') || action === 'sign' || pathname.endsWith('/cloudinary')) {
    return handleCloudinarySign(req, res);
  }

  return json(res, 404, { error: 'Cloudinary endpoint action not found' });
}
