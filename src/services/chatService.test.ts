import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({ currentUser: null as { getIdToken: () => Promise<string> } | null }));

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

vi.mock('@/lib/firebase', () => ({ db: {}, auth: authMock }));
vi.mock('firebase/firestore', () => firestoreMock);

import { searchUsers, UserDirectorySearchError } from './chatService';

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
  authMock.currentUser = null;
  firestoreMock.getDocs.mockImplementation(async (reference: { parts: unknown[] }) => {
    const filters = reference.parts.filter((part): part is { field: string; operator: string; value: unknown } => Boolean(part && typeof part === 'object' && 'field' in part));
    const exactUsername = filters.find((filter) => filter.field === 'username' && filter.operator === '==')?.value;
    const exactEmail = filters.find((filter) => filter.field === 'email' && filter.operator === '==')?.value;
    const fullNameLower = filters.find((filter) => filter.field === 'fullNameLower' && filter.operator === '>=')?.value;
    if (exactUsername === 'legacy.user' || exactEmail === 'legacy@example.com' || fullNameLower === 'legacy user') return snapshotFor(legacyUser, currentUser);
    return snapshotFor();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  authMock.currentUser = null;
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

  it('finds real records by normalized display name', async () => {
    const results = await searchUsers('Legacy User', 'current-user');

    expect(results).toEqual([
      expect.objectContaining({ uid: 'legacy-user', fullName: 'Legacy User' }),
    ]);
  });

  it('falls back to the authenticated API when the directory has no matching records', async () => {
    firestoreMock.getDocs.mockResolvedValue(snapshotFor());
    authMock.currentUser = { getIdToken: vi.fn().mockResolvedValue('test-token') };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ users: [{ uid: 'legacy-user', fullName: 'Legacy User', email: 'legacy@example.com', role: 'student' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const results = await searchUsers('Legacy User', 'current-user');

    expect(results).toEqual([expect.objectContaining({ uid: 'legacy-user', fullName: 'Legacy User' })]);
    expect(fetch).toHaveBeenCalledWith('/api/search-users?q=Legacy%20User', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  });

  it('reports a coded error when every directory query fails', async () => {
    firestoreMock.getDocs.mockRejectedValue(Object.assign(new Error('Directory unavailable'), { code: 'unavailable' }));

    await expect(searchUsers('Legacy User', 'current-user')).rejects.toMatchObject({
      name: 'UserDirectorySearchError',
      code: 'unavailable',
    });
    await expect(searchUsers('Legacy User', 'current-user')).rejects.toBeInstanceOf(UserDirectorySearchError);
  });

  it('keeps real legacy results when an optional normalized lookup fails', async () => {
    firestoreMock.getDocs.mockImplementation(async (reference: { parts: unknown[] }) => {
      const filters = reference.parts.filter((part): part is { field: string; operator: string; value: unknown } => Boolean(part && typeof part === 'object' && 'field' in part));
      if (filters.some((filter) => filter.field === 'usernameLower' || filter.field === 'emailLower')) {
        throw Object.assign(new Error('Missing optional index'), { code: 'failed-precondition' });
      }
      const exactUsername = filters.find((filter) => filter.field === 'username' && filter.operator === '==')?.value;
      const exactEmail = filters.find((filter) => filter.field === 'email' && filter.operator === '==')?.value;
      if (exactUsername === 'legacy.user' || exactEmail === 'legacy@example.com') return snapshotFor(legacyUser, currentUser);
      return snapshotFor();
    });

    const results = await searchUsers('Legacy.User', 'current-user');

    expect(results).toEqual([
      expect.objectContaining({ uid: 'legacy-user', username: 'legacy.user', email: 'legacy@example.com' }),
    ]);
  });
});
