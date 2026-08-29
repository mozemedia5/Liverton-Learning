import type { TeamRole } from '@/types/livTeams';

export function formatUGX(amount: number): string {
  return `UGX ${(amount || 0).toLocaleString()}`;
}

export function teamRoleLabel(role?: TeamRole | string): string {
  return (role || 'guest').replace(/_/g, ' ');
}
