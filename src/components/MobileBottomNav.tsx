import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, MessageSquare, Briefcase, MoreHorizontal, FileText, Calendar, Bell, Settings, X, Users, HeartHandshake, ShoppingBag, UserRound, LogOut, BarChart3, ClipboardList, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';
import { toast } from 'sonner';

type NavItem = { name: string; path: string; icon: React.ElementType; primary?: boolean; onClick?: () => void };
type Role = 'student' | 'teacher' | 'parent' | 'school_admin' | 'platform_admin';

const homeFor = (role: Role) => ({
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  school_admin: '/school-admin/dashboard',
  platform_admin: '/admin/dashboard'
}[role]);

const roleNavigation = (role: Role, openMore: () => void): { main: NavItem[]; secondary: NavItem[] } => {
  const common: NavItem[] = [
    { name: 'Messages', path: '/chat', icon: MessageSquare },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Announcements', path: '/announcements', icon: Bell },
    { name: 'Documents', path: '/dashboard/documents', icon: FileText },
    { name: 'Profile', path: '/profile', icon: UserRound },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];
  const home: NavItem = { name: 'Home', path: homeFor(role), icon: Home };
  const more: NavItem = { name: 'More', path: '#more', icon: MoreHorizontal, onClick: openMore };

  if (role === 'teacher') {
    return {
      main: [home, { name: 'Modules', path: '/teacher/courses', icon: BookOpen }, { name: 'Chats', path: '/chat', icon: MessageSquare, primary: true } , { name: 'Teams', path: '/features/liv-teams', icon: Users }, more],
      secondary: [{ name: 'Educators Workhub', path: '/features/tearn', icon: Briefcase }, { name: 'My modules', path: '/teacher/courses', icon: BookOpen }, { name: 'Liv Teams', path: '/features/liv-teams', icon: Users }, { name: 'Liv Fund', path: '/features/liv-fund', icon: HeartHandshake }, { name: 'Liv Mart', path: '/features/liv-mart', icon: ShoppingBag }, ...common]
    };
  }

  if (role === 'parent') {
    return {
      main: [home, { name: 'Learners', path: '/parent/students', icon: Users }, { name: 'Messages', path: '/chat', icon: MessageSquare }, { name: 'Progress', path: '/parent/performance', icon: BarChart3 }, more],
      secondary: [{ name: 'Learners', path: '/parent/students', icon: Users }, { name: 'Progress', path: '/parent/performance', icon: BarChart3 }, { name: 'My modules', path: '/parent/courses', icon: BookOpen }, { name: 'Liv Mart', path: '/features/liv-mart', icon: ShoppingBag }, ...common.filter(item => item.name !== 'Messages')]
    };
  }

  if (role === 'school_admin' || role === 'platform_admin') {
    return {
      main: [home, { name: 'Reports', path: '/features/analytics', icon: BarChart3 }, { name: 'People', path: role === 'school_admin' ? '/school-admin/teachers' : '/admin/users', icon: Users }, { name: 'Approvals', path: '/announcements', icon: ClipboardList }, more],
      secondary: [{ name: 'Reports', path: '/features/analytics', icon: BarChart3 }, { name: 'People', path: role === 'school_admin' ? '/school-admin/teachers' : '/admin/users', icon: Users }, ...common]
    };
  }

  return {
    main: [home, { name: 'Modules', path: '/student/courses', icon: BookOpen }, { name: 'Messages', path: '/chat', icon: MessageSquare }, { name: 'Explore', path: '/features/liv-mart', icon: ShoppingBag }, more],
    secondary: [{ name: 'My modules', path: '/student/courses', icon: BookOpen }, { name: 'Messages', path: '/chat', icon: MessageSquare }, { name: 'Liv Mart', path: '/features/liv-mart', icon: ShoppingBag }, ...common.filter(item => item.name !== 'Messages')]
  };
};

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const role = (userRole || 'student') as Role;
  const [showMore, setShowMore] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigation = useMemo(() => roleNavigation(role, () => setShowMore(true)), [role]);

  const isActive = (path: string) => path !== '#more' && (location.pathname === path || location.pathname.startsWith(`${path}/`));
  const go = (path: string) => { setShowMore(false); navigate(path); };
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); toast.success('You are signed out'); navigate('/login'); }
    catch { toast.error('Could not sign out'); }
    finally { setIsLoggingOut(false); setShowLogoutConfirm(false); }
  };

  return <>
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_12px_35px_rgba(15,23,42,.16)] px-2 py-2" aria-label={`${role} mobile navigation`}>
      <div className="flex items-center justify-between gap-1">
        {navigation.main.map(item => { const Icon = item.icon; const active = isActive(item.path); return <button key={item.name} onClick={() => item.onClick ? item.onClick() : navigate(item.path)} aria-label={item.name} className={item.primary ? 'flex min-w-[76px] flex-col items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-2 text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95' : `flex min-w-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ${active ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><Icon className="h-5 w-5" /><span className="max-w-[72px] truncate">{item.name}</span></button>; })}
      </div>
    </nav>

    {showMore && <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-end" onClick={() => setShowMore(false)}>
      <div className="w-full rounded-t-[28px] border-t border-slate-200 bg-[#f7f7fb] p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-200/80 pb-4 mb-3 dark:border-slate-800"><div><span className="text-[10px] uppercase tracking-[.16em] text-slate-400">{role.replace('_', ' ')} space</span><h3 className="text-xl font-semibold tracking-tight">More tools</h3></div><button onClick={() => setShowMore(false)} className="rounded-full bg-white p-2 text-slate-500 dark:bg-slate-800" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-3 gap-2 py-2">{navigation.secondary.map(item => { const Icon = item.icon; return <button key={item.name} onClick={() => go(item.path)} className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${isActive(item.path) ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}><span className="rounded-xl bg-slate-100 p-2 dark:bg-slate-700"><Icon className="h-5 w-5" /></span><span className="text-center text-[11px] font-medium">{item.name}</span></button>; })}</div>
        <button onClick={toggleTheme} aria-pressed={theme === 'dark'} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"><span className="rounded-lg bg-slate-100 p-1.5 dark:bg-slate-700">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
        <button onClick={() => { setShowMore(false); setShowLogoutConfirm(true); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"><LogOut className="h-4 w-4" /> Log out</button>
      </div>
    </div>}
    <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} onConfirm={handleLogout} isLoading={isLoggingOut} />
  </>;
};
