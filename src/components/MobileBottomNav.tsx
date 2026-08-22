import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, MessageSquare, Briefcase, MoreHorizontal, FileText, Calendar, Bell, Settings, X, Users, HeartHandshake, ShoppingBag, UserRound, LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';
import { toast } from 'sonner';

const homeFor = (role: string | null) => role === 'teacher' ? '/teacher/dashboard' : role === 'parent' ? '/parent/dashboard' : role === 'school_admin' ? '/school-admin/dashboard' : role === 'platform_admin' ? '/admin/dashboard' : '/student/dashboard';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, logout } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const homePath = homeFor(userRole);

  const mainNavItems = useMemo(() => [
    { name: 'Home', path: homePath, icon: Home },
    { name: 'Modules', path: userRole === 'teacher' ? '/teacher/courses' : userRole === 'parent' ? '/parent/courses' : '/student/courses', icon: BookOpen },
    ...(userRole === 'teacher' ? [{ name: 'Create', path: '/features/tearn', icon: Plus, isPrimary: true, onClick: () => navigate('/features/tearn') }] : [{ name: 'Workhub', path: '/features/tearn', icon: Briefcase, isPrimary: true }]),
    ...(userRole === 'teacher' ? [] : [{ name: 'Workhub', path: '/features/tearn', icon: Briefcase }]),
    { name: 'More', path: '#more', icon: MoreHorizontal, onClick: () => setShowMore(true) },
  ], [homePath, userRole]);

  const secondaryNavItems = [
    { name: 'Documents', path: '/dashboard/documents', icon: FileText },
    { name: 'Messages', path: '/chat', icon: MessageSquare },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Announcements', path: '/announcements', icon: Bell },
    { name: 'Liv Teams', path: '/features/liv-teams', icon: Users },
    { name: 'Liv Fund', path: '/features/liv-fund', icon: HeartHandshake },
    { name: 'Liv Mart', path: '/features/liv-mart', icon: ShoppingBag },
    { name: 'Profile', path: '/profile', icon: UserRound },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => path !== '#more' && (location.pathname === path || location.pathname.startsWith(`${path}/`));
  const go = (path: string) => { setShowMore(false); navigate(path); };
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); toast.success('You are signed out'); navigate('/login'); }
    catch { toast.error('Could not sign out'); }
    finally { setIsLoggingOut(false); setShowLogoutConfirm(false); }
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-[24px] shadow-lg px-2 py-2 transition-all" aria-label="Mobile navigation">
        <div className="flex items-center justify-around">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            if (item.isPrimary) return <button key={item.name} onClick={() => item.onClick ? item.onClick() : navigate(item.path)} className="relative -top-5 flex items-center justify-center w-12 h-12 rounded-full bg-[#151515] text-[#c9f36b] shadow-md hover:scale-105 active:scale-95 transition-all" aria-label={item.name}><Icon className="w-5 h-5" /></button>;
            return <button key={item.name} onClick={() => item.onClick ? item.onClick() : navigate(item.path)} className={`flex flex-col items-center justify-center min-w-12 py-1 text-xs font-medium transition-colors ${active ? 'text-[#151515] dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}`}><Icon className={`w-5 h-5 mb-0.5 ${active ? 'scale-110' : ''} transition-transform`} /><span className="text-[10px] tracking-tight">{item.name}</span></button>;
          })}
        </div>
      </nav>

      {showMore && <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-end" onClick={() => setShowMore(false)}>
        <div className="w-full bg-[#f7f7fb] dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[28px] p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
          <div className="flex items-start justify-between pb-4 mb-3 border-b border-slate-200/80 dark:border-slate-800"><div><span className="text-[10px] uppercase tracking-[.16em] text-slate-400">Liverton space</span><h3 className="text-xl font-semibold tracking-tight">Everything in one place</h3></div><button onClick={() => setShowMore(false)} className="p-2 rounded-full bg-white dark:bg-slate-800 text-slate-500"><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-3 gap-2 py-2">{secondaryNavItems.map(item => { const Icon = item.icon; return <button key={item.name} onClick={() => go(item.path)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${isActive(item.path) ? 'bg-[#151515] text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}><span className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-700"><Icon className="w-5 h-5" /></span><span className="text-[11px] font-medium text-center">{item.name}</span></button>; })}</div>
          <button onClick={() => { setShowMore(false); setShowLogoutConfirm(true); }} className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 text-sm font-semibold"><LogOut className="w-4 h-4" /> Log out</button>
        </div>
      </div>}
      <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} onConfirm={handleLogout} isLoading={isLoggingOut} />
    </>
  );
};
