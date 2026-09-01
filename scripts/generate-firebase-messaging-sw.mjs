import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../public/firebase-messaging-sw.js', import.meta.url);
const apiKey = process.env.VITE_FIREBASE_API_KEY || 'dummy-api-key-for-development';
const source = await readFile(path, 'utf8');
const updated = source.replace(/apiKey:\s*['"][^'"]*['"]/, `apiKey: '${apiKey}'`);
await writeFile(path, updated);
