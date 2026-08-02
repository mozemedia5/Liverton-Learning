import { 
  collection, 
  addDoc, 
  query, 
  getDocs, 
  orderBy, 
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Notification {
  id?: string;
  type: 'announcement' | 'quiz' | 'course' | 'reminder' | 'motivation';
  title: string;
  body: string;
  link?: string;
  isRead?: boolean;
  targetAudience: string[]; // students, teachers, parents, school_admins, platform_admin
  sender: string;
  senderId: string;
  senderRole: string;
  createdAt: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  isHidden?: boolean;
  hiddenBy?: string;
  hiddenAt?: Timestamp | Date;
  hideReason?: string;
}

// Map backward compatibility for raw mapping
export interface Announcement {
  id?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  redirectUrl?: string;
  openInNewTab?: boolean;
  sender: string;
  senderId: string;
  senderRole: string;
  targetAudience: string[];
  createdAt: Timestamp | Date;
  isHidden?: boolean;
  hiddenBy?: string;
  hiddenAt?: Timestamp | Date;
  hideReason?: string;
  expiresAt?: Timestamp | Date;
}

const convertDocToNotification = (doc: QueryDocumentSnapshot<DocumentData>): Notification => {
  const data = doc.data();
  return {
    id: doc.id,
    type: data.type || 'announcement',
    title: data.title || '',
    body: data.body || data.message || '',
    link: data.link || data.redirectUrl || '',
    isRead: data.isRead ?? false,
    sender: data.sender || 'Unknown',
    senderId: data.senderId || '',
    senderRole: data.senderRole || '',
    targetAudience: data.targetAudience || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    isHidden: data.isHidden || false,
    hiddenBy: data.hiddenBy || undefined,
    hiddenAt: data.hiddenAt?.toDate() || undefined,
    hideReason: data.hideReason || undefined,
    expiresAt: data.expiresAt?.toDate() || undefined,
  };
};

/**
 * Create a new notification (replaces textAnnouncement)
 */
export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'expiresAt'>) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default to 7 days expiry

    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notification,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      isHidden: false,
      isRead: false,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get notifications with filtering matching userRole & targetAudience
 */
export const getNotifications = async (role?: string, userId?: string) => {
  try {
    let q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(convertDocToNotification);
    const now = new Date();

    if (role === 'platform_admin') {
      return notifications;
    }

    return notifications.filter(n => {
      if (userId && n.senderId === userId) {
        return true;
      }
      const isNotHidden = !n.isHidden;
      const isNotExpired = !n.expiresAt || n.expiresAt > now;
      const isTargetAudience = n.targetAudience.includes('all') ||
                               (role && n.targetAudience.includes(role + 's'));
      return isNotHidden && isNotExpired && isTargetAudience;
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Soft delete/hide a notification
 */
export const hideNotification = async (notificationId: string, adminId: string, reason?: string) => {
  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, {
      isHidden: true,
      hiddenBy: adminId,
      hiddenAt: Timestamp.now(),
      hideReason: reason || 'Moderated',
    });
  } catch (error) {
    console.error('Error hiding notification:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string) => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};
