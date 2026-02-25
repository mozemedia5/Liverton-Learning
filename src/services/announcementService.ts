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

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  sender: string;
  senderId: string;
  senderRole: string;
  targetAudience: string[];
  category: string;
  createdAt: Timestamp | Date;
  priority: 'low' | 'normal' | 'high';
  link?: string;
  // Moderation fields
  isHidden?: boolean;
  hiddenBy?: string;
  hiddenAt?: Timestamp | Date;
  hideReason?: string;
  expiresAt?: Timestamp | Date;
}

const convertDocToAnnouncement = (doc: QueryDocumentSnapshot<DocumentData>): Announcement => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    message: data.message || '',
    sender: data.sender || 'Unknown',
    senderId: data.senderId || '',
    senderRole: data.senderRole || '',
    targetAudience: data.targetAudience || [],
    category: data.category || 'General',
    createdAt: data.createdAt?.toDate() || new Date(),
    priority: data.priority || 'normal',
    link: data.link || undefined,
    isHidden: data.isHidden || false,
    hiddenBy: data.hiddenBy || undefined,
    hiddenAt: data.hiddenAt?.toDate() || undefined,
    hideReason: data.hideReason || undefined,
    expiresAt: data.expiresAt?.toDate() || undefined,
  };
};

/**
 * Create a new announcement
 * Automatically sets expiry to 2 days from creation
 */
export const createAnnouncement = async (announcement: Omit<Announcement, 'id' | 'createdAt' | 'expiresAt'>) => {
  try {
    // Set expiry to 2 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    const docRef = await addDoc(collection(db, 'announcements'), {
      ...announcement,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      isHidden: false,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

/**
 * Get announcements with filtering
 * - Regular users: only see non-expired, non-hidden announcements
 * - Creators: can see their own announcements even if expired
 * - Admins: can see all announcements including hidden and expired
 */
export const getAnnouncements = async (role?: string, userId?: string) => {
  try {
    let q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    const announcements = snapshot.docs.map(convertDocToAnnouncement);
    
    const now = new Date();
    
    // Filter based on role and ownership
    if (role === 'platform_admin') {
      // Admin sees all announcements (including hidden and expired)
      return announcements;
    }
    
    // For non-admin users
    return announcements.filter(a => {
      // User can see their own announcements (even if expired)
      if (userId && a.senderId === userId) {
        return true;
      }
      
      // User can see announcements targeted to their role that are:
      // 1. Not hidden
      // 2. Not expired
      const isNotHidden = !a.isHidden;
      const isNotExpired = !a.expiresAt || a.expiresAt > now;
      const isTargetAudience = a.targetAudience.includes('all') || 
                               (role && a.targetAudience.includes(role + 's'));
      
      return isNotHidden && isNotExpired && isTargetAudience;
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
};

/**
 * Hide an announcement (soft delete)
 * Content is kept in Firebase but hidden from regular users
 */
export const hideAnnouncement = async (
  announcementId: string, 
  adminId: string, 
  reason?: string
) => {
  try {
    const announcementRef = doc(db, 'announcements', announcementId);
    await updateDoc(announcementRef, {
      isHidden: true,
      hiddenBy: adminId,
      hiddenAt: Timestamp.now(),
      hideReason: reason || 'Moderated by admin',
    });
  } catch (error) {
    console.error('Error hiding announcement:', error);
    throw error;
  }
};

/**
 * Unhide an announcement (restore visibility)
 */
export const unhideAnnouncement = async (announcementId: string) => {
  try {
    const announcementRef = doc(db, 'announcements', announcementId);
    await updateDoc(announcementRef, {
      isHidden: false,
      hiddenBy: null,
      hiddenAt: null,
      hideReason: null,
    });
  } catch (error) {
    console.error('Error unhiding announcement:', error);
    throw error;
  }
};

/**
 * Permanently delete an announcement
 * Use with caution - prefer hideAnnouncement for moderation
 */
export const deleteAnnouncement = async (announcementId: string) => {
  try {
    await deleteDoc(doc(db, 'announcements', announcementId));
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

/**
 * Check if an announcement is expired
 */
export const isAnnouncementExpired = (announcement: Announcement): boolean => {
  if (!announcement.expiresAt) return false;
  const expiry = announcement.expiresAt instanceof Date 
    ? announcement.expiresAt 
    : announcement.expiresAt.toDate();
  return expiry < new Date();
};

/**
 * Get announcement display name
 * - For platform admin announcements: show "Liverton" instead of "Liverton Admin"
 * - For regular users: show their name
 */
export const getAnnouncementDisplayName = (announcement: Announcement): string => {
  if (announcement.senderRole === 'platform_admin') {
    return 'Liverton';
  }
  return announcement.sender;
};

/**
 * Get all announcements for moderation (admin only)
 */
export const getAllAnnouncementsForModeration = async () => {
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(convertDocToAnnouncement);
  } catch (error) {
    console.error('Error fetching announcements for moderation:', error);
    throw error;
  }
};

/**
 * Update announcement expiry date
 */
export const updateAnnouncementExpiry = async (
  announcementId: string, 
  daysFromNow: number
) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysFromNow);
    
    const announcementRef = doc(db, 'announcements', announcementId);
    await updateDoc(announcementRef, {
      expiresAt: Timestamp.fromDate(expiresAt),
    });
  } catch (error) {
    console.error('Error updating announcement expiry:', error);
    throw error;
  }
};
