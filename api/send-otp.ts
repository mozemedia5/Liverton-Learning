import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, json, parseBody, safeString } from './_lib/server';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const body = parseBody(req);
  const email = safeString(body.email, 254).toLowerCase();
  const otp = safeString(body.otp, 12);
  const key = `${req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'}:${email}`;
  const current = attempts.get(key);
  const now = Date.now();
  if (!current || current.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else if (current.count >= MAX_ATTEMPTS) return json(res, 429, { error: 'Too many OTP attempts. Please try again later.' });
  else current.count += 1;

  if (!validEmail(email) || !/^\d{6}$/.test(otp)) return json(res, 400, { error: 'A valid email and six-digit OTP are required' });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return json(res, 503, { error: 'Email delivery is not configured' });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Liverton Learning verification code',
      html: `<p>Your Liverton Learning verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires shortly. If you did not request it, you can ignore this email.</p>`,
    }),
  });
  if (!response.ok) {
    console.error('OTP email provider rejected request', { status: response.status });
    return json(res, 502, { error: 'Could not send verification email' });
  }
  return json(res, 200, { success: true, message: 'Verification email sent' });
}
