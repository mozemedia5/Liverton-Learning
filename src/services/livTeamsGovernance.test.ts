import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, setDoc, addDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { requestToJoinTeam, respondToJoinRequest } from './livTeamsCoreService';

const team = {
  id: 'team-123',
  name: 'Open Science Team',
  visibility: 'public',
  maxMembers: 10,
  ownerId: 'owner-1',
  ownerName: 'Team Owner',
  adminIds: ['admin-1'],
  memberIds: ['owner-1', 'admin-1'],
  members: [
    { userId: 'owner-1', fullName: 'Team Owner', email: 'owner@test.com', role: 'owner', joinedAt: new Date() },
    { userId: 'admin-1', fullName: 'Team Admin', email: 'admin@test.com', role: 'admin', joinedAt: new Date() },
  ],
};

let requestSnapshot: { exists: () => boolean; data: () => Record<string, unknown> };

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  query: vi.fn((ref: unknown) => ref),
  where: vi.fn(),
  arrayUnion: vi.fn((value: unknown) => ({ arrayUnion: value })),
  arrayRemove: vi.fn((value: unknown) => ({ arrayRemove: value })),
  Timestamp: { now: () => new Date() },
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
}));

const teamSnapshot = () => ({ id: team.id, exists: () => true, data: () => team });

beforeEach(() => {
  requestSnapshot = { exists: () => false, data: () => ({}) };
  vi.clearAllMocks();
  vi.mocked(getDoc).mockImplementation(async (reference: unknown) => {
    const path = (reference as { path: string }).path;
    if (path === 'teams/team-123') return teamSnapshot() as any;
    return requestSnapshot as any;
  });
  vi.mocked(setDoc).mockResolvedValue(undefined as any);
  vi.mocked(updateDoc).mockResolvedValue(undefined as any);
  vi.mocked(addDoc).mockResolvedValue({ id: 'notification-abc' } as any);
});

describe('Liv Teams public join and approval governance', () => {
  it('creates a public join request and notifies the owner plus admins', async () => {
    await requestToJoinTeam('team-123', 'user-456', 'John Doe', 'john@test.com');

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'teams/team-123/join_requests/user-456' }),
      expect.objectContaining({ userId: 'user-456', status: 'pending' }),
    );
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'notifications' }),
      expect.objectContaining({
        targetUsers: ['owner-1', 'admin-1'],
        notificationType: 'team_join_request',
        teamId: 'team-123',
      }),
    );
  });

  it('rejects duplicate pending requests and non-public teams', async () => {
    requestSnapshot = { exists: () => true, data: () => ({ status: 'pending' }) };
    await expect(requestToJoinTeam('team-123', 'user-456', 'John Doe', 'john@test.com'))
      .rejects.toThrow('You have already submitted a join request that is currently pending approval.');

    const privateTeam = { ...team, visibility: 'private' };
    vi.mocked(getDoc).mockImplementationOnce(async () => ({ id: team.id, exists: () => true, data: () => privateTeam }) as any);
    await expect(requestToJoinTeam('team-123', 'user-999', 'Private User', 'private@test.com'))
      .rejects.toThrow('This team is not open for public join requests');
  });

  it('allows an admin to approve a pending request and adds the member', async () => {
    requestSnapshot = { exists: () => true, data: () => ({ status: 'pending' }) };

    await respondToJoinRequest(
      'team-123',
      'user-456',
      'John Doe',
      'john@test.com',
      true,
      'admin-1',
      'Team Admin',
    );

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'teams/team-123/join_requests/user-456' }),
      { status: 'accepted' },
    );
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'teams/team-123' }),
      expect.objectContaining({
        members: expect.objectContaining({ arrayUnion: expect.objectContaining({ userId: 'user-456' }) }),
        memberIds: expect.objectContaining({ arrayUnion: 'user-456' }),
      }),
    );
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'notifications' }),
      expect.objectContaining({
        targetUsers: ['user-456'],
        notificationType: 'team_join_approved',
        teamId: 'team-123',
      }),
    );
  });

  it('rejects approval attempts from non-admin members', async () => {
    requestSnapshot = { exists: () => true, data: () => ({ status: 'pending' }) };
    await expect(respondToJoinRequest(
      'team-123',
      'user-456',
      'John Doe',
      'john@test.com',
      true,
      'member-999',
      'Regular Member',
    )).rejects.toThrow('Only the team owner or an administrator can approve join requests');
  });
});

void arrayUnion;
void arrayRemove;
