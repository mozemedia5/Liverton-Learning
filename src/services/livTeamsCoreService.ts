import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeEmail, normalizeUsername } from '@/services/userProfileService';
import type { Team, TeamMember, TeamRole, TeamInvitation, TeamActivityFeedItem } from '@/types/livTeams';

export const teamCategories = [
  'Science', 'ICT', 'Mathematics', 'Physics', 'Biology', 'Chemistry',
  'Geography', 'History', 'Literature', 'Reading', 'Research',
  'Innovation', 'Robotics', 'AI', 'Coding', 'Study', 'Under 20', 'Startup', 'Agriculture',
  'Debate', 'Entrepreneurship', 'School Club', 'Savings', 'Other'
];

async function createTeamNotification(input: {
  targetUsers: string[];
  targetEmail?: string;
  title: string;
  body: string;
  link?: string;
  senderId?: string;
  sender?: string;
  metadata?: Record<string, unknown>;
}) {
  await addDoc(collection(db, 'notifications'), {
    title: input.title,
    body: input.body,
    // Keep the legacy field for older inbox readers.
    content: input.body,
    type: 'announcement',
    targetAudience: [],
    targetUsers: input.targetUsers,
    ...(input.targetEmail ? { targetEmail: input.targetEmail } : {}),
    link: input.link || '',
    sender: input.sender || 'LivTeams',
    senderId: input.senderId || '',
    createdAt: Timestamp.now(),
    ...input.metadata,
  });
}

/**
 * Log a team activity feed item
 */
export async function logTeamActivity(
  teamId: string,
  userId: string,
  userName: string,
  action: string,
  targetName?: string
) {
  try {
    const feedRef = collection(db, 'teams', teamId, 'activity_feed');
    await addDoc(feedRef, {
      teamId,
      userId,
      userName,
      action,
      targetName: targetName || '',
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error logging team activity:', error);
  }
}

/**
 * Create a new team
 * Automatically generates workspace subcollections placeholders and creates savings wallet
 */
export async function createTeam(teamData: Partial<Team>, ownerId: string, ownerName: string, ownerEmail: string): Promise<string> {
  try {
    const teamsRef = collection(db, 'teams');

    const ownerMember: TeamMember = {
      userId: ownerId,
      fullName: ownerName,
      email: ownerEmail,
      role: 'owner',
      joinedAt: new Date()
    };

    const finalTeam = {
      name: teamData.name || 'Untitled Team',
      logoUrl: teamData.logoUrl || '',
      coverUrl: teamData.coverUrl || '',
      description: teamData.description || '',
      category: teamData.category || 'Other',
      purpose: teamData.purpose || '',
      country: teamData.country || 'Global',
      school: teamData.school || '',
      district: teamData.district || '',
      language: teamData.language || 'English',
      visibility: teamData.visibility || 'public',
      // Capacity is platform-controlled; clients cannot lower or raise this limit.
      maxMembers: 1000,
      rules: teamData.rules || '',
      welcomeMessage: teamData.welcomeMessage || 'Welcome to the Team!',
      tags: teamData.tags || [],
      ownerId,
      ownerName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      members: [ownerMember],
      memberIds: [ownerId],
      adminIds: [ownerId],
      savedByUsers: [],
      savingsBalance: 0
    };

    const docRef = await addDoc(teamsRef, finalTeam);
    const teamId = docRef.id;

    await updateDoc(docRef, { id: teamId });

    // Log initial activity
    await logTeamActivity(teamId, ownerId, ownerName, 'created the team', finalTeam.name);

    return teamId;
  } catch (error) {
    console.error('Error creating team:', error);
    throw error;
  }
}

/**
 * Get Team by ID
 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  try {
    const docRef = doc(db, 'teams', teamId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Team;
    }
    return null;
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
}

/**
 * Get all Teams
 */
export async function getAllTeams(): Promise<Team[]> {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
  } catch (error) {
    console.error('Error fetching all teams:', error);
    return [];
  }
}

/**
 * Load the teams a signed-in user is allowed to see. Querying every team from
 * the client is rejected by Firestore because private teams are not readable
 * unless the request is constrained by ownership or membership.
 */
export async function getTeamsForUser(userId: string): Promise<Team[]> {
  if (!userId) return [];
  const teamsRef = collection(db, 'teams');
  const queries = [
    query(teamsRef, where('visibility', '==', 'public')),
    query(teamsRef, where('ownerId', '==', userId)),
    query(teamsRef, where('memberIds', 'array-contains', userId)),
  ];

  const snapshots = await Promise.all(queries.map(async (teamQuery) => {
    try {
      return await getDocs(teamQuery);
    } catch (error) {
      console.warn('Unable to load one team visibility bucket:', error);
      return null;
    }
  }));

  const teams = new Map<string, Team>();
  snapshots.forEach((snapshot) => {
    snapshot?.docs.forEach((teamDoc) => {
      teams.set(teamDoc.id, { id: teamDoc.id, ...teamDoc.data() } as Team);
    });
  });

  return Array.from(teams.values()).sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime();
    const bTime = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

/**
 * Suspend a team for unhealthy/threatening content (Admin only)
 */
export async function suspendTeam(teamId: string, reason: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) throw new Error('Team not found');
    const teamData = teamSnap.data();

    await updateDoc(teamRef, {
      status: 'suspended',
      suspensionReason: reason,
      appealStatus: 'none',
      appealText: ''
    });

    // Send a system notification in inbox to the owner
    await addDoc(collection(db, 'notifications'), {
      title: '🔴 Team Suspended due to Rules Violation',
      content: `Your team "${teamData.name}" has been suspended due to: "${reason}". You can appeal this suspension from your team workspace page.`,
      type: 'announcement',
      audience: 'all',
      targetUsers: [teamData.ownerId],
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error suspending team:', error);
    throw error;
  }
}

/**
 * Unsuspend a team (Admin only)
 */
export async function unsuspendTeam(teamId: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      status: 'active',
      appealStatus: 'none',
      appealText: ''
    });
  } catch (error) {
    console.error('Error unsuspending team:', error);
    throw error;
  }
}

