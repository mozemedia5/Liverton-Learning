import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { TeamRole } from '@/types/livTeams';
import { teamRoleLabel } from './livTeamsUtils';

/* ------------------------------------------------------------------ */
/* Loading state (matches the rest of Liverton Learning)               */
/* ------------------------------------------------------------------ */

export function LivLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

interface LivEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function LivEmptyState({ icon, title, description, children }: LivEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
      <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

interface LivSectionHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function LivSectionHeader({ title, subtitle, children }: LivSectionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="space-y-0.5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card (dashboard style)                                         */
/* ------------------------------------------------------------------ */

export type LivStatColor = 'blue' | 'green' | 'purple' | 'orange' | 'emerald' | 'teal' | 'indigo' | 'violet' | 'amber' | 'rose';

const statColorMap: Record<LivStatColor, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
  green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
  purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  teal: 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400',
  indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
  violet: 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400',
};

interface LivStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color?: LivStatColor;
  hint?: string;
}

export function LivStatCard({ icon, label, value, color = 'emerald', hint }: LivStatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${statColorMap[color]}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{label}</p>
            <p className="text-xl font-bold truncate">{value}</p>
            {hint && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Team role badge                                                     */
/* ------------------------------------------------------------------ */

const roleBadgeStyles: Partial<Record<TeamRole, string>> = {
  owner: 'bg-emerald-500 text-white border-transparent',
  admin: 'bg-blue-500 text-white border-transparent',
  moderator: 'bg-violet-500 text-white border-transparent',
  project_manager: 'bg-amber-500 text-white border-transparent',
  treasurer: 'bg-teal-500 text-white border-transparent',
  secretary: 'bg-rose-500 text-white border-transparent',
  teacher_mentor: 'bg-indigo-500 text-white border-transparent',
  student_member: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10',
  guest: 'bg-transparent text-slate-400 border-slate-300 dark:border-white/10',
};

export function TeamRoleBadge({ role, className = '' }: { role?: TeamRole | string; className?: string }) {
  const style = roleBadgeStyles[(role || 'guest') as TeamRole] || roleBadgeStyles.guest!;
  return (
    <Badge variant="outline" className={`capitalize ${style} ${className}`}>
      {teamRoleLabel(role)}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Team logo (image with emerald initial fallback)                     */
/* ------------------------------------------------------------------ */

interface TeamLogoProps {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const logoSizes = {
  sm: 'w-8 h-8 rounded-lg text-sm',
  md: 'w-12 h-12 rounded-xl text-base',
  lg: 'w-14 h-14 rounded-2xl text-lg',
  xl: 'w-24 h-24 rounded-2xl text-3xl',
};

export function TeamLogo({ name, logoUrl, size = 'md', className = '' }: TeamLogoProps) {
  const sizing = logoSizes[size];
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${sizing} object-cover flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`${sizing} bg-emerald-500 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
