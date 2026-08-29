/* Firebase Cloud Messaging background handler. Firebase web config is public client configuration. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'dummy-api-key-for-development',
  authDomain: 'liverton-learn.firebaseapp.com',
  projectId: 'liverton-learn',
  storageBucket: 'liverton-learn.firebasestorage.app',
  messagingSenderId: '694304753308',
  appId: '1:694304753308:web:5ca134f5f85f428c0b0f59',
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  self.registration.showNotification(notification.title || 'Liverton Learning', {
    body: notification.body || 'You have a new notification.',
    icon: '/liverton-icon.png',
    badge: '/liverton-badge.png',
    tag: data.notificationId || 'liverton-notification',
    data: { redirectUrl: data.redirectUrl || '/announcements' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const redirectUrl = event.notification.data?.redirectUrl || '/announcements';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => 'focus' in client);
    if (existing) { existing.focus(); existing.navigate(redirectUrl); return; }
    return clients.openWindow(redirectUrl);
  }));
});
