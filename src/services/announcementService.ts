import { 
  collection, 
  addDoc, 
  query, 
  getDocs, 
  orderBy, 
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot
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
  link?: string; // Optional internal link (course or lesson page)
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
  };
};

export const createAnnouncement = async (announcement: Omit<Announcement, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'announcements'), {
      ...announcement,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

export const getAnnouncements = async (role?: string) => {
  try {
    let q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    
    // If a role is provided, we might want to filter announcements that include this role in targetAudience
    // However, Firestore 'array-contains' is limited. For now, we'll fetch all and filter in memory 
    // or just show all if the user is an admin.
    
    const snapshot = await getDocs(q);
    const announcements = snapshot.docs.map(convertDocToAnnouncement);
    
    if (role && role !== 'platform_admin') {
      return announcements.filter(a => 
        a.targetAudience.includes('all') || 
        a.targetAudience.includes(role + 's') || // e.g., 'students'
        a.senderRole === role // User can see their own announcements
      );
    }
    
    return announcements;
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
};
