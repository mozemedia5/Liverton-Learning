import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, CalendarDays, ChevronLeft, ChevronRight,
  FileText, GraduationCap, HeartHandshake, Home, LayoutGrid, LogOut, MessageCircle, Plus, Settings,
  ShieldCheck, ShoppingBag, Sparkles, Users, Video, WalletCards, Briefcase,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';

interface DesktopNavbarProps {
  userRole: UserRole | null;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

type NavItem = { label: string; path: string; icon: React.ElementType; badge?: string };

const homeFor = (role: UserRole | null) => {
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'parent') return '/parent/dashboard';
  if (role === 'school_admin') return '/school-admin/dashboard';
  if (role === 'platform_admin') return '/admin/dashboard';
  return '/student/dashboard';
};

const roleCopy = (role: UserRole | null) => {
  if (role === 'teacher') return { title: 'Educator studio', mark: 'E', subtitle: 'Build learning that travels' };
  if (role === 'parent') return { title: 'Parent space', mark: 'P', subtitle: 'A clearer view of progress' };
  if (role === 'school_admin') return { title: 'Organization hub', mark: 'O', subtitle: 'Move your community forward' };
  if (role === 'platform_admin') return { title: 'Platform control', mark: 'A', subtitle: 'Keep Liverton healthy' };
  return { title: 'Student space', mark: 'S', subtitle: 'Learn in your own rhythm' };
};

export function DesktopNavbar({ userRole, isCollapsed, setIsCollapsed }: DesktopNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const copy = roleCopy(userRole);

  const sections = useMemo(() => {
    const home: NavItem = { label: 'Overview', path: homeFor(userRole), icon: Home };
    if (userRole === 'teacher') return {
      primary: [home, { label: 'My modules', path: '/teacher/courses', icon: BookOpen }, { label: 'Educators Workhub', path: '/features/tearn', icon: Briefcase }],
      tools: [{ label: 'Create module', path: '/features/tearn', icon: Plus }, { label: 'Assessments', path: '/teacher/quizzes', icon: GraduationCap }, { label: 'Liv Teams', path: '/features/liv-teams', icon: Video }, { label: 'Liv Fund', path: '/features/liv-fund', icon: HeartHandshake }, { label: 'Liv Mart', path: '/features/liv-mart', icon: ShoppingBag }, { label: 'Insights', path: '/features/analytics', icon: BarChart3 }, { label: 'Earnings', path: '/payments', icon: WalletCards }, { label: 'More', path: '/more', icon: LayoutGrid }],
    };
    if (userRole === 'parent') return {
      primary: [home, { label: 'My children', path: '/parent/students', icon: Users }, { label: 'Progress', path: '/parent/performance', icon: BarChart3 }],
      tools: [{ label: 'Courses', path: '/parent/courses', icon: BookOpen }, { label: 'Organization fees', path: '/parent/fees', icon: WalletCards }, { label: 'Calendar', path: '/calendar', icon: CalendarDays }, { label: 'Messages', path: '/chat', icon: MessageCircle }, { label: 'More', path: '/more', icon: LayoutGrid }],
    };
    if (userRole === 'school_admin') return {
      primary: [home, { label: 'People', path: '/school-admin/students', icon: Users }, { label: 'Educators', path: '/school-admin/teachers', icon: GraduationCap }],
      tools: [{ label: 'Projects', path: '/features/liv-teams', icon: LayoutGrid }, { label: 'Liv Fund', path: '/features/liv-fund', icon: HeartHandshake }, { label: 'Reports', path: '/admin/analytics', icon: BarChart3 }, { label: 'Marketplace', path: '/features/liv-mart', icon: ShoppingBag }, { label: 'Calendar', path: '/calendar', icon: CalendarDays }, { label: 'More', path: '/more', icon: LayoutGrid }],
    };
    return {
      primary: [home, { label: 'Learn', path: '/student/courses', icon: BookOpen }, { label: 'Progress', path: '/student/quizzes', icon: BarChart3 }],
      tools: [{ label: 'Liv Teams', path: '/features/liv-teams', icon: Users }, { label: 'Liv Fund', path: '/features/liv-fund', icon: HeartHandshake }, { label: 'Shorts', path: '/features/tearn/shorts', icon: Sparkles }, { label: 'Calendar', path: '/calendar', icon: CalendarDays }, { label: 'Documents', path: '/dashboard/documents', icon: FileText }, { label: 'Marketplace', path: '/features/liv-mart', icon: ShoppingBag }, { label: 'Hanna AI', path: '/features/hanna-ai', icon: Sparkles }, { label: 'More', path: '/more', icon: LayoutGrid }],
    };
  }, [userRole]);

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`));
  const go = (item: NavItem) => navigate(item.path);
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('You are signed out');
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <button key={item.path} onClick={() => go(item)} className={`liv-nav-item ${isActive(item.path) ? 'is-active' : ''} ${isCollapsed ? 'is-collapsed' : ''}`} title={isCollapsed ? item.label : undefined}>
        <Icon size={19} strokeWidth={isActive(item.path) ? 2.3 : 1.8} />
        {!isCollapsed && <span>{item.label}</span>}
        {!isCollapsed && item.badge && <span className="liv-nav-badge">{item.badge}</span>}
      </button>
    );
  };

  return (
    <aside className={`liv-sidebar ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="liv-sidebar-brand">
        <button className="liv-brand-mark" onClick={() => navigate(homeFor(userRole))} aria-label="Liverton home"><img src="/liverton-mark.jpg" alt="Liverton" /></button>
        {!isCollapsed && <div><strong>Liverton</strong><span>Learning platform</span></div>}
        <button className="liv-collapse" onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className={`liv-workspace ${isCollapsed ? 'is-collapsed' : ''}`}>
        <div className="liv-workspace-avatar">{copy.mark}</div>
        {!isCollapsed && <div><span>Workspace</span><strong>{copy.title}</strong><small>{copy.subtitle}</small></div>}
      </div>

      <div className="liv-sidebar-scroll">
        <p className="liv-nav-label">Main menu</p>
        {sections.primary.map(renderItem)}
        <p className="liv-nav-label">Workspace</p>
        {sections.tools.map(renderItem)}
        <p className="liv-nav-label">Account</p>
        {renderItem({ label: 'Settings', path: '/settings', icon: Settings })}
        {renderItem({ label: 'Profile', path: '/profile', icon: ShieldCheck })}
      </div>

      <div className={`liv-sidebar-footer ${isCollapsed ? 'is-collapsed' : ''}`}>
        <button className="liv-user-card" onClick={() => navigate('/profile')} title={isCollapsed ? 'Open profile' : undefined}>
          <div className="liv-avatar">{copy.mark}</div>
          {!isCollapsed && <div><strong>{copy.title.replace(' space', '').replace(' studio', '')}</strong><span>{userRole === 'teacher' ? 'Educator account' : 'Liverton member'}</span></div>}
        </button>
        <button className="liv-logout" onClick={() => setShowLogoutConfirm(true)} title="Log out"><LogOut size={17} />{!isCollapsed && <span>Log out</span>}</button>
      </div>
      <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} onConfirm={handleLogout} isLoading={isLoggingOut} />
    </aside>
  );
}
