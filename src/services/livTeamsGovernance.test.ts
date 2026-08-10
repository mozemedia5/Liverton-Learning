import { describe, it, expect, vi } from 'vitest';
import { requestToJoinTeam } from './livTeamsCoreService';
import { getDoc, setDoc, addDoc } from 'firebase/firestore';

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => new Date() }
}));

describe('Liv Teams Governance - requestToJoinTeam', () => {
  it('should throw an error if a join request is already pending', async () => {
    // Mock getDoc to return a document that exists and is pending
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'pending' })
    } as any);

    await expect(requestToJoinTeam('team-123', 'user-456', 'John Doe', 'john@test.com'))
      .rejects
      .toThrow('You have already submitted a join request that is currently pending approval.');
  });

  it('should create a join request if no pending request exists', async () => {
    // Mock getDoc to return a document that does not exist
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
      data: () => null
    } as any);

    vi.mocked(setDoc).mockResolvedValue(undefined as any);
    vi.mocked(addDoc).mockResolvedValue({ id: 'notification-abc' } as any);

    await requestToJoinTeam('team-123', 'user-456', 'John Doe', 'john@test.com');

    expect(setDoc).toHaveBeenCalled();
  });
});
