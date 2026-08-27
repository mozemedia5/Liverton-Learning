import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, json, parseBody, requireIdentity, safeString } from '../_lib/server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const identity = await requireIdentity(req);
    const token = safeString(parseBody(req).token, 4096);
    if (!token) return json(res, 400, { error: 'A push token is required.' });
    const db = getAdminFirestore();
    await db.collection('pushTokens').doc(`${identity.uid}_${token.slice(-80)}`).set({
      token,
      userId: identity.uid,
      email: identity.email || '',
      updatedAt: new Date(),
      active: true,
    }, { merge: true });
    return json(res, 200, { registered: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Push token registration error', message);
    return json(res, 500, { error: 'Could not register push notifications.' });
  }
}
