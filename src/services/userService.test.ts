import { vi, describe, it, expect } from 'vitest';

// Mock the firebase module before importing the service
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

// Also mock firebase/firestore just in case
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  where: vi.fn(),
  Timestamp: { now: vi.fn() }
}));

import { getStatusBadgeColor } from './userService';

describe('getStatusBadgeColor', () => {
  it('returns green classes for active status', () => {
    const result = getStatusBadgeColor('active');
    expect(result).toBe('bg-green-100 text-green-800 hover:bg-green-100');
  });

  it('returns red classes for suspended status', () => {
    const result = getStatusBadgeColor('suspended');
    expect(result).toBe('bg-red-100 text-red-800 hover:bg-red-100');
  });

  it('returns yellow classes for pending status', () => {
    const result = getStatusBadgeColor('pending');
    expect(result).toBe('bg-yellow-100 text-yellow-800 hover:bg-yellow-100');
  });

  it('returns default gray classes for unknown status', () => {
    const result = getStatusBadgeColor('unknown_status');
    expect(result).toBe('bg-gray-100 text-gray-800 hover:bg-gray-100');
  });

  it('returns default gray classes for case mismatch', () => {
    const result = getStatusBadgeColor('Active');
    expect(result).toBe('bg-gray-100 text-gray-800 hover:bg-gray-100');
  });
});
