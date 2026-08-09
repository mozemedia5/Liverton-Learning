import { describe, it, expect } from 'vitest';
import { canManageTask } from '@/services/livTeamsProjectService';
import type { TeamTask, TeamRole } from '@/types/livTeams';

describe('canManageTask', () => {
  const baseTask: TeamTask = {
    id: 'task-1',
    teamId: 'team-1',
    projectId: 'proj-1',
    title: 'Test Task',
    description: '',
    deadline: '',
    priority: 'medium',
    assignedMembers: ['user-A'],
    attachments: [],
    checklist: [],
    comments: [],
    progress: 0,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('allows the assigned member to manage the task', () => {
    expect(canManageTask('user-A', 'student_member', baseTask)).toBe(true);
  });

  it('blocks a non-assigned regular member from managing the task', () => {
    expect(canManageTask('user-B', 'student_member', baseTask)).toBe(false);
  });

  it('allows owner to manage any task regardless of assignment', () => {
    expect(canManageTask('owner-1', 'owner', baseTask)).toBe(true);
  });

  it('allows admin to manage any task regardless of assignment', () => {
    expect(canManageTask('admin-1', 'admin', baseTask)).toBe(true);
  });

  it('allows project_manager to manage any task regardless of assignment', () => {
    expect(canManageTask('pm-1', 'project_manager', baseTask)).toBe(true);
  });

  it('allows any member to manage an unassigned task', () => {
    const unassignedTask = { ...baseTask, assignedMembers: [] };
    expect(canManageTask('user-B', 'student_member', unassignedTask)).toBe(true);
  });

  it('blocks guests from managing any task', () => {
    expect(canManageTask('user-A', 'guest', baseTask)).toBe(false);
  });

  it('allows the second assignee in a multi-assignee task', () => {
    const multiAssigneeTask = { ...baseTask, assignedMembers: ['user-A', 'user-C'] };
    expect(canManageTask('user-C', 'student_member', multiAssigneeTask)).toBe(true);
  });
});
