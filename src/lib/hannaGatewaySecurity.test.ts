import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Hanna gateway security boundary', () => {
  const client = readFileSync(resolve(process.cwd(), 'src/lib/hannaGemini.ts'), 'utf8');
  const gateway = readFileSync(resolve(process.cwd(), 'api/hanna.ts'), 'utf8');
  const server = readFileSync(resolve(process.cwd(), 'api/_lib/server.ts'), 'utf8');
  const provider = readFileSync(resolve(process.cwd(), 'api/_lib/gemini.ts'), 'utf8');

  it('does not ship Gemini SDK or provider secrets to the browser client', () => {
    expect(client).not.toContain('@google/generative-ai');
    expect(client).not.toContain('GEMINI_API_KEY');
    expect(client).not.toContain('VITE_GEMINI');
    expect(client).toContain('Authorization');
    expect(client).toContain('/api/hanna');
  });

  it('requires a bearer token and verifies persistent chat ownership', () => {
    expect(server).toContain("header?.startsWith('Bearer ')");
    expect(server).toContain('verifyIdToken');
    expect(gateway).toContain('loadAuthorizedHistory');
    expect(gateway).toContain("code === 'CHAT_FORBIDDEN'");
  });

  it('uses a server-selected allowlisted provider model and operation pricing', () => {
    expect(provider).toContain('ALLOWED_MODELS');
    expect(provider).toContain('getModelName');
    expect(provider).toContain('credits');
    expect(provider).toContain('process.env.GEMINI_API_KEY');
  });

  it('restricts server-side attachment retrieval to Cloudinary media hosts', () => {
    expect(gateway).toContain("['res.cloudinary.com', 'cloudinary.com']");
    expect(gateway).toContain('MAX_ATTACHMENT_BYTES');
  });
});
