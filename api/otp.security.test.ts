import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = new Map<string, Record<string, any>>();
const resendFetch = vi.fn();

vi.mock('./_lib/server.js', () => ({
  applyCors: (req: any, res: any) => { if (req.headers?.origin === 'https://liverton-learning.vercel.app') res.setHeader('Access-Control-Allow-Origin', req.headers.origin); },
  json: (res: any, status: number, payload: Record<string, unknown>) => res.status(status).json(payload),
  parseBody: (req: any) => typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}),
  safeString: (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '',
  getAdminFirestore: () => ({
    collection: () => ({
      doc: (id: string) => {
        const ref: any = {
          __id: id,
          get: async () => ({ exists: records.has(id), data: () => records.get(id), get: (field: string) => { const value = records.get(id)?.[field]; return value instanceof Date ? { toMillis: () => value.getTime() } : value; } }),
          set: async (data: Record<string, any>) => { records.set(id, data); },
          delete: async () => { records.delete(id); },
        };
        return ref;
      },
    }),
    runTransaction: async (callback: any) => {
      const transaction = {
        get: async (ref: any) => ref.get(),
        delete: async (ref: any) => ref.delete(),
        set: async (ref: any, data: Record<string, any>) => { records.set((ref as any).__id, data); },
        update: async (ref: any, data: Record<string, any>) => { const current = records.get((ref as any).__id) || {}; records.set((ref as any).__id, { ...current, ...data }); },
      };
      await callback(transaction);
    },
  }),
}));

import sendOtp from './send-otp.js';
import verifyOtp from './verify-otp.js';

function response() {
  const state: any = { statusCode: 0, body: undefined, headers: {} };
  state.setHeader = (key: string, value: string) => { state.headers[key] = value; };
  state.status = (status: number) => { state.statusCode = status; return state; };
  state.json = (body: unknown) => { state.body = body; return state; };
  state.end = () => state;
  return state;
}

function request(body: unknown, ip = '198.51.100.10', method = 'POST') {
  return { method, body, headers: { 'x-forwarded-for': ip, origin: 'https://liverton-learning.vercel.app' }, socket: { remoteAddress: ip } } as any;
}

describe('OTP endpoint security', () => {
  beforeEach(() => {
    records.clear();
    resendFetch.mockReset();
    resendFetch.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', resendFetch);
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM_EMAIL = 'no-reply@example.test';
    process.env.OTP_PEPPER = 'test-pepper';
  });

  it('does not require or accept a client-supplied OTP when sending', async () => {
    const res = response();
    await sendOtp(request({ email: 'student@example.com', otp: '000000' }), res);
    expect(res.statusCode).toBe(200);
    expect(resendFetch).toHaveBeenCalledTimes(1);
    const otpRecord = [...records.values()].find(record => record.otpHash);
    expect(otpRecord).toBeDefined();
    expect(otpRecord?.otpHash).not.toBe('000000');
    expect(JSON.stringify(res.body)).not.toContain('000000');
  });

  it('rejects invalid input and disallows non-POST methods', async () => {
    const invalid = response();
    await sendOtp(request({ email: 'not-an-email' }), invalid);
    expect(invalid.statusCode).toBe(400);
    const method = response();
    await verifyOtp(request({ email: 'student@example.com', otp: '123456' }, '198.51.100.11', 'GET'), method);
    expect(method.statusCode).toBe(405);
  });

  it('enforces the resend cooldown before calling the email provider again', async () => {
    const first = response();
    await sendOtp(request({ email: 'cooldown@example.com' }), first);
    const second = response();
    await sendOtp(request({ email: 'cooldown@example.com' }), second);
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(resendFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects wrong and malformed verification codes without revealing the stored hash', async () => {
    const send = response();
    await sendOtp(request({ email: 'verify@example.com' }), send);
    const wrong = response();
    await verifyOtp(request({ email: 'verify@example.com', otp: '111111' }), wrong);
    expect(wrong.statusCode).toBe(400);
    expect(JSON.stringify(wrong.body)).not.toMatch(/[a-f0-9]{64}/);
    const malformed = response();
    await verifyOtp(request({ email: 'verify@example.com', otp: '1' }), malformed);
    expect(malformed.statusCode).toBe(400);
  });
});
