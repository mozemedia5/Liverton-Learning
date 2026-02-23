import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  orderBy, 
  Timestamp,
  limit,
  getDoc,
  or,
  and
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Chat, Message, UserRole } from '@/types';

export interface ChatContact {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
}

/**
 * Search for users by name or email to start a new chat
 */
export const searchUsers = async (searchTerm: string, currentUserId: string): Promise<ChatContact[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(20));
    const snapshot = await getDocs(q);
    
    const term = searchTerm.toLowerCase();
    return snapshot.docs
      .map(doc => ({ uid: doc.id, ...doc.data() } as any))
      .filter(user => 
        user.uid !== currentUserId && 
        (user.fullName?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term))
      )
      .map(user => ({
        uid: user.uid,
        fullName: user.fullName || user.name || 'Unknown',
        email: user.email || '',
        role: user.role || 'student',
        profilePicture: user.profilePicture || user.profileImageUrl
      }));
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Find or create a chat between two users
 */
export const getOrCreateChat = async (currentUserId: string, targetUserId: string, currentUserData: any, targetUserData: any): Promise<string> => {
  try {
    const chatsRef = collection(db, 'chats');
    
    // Check if chat already exists
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', currentUserId)
    );
    
    const snapshot = await getDocs(q);
    const existingChat = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(targetUserId);
    });
    
    if (existingChat) {
      return existingChat.id;
    }
    
    // Create new chat
    const newChatData = {
      participants: [currentUserId, targetUserId],
      participantNames: {
        [currentUserId]: currentUserData.fullName || 'Me',
        [targetUserId]: targetUserData.fullName || 'User'
      },
      participantRoles: {
        [currentUserId]: currentUserData.role || 'student',
        [targetUserId]: targetUserData.role || 'student'
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(chatsRef, newChatData);
    return docRef.id;
  } catch (error) {
    console.error('Error getting/creating chat:', error);
    throw error;
  }
};

/**
 * Listen to user's chats
 */
export const listenToUserChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastMessage: doc.data().lastMessage ? {
        ...doc.data().lastMessage,
        createdAt: doc.data().lastMessage.createdAt?.toDate()
      } : undefined
    })) as Chat[];
    callback(chats);
  });
};

/**
 * Listen to messages in a chat
 */
export const listenToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as Message[];
    callback(messages);
  });
};

/**
 * Send a message
 */
export const sendMessage = async (chatId: string, senderId: string, senderName: string, content: string) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messageData = {
      chatId,
      senderId,
      senderName,
      content,
      type: 'text',
      createdAt: Timestamp.now(),
      readBy: [senderId]
    };
    
    await addDoc(messagesRef, messageData);
    
    // Update chat's last message and updatedAt
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: messageData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
