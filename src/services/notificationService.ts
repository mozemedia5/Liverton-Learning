/**
 * Notification Service
 * Handles PWA notifications for announcements and other events
 */

export interface NotificationPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  return false;
}

/**
 * Check if notifications are supported and permitted
 */
export function areNotificationsEnabled(): boolean {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Show a notification to the user
 */
export function showNotification(payload: NotificationPayload): Notification | null {
  if (!areNotificationsEnabled()) {
    return null;
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.message,
      icon: payload.icon || '/liverton-icon.png',
      badge: payload.badge || '/liverton-badge.png',
      tag: payload.tag || 'announcement',
      data: payload.data || {},
      requireInteraction: true, // Keep notification visible until user interacts
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      
      // Navigate to announcements page if data contains redirect info
      if (payload.data?.redirectUrl) {
        window.location.href = payload.data.redirectUrl;
      }
      
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Show an announcement notification
 */
export function showAnnouncementNotification(
  title: string,
  message: string,
  announcementId?: string
): Notification | null {
  return showNotification({
    title,
    message,
    tag: `announcement-${announcementId || Date.now()}`,
    data: {
      type: 'announcement',
      announcementId,
      redirectUrl: '/announcements',
    },
  });
}

/**
 * Register for announcement notifications via Service Worker
 * This allows notifications even when the app is not in focus
 */
export async function registerAnnouncementNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers are not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe to push notifications if available
    if ('pushManager' in registration) {
      try {
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          // No subscription yet, but the service worker is ready
          console.log('Service Worker ready for announcements');
        }
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    }
  } catch (error) {
    console.error('Error registering announcement notifications:', error);
  }
}

/**
 * Listen for announcement changes and show notifications
 * This is called from the Announcements component
 */
export function setupAnnouncementListener(
  _onNewAnnouncement: (title: string, message: string, announcementId: string) => void
): void {
  // This will be called when new announcements are detected
  // The actual listening is done in the Announcements component via Firestore
}
