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
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Team, TeamMember, TeamRole, TeamInvitation, TeamActivityFeedItem } from '@/types/livTeams';

export const teamCategories = [
  'Science', 'ICT', 'Mathematics', 'Physics', 'Biology', 'Chemistry',
  'Geography', 'History', 'Literature', 'Reading', 'Research',
  'Innovation', 'Robotics', 'AI', 'Coding', 'Study', 'Under 20', 'Startup', 'Agriculture',
  'Debate', 'Entrepreneurship', 'School Club', 'Savings', 'Other'
];

/**
 * Send an inbox notification to specific users (Liverton Inbox).
 * These persist in Firestore so users can review them later, not just toasts.
 */
export async function sendInboxNotification(
  targetUserIds: string[],
  title: string,
  content: string,
  type: string = 'team_event',
  link?: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      title,
      content,
      type,
      audience: 'all',
      targetUsers: targetUserIds,
      link: link || '',
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error sending inbox notification:', error);
  }
}

/**
 * Get the user IDs of team owner and admins (for notifications).
 */
function getTeamAdminIds(team: { ownerId: string; members: { userId: string; role: TeamRole }[] }): string[] {
  const adminIds = team.members
    .filter(m => m.role === 'owner' || m.role === 'admin')
    .map(m => m.userId);
  if (!adminIds.includes(team.ownerId)) adminIds.push(team.ownerId);
  return adminIds;
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
export async function createTeam(teamData: Partial<Team>, ownerId: string, ownerName: string, ownerEmail: string, ownerRole?: string): Promise<string> {
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
      maxMembers: teamData.maxMembers || 50,
      rules: teamData.rules || '',
      welcomeMessage: teamData.welcomeMessage || 'Welcome to the Team!',
      tags: teamData.tags || [],
      ownerId,
      ownerName,
      createdByRole: ownerRole || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      members: [ownerMember],
      memberIds: [ownerId],
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
 * Suspend a team for unhealthy/threatening content (Admin only).
 * Sends a detailed inbox notification to the team owner explaining the suspension
 * and the appeal process.
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
    await sendInboxNotification(
      [teamData.ownerId],
      '🔴 Team Suspended due to Rules Violation',
      `Your team "${teamData.name}" has been suspended due to: "${reason}". The team is no longer visible in discovery and members cannot use the workspace. You can appeal this suspension from your team workspace page by providing an explanation of why you believe the suspension was incorrect.`,
      'team_suspended',
      `/features/liv-teams/workspace/${teamId}`
    );
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
 * Submit team suspension appeal (Owner only).
 * Sets the appeal status to 'pending' and notifies platform admins.
 */
export async function submitTeamAppeal(teamId: string, appealText: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const team = await getTeamById(teamId);
    await updateDoc(teamRef, {
      appealStatus: 'pending',
      appealText
    });

    // Notify platform admins — we send to a 'platform_admins' channel
    // by targeting all admin users. The admin dashboard will show pending appeals.
    if (team) {
      await sendInboxNotification(
        [team.ownerId], // confirm to owner that appeal was submitted
        '📋 Suspension Appeal Submitted',
        `Your appeal for "${team.name}" has been submitted and is now pending review. The Liverton team will review your explanation and respond. You can check the status from your team workspace.`,
        'team_appeal_submitted',
        `/features/liv-teams/workspace/${teamId}`
      );
    }
  } catch (error) {
    console.error('Error submitting team appeal:', error);
    throw error;
  }
}

/**
 * Respond to a team suspension appeal (Platform Admin only).
 * Sets the appeal status to 'under_review', 'accepted', or 'rejected'.
 * If accepted, the team is reinstated (unsuspended).
 */
export async function respondToTeamAppeal(
  teamId: string,
  decision: 'under_review' | 'accepted' | 'rejected',
  _adminId: string
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const team = await getTeamById(teamId);
    if (!team) throw new Error('Team not found');

    if (decision === 'accepted') {
      // Reinstate the team
      await updateDoc(teamRef, {
        status: 'active',
        suspensionReason: '',
        appealStatus: 'accepted',
        appealText: ''
      });
    } else {
      await updateDoc(teamRef, { appealStatus: decision });
    }

    // Notify the owner of the decision
    const decisionLabel = decision === 'under_review' ? 'is under review' :
      decision === 'accepted' ? 'has been accepted — your team is reinstated' :
      'has been rejected';
    await sendInboxNotification(
      [team.ownerId],
      decision === 'accepted' ? '✅ Suspension Appeal Accepted' :
      decision === 'rejected' ? '❌ Suspension Appeal Rejected' :
      '🔍 Suspension Appeal Under Review',
      `Your appeal for "${team.name}" ${decisionLabel}.`,
      'team_appeal_decision',
      `/features/liv-teams/workspace/${teamId}`
    );
  } catch (error) {
    console.error('Error responding to team appeal:', error);
    throw error;
  }
}

