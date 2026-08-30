import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json } from './_lib/server.js';
import { handleSendOtp, handleVerifyOtp, handleSearchUsers } from './_lib/modules/authModule.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const url = new URL(req.url || '', 'http://localhost');
  const pathname = url.pathname.replace(/\/+$/, '');
  const action = req.query?.action;

  if (pathname.endsWith('/send-otp') || action === 'send-otp') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    return handleSendOtp(req, res);
  }
  if (pathname.endsWith('/verify-otp') || action === 'verify-otp') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    return handleVerifyOtp(req, res);
  }
  if (pathname.endsWith('/search-users') || action === 'search-users') {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    return handleSearchUsers(req, res);
  }

  return json(res, 404, { error: 'Auth endpoint action not found' });
}
