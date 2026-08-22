import { describe, expect, it } from 'vitest';
import { getAccountSetupStatus } from './accountSetupService';
import { normalizeUsername, validateUsername } from './userProfileService';

const baseProfile = {
  uid: 'user-1',
  email: 'learner@example.com',
  fullName: 'Learner Example',
  role: 'student' as const,
  sex: 'other' as const,
  age: 18,
  country: 'Uganda',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('account setup progress', () => {
  it('calculates four equal setup steps and lists missing items', () => {
    const status = getAccountSetupStatus({
      ...baseProfile,
      username: 'learner.one',
      profileImageUrl: 'https://example.com/avatar.png',
    }, { emailVerified: true });

    expect(status.percentage).toBe(75);
    expect(status.completedCount).toBe(3);
    expect(status.totalCount).toBe(4);
    expect(status.missingSteps.map((step) => step.key)).toEqual(['bio']);
  });

  it('reports a complete account only when all required steps are complete', () => {
    const status = getAccountSetupStatus({
      ...baseProfile,
      username: 'learner.one',
      profileImageUrl: 'https://example.com/avatar.png',
      bio: 'I enjoy learning science.',
    }, { emailVerified: true });

    expect(status.percentage).toBe(100);
    expect(status.missingSteps).toHaveLength(0);
  });
});

describe('username rules', () => {
  it('normalizes handles and accepts safe values', () => {
    expect(normalizeUsername('  @Learner.One  ')).toBe('learner.one');
    expect(validateUsername('learner.one')).toBeNull();
  });

  it('rejects ambiguous or unsafe handles', () => {
    expect(validateUsername('ab')).toContain('between 3 and 30');
    expect(validateUsername('learner name')).toContain('letters, numbers');
    expect(validateUsername('learner/one')).toContain('letters, numbers');
  });
});
