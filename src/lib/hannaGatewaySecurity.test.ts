import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Hanna gateway security boundary', () => {
  const client = readFileSync(resolve(process.cwd(), 'src/lib/hannaGemini.ts'), 'utf8');
  const gateway = readFileSync(resolve(process.cwd(), 'functions/src/hannaGateway.ts'), 'utf8');
  const provider = readFileSync(resolve(process.cwd(), 'functions/src/aiProvider.ts'), 'utf8');

  it('does not ship Gemini SDK or provider secrets to the browser client', () => {
    expect(client).not.toContain('@google/generative-ai');
    expect(client).not.toContain('GEMINI_API_KEY');
    expect(client).not.toContain('VITE_GEMINI');
    expect(client).toContain('Authorization');
    expect(client).toContain('/api/hanna');
  });

  it('requires a bearer token and verifies persistent chat ownership', () => {
    expect(gateway).toContain("header.startsWith('Bearer ')");
    expect(gateway).toContain('verifyIdToken');
    expect(gateway).toContain('verifyChatOwnership');
    expect(gateway).toContain("message === 'CHAT_FORBIDDEN'");
  });

  it('uses a server-selected allowlisted provider model and operation pricing', () => {
    expect(provider).toContain('ALLOWED_GEMINI_MODELS');
    expect(provider).toContain('getAuthorizedModel');
    expect(provider).toContain('const pricing');
    expect(provider).toContain('process.env.GEMINI_API_KEY');
  });

  it('restricts server-side attachment retrieval to Cloudinary media hosts', () => {
    expect(gateway).toContain("['res.cloudinary.com', 'cloudinary.com']");
    expect(gateway).toContain('MAX_ATTACHMENT_BYTES');
  });
});
