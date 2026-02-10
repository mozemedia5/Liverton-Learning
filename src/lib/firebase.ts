import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBjDFyYVoHQ2MYP870VqxHpqpEmKy-kaeQ",
  authDomain: "liverton-learning-52b7c.firebaseapp.com",
  databaseURL: "https://liverton-learning-52b7c-default-rtdb.firebaseio.com",
  projectId: "liverton-learning-52b7c",
  storageBucket: "liverton-learning-52b7c.firebasestorage.app",
  messagingSenderId: "694304753308",
  appId: "1:694304753308:web:5ca134f5f85f428c0b0f59"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