/**
 * Submit team suspension appeal (Owner only)
 */
export async function submitTeamAppeal(teamId: string, appealText: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    const teamData = teamSnap.data();
    const teamName = teamData?.name || 'Suspended Team';

    await updateDoc(teamRef, {
      appealStatus: 'pending',
      appealText
    });

    await addDoc(collection(db, 'notifications'), {
      title: `⚖️ New Suspension Appeal for "${teamName}"`,
      content: `The owner of "${teamName}" has submitted a suspension appeal: "${appealText}". Please review and resolve.`,
      type: 'announcement',
      targetAudience: ['platform_admin'],
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error submitting team appeal:', error);
    throw error;
  }
}

/**
 * Update team suspension appeal status (Admin only)
 */
export async function updateTeamAppealStatus(
  teamId: string,
  nextStatus: 'pending' | 'under_review' | 'resolved' | 'rejected',
  notes: string = ''
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) throw new Error('Team not found');
    const teamData = teamSnap.data();

    const updates: any = {
      appealStatus: nextStatus
    };

    if (nextStatus === 'resolved') {
      updates.status = 'active';
      updates.appealStatus = 'resolved'; // Accepted
    } else if (nextStatus === 'rejected') {
      updates.appealStatus = 'rejected';
    }

    await updateDoc(teamRef, updates);

    // Send inbox notification to the team owner
    let title = '⚖️ Suspension Appeal Update';
    let content = `Your appeal for team "${teamData.name}" has been updated.`;
    if (nextStatus === 'under_review') {
      title = `⏳ Appeal Under Review: "${teamData.name}"`;
      content = `Our team is currently reviewing your suspension appeal for "${teamData.name}". Status: Under Review.`;
    } else if (nextStatus === 'resolved') {
      title = `✅ Appeal Accepted: "${teamData.name}" Re-activated!`;
      content = `Great news! Your suspension appeal for "${teamData.name}" has been accepted. The workspace is now fully re-activated.`;
    } else if (nextStatus === 'rejected') {
      title = `❌ Appeal Declined: "${teamData.name}" remains suspended`;
      content = `Your suspension appeal for "${teamData.name}" has been declined by our governance team. Reason/Feedback: "${notes || 'Violation of community guidelines'}".`;
    }

    await addDoc(collection(db, 'notifications'), {
      title,
      content,
      type: 'announcement',
      targetAudience: [],
      targetUsers: [teamData.ownerId],
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating team appeal status:', error);
    throw error;
  }
}

/**
 * Dismiss a member from a team due to rule breaking (Owner only)
 */
export async function dismissMemberFromTeam(
  teamId: string,
  memberUserId: string,
  actorId: string,
  actorName: string,
  explanation: string = 'Violation of team rules'
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) throw new Error('Team not found');
    const teamData = teamSnap.data() as Team;

    const memberToDismiss = teamData.members.find(m => m.userId === memberUserId);
    if (!memberToDismiss) throw new Error('Member not found in team');

    const dismissedExplanations = teamData.dismissedExplanations || {};
    dismissedExplanations[memberUserId] = explanation;

    await updateDoc(teamRef, {
      members: arrayRemove(memberToDismiss),
      memberIds: arrayRemove(memberUserId),
      dismissedMembers: arrayUnion(memberUserId),
      dismissedExplanations
    });

    await logTeamActivity(teamId, actorId, actorName, `dismissed ${memberToDismiss.fullName} from the team`);

    // Put dismissal in Liverton Inbox (notifications)
    await addDoc(collection(db, 'notifications'), {
      title: '⚠️ Revoked access from ' + teamData.name,
      content: `You have been dismissed. Reason: "${explanation}". You can appeal this from the team workspace page.`,
      type: 'announcement',
      targetAudience: [],
      targetUsers: [memberUserId],
      sender: actorName,
      senderId: actorId,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error dismissing member:', error);
    throw error;
  }
}

/**
 * Submit workspace re-join appeal (Dismissed member only)
 */
export async function submitRejoinAppeal(
  teamId: string,
  userId: string,
  fullName: string,
  email: string,
  appealText: string
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) throw new Error('Team not found');
    const teamData = teamSnap.data();

    const existingAppeals = teamData.appeals || [];
    // Remove any older appeal from this user
    const filtered = existingAppeals.filter((a: any) => a.userId !== userId);

    const newAppeal = {
      userId,
      fullName,
      email,
      appealText,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await updateDoc(teamRef, {
      appeals: [...filtered, newAppeal]
    });

    // Notify the team owner of this appeal in their inbox
    await addDoc(collection(db, 'notifications'), {
      title: `⚖️ New Member Re-access Appeal for "${teamData.name}"`,
      content: `Dismissed member "${fullName}" has submitted a re-access appeal: "${appealText}". Please review and resolve.`,
      type: 'announcement',
      targetAudience: [],
      targetUsers: [teamData.ownerId],
      sender: fullName,
      senderId: userId,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error submitting rejoin appeal:', error);
    throw error;
  }
}

/**
 * Respond to workspace rejoin appeal (Owner only)
 */
export async function respondToRejoinAppeal(
  teamId: string,
  userId: string,
  approve: boolean,
  actorId: string,
  actorName: string
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) throw new Error('Team not found');
    const teamData = teamSnap.data() as Team;

    const existingAppeals = teamData.appeals || [];
    const targetAppeal = existingAppeals.find((a: any) => a.userId === userId);
    if (!targetAppeal) throw new Error('Appeal not found');

    if (approve) {
      // Re-add to members, remove from dismissed and appeals
      const updatedAppeals = existingAppeals.filter((a: any) => a.userId !== userId);
      await updateDoc(teamRef, {
        appeals: updatedAppeals,
        dismissedMembers: arrayRemove(userId)
      });

      await addMemberToTeam(teamId, {
        userId,
        fullName: targetAppeal.fullName,
        email: targetAppeal.email,
        role: 'student_member',
        joinedAt: new Date()
      });

      await logTeamActivity(teamId, actorId, actorName, `approved the re-join appeal of ${targetAppeal.fullName}`);

      // Notify user of approved appeal in inbox
      await addDoc(collection(db, 'notifications'), {
        title: `✅ Re-access Appeal Approved for "${teamData.name}"`,
        content: `Your re-access appeal has been approved by the team owner ${actorName}. Your membership is fully re-instated.`,
        type: 'announcement',
        targetAudience: [],
        targetUsers: [userId],
        sender: actorName,
        senderId: actorId,
        createdAt: Timestamp.now()
      });
    } else {
      // Update appeal status to rejected
      const updatedAppeals = existingAppeals.map((a: any) => {
        if (a.userId === userId) {
          return { ...a, status: 'rejected' };
        }
        return a;
      });
      await updateDoc(teamRef, {
        appeals: updatedAppeals
      });
      await logTeamActivity(teamId, actorId, actorName, `rejected the re-join appeal of ${targetAppeal.fullName}`);

      // Notify user of rejected appeal in inbox
      await addDoc(collection(db, 'notifications'), {
        title: `❌ Re-access Appeal Rejected for "${teamData.name}"`,
        content: `Your re-access appeal has been declined by the team owner ${actorName}.`,
        type: 'announcement',
        targetAudience: [],
        targetUsers: [userId],
        sender: actorName,
        senderId: actorId,
        createdAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error responding to rejoin appeal:', error);
    throw error;
  }
}

export interface TeamJoinRequest {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

/**
 * Request to join a public or private team
 */
export async function requestToJoinTeam(teamId: string, userId: string, fullName: string, email: string): Promise<void> {
  try {
    const team = await getTeamById(teamId);
    if (!team) throw new Error('Team not found');
    if (team.visibility !== 'public') throw new Error('This team is not open for public join requests');
    if (team.members.some(member => member.userId === userId)) throw new Error('You are already a member of this team');
    if (team.members.length >= 1000) throw new Error('This team has reached its maximum member capacity');

    const requestRef = doc(db, 'teams', teamId, 'join_requests', userId);
    const snap = await getDoc(requestRef);
    if (snap.exists() && snap.data().status === 'pending') {
      throw new Error('You have already submitted a join request that is currently pending approval.');
    }

    await setDoc(requestRef, {
      userId,
      fullName,
      email,
      status: 'pending',
      createdAt: Timestamp.now()
    });
    // Log the request and notify both the owner and every administrator.
    await logTeamActivity(teamId, userId, fullName, 'requested to join the team');
    const approverIds = Array.from(new Set([
      team.ownerId,
      ...(team.adminIds || []),
      ...team.members.filter(member => member.role === 'admin').map(member => member.userId),
    ].filter(Boolean)));
    if (approverIds.length > 0) {
      await createTeamNotification({
        targetUsers: approverIds,
        title: `New join request for "${team.name}"`,
        body: `${fullName} requested to join your team. Review the request in the team workspace.`,
        link: `/features/liv-teams/workspace/${teamId}?tab=members`,
        senderId: userId,
        sender: fullName,
        metadata: { notificationType: 'team_join_request', teamId, joinRequestUserId: userId },
      });
    }
  } catch (error) {
    console.error('Error requesting to join team:', error);
    throw error;
  }
}

/**
 * Fetch all pending join requests for a team
 */
export async function getTeamJoinRequests(teamId: string): Promise<TeamJoinRequest[]> {
  try {
    const requestsRef = collection(db, 'teams', teamId, 'join_requests');
    const q = query(requestsRef, where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamJoinRequest));
  } catch (error) {
    console.error('Error fetching team join requests:', error);
    return [];
  }
}

/**
 * Approve or decline a join request
 */
export async function respondToJoinRequest(
  teamId: string,
  userId: string,
  fullName: string,
  email: string,
  approve: boolean,
  actorId: string,
  actorName: string
): Promise<void> {
  try {
    const team = await getTeamById(teamId);
    if (!team) throw new Error('Team not found');
    const actor = team.members.find(member => member.userId === actorId);
    const isApprover = team.ownerId === actorId || team.adminIds?.includes(actorId) || actor?.role === 'admin';
    if (!isApprover) throw new Error('Only the team owner or an administrator can approve join requests');
    if (actor?.role === 'admin' && !team.adminIds?.includes(actorId)) {
      await updateDoc(doc(db, 'teams', teamId), { adminIds: arrayUnion(actorId) });
    }
    if (team.members.some(member => member.userId === userId)) throw new Error('This user is already a team member');
    if (approve && team.members.length >= (team.maxMembers || 50)) throw new Error('This team has reached its maximum member capacity');

    const requestRef = doc(db, 'teams', teamId, 'join_requests', userId);
    const requestSnapshot = await getDoc(requestRef);
    if (!requestSnapshot.exists() || requestSnapshot.data().status !== 'pending') {
      throw new Error('This join request is no longer pending');
    }
    if (approve) {
      await updateDoc(requestRef, { status: 'accepted' });
      // Add member to the team
      await addMemberToTeam(teamId, {
        userId,
        fullName,
        email,
        role: 'student_member',
        joinedAt: new Date()
      });
      await logTeamActivity(teamId, actorId, actorName, `approved ${fullName}'s join request`);
      await createTeamNotification({
        targetUsers: [userId],
        title: `You joined "${team.name}"`,
        body: `Your request was approved. Open the team workspace to get started.`,
        link: `/features/liv-teams/workspace/${teamId}`,
        senderId: actorId,
        sender: actorName,
        metadata: { notificationType: 'team_join_approved', teamId },
      });
    } else {
      await updateDoc(requestRef, { status: 'declined' });
      await logTeamActivity(teamId, actorId, actorName, `declined ${fullName}'s join request`);
      await createTeamNotification({
        targetUsers: [userId],
        title: `Join request declined`,
        body: `Your request to join the team was declined by ${actorName}.`,
        link: `/features/liv-teams/workspace/${teamId}`,
        senderId: actorId,
        sender: actorName,
        metadata: { notificationType: 'team_join_declined', teamId },
      });
    }
  } catch (error) {
    console.error('Error responding to join request:', error);
    throw error;
  }
}

/**
 * Subscribe to a single team document in real time
 */
export function subscribeToTeam(
  teamId: string,
  callback: (team: Team | null) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, 'teams', teamId);
  return onSnapshot(
    docRef,
    (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null);
    },
    (error) => {
      console.error('Error subscribing to team:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * One-time migration helper: ensure the flat memberIds list matches the
 * members array (used by security rules). Safe to call repeatedly.
 */
export async function syncTeamMemberIds(teamId: string): Promise<void> {
  try {
    const team = await getTeamById(teamId);
    if (!team) return;
    const expected = team.members.map(m => m.userId);
    const current = team.memberIds || [];
    const missing = expected.filter(id => !current.includes(id));
    if (missing.length === 0) return;
    const docRef = doc(db, 'teams', teamId);
    await updateDoc(docRef, { memberIds: expected });
  } catch (error) {
    console.error('Error syncing team memberIds:', error);
  }
}

/**
 * Update Team settings
 */
export async function updateTeam(teamId: string, updates: Partial<Team>, userId: string, userName: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    await logTeamActivity(teamId, userId, userName, 'updated team settings');
  } catch (error) {
    console.error('Error updating team:', error);
    throw error;
  }
}

/**
 * Delete a Team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
}

/**
 * Manage Team Member Membership / Join / Leave / Kick
 */
export async function addMemberToTeam(teamId: string, member: TeamMember): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId);
    await updateDoc(docRef, {
      members: arrayUnion(member),
      memberIds: arrayUnion(member.userId)
    });
    await logTeamActivity(teamId, member.userId, member.fullName, 'joined the team');
  } catch (error) {
    console.error('Error adding team member:', error);
    throw error;
  }
}

/**
 * Join a public team directly (validates visibility, capacity and duplicates)
 */
export async function joinPublicTeam(team: Team, userId: string, fullName: string, email: string): Promise<void> {
  if (team.visibility !== 'public') {
    throw new Error('This team is not open for public joining');
  }
  if (team.members.some(m => m.userId === userId)) {
    throw new Error('You are already a member of this team');
  }
  if (team.members.length >= 1000) {
    throw new Error('This team has reached its maximum member capacity');
  }
  await addMemberToTeam(team.id, {
    userId,
    fullName,
    email,
    role: 'student_member',
    joinedAt: new Date()
  });
}

export async function removeMemberFromTeam(teamId: string, member: TeamMember, actorId: string, actorName: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId);
    await updateDoc(docRef, {
      members: arrayRemove(member),
      memberIds: arrayRemove(member.userId)
    });

    if (member.userId === actorId) {
      await logTeamActivity(teamId, member.userId, member.fullName, 'left the team');
    } else {
      await logTeamActivity(teamId, actorId, actorName, `removed ${member.fullName} from the team`);
    }
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}

