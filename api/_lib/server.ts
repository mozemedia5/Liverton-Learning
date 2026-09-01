import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let firestore: Firestore | undefined;
let messaging: Messaging | undefined;

export function ensureAdminApp() {
  return getApps()[0] || initializeApp({
    credential: cert({
      projectId: required('FIREBASE_PROJECT_ID'),
      clientEmail: required('FIREBASE_CLIENT_EMAIL'),
      privateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`SERVER_CONFIG_MISSING:${name}`);
  return value;
}

export function getAdminFirestore() {
  if (!firestore) firestore = getFirestore(ensureAdminApp());
  return firestore;
}

export function getAdminMessaging() {
  if (!messaging) messaging = getMessaging(ensureAdminApp());
  return messaging;
}

export async function requireIdentity(req: VercelRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw Object.assign(new Error('AUTH_REQUIRED'), { statusCode: 401 });
  const token = await getAuth(ensureAdminApp()).verifyIdToken(header.slice(7));
  return { uid: token.uid, email: token.email || '', name: token.name || '' };
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || [
    'https://liverton-learning.vercel.app',
    'https://livertonlearning.com',
    'https://liverton-learning.lindy.site',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].join(','))
    .split(',').map(value => value.trim()).filter(Boolean);
}

export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  const configured = allowedOrigins();
  if (configured.includes(origin) || configured.includes('*')) return true;

  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'livertonlearning.com' ||
      host.endsWith('.livertonlearning.com') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.lindy.site') ||
      host.endsWith('.e2b.app') ||
      host.endsWith('.manus.computer')
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

export function json(res: VercelResponse, status: number, payload: Record<string, unknown>) {
  return res.status(status).json(payload);
}

export function safeString(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parseBody(req: VercelRequest) {
  if (!req.body) return {} as Record<string, unknown>;
  if (typeof req.body === 'string') return JSON.parse(req.body) as Record<string, unknown>;
  return req.body as Record<string, unknown>;
}
