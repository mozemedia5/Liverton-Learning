import { getToken } from 'firebase/messaging';
import { getMessaging } from 'firebase/messaging';
import app, { auth } from '@/lib/firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();

export async function registerPushToken(role?: string | null): Promise<boolean> {
  if (!vapidKey || !('Notification' in window) || !('serviceWorker' in navigator) || Notification.permission !== 'granted' || !auth.currentUser) return false;
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return false;
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, role: role || undefined }),
    });
    return response.ok;
  } catch (error) {
    console.warn('Push notification registration unavailable:', error);
    return false;
  }
}
