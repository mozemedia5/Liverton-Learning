import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json } from './_lib/server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  return json(res, 200, {
    ok: true,
    service: 'liverton-learning-api',
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    capabilities: {
      hanna: Boolean(
        process.env.GEMINI_API_KEY &&
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ),
      firebaseAdmin: Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
      cloudinarySigning: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    },
  });
}
