import { describe, expect, it } from 'vitest';
import { APPLICATION_KNOWLEDGE, getApplicationKnowledgeParts } from './appKnowledge';

describe('application knowledge context', () => {
  it('contains the verified product areas and role guidance', () => {
    expect(APPLICATION_KNOWLEDGE).toContain('Liverton Learning');
    expect(APPLICATION_KNOWLEDGE).toContain('Liv Teams');
    expect(APPLICATION_KNOWLEDGE).toContain('LivFund');
    expect(APPLICATION_KNOWLEDGE).toContain('LivMart');
    expect(APPLICATION_KNOWLEDGE).toContain('Hanna AI');
    expect(APPLICATION_KNOWLEDGE).toContain('Students and learners');
    expect(APPLICATION_KNOWLEDGE).toContain('Educators');
  });

  it('explicitly prevents fabricated or private contact disclosure', () => {
    expect(APPLICATION_KNOWLEDGE).toContain('must not invent contact details');
    expect(APPLICATION_KNOWLEDGE).toContain('Never disclose secrets');
    expect(APPLICATION_KNOWLEDGE).toContain('backend authorization is authoritative');
  });

  it('returns text context by default and reserves images for the visual-aware request', async () => {
    const parts = await getApplicationKnowledgeParts();
    expect(parts).toHaveLength(1);
    expect('text' in parts[0]).toBe(true);
  });
});
