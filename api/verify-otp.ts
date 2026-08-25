import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, json, parseBody, safeString } from './_lib/server.js';
import { digest, otpDigest } from './send-otp.js';

const MAX_VERIFY_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function equalDigest(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const body = parseBody(req);
    const email = safeString(body.email, 254).toLowerCase();
    const otp = safeString(body.otp, 6);
    if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
      return json(res, 400, { error: 'A valid email and six-digit code are required' });
    }

    const ref = getAdminFirestore().collection('otpCodes').doc(digest(email));
    let result: { success: boolean; error?: string } = { success: false, error: 'Invalid or expired verification code.' };
    await getAdminFirestore().runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return;
      const data = snapshot.data() || {};
      const expiresAt = data.expiresAt?.toMillis?.() || 0;
      const attempts = Number(data.attempts || 0);
      if (!expiresAt || expiresAt <= Date.now()) {
        transaction.delete(ref);
        result = { success: false, error: 'This code has expired. Please request a new one.' };
        return;
      }
      if (attempts >= MAX_VERIFY_ATTEMPTS) {
        transaction.delete(ref);
        result = { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
        return;
      }
      const expected = typeof data.otpHash === 'string' ? data.otpHash : '';
      if (!expected || !equalDigest(expected, otpDigest(email, otp))) {
        const nextAttempts = attempts + 1;
        if (nextAttempts >= MAX_VERIFY_ATTEMPTS) transaction.delete(ref);
        else transaction.update(ref, { attempts: nextAttempts });
        result = { success: false, error: nextAttempts >= MAX_VERIFY_ATTEMPTS ? 'Too many incorrect attempts. Please request a new code.' : `Invalid code. ${MAX_VERIFY_ATTEMPTS - nextAttempts} attempts remaining.` };
        return;
      }
      transaction.delete(ref);
      result = { success: true };
    });
    return json(res, result.success ? 200 : 400, result);
  } catch (error) {
    console.error('OTP verification failed', error instanceof Error ? error.message : 'unknown error');
    return json(res, 500, { error: 'Could not process verification request' });
  }
}
