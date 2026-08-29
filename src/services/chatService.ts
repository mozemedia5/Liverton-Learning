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
import { auth, db } from '@/lib/firebase';
import type { Chat, Message, SharedContent, UserRole } from '@/types';
import { mapDirectoryEntry, normalizeDisplayName, normalizeEmail, normalizeUsername, type UserDirectoryEntry } from '@/services/userProfileService';

export interface ChatContact {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  username?: string;
  providerIds?: string[];
  profilePicture?: string;
}

export class UserDirectorySearchError extends Error {
  code: string;

  constructor(message: string, code = 'directory-unavailable') {
    super(message);
    this.name = 'UserDirectorySearchError';
    this.code = code;
  }
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
 * Search for users by username or email to start a new chat.
 * The directory only contains explicitly searchable identity fields. This keeps
 * discovery safe for normal users because the private /users collection is not
 * list-readable under Firestore rules.
 */
const searchUsersViaApi = async (searchTerm: string): Promise<ChatContact[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new UserDirectorySearchError('Please sign in to search for users.', 'auth-required');
  const baseUrl = (import.meta.env.VITE_VERCEL_API_BASE_URL || '').replace(/\/$/, '');
  const token = await currentUser.getIdToken();
  const response = await fetch(`${baseUrl}/api/search-users?q=${encodeURIComponent(searchTerm)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = Object.assign(new Error('The user search service is unavailable.'), { code: response.status === 403 ? 'permission-denied' : response.status === 503 ? 'unavailable' : 'search-api-error' });
    throw error;
  }
  const body = await response.json() as { users?: ChatContact[] };
  return Array.isArray(body.users) ? body.users : [];
};

export const searchUsers = async (searchTerm: string, currentUserId: string): Promise<ChatContact[]> => {
  const rawTerm = searchTerm.trim();
  if (!rawTerm || rawTerm.length < 2) return [];

  const usernameTerm = normalizeUsername(rawTerm);
  const emailTerm = normalizeEmail(rawTerm);

  // Prefer the authenticated server search so legacy accounts are found even
  // when their userDirectory document has not been backfilled yet.
  if (auth.currentUser) {
    try {
      const serverResults = await searchUsersViaApi(rawTerm);
      if (serverResults.length > 0) return serverResults;
    } catch (error) {
      console.warn('Authenticated user search unavailable; using directory fallback.', error);
    }
  }
  const displayNameTerm = normalizeDisplayName(rawTerm);
  const legacyUsernameTerms = Array.from(new Set([rawTerm.replace(/^@+/, ''), usernameTerm])).filter(Boolean);
  const legacyEmailTerms = Array.from(new Set([rawTerm, emailTerm])).filter(Boolean);

  const toContact = (user: UserDirectoryEntry): ChatContact => ({
    uid: user.uid,
    fullName: user.fullName || 'Liverton member',
    email: user.email || '',
    role: user.role || 'student',
    username: user.username,
    providerIds: user.providerIds,
    profilePicture: user.profilePicture,
  });

  try {
    const directoryCollection = collection(db, 'userDirectory');
    const queryPromises = [
      getDocs(query(
        directoryCollection,
        where('usernameLower', '>=', usernameTerm),
        where('usernameLower', '<=', `${usernameTerm}\uf8ff`),
        limit(50),
      )),
      getDocs(query(
        directoryCollection,
        where('emailLower', '>=', emailTerm),
        where('emailLower', '<=', `${emailTerm}\uf8ff`),
        limit(50),
      )),
      getDocs(query(
        directoryCollection,
        where('fullNameLower', '>=', displayNameTerm),
        where('fullNameLower', '<=', `${displayNameTerm}\uf8ff`),
        limit(50),
      )),
      // Older directory records may not have the lowercase index fields yet.
      // Query original and normalized forms without requiring an insecure
      // collection-wide read.
      ...legacyUsernameTerms.map((term) => getDocs(query(directoryCollection, where('username', '==', term), limit(50)))),
      ...legacyEmailTerms.map((term) => getDocs(query(directoryCollection, where('email', '==', term), limit(50)))),
    ];
    const queryResults = await Promise.allSettled(queryPromises);
    const successfulSnapshots = queryResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const failedQueries = queryResults.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failedQueries.length > 0) {
      const failureCodes = failedQueries.map(({ reason }) => {
        if (reason && typeof reason === 'object' && 'code' in reason) return String((reason as { code: unknown }).code);
        return reason instanceof Error ? reason.name : 'unknown';
      });
      console.warn('Some user-directory search queries failed; using available results.', { failureCodes });
    }
    if (successfulSnapshots.length === 0) {
      const firstFailure = failedQueries[0]?.reason;
      const code = firstFailure && typeof firstFailure === 'object' && 'code' in firstFailure
        ? String((firstFailure as { code: unknown }).code)
        : 'directory-unavailable';
      throw new UserDirectorySearchError('The user directory is unavailable. Please try again.', code);
    }

    const directoryResults = Array.from(new Map(
      successfulSnapshots.flatMap((snapshot) => snapshot.docs)
        .map((directoryDoc) => [directoryDoc.id, mapDirectoryEntry(directoryDoc)]),
    ).values())
      .filter((user) => user.uid !== currentUserId && user.isDiscoverable)
      .filter((user) => {
        const username = user.usernameLower || normalizeUsername(user.username);
        const email = user.emailLower || normalizeEmail(user.email);
        const fullName = user.fullNameLower || normalizeDisplayName(user.fullName);
        return username.startsWith(usernameTerm) || email.startsWith(emailTerm) || fullName.startsWith(displayNameTerm);
      })
      .sort((a, b) => {
        const aExact = (a.usernameLower === usernameTerm || a.emailLower === emailTerm || a.fullNameLower === displayNameTerm) ? 1 : 0;
        const bExact = (b.usernameLower === usernameTerm || b.emailLower === emailTerm || b.fullNameLower === displayNameTerm) ? 1 : 0;
        return bExact - aExact || a.fullName.localeCompare(b.fullName);
      })
      .slice(0, 50)
      .map(toContact);

    if (directoryResults.length > 0) return directoryResults;

    // Existing accounts may predate userDirectory. Use the authenticated Admin
    // search endpoint as a repair-safe fallback until the directory is backfilled.
    return await searchUsersViaApi(rawTerm);
  } catch (error) {
    console.error('Error searching the user directory:', error);
    try {
      return await searchUsersViaApi(rawTerm);
    } catch (fallbackError) {
      console.error('Authenticated user search fallback failed:', fallbackError);
      throw error;
    }
  }
};

/**
 * Pin or unpin a chat for a specific user
 */
export const togglePinChat = async (chatId: string, userId: string): Promise<boolean> => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) throw new Error('Chat not found');

    const pinnedBy: string[] = chatSnap.data().pinnedBy || [];
    const isPinned = pinnedBy.includes(userId);

    if (isPinned) {
      const updated = pinnedBy.filter(uid => uid !== userId);
      await updateDoc(chatRef, { pinnedBy: updated });
      return false;
    } else {
      await updateDoc(chatRef, { pinnedBy: arrayUnion(userId) });
      return true;
    }
  } catch (error) {
    console.error('Error toggling pin chat:', error);
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
  currentUserData: { fullName?: string; role?: string; username?: string; email?: string },
  targetUserData: { fullName?: string; role?: string; username?: string; email?: string },
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
      participantUsernames: {
        [currentUserId]: currentUserData.username || '',
        [targetUserId]: targetUserData.username || ''
      },
      participantEmails: {
        [currentUserId]: currentUserData.email || '',
        [targetUserId]: targetUserData.email || ''
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
export const listenToUserChats = (
  userId: string,
  callback: (chats: Chat[]) => void,
  onError?: (error: Error) => void
) => {
  const chatsRef = collection(db, 'chats');
  const orderedQuery = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  const unorderedQuery = query(chatsRef, where('participants', 'array-contains', userId));
  let fallbackUnsubscribe: (() => void) | undefined;

  const handleSnapshot = (snapshot: { docs: Array<{ id: string; data: () => Record<string, any> }> }, shouldSort = false) => {
    const chats = snapshot.docs.map(chatDoc => ({
      id: chatDoc.id,
      ...chatDoc.data(),
      createdAt: chatDoc.data().createdAt?.toDate(),
      updatedAt: chatDoc.data().updatedAt?.toDate(),
      lastMessage: chatDoc.data().lastMessage ? {
        ...chatDoc.data().lastMessage,
        createdAt: chatDoc.data().lastMessage.createdAt?.toDate()
      } : undefined
    })) as Chat[];
    if (shouldSort) {
      chats.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    }
    callback(chats);
  };

  const unsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => handleSnapshot(snapshot),
    (error) => {
      console.error('Error listening to ordered user chats:', error);
      // Firestore requires a composite index for array-contains + orderBy.
      // Keep chats usable while an index is being deployed by retrying without
      // orderBy and sorting the small per-user result set in memory.
      if ((error as { code?: string }).code === 'failed-precondition') {
        fallbackUnsubscribe = onSnapshot(
          unorderedQuery,
          (snapshot) => handleSnapshot(snapshot, true),
          (fallbackError) => {
            console.error('Error listening to fallback user chats:', fallbackError);
            callback([]);
            onError?.(fallbackError);
          },
        );
        return;
      }
      callback([]);
      onError?.(error);
    },
  );

  return () => {
    unsubscribe();
    fallbackUnsubscribe?.();
  };
};

/**
 * Listen to messages in a chat
 */
export const listenToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Message[];
      callback(messages);
    },
    (error) => {
      console.error('Error listening to messages:', error);
      callback([]);
    }
  );
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
  isFirstMessage: boolean = false,
  sharedContent?: SharedContent,
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
      readBy: [senderId],
      ...(sharedContent ? { sharedContent } : {}),
    };

    await addDoc(messagesRef, messageData);

    // Update chat's last message and updatedAt + bump unread counters for the other participants
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    const participants: string[] = chatSnap.exists() ? (chatSnap.data().participants || []) : [];
    const unreadUpdates: Record<string, FieldValue> = {};
    participants
      .filter(p => p !== senderId && p !== 'hanna-ai')
      .forEach(p => { unreadUpdates[`unreadCounts.${p}`] = increment(1); });

    await updateDoc(chatRef, {
      lastMessage: messageData,
      updatedAt: Timestamp.now(),
      ...unreadUpdates
    });

    // Update chat title based on message gist (for first message or generic titles)
    await updateChatTitleByGist(chatId, content, isFirstMessage);

  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Mark a conversation as read for a user:
 * resets their unread counter and records their read receipts on recent messages.
 */
export const markChatAsRead = async (chatId: string, userId: string): Promise<void> => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { [`unreadCounts.${userId}`]: 0 });

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(30));
    const snap = await getDocs(q);

    const unread = snap.docs.filter(d => {
      const readBy: string[] = d.data().readBy || [];
      return !readBy.includes(userId);
    });
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(d => {
      batch.update(d.ref, { readBy: arrayUnion(userId) });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error marking chat as read:', error);
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
