import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMock = vi.hoisted(() => ({
  getDocs: vi.fn(),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  where: vi.fn((field: string, operator: string, value: unknown) => ({ field, operator, value })),
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  limit: vi.fn((value: number) => ({ limit: value })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: () => new Date() },
  getDoc: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
  arrayUnion: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => firestoreMock);

import { searchUsers } from './chatService';

const legacyUser = {
  id: 'legacy-user',
  data: () => ({
    email: 'legacy@example.com',
    fullName: 'Legacy User',
    role: 'student',
    username: 'legacy.user',
    isDiscoverable: true,
  }),
};

const currentUser = {
  id: 'current-user',
  data: () => ({
    email: 'me@example.com',
    fullName: 'Current User',
    role: 'student',
    username: 'legacy.user',
    isDiscoverable: true,
  }),
};

function snapshotFor(...docs: typeof legacyUser[]) {
  return { docs };
}

beforeEach(() => {
  vi.clearAllMocks();
  firestoreMock.getDocs.mockImplementation(async (reference: { parts: unknown[] }) => {
    const filters = reference.parts.filter((part): part is { field: string; operator: string; value: unknown } => Boolean(part && typeof part === 'object' && 'field' in part));
    const exactUsername = filters.find((filter) => filter.field === 'username' && filter.operator === '==')?.value;
    const exactEmail = filters.find((filter) => filter.field === 'email' && filter.operator === '==')?.value;
    if (exactUsername === 'legacy.user' || exactEmail === 'legacy@example.com') return snapshotFor(legacyUser, currentUser);
    return snapshotFor();
  });
});

describe('searchUsers', () => {
  it('finds legacy records by normalized username and excludes the signed-in user', async () => {
    const results = await searchUsers('Legacy.User', 'current-user');

    expect(results).toEqual([
      expect.objectContaining({ uid: 'legacy-user', username: 'legacy.user', email: 'legacy@example.com' }),
    ]);
  });

  it('finds legacy records by case-insensitive email', async () => {
    const results = await searchUsers('LEGACY@EXAMPLE.COM', 'current-user');

    expect(results).toEqual([
      expect.objectContaining({ uid: 'legacy-user', email: 'legacy@example.com' }),
    ]);
  });
});
