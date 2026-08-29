import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const dryRun = process.argv.includes('--dry-run');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY before running this script.');
}
if (!dryRun && process.env.BACKFILL_CONFIRM !== '1') {
  throw new Error('This writes production data. Re-run with BACKFILL_CONFIRM=1, or use --dry-run first.');
}

const app = getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);
const users = await db.collection('users').get();
const stats = { scanned: users.size, written: 0, skipped: 0, failed: 0 };
const failures = [];
let batch = db.batch();
let pending = 0;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().replace(/^@+/, '').toLowerCase() : '';
}
function normalizeDisplayName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';
}
function directoryRecord(uid, data) {
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const fullName = typeof data.fullName === 'string' && data.fullName.trim() ? data.fullName.trim() : 'Liverton member';
  const username = normalizeUsername(data.username);
  return {
    uid,
    email,
    emailLower: normalizeEmail(email),
    fullName,
    fullNameLower: normalizeDisplayName(fullName),
    role: typeof data.role === 'string' ? data.role : 'student',
    isDiscoverable: data.isDiscoverable !== false,
    ...(username ? { username, usernameLower: username } : {}),
    ...((data.profilePicture || data.profileImageUrl) ? { profilePicture: data.profilePicture || data.profileImageUrl } : {}),
    ...(Array.isArray(data.providerIds) && data.providerIds.length ? { providerIds: data.providerIds.filter((value) => typeof value === 'string').slice(0, 10) } : {}),
  };
}

async function flush() {
  if (!pending) return;
  if (!dryRun) await batch.commit();
  stats.written += pending;
  batch = db.batch();
  pending = 0;
}

for (const userDoc of users.docs) {
  try {
    const data = userDoc.data();
    if (!data || data.deletedAt) {
      stats.skipped += 1;
      continue;
    }
    const record = directoryRecord(userDoc.id, data);
    if (!record.email && record.fullName === 'Liverton member') {
      stats.skipped += 1;
      continue;
    }
    if (!dryRun) batch.set(db.collection('userDirectory').doc(userDoc.id), record, { merge: true });
    pending += 1;
    if (pending >= 400) await flush();
  } catch (error) {
    stats.failed += 1;
    failures.push({ uid: userDoc.id, error: error instanceof Error ? error.message : String(error) });
  }
}
await flush();
console.log(JSON.stringify({ dryRun, ...stats, failures }, null, 2));
if (stats.failed) process.exitCode = 1;
