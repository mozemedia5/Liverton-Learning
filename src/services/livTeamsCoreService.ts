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
  'Innovation', 'Robotics', 'AI', 'Coding', 'Startup', 'Agriculture',
  'Debate', 'Entrepreneurship', 'School Club', 'Savings', 'Other'
];

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
      maxMembers: teamData.maxMembers || 50,
      rules: teamData.rules || '',
      welcomeMessage: teamData.welcomeMessage || 'Welcome to the Team!',
      tags: teamData.tags || [],
      ownerId,
      ownerName,
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
