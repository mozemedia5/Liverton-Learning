import { describe, expect, it } from 'vitest';
import {
  deriveTreasuryBalance,
  getOverdueTeamTasks,
  isValidProjectTransition,
} from './livTeamsGovernanceService';

describe('Liv Teams governance helpers', () => {
  it('allows only valid project lifecycle transitions', () => {
    expect(isValidProjectTransition('Idea', 'Planning')).toBe(true);
    expect(isValidProjectTransition('Planning', 'Active')).toBe(true);
    expect(isValidProjectTransition('Active', 'Testing')).toBe(true);
    expect(isValidProjectTransition('Testing', 'Review')).toBe(true);
    expect(isValidProjectTransition('Review', 'Near Completion')).toBe(true);
    expect(isValidProjectTransition('Near Completion', 'Completed')).toBe(true);
    expect(isValidProjectTransition('Completed', 'Listed')).toBe(true);
    expect(isValidProjectTransition('Idea', 'Verified')).toBe(false);
    expect(isValidProjectTransition('Completed', 'Submitted for Verification')).toBe(false);
    expect(isValidProjectTransition('Active', 'Near Completion')).toBe(false);
  });

  it('derives treasury balance only from settled entries', () => {
    expect(deriveTreasuryBalance([
      { type: 'credit', amount: 100, status: 'completed' },
      { type: 'debit', amount: 25, status: 'approved' },
      { type: 'debit', amount: 500, status: 'pending' },
    ] as any)).toBe(75);
  });

  it('counts incomplete tasks whose deadlines have passed', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    expect(getOverdueTeamTasks([
      { deadline: '2026-08-19', isCompleted: false },
      { deadline: '2026-08-19', isCompleted: true },
      { deadline: '2026-08-21', isCompleted: false },
    ], now)).toBe(1);
  });
});
