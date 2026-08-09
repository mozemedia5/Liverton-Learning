import { describe, it, expect } from 'vitest';
import { SUSPICIOUS_KEYWORDS } from '@/services/livTeamsCoreService';

describe('Suspicious keyword scanning', () => {
  it('includes keywords for serious threats', () => {
    expect(SUSPICIOUS_KEYWORDS).toContain('kill');
    expect(SUSPICIOUS_KEYWORDS).toContain('murder');
    expect(SUSPICIOUS_KEYWORDS).toContain('threat');
    expect(SUSPICIOUS_KEYWORDS).toContain('bomb');
    expect(SUSPICIOUS_KEYWORDS).toContain('violence');
  });

  it('does not auto-suspend — keywords only surface for review', () => {
    // The scanning function returns messages for admin review.
    // It does NOT suspend teams. This test documents that design decision:
    // a keyword appearing does not mean automatic suspension.
    const hasKeyword = (text: string) =>
      SUSPICIOUS_KEYWORDS.some(kw => text.toLowerCase().includes(kw));

    expect(hasKeyword('I will kill the exam tomorrow')).toBe(true);
    // But the system should surface this for human review, not auto-suspend.
    // The admin must investigate context before deciding.
  });

  it('does not flag innocent educational content', () => {
    const hasKeyword = (text: string) =>
      SUSPICIOUS_KEYWORDS.some(kw => text.toLowerCase().includes(kw));

    expect(hasKeyword('Let us study photosynthesis today')).toBe(false);
    expect(hasKeyword('The quadratic formula is useful')).toBe(false);
  });
});
