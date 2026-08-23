import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserRole } from '@/types';

export interface UserDirectoryInput {
  uid: string;
  email?: string;
  fullName?: string;
  role?: UserRole | string;
  username?: string;
  profilePicture?: string;
  profileImageUrl?: string;
  providerIds?: string[];
}

export interface UserDirectoryEntry {
  uid: string;
  email: string;
  emailLower: string;
  fullName: string;
  role: UserRole;
  username?: string;
  usernameLower?: string;
  profilePicture?: string;
  providerIds?: string[];
  isDiscoverable: boolean;
}

export const normalizeEmail = (email: string | undefined | null): string =>
  (email || '').trim().toLowerCase();

export const normalizeUsername = (username: string | undefined | null): string =>
  (username || '').trim().replace(/^@+/, '').toLowerCase();

export const validateUsername = (username: string): string | null => {
  const normalized = normalizeUsername(username);
  if (!normalized) return 'Choose a username to make your account discoverable.';
  if (normalized.length < 3 || normalized.length > 30) {
    return 'Username must be between 3 and 30 characters.';
  }
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(normalized)) {
    return 'Use letters, numbers, dots, underscores, or hyphens only.';
  }
  return null;
};

const cleanDirectoryFields = (input: UserDirectoryInput): UserDirectoryEntry => {
  const username = normalizeUsername(input.username);
  const email = (input.email || '').trim();
  const directory: UserDirectoryEntry = {
    uid: input.uid,
    email,
    emailLower: normalizeEmail(email),
    fullName: (input.fullName || '').trim() || 'Liverton member',
    role: (input.role || 'student') as UserRole,
    isDiscoverable: true,
  };

  if (username) {
    directory.username = username;
    directory.usernameLower = username;
  }
  const profilePicture = input.profilePicture || input.profileImageUrl;
  if (profilePicture) directory.profilePicture = profilePicture;
  if (input.providerIds?.length) directory.providerIds = input.providerIds.slice(0, 10);
  return directory;
};

/**
 * Writes a minimal directory record. It intentionally excludes phone, address,
 * bio, school details, and other private profile fields from chat discovery.
 */
export async function syncUserDirectory(input: UserDirectoryInput): Promise<void> {
  await setDoc(doc(db, 'userDirectory', input.uid), cleanDirectoryFields(input), { merge: true });
}

export async function claimUsername(username: string, uid: string): Promise<string> {
  const normalized = normalizeUsername(username);
  const usernameError = validateUsername(normalized);
  if (usernameError) throw new Error(usernameError);

  const usernameRef = doc(db, 'usernames', normalized);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(usernameRef);
    if (existing.exists() && existing.data().uid !== uid) {
      throw new Error('That username is already taken. Please choose another one.');
    }
    transaction.set(usernameRef, {
      uid,
      username: normalized,
      updatedAt: new Date(),
    }, { merge: true });
  });
  return normalized;
}

export async function releaseUsername(username: string, uid: string): Promise<void> {
  const normalized = normalizeUsername(username);
  if (!normalized) return;
  const usernameRef = doc(db, 'usernames', normalized);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(usernameRef);
    if (existing.exists() && existing.data().uid === uid) transaction.delete(usernameRef);
  });
}

export async function isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  const usernameError = validateUsername(normalized);
  if (usernameError) return false;

  const snapshot = await getDocs(query(
    collection(db, 'userDirectory'),
    where('usernameLower', '==', normalized),
  ));

  return snapshot.docs.every((directoryDoc) => directoryDoc.id === currentUserId);
}

export function mapDirectoryEntry(directoryDoc: { id: string; data: () => DocumentData }): UserDirectoryEntry {
  const data = directoryDoc.data();
  return {
    uid: directoryDoc.id,
    email: data.email || '',
    emailLower: data.emailLower || normalizeEmail(data.email),
    fullName: data.fullName || 'Liverton member',
    role: data.role || 'student',
    username: data.username || undefined,
    usernameLower: data.usernameLower || undefined,
    profilePicture: data.profilePicture || undefined,
    providerIds: Array.isArray(data.providerIds) ? data.providerIds.filter((value: unknown): value is string => typeof value === 'string').slice(0, 10) : undefined,
    isDiscoverable: data.isDiscoverable !== false,
  };
}
