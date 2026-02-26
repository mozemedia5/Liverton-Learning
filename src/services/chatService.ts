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
  writeBatch
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
 * Generate a chat title based on message content (gist)
 * Uses the first message or a summary to create a meaningful title
 */
const generateChatTitle = (firstMessage: string): string => {
  if (!firstMessage) return 'New Chat';
  
  // Remove extra whitespace and limit length
  const cleanMessage = firstMessage.trim().replace(/\s+/g, ' ');
  
  // Extract the first sentence or first 50 characters
  const firstSentence = cleanMessage.split(/[.!?]/)[0];
  const truncated = firstSentence.length > 50 
    ? firstSentence.substring(0, 47) + '...' 
    : firstSentence;
  
  return truncated || 'New Chat';
};

/**
 * Format date for chat title
 * Returns a short date string like "Jan 15" or "Today" or "Yesterday"
 */
const formatChatDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (chatDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (chatDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

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
 * Chat title will be updated based on the first message content
 */
export const getOrCreateChat = async (
  currentUserId: string, 
  targetUserId: string, 
  currentUserData: any, 
  targetUserData: any,
  initialMessage?: string
): Promise<string> => {
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
    
    // Generate title based on initial message or default
    const title = initialMessage 
      ? `${generateChatTitle(initialMessage)} - ${formatChatDate(new Date())}`
      : `Chat with ${targetUserData.fullName || 'User'} - ${formatChatDate(new Date())}`;
    
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
      title: title,
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
 * Update chat title based on message content
 * Called when a new message is sent to rename the chat by its gist
 */
export const updateChatTitleByGist = async (
  chatId: string, 
  messageContent: string,
  isFirstMessage: boolean = false
): Promise<void> => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) return;
    
    const chatData = chatSnap.data();
    const currentTitle = chatData.title || '';
    
    // Only update if it's the first message or title is generic
    const shouldUpdate = isFirstMessage || 
      currentTitle.startsWith('Chat with') || 
      currentTitle === 'New Chat' ||
      currentTitle.includes(' - Today') ||
      currentTitle.includes(' - Yesterday');
    
    if (shouldUpdate && messageContent) {
      const newTitle = `${generateChatTitle(messageContent)} - ${formatChatDate(new Date())}`;
      await updateDoc(chatRef, { title: newTitle });
    }
  } catch (error) {
    console.error('Error updating chat title:', error);
  }
};

/**
 * Listen to user's chats
 * Chats are now named according to their content with dates
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
 * Automatically renames the chat based on the first message content (gist)
 */
export const sendMessage = async (
  chatId: string, 
  senderId: string, 
  senderName: string, 
  content: string,
  isFirstMessage: boolean = false
) => {
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
    
    // Update chat title based on message gist (for first message or generic titles)
    await updateChatTitleByGist(chatId, content, isFirstMessage);
    
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Create a new chat with Hanna AI
 * Chat will be named based on the first question asked
 */
export const createHannaChat = async (userId: string, userName: string): Promise<string> => {
  try {
    const chatsRef = collection(db, 'chats');
    
    const newChatData = {
      participants: [userId, 'hanna-ai'],
      participantNames: {
        [userId]: userName || 'Me',
        'hanna-ai': 'Hanna AI'
      },
      participantRoles: {
        [userId]: 'student',
        'hanna-ai': 'assistant'
      },
      title: `Hanna Chat - ${formatChatDate(new Date())}`,
      type: 'hanna',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(chatsRef, newChatData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating Hanna chat:', error);
    throw error;
  }
};

/**
 * Get chat title with date
 * Returns formatted chat title with creation date
 */
export const getChatDisplayTitle = (chat: Chat): string => {
  if (chat.title) return chat.title;
  
  // Fallback: create title from participant names
  const names = Object.values(chat.participantNames || {});
  const otherNames = names.filter(name => name !== 'Me' && name !== 'You');
  
  if (otherNames.length > 0) {
    const date = chat.createdAt 
      ? formatChatDate(chat.createdAt instanceof Date ? chat.createdAt : chat.createdAt.toDate())
      : formatChatDate(new Date());
    return `${otherNames.join(', ')} - ${date}`;
  }
  
  return `Chat - ${formatChatDate(new Date())}`;
};

/**
 * Delete a chat and all its messages
 * @param chatId - The ID of the chat to delete
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete all messages in the chat
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    messagesSnapshot.docs.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });
    
    // Delete the chat document
    const chatRef = doc(db, 'chats', chatId);
    batch.delete(chatRef);
    
    // Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
};

/**
 * Send message with file attachment
 * @param chatId - Chat ID
 * @param senderId - Sender user ID
 * @param senderName - Sender name
 * @param content - Message text content
 * @param fileURL - Optional file attachment URL
 * @param fileName - Optional file name
 * @param fileType - Optional file type
 */
export const sendMessageWithFile = async (
  chatId: string, 
  senderId: string, 
  senderName: string, 
  content: string,
  fileURL?: string,
  fileName?: string,
  fileType?: string,
  isFirstMessage: boolean = false
) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messageData: any = {
      chatId,
      senderId,
      senderName,
      content,
      type: fileURL ? 'file' : 'text',
      createdAt: Timestamp.now(),
      readBy: [senderId]
    };
    
    // Add file attachment info if present
    if (fileURL) {
      messageData.attachments = [{
        type: fileType || 'file',
        url: fileURL,
        name: fileName || 'file'
      }];
    }
    
    await addDoc(messagesRef, messageData);
    
    // Update chat's last message and updatedAt
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        ...messageData,
        content: fileURL ? `📎 ${fileName || 'File'}` : content
      },
      updatedAt: Timestamp.now()
    });
    
    // Update chat title based on message gist (for first message or generic titles)
    if (content && !fileURL) {
      await updateChatTitleByGist(chatId, content, isFirstMessage);
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
