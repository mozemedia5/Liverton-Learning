import { describe, expect, it } from 'vitest';
import { filterHannaSessions } from './hannaArchive';

describe('Hanna conversation archive filtering', () => {
  const sessions = [
    { id: 'active-old', title: 'Algebra revision', updatedAt: new Date('2026-08-20'), archived: false },
    { id: 'active-pinned', title: 'Physics revision', updatedAt: new Date('2026-08-21'), archived: false, pinnedBy: ['learner-1'] },
    { id: 'archived-new', title: 'Archived physics notes', updatedAt: new Date('2026-08-24'), archived: true },
    { id: 'archived-old', title: 'Old algebra notes', updatedAt: new Date('2026-08-19'), archived: true },
  ];

  it('shows only active conversations and prioritizes the learner’s pinned chat', () => {
    expect(filterHannaSessions(sessions, false, '', 'learner-1').map(session => session.id)).toEqual(['active-pinned', 'active-old']);
  });

  it('shows only archived conversations ordered by most recently updated', () => {
    expect(filterHannaSessions(sessions, true).map(session => session.id)).toEqual(['archived-new', 'archived-old']);
  });

  it('searches archived conversations by title without matching active chats', () => {
    expect(filterHannaSessions(sessions, true, 'ALGEBRA').map(session => session.id)).toEqual(['archived-old']);
  });
});
