import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration with API keys
const firebaseConfig = {
  apiKey: "AIzaSyBjDFyYVoHQ2MYP870VqxHpqpEmKy-kaeQ",
  authDomain: "liverton-learning-52b7c.firebaseapp.com",
  databaseURL: "https://liverton-learning-52b7c-default-rtdb.firebaseio.com",
  projectId: "liverton-learning-52b7c",
  storageBucket: "liverton-learning-52b7c.firebasestorage.app",
  messagingSenderId: "694304753308",
  appId: "1:694304753308:web:5ca134f5f85f428c0b0f59"
};

// Initialize Firebase
console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
console.log('Firebase initialized successfully');

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support offline persistence.');
  } else {
    console.error('Error enabling persistence:', err);
  }
});

console.log('Firebase services ready:', {
  auth: !!auth,
  firestore: !!db,
  storage: !!storage
});

export default app;
