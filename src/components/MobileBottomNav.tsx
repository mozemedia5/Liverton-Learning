import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, CalendarDays, GraduationCap, Home, LayoutGrid, Menu, MessageCircle, Plus, Settings, ShoppingBag, Sparkles, Users, WalletCards, X } from 'lucide-react';
import type { UserRole } from '@/types';

type Tab = { label: string; path?: string; icon: React.ElementType; action?: 'create' | 'more' };

const homeFor = (role: UserRole | null) => role === 'teacher' ? '/teacher/dashboard' : role === 'parent' ? '/parent/dashboard' : role === 'school_admin' ? '/school-admin/dashboard' : '/student/dashboard';

export function MobileBottomNav({ userRole }: { userRole: UserRole | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = useMemo<Tab[]>(() => {
    if (userRole === 'teacher') return [{ label: 'Home', path: homeFor(userRole), icon: Home }, { label: 'Modules', path: '/teacher/courses', icon: BookOpen }, { label: 'Create', icon: Plus, action: 'create' }, { label: 'Learners', path: '/teacher/students', icon: Users }, { label: 'More', icon: Menu, action: 'more' }];
    if (userRole === 'parent') return [{ label: 'Home', path: homeFor(userRole), icon: Home }, { label: 'Children', path: '/parent/students', icon: Users }, { label: 'Progress', path: '/parent/performance', icon: BarChart3 }, { label: 'Messages', path: '/chat', icon: MessageCircle }, { label: 'More', icon: Menu, action: 'more' }];
    if (userRole === 'school_admin') return [{ label: 'Home', path: homeFor(userRole), icon: Home }, { label: 'People', path: '/school-admin/students', icon: Users }, { label: 'Projects', path: '/features/liv-teams', icon: LayoutGrid }, { label: 'Reports', path: '/admin/analytics', icon: BarChart3 }, { label: 'More', icon: Menu, action: 'more' }];
    return [{ label: 'Home', path: homeFor(userRole), icon: Home }, { label: 'Learn', path: '/student/courses', icon: BookOpen }, { label: 'Progress', path: '/student/quizzes', icon: BarChart3 }, { label: 'Teams', path: '/features/liv-teams', icon: Users }, { label: 'More', icon: Menu, action: 'more' }];
  }, [userRole]);

  const moreItems = userRole === 'teacher'
    ? [{ label: 'Assessments', path: '/teacher/quizzes', icon: GraduationCap }, { label: 'Liv Teams', path: '/features/liv-teams', icon: Users }, { label: 'Insights', path: '/features/analytics', icon: BarChart3 }, { label: 'Earnings', path: '/payments', icon: WalletCards }]
    : userRole === 'parent'
      ? [{ label: 'Courses', path: '/parent/courses', icon: BookOpen }, { label: 'School fees', path: '/parent/fees', icon: WalletCards }, { label: 'Calendar', path: '/calendar', icon: CalendarDays }, { label: 'Marketplace', path: '/features/liv-mart', icon: ShoppingBag }]
      : [{ label: 'Calendar', path: '/calendar', icon: CalendarDays }, { label: 'Short learning', path: '/features/tearn/shorts', icon: Sparkles }, { label: 'Marketplace', path: '/features/liv-mart', icon: ShoppingBag }, { label: 'Settings', path: '/settings', icon: Settings }];

  const isActive = (path?: string) => Boolean(path && (location.pathname === path || location.pathname.startsWith(`${path}/`)));
  const handleTab = (tab: Tab) => {
    if (tab.action === 'more') setMoreOpen((open) => !open);
    else if (tab.action === 'create') navigate('/teacher/courses/create');
    else if (tab.path) { setMoreOpen(false); navigate(tab.path); }
  };

  return (
    <>
      {moreOpen && <div className="liv-mobile-sheet-backdrop" onClick={() => setMoreOpen(false)} />}
      {moreOpen && <section className="liv-mobile-sheet" aria-label="More navigation"><div className="liv-sheet-head"><div><span>Workspace</span><h2>More from Liverton</h2></div><button onClick={() => setMoreOpen(false)} aria-label="Close menu"><X size={19} /></button></div><div className="liv-sheet-grid">{moreItems.map(({ label, path, icon: Icon }) => <button key={path} onClick={() => { setMoreOpen(false); navigate(path); }}><span><Icon size={19} /></span><strong>{label}</strong></button>)}</div><button className="liv-sheet-profile" onClick={() => { setMoreOpen(false); navigate('/profile'); }}><span><Settings size={18} /></span><div><strong>Profile & settings</strong><small>Manage your Liverton account</small></div></button></section>}
      <nav className="liv-mobile-nav" aria-label="Mobile navigation">
        {tabs.map((tab) => { const Icon = tab.icon; const active = isActive(tab.path); return <button key={tab.label} onClick={() => handleTab(tab)} className={`${active ? 'is-active' : ''} ${tab.action === 'create' ? 'liv-mobile-create' : ''}`} aria-label={tab.label}><span className="liv-mobile-icon"><Icon size={tab.action === 'create' ? 22 : 19} /></span><small>{tab.label}</small></button>; })}
      </nav>
    </>
  );
}
