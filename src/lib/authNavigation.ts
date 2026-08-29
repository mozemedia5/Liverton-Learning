import type { UserRole } from '@/types';

/**
 * Public-facing labels intentionally differ from legacy Firestore role keys.
 * Keep the keys stable for backwards compatibility while presenting inclusive language.
 */
const roleAliases: Record<string, UserRole> = {
  educator: 'teacher',
  educators: 'teacher',
  organization: 'school_admin',
  organisations: 'school_admin',
  organizations: 'school_admin',
  org_admin: 'school_admin',
  learner: 'student',
  learners: 'student',
};

export function normalizeUserRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();
  if (normalized in roleAliases) return roleAliases[normalized];
  if (normalized === 'student' || normalized === 'teacher' || normalized === 'school_admin' || normalized === 'parent' || normalized === 'platform_admin') {
    return normalized as UserRole;
  }
  return null;
}

export const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  teacher: 'Educator',
  school_admin: 'Organization',
  parent: 'Parent',
  platform_admin: 'Platform Administrator',
};

export const dashboardRoutes: Record<UserRole, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  school_admin: '/school-admin/dashboard',
  parent: '/parent/dashboard',
  platform_admin: '/admin/dashboard',
};

export function getDashboardRoute(role: UserRole | string | null | undefined): string | null {
  const normalized = normalizeUserRole(role);
  return normalized ? dashboardRoutes[normalized] ?? null : null;
}

export function getRoleLabel(role: string | null | undefined): string {
  const normalized = normalizeUserRole(role) || 'student';
  return roleLabels[normalized] || 'Student';
}

export function getAuthErrorMessage(error: unknown, provider: 'Google' | 'Apple' | 'email/password'): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  if (code === 'auth/unauthorized-domain') {
    return `${provider} sign-in is blocked because ${window.location.hostname} is not an authorized Firebase Auth domain. Add this exact hostname in Firebase Console → Authentication → Settings → Authorized domains, then redeploy.`;
  }
  if (code === 'auth/popup-blocked') {
    return `${provider} sign-in was blocked by the browser. Allow pop-ups for this site and try again.`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return `${provider} sign-in was cancelled before it completed.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return `${provider} sign-in failed. Please try again.`;
}
