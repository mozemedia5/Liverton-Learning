import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json } from './_lib/server.js';
import { handleCourseEnroll, handleCourseNotifyUpdate } from './_lib/modules/courseModule.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url || '', 'http://localhost');
  const pathname = url.pathname.replace(/\/+$/, '');
  const action = req.query?.action;

  if (pathname.endsWith('/enroll') || action === 'enroll') {
    return handleCourseEnroll(req, res);
  }
  if (pathname.endsWith('/notify-update') || action === 'notify-update') {
    return handleCourseNotifyUpdate(req, res);
  }

  return json(res, 404, { error: 'Courses endpoint action not found' });
}
