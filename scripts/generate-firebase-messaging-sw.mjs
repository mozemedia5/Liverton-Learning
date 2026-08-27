import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../public/firebase-messaging-sw.js', import.meta.url);
const apiKey = process.env.VITE_FIREBASE_API_KEY || 'dummy-api-key-for-development';
const source = await readFile(path, 'utf8');
await writeFile(path, source.replace('REPLACE_WITH_VITE_FIREBASE_API_KEY', apiKey));
