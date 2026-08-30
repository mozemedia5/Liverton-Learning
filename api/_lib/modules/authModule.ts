import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, json, parseBody, requireIdentity, safeString } from '../server.js';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const SEND_COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

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

function equalDigest(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

function normalizeUsername(value: unknown): string {
  return normalize(value).replace(/^@+/, '');
}

function toSearchableUser(id: string, data: Record<string, unknown>) {
  const email = safeString(data.email, 320);
  const fullName = safeString(data.fullName || data.name || data.displayName, 160) || 'Liverton member';
  const username = normalizeUsername(data.username || data.userName || data.handle);
  return {
    uid: id,
    email,
    emailLower: normalize(email),
    fullName,
    fullNameLower: normalize(fullName),
    role: typeof data.role === 'string' ? data.role : 'student',
    ...(username ? { username, usernameLower: username } : {}),
    ...(typeof data.profilePicture === 'string' ? { profilePicture: data.profilePicture } : {}),
    ...(typeof data.profileImageUrl === 'string' ? { profilePicture: data.profileImageUrl } : {}),
    ...(typeof data.photoURL === 'string' ? { profilePicture: data.photoURL } : {}),
    isDiscoverable: data.isDiscoverable !== false,
  };
}

export async function handleSendOtp(req: VercelRequest, res: VercelResponse) {
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

export async function handleVerifyOtp(req: VercelRequest, res: VercelResponse) {
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

export async function handleSearchUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const identity = await requireIdentity(req);
    const term = normalize(req.query.q);
    if (term.length < 2) return json(res, 200, { users: [] });

    const snapshot = await getAdminFirestore().collection('users').limit(5000).get();
    const usernameTerm = normalizeUsername(term);
    const results = snapshot.docs
      .map((userDoc) => toSearchableUser(userDoc.id, userDoc.data() as Record<string, unknown>))
      .filter((user) => user.uid !== identity.uid && user.isDiscoverable)
      .filter((user) => (
        user.usernameLower?.startsWith(usernameTerm) ||
        user.emailLower.startsWith(term) ||
        user.fullNameLower.startsWith(term)
      ))
      .slice(0, 20)
      .map(({ emailLower, fullNameLower, usernameLower, isDiscoverable, ...user }) => user);

    return json(res, 200, { users: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('User search failed', message);
    return json(res, 500, { error: 'Could not search user directory.' });
  }
}