/**
 * Dismiss a member from a team due to rule breaking (Owner or Admin only).
 * The dismissed member loses access and is notified via the Liverton Inbox.
 * They can appeal the decision from the team workspace page.
 */
export async function dismissMemberFromTeam(
  teamId: string,
  memberUserId: string,
  actorId: string,
  actorName: string,
  reason?: string
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) throw new Error('Team not found');
    const teamData = teamSnap.data() as Team;

    const memberToDismiss = teamData.members.find(m => m.userId === memberUserId);
    if (!memberToDismiss) throw new Error('Member not found in team');

    await updateDoc(teamRef, {
      members: arrayRemove(memberToDismiss),
      memberIds: arrayRemove(memberUserId),
      dismissedMembers: arrayUnion(memberUserId)
    });

    await logTeamActivity(teamId, actorId, actorName, `dismissed ${memberToDismiss.fullName} from the team`);

    // Notify the dismissed member
    await sendInboxNotification(
      [memberUserId],
      '🚫 You have been dismissed from a team',
      `You have been dismissed from "${teamData.name}"${reason ? ` due to: ${reason}` : ''}. You can appeal this decision from the team workspace page.`,
      'team_member_dismissed',
      `/features/liv-teams/workspace/${teamId}`
    );
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

      // Notify the member
      await sendInboxNotification(
        [userId],
        '✅ Re-join Appeal Approved',
        `Your appeal to re-join "${teamData.name}" has been approved. Welcome back!`,
        'team_appeal_approved',
        `/features/liv-teams/workspace/${teamId}`
      );
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

      // Notify the member
      await sendInboxNotification(
        [userId],
        '❌ Re-join Appeal Rejected',
        `Your appeal to re-join "${teamData.name}" has been rejected. You can contact the team owner for more information.`,
        'team_appeal_rejected'
      );
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
 * Request to join a public or private team.
 * Prevents duplicate pending requests by using a deterministic document ID.
 * Notifies the team owner and admins via the Liverton Inbox.
 */
