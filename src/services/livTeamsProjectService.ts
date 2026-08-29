import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TeamProject, TeamTask, TeamFolderFile, TeamMilestone, TeamFolderRequest } from '@/types/livTeams';
import { getTeamById, logTeamActivity } from './livTeamsCoreService';
import { isValidProjectTransition } from './livTeamsGovernanceService';

/**
 * Projects CRUD
 */
export async function createTeamProject(teamId: string, project: Partial<TeamProject>, userId: string, userName: string): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'projects');
    const finalProject = {
      ...project,
      teamId,
      // Every new project starts at the first lifecycle stage; callers cannot skip Idea.
      status: 'Idea',
      ownerId: project.ownerId || userId,
      members: project.members && project.members.length > 0 ? project.members : [userId],
      memberRoles: project.memberRoles || { [userId]: 'Project Owner' },
      milestones: project.milestones || [],
      currency: project.currency || 'UGX',
      progress: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(ref, finalProject);
    await logTeamActivity(teamId, userId, userName, 'created project', finalProject.name);
    return docRef.id;
  } catch (error) {
    console.error('Error creating team project:', error);
    throw error;
  }
}

export async function getTeamProjects(teamId: string): Promise<TeamProject[]> {
  try {
    const ref = collection(db, 'teams', teamId, 'projects');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamProject));
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export async function updateTeamProject(teamId: string, projectId: string, updates: Partial<TeamProject>, userId: string, userName: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'projects', projectId);
    const current = await getDoc(docRef);
    if (!current.exists()) throw new Error('Project not found');
    const currentProject = current.data() as TeamProject;
    if (updates.status && !isValidProjectTransition(currentProject.status, updates.status)) {
      throw new Error(`Invalid project transition from ${currentProject.status} to ${updates.status}`);
    }
    if (updates.status === 'Completed' && currentProject.status !== 'Completed') {
      const milestones = await getTeamMilestones(teamId, projectId);
      if (milestones.length === 0) throw new Error('Add and complete at least one milestone before completing this project');
      if (milestones.some(milestone => !milestone.isCompleted)) throw new Error('Complete every project milestone before moving to Completed');
    }
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    await logTeamActivity(teamId, userId, userName, `updated project details for ${updates.name || 'a project'}`);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

export async function deleteTeamProject(teamId: string, projectId: string, userId: string, userName: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'projects', projectId);
    await deleteDoc(docRef);
    await logTeamActivity(teamId, userId, userName, 'deleted a project');
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

/**
 * Tasks CRUD
 */
export async function createTeamTask(teamId: string, projectId: string, task: Partial<TeamTask>, userId: string, userName: string): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'tasks');
    const finalTask = {
      ...task,
      teamId,
      projectId,
      priority: task.priority || 'medium',
      status: task.status || (task.isCompleted ? 'Completed' : 'Todo'),
      createdBy: task.createdBy || userId,
      assignedMembers: task.assignedMembers || [],
      attachments: task.attachments || [],
      checklist: task.checklist || [],
      comments: task.comments || [],
      progress: task.progress || 0,
      isCompleted: task.isCompleted || false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(ref, finalTask);
    await logTeamActivity(teamId, userId, userName, 'created task', finalTask.title);

    // Send task assignment alerts to Liverton Inbox
    if (finalTask.assignedMembers && finalTask.assignedMembers.length > 0) {
      for (const assigneeId of finalTask.assignedMembers) {
        await addDoc(collection(db, 'notifications'), {
          title: `📝 New Task Assigned: "${finalTask.title}"`,
          content: `You have been assigned a new task "${finalTask.title}". Please review and complete your deliverables!`,
          type: 'announcement',
          targetAudience: [],
          targetUsers: [assigneeId],
          sender: userName,
          senderId: userId,
          createdAt: Timestamp.now()
        });
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

export async function getTeamTasks(teamId: string): Promise<TeamTask[]> {
  try {
    const ref = collection(db, 'teams', teamId, 'tasks');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamTask));
  } catch (error) {
    console.error('Error fetching team tasks:', error);
    return [];
  }
}

export async function updateTeamTask(teamId: string, taskId: string, updates: Partial<TeamTask>): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'tasks', taskId);
    const nextStatus = updates.status || (updates.isCompleted ? 'Completed' : undefined);
    await updateDoc(docRef, {
      ...updates,
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextStatus === 'Completed' ? { isCompleted: true, progress: 100 } : {}),
      updatedAt: Timestamp.now()
    });

    const taskSnapshot = await getDoc(docRef);
    if (taskSnapshot.exists()) {
      const taskData = taskSnapshot.data() as TeamTask;
      const siblingTasks = await getTeamTasks(teamId);
      const projectTasks = siblingTasks.filter(task => task.projectId === taskData.projectId);
      const progress = projectTasks.length
        ? Math.round(projectTasks.reduce((sum, task) => sum + (task.id === taskId ? (nextStatus === 'Completed' ? 100 : (updates.progress ?? task.progress ?? 0)) : (task.isCompleted ? 100 : task.progress || 0)), 0) / projectTasks.length)
        : 0;
      await updateDoc(doc(db, 'teams', teamId, 'projects', taskData.projectId), { progress, updatedAt: Timestamp.now() });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

export async function createTeamMilestone(
  teamId: string,
  projectId: string,
  milestone: Partial<TeamMilestone>,
  userId: string,
  userName: string
): Promise<string> {
  const ref = collection(db, 'teams', teamId, 'milestones');
  const finalMilestone = {
    ...milestone,
    teamId,
    projectId,
    taskIds: milestone.taskIds || [],
    responsibleUserIds: milestone.responsibleUserIds || [],
    evidenceFileIds: milestone.evidenceFileIds || [],
    isCompleted: false,
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  const docRef = await addDoc(ref, finalMilestone);
  await logTeamActivity(teamId, userId, userName, 'created a milestone', milestone.title);
  return docRef.id;
}

export async function getTeamMilestones(teamId: string, projectId: string): Promise<TeamMilestone[]> {
  const ref = collection(db, 'teams', teamId, 'milestones');
  const snap = await getDocs(query(ref, orderBy('createdAt', 'asc')));
  return snap.docs
    .map(snapshot => ({ id: snapshot.id, ...snapshot.data() } as TeamMilestone))
    .filter(milestone => milestone.projectId === projectId);
}

export async function updateTeamMilestone(
  teamId: string,
  milestoneId: string,
  updates: Partial<TeamMilestone>,
  userId: string,
  userName: string
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'milestones', milestoneId), {
    ...updates,
    updatedAt: Timestamp.now()
  });
  await logTeamActivity(teamId, userId, userName, updates.isCompleted ? 'completed a milestone' : 'updated a milestone');
}

