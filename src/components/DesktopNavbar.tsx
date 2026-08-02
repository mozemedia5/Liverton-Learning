import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';
import {
  Home,
  BookOpen,
  MessageSquare,
  FileText,
  Calendar,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Video,
  Calculator,
  BarChart3,
  CreditCard,
  Users,
  GraduationCap,
  Shield,
  HelpCircle,
  Activity,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/types';
import { AskHannaIcon } from '@/components/AskHannaIcon';

interface DesktopNavbarProps {
  userRole: UserRole | null;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string | number;
  dot?: boolean;
};

function getHomePath(role: UserRole | null) {
  if (!role) return '/';
  if (role === 'platform_admin') return '/admin/dashboard';
  if (role === 'school_admin') return '/school-admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'parent') return '/parent/dashboard';
  return '/student/dashboard';
}

export function DesktopNavbar({ userRole, isCollapsed, setIsCollapsed }: DesktopNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  const activePath = location.pathname;

  const isActive = (path: string) => activePath === path;

  // Custom Workspace Selector Name & Letter
  const workspaceInfo = useMemo(() => {
    switch (userRole) {
      case 'platform_admin':
        return { letter: 'A', name: 'Platform Admin' };
      case 'school_admin':
        return { letter: 'S', name: 'School Admin' };
      case 'teacher':
        return { letter: 'T', name: 'Teacher Workspace' };
      case 'parent':
        return { letter: 'P', name: 'Parent Dashboard' };
      case 'student':
      default:
        return { letter: 'C', name: 'Student Workspace' };
    }
  }, [userRole]);

  // Section Items divided like the reference image
  const sections = useMemo(() => {
    const general: NavItem[] = [];
    const tools: NavItem[] = [];

    const homePath = getHomePath(userRole);
    const homeItem = { icon: Home, label: 'Dashboard', path: homePath };

    switch (userRole) {
      case 'platform_admin':
        general.push(
          homeItem,
          { icon: Users, label: 'Users', path: '/admin/users' },
          { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
          { icon: Shield, label: 'Moderation', path: '/admin/moderation' }
        );
        tools.push(
          { icon: Activity, label: 'Monitoring', path: '/admin/monitoring' },
          { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
          { icon: ImageIcon, label: 'Banners', path: '/admin/dashboard-banners' },
          { icon: Bell, label: 'Notifications', path: '/admin/dashboard-announcements', badge: 2 },
          { icon: MessageSquare, label: 'Chat', path: '/chat', dot: true },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
          { icon: FileText, label: 'Documents', path: '/features/document-workspace' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
        );
        break;

      case 'teacher':
        general.push(
          homeItem,
          { icon: BookOpen, label: 'My Courses', path: '/teacher/courses' },
          { icon: HelpCircle, label: 'My Quiz', path: '/teacher/my-quiz' },
          { icon: Users, label: 'Students', path: '/teacher/students' }
        );
        tools.push(
          { icon: Video, label: 'Live Lessons', path: '/teacher/zoom-lessons' },
          { icon: CreditCard, label: 'Earnings', path: '/payments' },
          { icon: MessageSquare, label: 'Chat', path: '/chat', dot: true },
          { icon: FileText, label: 'Documents', path: '/features/document-workspace' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: Bell, label: 'Notifications', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
        );
        break;

      case 'parent':
        general.push(
          homeItem,
          { icon: Users, label: 'My Children', path: '/parent/students' },
          { icon: BarChart3, label: 'Performance', path: '/parent/performance' },
          { icon: CreditCard, label: 'School Fees', path: '/parent/fees' }
        );
        tools.push(
          { icon: Video, label: 'Live Lessons', path: '/parent/zoom-lessons' },
          { icon: BookOpen, label: 'Courses', path: '/parent/courses' },
          { icon: FileText, label: 'Quizzes', path: '/parent/quizzes' },
          { icon: MessageSquare, label: 'Chat', path: '/chat', dot: true },
          { icon: FileText, label: 'Documents', path: '/features/document-workspace' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: Bell, label: 'Announcements', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
        );
        break;

      case 'school_admin':
        general.push(
          homeItem,
          { icon: Users, label: 'Students', path: '/school-admin/students' },
          { icon: GraduationCap, label: 'Teachers', path: '/school-admin/teachers' },
          { icon: Calendar, label: 'Attendance', path: '/school-admin/attendance' }
        );
        tools.push(
          { icon: CreditCard, label: 'Fees', path: '/school-admin/fees' },
          { icon: MessageSquare, label: 'Chat', path: '/chat', dot: true },
          { icon: FileText, label: 'Documents', path: '/features/document-workspace' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: Bell, label: 'Announcements', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
        );
        break;

      case 'student':
      default:
        general.push(
          homeItem,
          { icon: BookOpen, label: 'Courses', path: '/student/courses' },
          { icon: MessageSquare, label: 'Chat', path: '/chat', dot: true },
          { icon: FileText, label: 'Documents', path: '/features/document-workspace' }
        );
        tools.push(
          { icon: FileText, label: 'Quizzes', path: '/student/quizzes' },
          { icon: Video, label: 'Live Lessons', path: '/student/zoom-lessons' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: Bell, label: 'Notifications', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
          { icon: Calculator, label: 'Calculator', path: '/features/calculator' },
        );
        break;
    }

    // Shared standard tools
    tools.push(
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: User, label: 'Profile', path: '/profile' }
    );

    return { general, tools };
  }, [userRole]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutDialog(false);
      setShowUserMenu(false);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (event.key === 'Escape') {
        setShowUserMenu(false);
        return;
      }

      if (showUserMenu) return;

      const shortcutMap: Record<string, string> = {
        'h': getHomePath(userRole),
        'c': userRole === 'teacher' ? '/teacher/courses' : '/student/courses',
        'm': '/chat',
        'd': '/features/document-workspace',
        's': '/settings',
      };

      if (shortcutMap[event.key.toLowerCase()]) {
        event.preventDefault();
        navigate(shortcutMap[event.key.toLowerCase()]);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showUserMenu, userRole]);

  return (
    <>
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-white/70 dark:bg-slate-950/75 backdrop-blur-xl text-slate-700 dark:text-slate-300 border-r border-slate-200/50 dark:border-white/10 shadow-glass transition-all duration-300 flex flex-col overflow-hidden ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-200/50 dark:border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Brand Logo - clean container with zero cropping and smooth hover effects */}
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden transition-transform duration-300 hover:scale-110">
              <img
                src="/logo.png"
                alt="Liverton Learning Logo"
                className="w-[90%] h-[90%] object-contain"
              />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none animate-in fade-in duration-300">
                Liverton
              </span>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Collapse Menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {isCollapsed && (
            <div className="w-full flex justify-center mt-1">
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Expand Menu"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Workspace Selector (Role Display) */}
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black shadow-lg flex-shrink-0">
                  {workspaceInfo.letter}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase leading-none">
                    Workspace
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {workspaceInfo.name}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black shadow-lg cursor-pointer animate-pulse-glow"
                title={workspaceInfo.name}
                onClick={() => setIsCollapsed(false)}
              >
                {workspaceInfo.letter}
              </div>
            </div>
          )}
        </div>

        {/* Nav Items Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {/* General Section */}
          <div>
            {!isCollapsed ? (
              <span className="px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                General
              </span>
            ) : (
              <div className="border-t border-slate-200/30 dark:border-white/5 my-2" />
            )}
            <ul className="space-y-1">
              {sections.general.map((item, idx) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const isHannaAI = item.label === 'Hanna AI';
                return (
                  <li key={item.path + idx} className="relative group">
                    <button
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        active
                          ? 'bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {isHannaAI ? (
                        <span className="w-5 h-5 flex items-center justify-center overflow-hidden rounded-md flex-shrink-0">
                          <span className="scale-[1.6] flex items-center justify-center">
                            <AskHannaIcon size={20} showText={false} />
                          </span>
                        </span>
                      ) : (
                        <Icon className="w-5 h-5 flex-shrink-0" />
                      )}
                      {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                      {item.dot && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {item.badge && !isCollapsed && (
                        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                    {/* Collapsed Tooltip */}
                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-150 z-50">
                        {item.label}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Tools Section */}
          <div>
            {!isCollapsed ? (
              <span className="px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                Tools
              </span>
            ) : (
              <div className="border-t border-slate-200/30 dark:border-white/5 my-2" />
            )}
            <ul className="space-y-1">
              {sections.tools.map((item, idx) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const isHannaAI = item.label === 'Hanna AI';
                return (
                  <li key={item.path + idx} className="relative group">
                    <button
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        active
                          ? 'bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {isHannaAI ? (
                        <span className="w-5 h-5 flex items-center justify-center overflow-hidden rounded-md flex-shrink-0">
                          <span className="scale-[1.6] flex items-center justify-center">
                            <AskHannaIcon size={20} showText={false} />
                          </span>
                        </span>
                      ) : (
                        <Icon className="w-5 h-5 flex-shrink-0" />
                      )}
                      {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                      {item.dot && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {item.badge && !isCollapsed && (
                        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                    {/* Collapsed Tooltip */}
                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-150 z-50">
                        {item.label}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* User Card / Profile Section at Bottom */}
        <div className="p-4 border-t border-slate-200/50 dark:border-white/10">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/40 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/45 transition-colors">
              <button
                ref={userButtonRef}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 text-left overflow-hidden group flex-1"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate leading-tight">
                    {userData?.fullName || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize truncate mt-0.5">
                    {userRole?.replace('_', ' ')}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowLogoutDialog(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-2"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 relative group">
              <button
                ref={userButtonRef}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md"
                title="View Account"
              >
                <span className="text-white font-bold text-sm">
                  {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </button>

              <button
                onClick={() => setShowLogoutDialog(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* User Custom Options Menu popover on Desktop sidebar */}
      {showUserMenu && (
        <div
          ref={userMenuRef}
          className="fixed z-50 rounded-2xl bg-white/95 dark:bg-[#030f26]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in-0 duration-150"
          style={{
            bottom: '80px',
            left: isCollapsed ? '90px' : '20px',
            width: '240px',
          }}
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-900/50 bg-slate-50 dark:bg-slate-950/20">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{userData?.fullName || 'User'}</p>
            <p className="text-[10px] text-slate-400 capitalize truncate mt-0.5">{userRole?.replace('_', ' ')}</p>
          </div>
          <div className="py-2 px-2 space-y-0.5">
            <button
              onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutDialog}
        onConfirm={handleLogout}
        onOpenChange={(open) => setShowLogoutDialog(open)}
        isLoading={isLoggingOut}
      />
    </>
  );
}
