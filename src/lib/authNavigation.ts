import type { UserRole } from '@/types';

/**
 * Public-facing labels intentionally differ from legacy Firestore role keys.
 * Keep the keys stable for backwards compatibility while presenting inclusive language.
 */
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

export function getDashboardRoute(role: UserRole | null | undefined): string | null {
  return role ? dashboardRoutes[role] ?? null : null;
}

export function getRoleLabel(role: string | null | undefined): string {
  return roleLabels[(role || 'student') as UserRole] || 'Student';
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
