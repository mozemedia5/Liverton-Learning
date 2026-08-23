import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, json, requireIdentity, safeString } from './_lib/server.js';

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

function normalizeUsername(value: unknown): string {
  return normalize(value).replace(/^@+/, '');
}

function toSearchableUser(id: string, data: Record<string, unknown>) {
  const email = safeString(data.email, 320);
  const fullName = safeString(data.fullName || data.displayName, 160) || 'Liverton member';
  const username = normalizeUsername(data.username);
  return {
    uid: id,
    email,
    emailLower: normalize(email),
    fullName,
    fullNameLower: normalize(fullName),
    role: typeof data.role === 'string' ? data.role : 'student',
    ...(username ? { username, usernameLower: username } : {}),
    ...(typeof data.profilePicture === 'string' ? { profilePicture: data.profilePicture } : {}),
    ...(typeof data.profileImageUrl === 'string' ? { profilePicture: data.profileImageUrl } : {}),
    isDiscoverable: data.isDiscoverable !== false,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const term = normalize(req.query.q);
    if (term.length < 2) return json(res, 200, { users: [] });

    const snapshot = await getAdminFirestore().collection('users').limit(5000).get();
    const usernameTerm = normalizeUsername(term);
    const results = snapshot.docs
      .map((userDoc) => toSearchableUser(userDoc.id, userDoc.data() as Record<string, unknown>))
      .filter((user) => user.uid !== identity.uid && user.isDiscoverable)
      .filter((user) => (
        user.usernameLower?.startsWith(usernameTerm) ||
        user.emailLower.startsWith(term) ||
        user.fullNameLower.startsWith(term)
      ))
      .sort((a, b) => {
        const exact = (user: typeof a) => Number(
          user.usernameLower === usernameTerm || user.emailLower === term || user.fullNameLower === term,
        );
        return exact(b) - exact(a) || a.fullName.localeCompare(b.fullName);
      })
      .slice(0, 50);

    return json(res, 200, { users: results });
  } catch (error) {
    console.error('User search API error:', error);
    const statusCode = error && typeof error === 'object' && 'statusCode' in error
      ? Number((error as { statusCode?: unknown }).statusCode) || 500
      : 500;
    return json(res, statusCode, { error: statusCode === 401 ? 'Authentication required.' : 'User search is temporarily unavailable.' });
  }
}