export async function updateMemberRole(teamId: string, userId: string, newRole: TeamRole, actorId: string, actorName: string): Promise<void> {
  try {
    const team = await getTeamById(teamId);
    if (!team) throw new Error('Team not found');

    const updatedMembers = team.members.map(m => {
      if (m.userId === userId) {
        return { ...m, role: newRole };
      }
      return m;
    });

    const docRef = doc(db, 'teams', teamId);
    await updateDoc(docRef, {
      members: updatedMembers,
      ...(newRole === 'admin' ? { adminIds: arrayUnion(userId) } : { adminIds: arrayRemove(userId) }),
      updatedAt: Timestamp.now()
    });

    const targetUser = team.members.find(m => m.userId === userId);
    if (targetUser) {
      await logTeamActivity(teamId, actorId, actorName, `changed role of ${targetUser.fullName} to ${newRole.replace('_', ' ')}`);
    }
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
}

/**
 * Team Invitations CRUD
 *
 * Direct invitations target a Liverton account by username or email. Link
 * invitations use a random, expiring bearer token and support multiple uses.
 */
export function getTeamInvitationUrl(inviteId: string): string {
  const path = `/features/liv-teams/invite/${encodeURIComponent(inviteId)}`;
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
}

function createSecureInvitationId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID().replace(/-/g, '');
  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(24);
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('This browser cannot create a secure invitation link. Please update your browser.');
}

