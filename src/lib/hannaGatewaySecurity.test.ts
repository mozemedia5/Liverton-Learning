import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Hanna gateway security boundary', () => {
  const client = readFileSync(resolve(process.cwd(), 'src/lib/hannaGemini.ts'), 'utf8');
  const gateway = readFileSync(resolve(process.cwd(), 'api/hanna.ts'), 'utf8');

  it('keeps raw Gemini API credentials out of client bundle', () => {
    expect(client).not.toContain('GEMINI_API_KEY');
    expect(client).not.toContain('VITE_GEMINI_API_KEY');
  });

  it('enforces authentication checks on gateway', () => {
    expect(gateway).toContain('requireIdentity');
  });
});