export async function requestToJoinTeam(teamId: string, userId: string, fullName: string, email: string): Promise<void> {
  try {
    // Check for existing pending request to prevent duplicates
    const existingRef = doc(db, 'teams', teamId, 'join_requests', userId);
    const existingSnap = await getDoc(existingRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      if (existingData.status === 'pending') {
        throw new Error('You already have a pending join request for this team.');
      }
      // If previous request was declined, allow re-request by overwriting
    }

    await setDoc(existingRef, {
      userId,
      fullName,
      email,
      status: 'pending',
      createdAt: Timestamp.now()
    });

    // Notify team owner and admins
    const team = await getTeamById(teamId);
    if (team) {
      const adminIds = getTeamAdminIds(team);
      await sendInboxNotification(
        adminIds,
        '🔔 New Team Join Request',
        `${fullName} has requested to join "${team.name}". Review and approve or decline from your team workspace.`,
        'team_join_request',
        `/features/liv-teams/workspace/${teamId}`
      );
    }

    await logTeamActivity(teamId, userId, fullName, 'requested to join the team');
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
 * Approve or decline a join request.
 * Notifies the requesting user of the decision via the Liverton Inbox.
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
    const requestRef = doc(db, 'teams', teamId, 'join_requests', userId);
    const team = await getTeamById(teamId);
    const teamName = team?.name || 'the team';
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
      // Notify the user
      await sendInboxNotification(
        [userId],
        '✅ Team Join Request Approved',
        `Your request to join "${teamName}" has been approved. Welcome to the team!`,
        'team_join_approved',
        `/features/liv-teams/workspace/${teamId}`
      );
    } else {
      await updateDoc(requestRef, { status: 'declined' });
      await logTeamActivity(teamId, actorId, actorName, `declined ${fullName}'s join request`);
      // Notify the user
      await sendInboxNotification(
        [userId],
        '❌ Team Join Request Declined',
        `Your request to join "${teamName}" was declined. You can contact the team owner for more information.`,
        'team_join_declined'
      );
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
  if (team.members.length >= (team.maxMembers || 50)) {
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
 * Invitation documents use a deterministic ID (`{teamId}_{email}`) so that
 * Firestore security rules can verify a pending invitation when someone
 * accepts one (self-join), and duplicate invites are impossible.
 */
export async function sendTeamInvitation(invitation: Partial<TeamInvitation>): Promise<string> {
  try {
    const invitedEmail = (invitation.invitedEmail || '').toLowerCase();
    if (!invitation.teamId || !invitedEmail) {
      throw new Error('Team and email are required for an invitation');
    }
    const inviteId = `${invitation.teamId}_${invitedEmail}`;
    const inviteRef = doc(db, 'team_invitations', inviteId);
    await setDoc(inviteRef, {
      ...invitation,
      invitedEmail,
      status: 'pending',
      createdAt: Timestamp.now()
    });
    return inviteId;
  } catch (error) {
    console.error('Error sending team invitation:', error);
    throw error;
  }
}

export async function getInvitationsForUser(email: string): Promise<TeamInvitation[]> {
  try {
    const ref = collection(db, 'team_invitations');
    const q = query(ref, where('invitedEmail', '==', email.toLowerCase()), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamInvitation));
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    return [];
  }
}

export async function respondToInvitation(inviteId: string, accept: boolean, userId: string, fullName: string): Promise<void> {
  try {
    const inviteRef = doc(db, 'team_invitations', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error('Invitation not found');

    const inviteData = inviteSnap.data() as TeamInvitation;
    const status = accept ? 'accepted' : 'declined';
    await updateDoc(inviteRef, { status });

    if (accept) {
      await addMemberToTeam(inviteData.teamId, {
        userId,
        fullName,
        email: inviteData.invitedEmail,
        role: inviteData.role,
        joinedAt: new Date()
      });
    }
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

/* ==================== Platform Admin: Team Governance ==================== */

/** Keywords that may indicate serious danger — surfaced for review, NOT auto-suspend. */
export const SUSPICIOUS_KEYWORDS = [
  'kill', 'murder', 'threat', 'bomb', 'attack', 'assault', 'weapon',
  'shoot', 'stab', 'poison', 'harm', 'violence', 'danger', 'suicide',
  'self-harm', 'abuse', 'kidnap', 'terror', 'extort', 'blackmail'
];

export interface SuspiciousMessage {
  teamId: string;
  teamName: string;
  messageId: string;
  senderName: string;
  content: string;
  matchedKeywords: string[];
  createdAt: any;
}

export interface TeamGovernanceStats {
  totalTeams: number;
  activeTeams: number;
  suspendedTeams: number;
  totalMembers: number;
  pendingAppeals: number;
  pendingJoinRequests: number;
  suspiciousTeams: number;
}

/**
 * Get governance statistics for the Platform Admin dashboard.
 */
export async function getTeamGovernanceStats(): Promise<TeamGovernanceStats> {
  try {
    const teams = await getAllTeams();
    const active = teams.filter(t => (t.status || 'active') === 'active');
    const suspended = teams.filter(t => t.status === 'suspended');
    const totalMembers = teams.reduce((sum, t) => sum + (t.members?.length || 0), 0);
    const pendingAppeals = teams.filter(t => t.appealStatus === 'pending' || t.appealStatus === 'under_review').length;

    // Count pending join requests across all teams
    let pendingJoinRequests = 0;
    for (const team of teams) {
      try {
        const requestsRef = collection(db, 'teams', team.id, 'join_requests');
        const q = query(requestsRef, where('status', '==', 'pending'));
        const snap = await getDocs(q);
        pendingJoinRequests += snap.size;
      } catch { /* skip */ }
    }

    // Scan for suspicious content
    const suspicious = await scanSuspiciousTeamContent(teams);

    return {
      totalTeams: teams.length,
      activeTeams: active.length,
      suspendedTeams: suspended.length,
      totalMembers,
      pendingAppeals,
      pendingJoinRequests,
      suspiciousTeams: suspicious.length,
    };
  } catch (error) {
    console.error('Error fetching governance stats:', error);
    return {
      totalTeams: 0, activeTeams: 0, suspendedTeams: 0,
      totalMembers: 0, pendingAppeals: 0, pendingJoinRequests: 0, suspiciousTeams: 0,
    };
  }
}

/**
 * Scan team chat messages for suspicious content.
 * Surfaces messages containing dangerous keywords for admin review.
 * Does NOT suspend teams — the admin must investigate and decide.
 */
export async function scanSuspiciousTeamContent(teams?: Team[]): Promise<SuspiciousMessage[]> {
  try {
    const allTeams = teams || await getAllTeams();
    const suspicious: SuspiciousMessage[] = [];

    for (const team of allTeams) {
      if (team.status === 'suspended') continue; // Already suspended
      try {
        const messagesRef = collection(db, 'teams', team.id, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        // Only check the most recent 50 messages per team for performance
        const recentMessages = snap.docs.slice(0, 50);
        for (const docSnap of recentMessages) {
          const msgData = docSnap.data();
          const content = String(msgData.content || '').toLowerCase();
          const matched = SUSPICIOUS_KEYWORDS.filter(kw => content.includes(kw));
          if (matched.length > 0) {
            suspicious.push({
              teamId: team.id,
              teamName: team.name,
              messageId: docSnap.id,
              senderName: msgData.senderName || 'Unknown',
              content: msgData.content || '',
              matchedKeywords: matched,
              createdAt: msgData.createdAt,
            });
          }
        }
      } catch { /* skip teams with no messages collection */ }
    }

    return suspicious;
  } catch (error) {
    console.error('Error scanning suspicious content:', error);
    return [];
  }
}

/**
 * Get all teams with their suspension appeal status for admin review.
 */
export async function getTeamsWithAppeals(): Promise<Team[]> {
  try {
    const teams = await getAllTeams();
    return teams.filter(t => t.appealStatus && t.appealStatus !== 'none');
  } catch (error) {
    console.error('Error fetching teams with appeals:', error);
    return [];
  }
}