const TEAM_INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export async function sendTeamInvitation(invitation: Partial<TeamInvitation>): Promise<string> {
  try {
    const inviteType = invitation.inviteType || 'direct';
    const teamId = invitation.teamId || '';
    const senderId = invitation.senderId || '';
    const senderName = invitation.senderName || 'Liverton member';
    if (!teamId || !senderId) throw new Error('A team and authenticated sender are required');
    const teamSnapshot = await getDoc(doc(db, 'teams', teamId));
    if (!teamSnapshot.exists()) throw new Error('Team not found');
    const teamData = teamSnapshot.data() as Team;
    if (!teamData.memberIds?.includes(senderId) && teamData.ownerId !== senderId) throw new Error('Only a member of this team can create an invitation');

    let invitedEmail = normalizeEmail(invitation.invitedEmail);
    let invitedUsername = normalizeUsername(invitation.invitedUsername);
    let invitedUserId = invitation.invitedUserId;
    if (inviteType === 'direct') {
      if (!invitedEmail && !invitedUsername) throw new Error('Enter a Liverton username or email address');
      const directoryQuery = invitedUsername
        ? query(collection(db, 'userDirectory'), where('usernameLower', '==', invitedUsername))
        : query(collection(db, 'userDirectory'), where('emailLower', '==', invitedEmail));
      const directorySnapshot = await getDocs(directoryQuery);
      const directoryEntry = directorySnapshot.docs[0];
      if (directoryEntry) {
        const directoryData = directoryEntry.data();
        invitedUserId = invitedUserId || directoryEntry.id;
        invitedEmail = normalizeEmail(directoryData.email) || invitedEmail;
        invitedUsername = normalizeUsername(directoryData.username) || invitedUsername;
      } else if (invitedUsername) {
        throw new Error('No Liverton account was found with that username');
      }
    } else {
      invitedEmail = '';
      invitedUsername = '';
      invitedUserId = undefined;
    }

    const inviteId = createSecureInvitationId();
    const inviteRef = doc(db, 'team_invitations', inviteId);
    await setDoc(inviteRef, {
      id: inviteId,
      teamId,
      teamName: invitation.teamName || teamData.name,
      teamLogo: invitation.teamLogo || teamData.logoUrl || '',
      ...(invitedEmail ? { invitedEmail } : {}),
      ...(invitedUsername ? { invitedUsername } : {}),
      ...(invitedUserId ? { invitedUserId } : {}),
      inviteType,
      token: inviteId,
      role: invitation.role === 'owner' ? 'student_member' : (invitation.role || 'student_member'),
      senderId,
      senderName,
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + TEAM_INVITATION_LIFETIME_MS),
      maxUses: inviteType === 'link' ? 1000 : 1,
      useCount: 0,
    });
    await createTeamNotification({
      targetUsers: invitedUserId ? [invitedUserId] : [],
      targetEmail: invitedEmail || undefined,
      title: `Invitation to join ${invitation.teamName || teamData.name}`,
      body: `${senderName} invited you to join "${invitation.teamName || teamData.name}". Tap to review and join.`,
      link: getTeamInvitationUrl(inviteId),
      senderId,
      sender: senderName,
      metadata: { notificationType: 'team_invitation', teamId, invitationId: inviteId },
    });
    return inviteId;
  } catch (error) {
    console.error('Error sending team invitation:', error);
    throw error;
  }
}

