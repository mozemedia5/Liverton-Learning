/**
 * Notification Service
 * Handles PWA notifications for announcements and other events
 */

import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, serverTimestamp, where, type Unsubscribe } from 'firebase/firestore';

export interface NotificationPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface VisibleNotificationRecord { id: string; [key: string]: any }

const notificationAudience = (role?: string | null) => role === 'student' ? 'students' : role === 'teacher' ? 'teachers' : role === 'parent' ? 'parents' : role === 'school_admin' ? 'school_admins' : null;

export function subscribeToVisibleNotifications(userId: string, email: string | null | undefined, role: string | null | undefined, callback: (records: VisibleNotificationRecord[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const notifications = collection(db, 'notifications');
  if (role === 'platform_admin') {
    return onSnapshot(notifications, snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))), error => onError?.(error as Error));
  }
  const queries = [query(notifications, where('targetUsers', 'array-contains', userId)), query(notifications, where('targetAudience', 'array-contains', 'all')), query(notifications, where('senderId', '==', userId))];
  const audience = notificationAudience(role);
  if (audience) queries.push(query(notifications, where('targetAudience', 'array-contains', audience)));
  if (email) queries.push(query(notifications, where('targetEmail', '==', email.toLowerCase())));
  const byId = new Map<string, VisibleNotificationRecord>();
  const emit = () => callback([...byId.values()].sort((a, b) => ((b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))));
  const stops = queries.map((notificationQuery) => onSnapshot(notificationQuery, snapshot => { snapshot.docs.forEach(item => byId.set(item.id, { id: item.id, ...item.data() })); emit(); }, error => onError?.(error as Error)));
  return () => stops.forEach(stop => stop());
}

export interface EnrollmentNotificationParams {
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  teacherId: string;
  teacherName: string;
}

export interface ProviderStatus {
  emailSent: boolean;
  whatsAppSent: boolean;
  pwaSent: boolean;
  firestoreRecorded: boolean;
  emailDetails?: string;
  whatsAppDetails?: string;
}

/**
 * WhatsApp Provider Abstraction
 * Sends WhatsApp notification via configured WhatsApp Business API or reports missing configuration.
 */
export async function sendWhatsAppNotification(
  recipientPhone: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  const apiKey = import.meta.env.VITE_WHATSAPP_API_KEY || import.meta.env.WHATSAPP_API_KEY;
  const phoneId = import.meta.env.VITE_WHATSAPP_PHONE_ID || import.meta.env.WHATSAPP_PHONE_ID;

  if (!apiKey || !phoneId) {
    return {
      success: false,
      message: 'WhatsApp provider unconfigured (requires VITE_WHATSAPP_API_KEY and VITE_WHATSAPP_PHONE_ID).'
    };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: message }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData?.error?.message || `WhatsApp API error ${res.status}` };
    }

    return { success: true, message: 'WhatsApp message sent successfully.' };
  } catch (err: any) {
    return { success: false, message: `WhatsApp network error: ${err.message}` };
  }
}

/**
 * Email Provider Abstraction
 * Sends Email notification via Resend / Email Provider or reports status.
 */
export async function sendEmailNotification(
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; message: string }> {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY || import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'Email provider unconfigured (requires VITE_RESEND_API_KEY environment variable).'
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Liverton Learning <notifications@livertonlearning.com>',
        to: [toEmail],
        subject,
        html: htmlContent
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData?.message || `Resend API error ${res.status}` };
    }

    return { success: true, message: 'Email sent successfully.' };
  } catch (err: any) {
    return { success: false, message: `Email network error: ${err.message}` };
  }
}

/**
 * Dispatch Enrollment Notifications across all configured channels
 */
export async function dispatchEnrollmentNotification(
  params: EnrollmentNotificationParams
): Promise<ProviderStatus> {
  const {
    courseId,
    courseTitle,
    studentId,
    studentName,
    studentEmail,
    studentPhone,
    teacherName
  } = params;

  const title = `Enrolled in ${courseTitle}`;
  const message = `Welcome ${studentName}! You have successfully enrolled in "${courseTitle}" taught by ${teacherName}.`;
  const redirectUrl = `/student/courses`;

  const status: ProviderStatus = {
    emailSent: false,
    whatsAppSent: false,
    pwaSent: false,
    firestoreRecorded: false
  };

  // 1. Record Notification in Firestore `notifications` collection
  try {
    if (db) {
      await addDoc(collection(db, 'notifications'), {
        type: 'course',
        title,
        message,
        targetAudience: [],
        targetUsers: [studentId],
        senderId: params.teacherId,
        senderName: teacherName,
        recipientId: studentId,
        redirectUrl,
        referenceId: courseId,
        isRead: false,
        isHidden: false,
        createdAt: serverTimestamp()
      });
      status.firestoreRecorded = true;
    }
  } catch (err) {
    console.warn('Error recording enrollment notification in Firestore:', err);
  }

  // 2. Dispatch PWA Browser Notification
  const pwaNotif = showNotification({
    title,
    message,
    tag: `enrollment-${courseId}-${studentId}`,
    data: { redirectUrl, courseId }
  });
  status.pwaSent = !!pwaNotif;

  // 3. Dispatch Email Notification via Provider Abstraction
  if (studentEmail) {
    const emailRes = await sendEmailNotification(
      studentEmail,
      `Enrollment Confirmation: ${courseTitle}`,
      `<h2>Welcome to ${courseTitle}!</h2><p>Hi ${studentName},</p><p>You are now enrolled in <strong>${courseTitle}</strong> instructed by ${teacherName}.</p><p><a href="https://liverton-learning.vercel.app/student/courses">Click here to start learning</a></p>`
    );
    status.emailSent = emailRes.success;
    status.emailDetails = emailRes.message;
  } else {
    status.emailDetails = 'No student email provided.';
  }

  // 4. Dispatch WhatsApp Notification via Provider Abstraction
  if (studentPhone) {
    const waRes = await sendWhatsAppNotification(
      studentPhone,
      `*Liverton Learning*: Hello ${studentName}, you are enrolled in "${courseTitle}" by ${teacherName}. Access your lessons at https://liverton-learning.vercel.app/student/courses`
    );
    status.whatsAppSent = waRes.success;
    status.whatsAppDetails = waRes.message;
  } else {
    status.whatsAppDetails = 'No student phone number provided.';
  }

  return status;
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