export function deriveProjectProgress(project: TeamProject, tasks: TeamTask[], milestones: TeamMilestone[] = []): number {
  const projectTasks = tasks.filter(task => task.projectId === project.id);
  const taskScore = projectTasks.length
    ? projectTasks.reduce((sum, task) => sum + (task.status === 'Completed' || task.isCompleted ? 100 : task.progress || 0), 0) / projectTasks.length
    : 0;
  const milestoneScore = milestones.length
    ? milestones.reduce((sum, milestone) => sum + (milestone.isCompleted ? 100 : 0), 0) / milestones.length
    : 0;
  if (!projectTasks.length && !milestones.length) return project.progress || 0;
  if (!projectTasks.length) return Math.round(milestoneScore);
  if (!milestones.length) return Math.round(taskScore);
  return Math.round((taskScore + milestoneScore) / 2);
}

/**
 * Shared Resources Library
 */
export async function uploadTeamFile(teamId: string, fileData: Partial<TeamFolderFile>, userId: string, userName: string): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'files');
    const finalFile = {
      ...fileData,
      teamId,
      uploadedBy: userId,
      uploadedByName: userName,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(ref, finalFile);
    await logTeamActivity(teamId, userId, userName, `uploaded file "${fileData.name}" into folder ${fileData.folder}`);
    return docRef.id;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function getTeamFiles(teamId: string): Promise<TeamFolderFile[]> {
  try {
    const ref = collection(db, 'teams', teamId, 'files');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamFolderFile));
  } catch (error) {
    console.error('Error fetching team files:', error);
    return [];
  }
}

export async function createTeamFolderRequest(teamId: string, name: string, userId: string, userName: string): Promise<string> {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  if (normalizedName.length < 2 || normalizedName.length > 40) throw new Error('Folder name must be between 2 and 40 characters');
  const team = await getTeamById(teamId);
  const member = team?.members?.find(candidate => candidate.userId === userId);
  if (!member) throw new Error('Team membership required');
  const existing = await getDocs(collection(db, 'teams', teamId, 'folderRequests'));
  const duplicate = existing.docs.some(item => String(item.data().name || '').toLowerCase() === normalizedName.toLowerCase() && item.data().status !== 'rejected');
  if (duplicate) throw new Error('That folder already exists or is awaiting approval');
  const record = {
    teamId,
    name: normalizedName,
    requestedBy: userId,
    requestedByName: userName,
    status: 'pending' as const,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } satisfies Omit<TeamFolderRequest, 'id'>;
  const ref = await addDoc(collection(db, 'teams', teamId, 'folderRequests'), record);
  await logTeamActivity(teamId, userId, userName, `requested a new folder: ${normalizedName}`);
  return ref.id;
}

export async function getTeamFolderRequests(teamId: string): Promise<TeamFolderRequest[]> {
  const snapshot = await getDocs(query(collection(db, 'teams', teamId, 'folderRequests'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as TeamFolderRequest));
}

export async function reviewTeamFolderRequest(teamId: string, requestId: string, status: 'approved' | 'rejected', reviewerId: string, reviewerName: string): Promise<void> {
  const team = await getTeamById(teamId);
  const reviewer = team?.members?.find(candidate => candidate.userId === reviewerId);
  if (!reviewer || !['owner', 'admin'].includes(reviewer.role)) throw new Error('Only the team owner or administrator can review folders');
  await updateDoc(doc(db, 'teams', teamId, 'folderRequests', requestId), { status, reviewedBy: reviewerId, updatedAt: Timestamp.now() });
  await logTeamActivity(teamId, reviewerId, reviewerName, `${status} a team folder request`);
}

export async function deleteTeamFile(teamId: string, fileId: string, userId: string, userName: string): Promise<void> {
  try {
    const docRef = doc(db, 'teams', teamId, 'files', fileId);
    await deleteDoc(docRef);
    await logTeamActivity(teamId, userId, userName, 'deleted a file from library');
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}
