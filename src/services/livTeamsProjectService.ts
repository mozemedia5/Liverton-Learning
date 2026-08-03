import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TeamProject, TeamTask, TeamFolderFile } from '@/types/livTeams';
import { logTeamActivity } from './livTeamsCoreService';

/**
 * Projects CRUD
 */
export async function createTeamProject(teamId: string, project: Partial<TeamProject>, userId: string, userName: string): Promise<string> {
  try {
    const ref = collection(db, 'teams', teamId, 'projects');
    const finalProject = {
      ...project,
      teamId,
      status: project.status || 'Idea',
      members: project.members || [],
      milestones: project.milestones || [],
      progress: project.progress || 0,
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
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
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
