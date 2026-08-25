import { createHash, randomInt } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, json, parseBody, safeString } from './_lib/server.js';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const SEND_COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

async function claimRateLimit(db: ReturnType<typeof getAdminFirestore>, key: string, now: number) {
  const ref = db.collection('otpRateLimits').doc(key);
  let allowed = true;
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const resetAt = data.resetAt?.toMillis?.() || 0;
    const count = Number(data.count || 0);
    if (resetAt > now && count >= MAX_SENDS_PER_WINDOW) {
      allowed = false;
      return;
    }
    transaction.set(ref, {
      count: resetAt > now ? count + 1 : 1,
      resetAt: new Date(resetAt > now ? resetAt : now + WINDOW_MS),
      updatedAt: new Date(now),
    });
  });
  return allowed;
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function clientIp(req: VercelRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  return (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || 'unknown').trim().slice(0, 64);
}

export function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function otpDigest(email: string, otp: string) {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!pepper) throw new Error('SERVER_CONFIG_MISSING:OTP_PEPPER');
  return digest(`${pepper}:${email}:${otp}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const body = parseBody(req);
    const email = safeString(body.email, 254).toLowerCase();
    const studentName = safeString(body.studentName, 120) || 'Student';
    if (!validEmail(email)) return json(res, 400, { error: 'A valid email address is required' });
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return json(res, 503, { error: 'Email delivery is not configured' });
    }

    const key = digest(`${email}:${clientIp(req)}`);
    const now = Date.now();
    const db = getAdminFirestore();
    if (!await claimRateLimit(db, key, now)) {
      return json(res, 429, { error: 'Too many requests. Please try again later.' });
    }

    const otpRef = db.collection('otpCodes').doc(digest(email));
    const existing = await otpRef.get();
    if (existing.exists) {
      const createdAt = existing.get('createdAt')?.toMillis?.() || 0;
      if (createdAt && now - createdAt < SEND_COOLDOWN_MS) {
        return json(res, 429, { error: 'Please wait before requesting another code.' });
      }
    }

    const otp = randomInt(100000, 1000000).toString();
    await otpRef.set({
      emailHash: digest(email),
      otpHash: otpDigest(email, otp),
      createdAt: new Date(now),
      expiresAt: new Date(now + OTP_TTL_MS),
      attempts: 0,
    });

    const safeName = studentName.replace(/[<>]/g, '');
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
        html: `<p>Hello ${safeName},</p><p>Your Liverton Learning verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
      }),
    });
    if (!response.ok) {
      await otpRef.delete().catch(() => undefined);
      console.error('OTP email provider rejected request', { status: response.status });
      return json(res, 502, { error: 'Could not send verification email' });
    }
    return json(res, 200, { success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('OTP send failed', error instanceof Error ? error.message : 'unknown error');
    return json(res, 500, { error: 'Could not process verification request' });
  }
}
