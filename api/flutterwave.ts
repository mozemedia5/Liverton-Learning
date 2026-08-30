import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json } from './_lib/server.js';
import { handleFlutterwaveInitialize, handleFlutterwaveVerify } from './_lib/modules/flutterwaveModule.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url || '', 'http://localhost');
  const pathname = url.pathname.replace(/\/+$/, '');
  const action = req.query?.action;

  if (pathname.endsWith('/initialize') || action === 'initialize') {
    return handleFlutterwaveInitialize(req, res);
  }
  if (pathname.endsWith('/verify') || action === 'verify') {
    return handleFlutterwaveVerify(req, res);
  }

  return json(res, 404, { error: 'Flutterwave endpoint action not found' });
}
