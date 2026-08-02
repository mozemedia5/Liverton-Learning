import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TeamMessage, TeamMeeting, TeamRole } from '@/types/livTeams';
import { logTeamActivity } from './livTeamsCoreService';

/**
 * Send message to team chat room
 */
export async function sendTeamMessage(
  teamId: string,
  senderId: string,
  senderName: string,
  senderTeamRole: TeamRole,
  content: string,
  type: TeamMessage['type'] = 'text',
  fileDetails?: { url: string; name: string; size?: string }
): Promise<string> {
  try {
    const messagesRef = collection(db, 'teams', teamId, 'messages');

    const messageData = {
      teamId,
      senderId,
      senderName,
      senderTeamRole,
      content,
      type,
      fileUrl: fileDetails?.url || '',
      fileName: fileDetails?.name || '',
      fileSize: fileDetails?.size || '',
      reactions: [],
      replies: [],
      isPinned: false,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(messagesRef, messageData);
    return docRef.id;
  } catch (error) {
    console.error('Error sending team message:', error);
    throw error;
  }
}

/**
 * Listen for real-time messages in a team chat room
 */
export function listenToTeamMessages(teamId: string, callback: (messages: TeamMessage[]) => void) {
  const messagesRef = collection(db, 'teams', teamId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as TeamMessage[];
    callback(messages);
  });
}

/**
 * Edit a team message
 */
export async function editTeamMessage(teamId: string, messageId: string, newContent: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'messages', messageId);
    await updateDoc(docRef, {
      content: newContent,
      editedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error editing team message:', error);
    throw error;
  }
}

/**
 * Delete a team message
 */
export async function deleteTeamMessage(teamId: string, messageId: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'messages', messageId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting team message:', error);
    throw error;
  }
}

/**
 * Add emoji reaction to message
 */
export async function toggleTeamMessageReaction(teamId: string, messageId: string, emoji: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'messages', messageId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    let reactions: any[] = data.reactions || [];

    const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);

    if (existingReactionIndex > -1) {
      const reaction = reactions[existingReactionIndex];
      const userIndex = reaction.userIds.indexOf(userId);
      if (userIndex > -1) {
        // Remove user's vote
        reaction.userIds.splice(userIndex, 1);
      } else {
        // Add user's vote
        reaction.userIds.push(userId);
      }

      // If no votes left, remove emoji reaction fully
      if (reaction.userIds.length === 0) {
        reactions.splice(existingReactionIndex, 1);
      }
    } else {
      reactions.push({
        emoji,
        userIds: [userId]
      });
    }

    await updateDoc(docRef, { reactions });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    throw error;
  }
}

/**
 * Reply / Thread Support
 */
export async function addTeamMessageReply(teamId: string, messageId: string, reply: any): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'messages', messageId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const replies = data.replies || [];

    replies.push({
      id: Math.random().toString(36).substring(2, 9),
      ...reply,
      createdAt: new Date()
    });

    await updateDoc(docRef, { replies });
  } catch (error) {
    console.error('Error adding message reply:', error);
    throw error;
  }
}

/**
 * Pin / Unpin Message
 */
export async function togglePinTeamMessage(teamId: string, messageId: string, pin: boolean): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'messages', messageId);
    await updateDoc(docRef, { isPinned: pin });
  } catch (error) {
    console.error('Error toggling pin status:', error);
    throw error;
  }
}

/**
 * Schedule Meeting
 */
export async function scheduleTeamMeeting(teamId: string, meetingData: Partial<TeamMeeting>, userId: string, userName: string): Promise<string> {
  try {
    const meetingsRef = collection(db, 'teams', teamId, 'meetings');
    const finalMeeting = {
      ...meetingData,
      joinUrl: meetingData.joinUrl || `https://meet.liverton.com/teams/${teamId}/${Math.random().toString(36).substring(2, 9)}`,
      notes: meetingData.notes || '',
      recordingUrlPlaceholder: '',
      attendance: [],
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(meetingsRef, finalMeeting);
    await logTeamActivity(teamId, userId, userName, 'scheduled a meeting', finalMeeting.title);
    return docRef.id;
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    throw error;
  }
}

/**
 * Join Meeting & Log Attendance
 */
export async function joinTeamMeeting(teamId: string, meetingId: string, userId: string, userName: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'meetings', meetingId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const attendance = data.attendance || [];

    const alreadyAttended = attendance.some((a: any) => a.userId === userId);
    if (!alreadyAttended) {
      attendance.push({
        userId,
        userName,
        attendedAt: new Date()
      });
      await updateDoc(docRef, { attendance });
    }
  } catch (error) {
    console.error('Error logging meeting attendance:', error);
    throw error;
  }
}

/**
 * Fetch Scheduled Meetings
 */
export async function getTeamMeetings(teamId: string): Promise<TeamMeeting[]> {
  try {
    const meetingsRef = collection(db, 'teams', teamId, 'meetings');
    const q = query(meetingsRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMeeting));
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }
}
