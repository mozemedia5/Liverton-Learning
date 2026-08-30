import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json } from './_lib/server.js';
import { handleNotificationDispatch, handleNotificationRegisterToken } from './_lib/modules/notificationModule.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url || '', 'http://localhost');
  const pathname = url.pathname.replace(/\/+$/, '');
  const action = req.query?.action;

  if (pathname.endsWith('/dispatch') || action === 'dispatch') {
    return handleNotificationDispatch(req, res);
  }
  if (pathname.endsWith('/register-token') || action === 'register-token') {
    return handleNotificationRegisterToken(req, res);
  }

  return json(res, 404, { error: 'Notifications endpoint action not found' });
}