export async function getTeamInvitation(inviteId: string): Promise<TeamInvitation | null> {
  const snapshot = await getDoc(doc(db, 'team_invitations', inviteId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as TeamInvitation) : null;
}

export async function getInvitationsForUser(email: string, username?: string, userId?: string): Promise<TeamInvitation[]> {
  try {
    const refs = [
      ...(email ? [query(collection(db, 'team_invitations'), where('invitedEmail', '==', normalizeEmail(email)), where('status', '==', 'pending'))] : []),
      ...(username ? [query(collection(db, 'team_invitations'), where('invitedUsername', '==', normalizeUsername(username)), where('status', '==', 'pending'))] : []),
      ...(userId ? [query(collection(db, 'team_invitations'), where('invitedUserId', '==', userId), where('status', '==', 'pending'))] : []),
    ];
    const snapshots = await Promise.all(refs.map((ref) => getDocs(ref)));
    const invitations = new Map<string, TeamInvitation>();
    snapshots.forEach((snapshot) => snapshot.docs.forEach((inviteDoc) => invitations.set(inviteDoc.id, { id: inviteDoc.id, ...inviteDoc.data() } as TeamInvitation)));
    return Array.from(invitations.values());
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    return [];
  }
}

export async function claimTeamInvitation(invitation: TeamInvitation, userId: string, email: string): Promise<string> {
  if (!invitation.teamId || !userId) throw new Error('A signed-in account is required to join a team');
  if (invitation.status !== 'pending') throw new Error('This invitation is no longer active');
  const emailLower = normalizeEmail(email);
  const isTarget = invitation.inviteType === 'link' || invitation.invitedUserId === userId || (!!invitation.invitedEmail && invitation.invitedEmail === emailLower);
  if (!isTarget) throw new Error('This invitation was sent to a different Liverton account');
  const claimId = `${invitation.teamId}_${userId}`;
  const claimRef = doc(db, 'team_invitation_claims', claimId);
  const existing = await getDoc(claimRef);
  if (existing.exists()) {
    if (existing.data().status === 'accepted') throw new Error('You are already a member of this team');
    if (existing.data().status === 'pending' && existing.data().invitationId === invitation.id) return claimId;
  }
  await setDoc(claimRef, { id: claimId, teamId: invitation.teamId, invitationId: invitation.id, userId, status: 'pending', createdAt: Timestamp.now() });
  return claimId;
}

export async function respondToInvitation(inviteId: string, accept: boolean, userId: string, fullName: string, email = ''): Promise<void> {
  try {
    const inviteRef = doc(db, 'team_invitations', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error('Invitation not found');
    const inviteData = { id: inviteSnap.id, ...inviteSnap.data() } as TeamInvitation;
    if (!accept) {
      if (inviteData.inviteType === 'link') return;
      await updateDoc(inviteRef, { status: 'declined' });
      return;
    }
    const claimId = await claimTeamInvitation(inviteData, userId, email);
    await addMemberToTeam(inviteData.teamId, { userId, fullName, email: email || inviteData.invitedEmail || '', role: inviteData.role, joinedAt: new Date() });
    const nextUseCount = (inviteData.useCount || 0) + 1;
    if (inviteData.inviteType === 'link') {
      await updateDoc(inviteRef, { useCount: increment(1), ...(nextUseCount >= (inviteData.maxUses || 1000) ? { status: 'accepted' } : {}) });
    } else {
      await updateDoc(inviteRef, { status: 'accepted', acceptedAt: Timestamp.now(), acceptedBy: userId });
    }
    await updateDoc(doc(db, 'team_invitation_claims', claimId), { status: 'accepted', acceptedAt: Timestamp.now() });
    await createTeamNotification({ targetUsers: [userId], title: `You joined "${inviteData.teamName}"`, body: `You are now a ${inviteData.role.replace('_', ' ')} in this team.`, link: `/features/liv-teams/workspace/${inviteData.teamId}`, senderId: inviteData.senderId, sender: inviteData.senderName, metadata: { notificationType: 'team_invitation_accepted', teamId: inviteData.teamId, invitationId: inviteId } });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    throw error;
  }
}

/**
 * Saved / Starred Teams
 */
export async function toggleSaveTeam(teamId: string, userId: string): Promise<boolean> {
  try {
    const team = await getTeamById(teamId);
    if (!team) throw new Error('Team not found');

    const isSaved = team.savedByUsers?.includes(userId) || false;
    const docRef = doc(db, 'teams', teamId);

    if (isSaved) {
      await updateDoc(docRef, {
        savedByUsers: arrayRemove(userId)
      });
      return false;
    } else {
      await updateDoc(docRef, {
        savedByUsers: arrayUnion(userId)
      });
      return true;
    }
  } catch (error) {
    console.error('Error toggling team save state:', error);
    throw error;
  }
}

/**
 * Fetch Activity Feed
 */
export async function getTeamActivityFeed(teamId: string): Promise<TeamActivityFeedItem[]> {
  try {
    const feedRef = collection(db, 'teams', teamId, 'activity_feed');
    const q = query(feedRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as TeamActivityFeedItem[];
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
}
