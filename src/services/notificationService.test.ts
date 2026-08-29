import { describe, expect, it } from 'vitest';
import { isNotificationVisibleToUser } from './notificationService';

describe('notification audience matching', () => {
  it('delivers an all-user notification to every role', () => {
    const notification = { id: 'all', targetAudience: ['all'] };
    expect(isNotificationVisibleToUser(notification, 'student-1', 'student@example.com', 'student')).toBe(true);
    expect(isNotificationVisibleToUser(notification, 'teacher-1', 'teacher@example.com', 'teacher')).toBe(true);
    expect(isNotificationVisibleToUser({ id: 'all-string', targetAudience: 'all' }, 'parent-1', null, 'parent')).toBe(true);
  });

  it('delivers a direct user or email notification only to the intended person', () => {
    const direct = { id: 'direct', targetUsers: ['student-1'] };
    expect(isNotificationVisibleToUser(direct, 'student-1', 'one@example.com', 'student')).toBe(true);
    expect(isNotificationVisibleToUser(direct, 'student-2', 'two@example.com', 'student')).toBe(false);
    expect(isNotificationVisibleToUser({ id: 'email', targetEmail: 'one@example.com' }, 'student-2', 'ONE@EXAMPLE.COM', 'student')).toBe(true);
  });

  it('supports both plural and singular role audience values', () => {
    expect(isNotificationVisibleToUser({ id: 'plural', targetAudience: ['students'] }, 'student-1', null, 'student')).toBe(true);
    expect(isNotificationVisibleToUser({ id: 'singular', targetAudience: ['teacher'] }, 'teacher-1', null, 'teacher')).toBe(true);
    expect(isNotificationVisibleToUser({ id: 'other', targetAudience: ['teachers'] }, 'student-1', null, 'student')).toBe(false);
  });

  it('allows a sender to see their own notification', () => {
    expect(isNotificationVisibleToUser({ id: 'sent', senderId: 'teacher-1' }, 'teacher-1', null, 'teacher')).toBe(true);
  });
});
