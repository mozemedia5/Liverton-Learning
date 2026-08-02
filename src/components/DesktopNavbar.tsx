import { useState, useRef, useEffect } from 'react';
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
  Share2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/types';

interface DesktopNavbarProps {
  userRole: UserRole | null;
}

type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  shortcut?: string;
};

function getHomePath(role: UserRole | null) {
  if (!role) return '/';
  if (role === 'platform_admin') return '/admin/dashboard';
  if (role === 'school_admin') return '/school-admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'parent') return '/parent/dashboard';
  return '/student/dashboard';
}

export function DesktopNavbar({ userRole }: DesktopNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, logout } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  const activePath = location.pathname;

  const primaryItems: NavItem[] = [
    { icon: Home, label: 'Home', path: getHomePath(userRole), shortcut: 'H' },
    { icon: BookOpen, label: 'Courses', path: userRole === 'teacher' ? '/teacher/courses' : '/student/courses', shortcut: 'C' },
    { icon: MessageSquare, label: 'Chat', path: '/chat', shortcut: 'M' },
    { icon: FileText, label: 'Documents', path: '/features/document-workspace', shortcut: 'D' },
  ];

  const getMoreItems = (): NavItem[] => {
    const items: NavItem[] = [
      { icon: Calendar, label: 'Calendar', path: '/calendar', shortcut: 'C' },
      { icon: Video, label: 'Live Lessons', path: userRole === 'teacher' ? '/teacher/zoom-lessons' : '/student/zoom-lessons', shortcut: 'L' },
      { icon: Bell, label: 'Announcements', path: '/announcements', shortcut: 'A' },
      { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai', shortcut: 'H' },
      { icon: Calculator, label: 'Calculator', path: '/features/calculator', shortcut: 'K' },
    ];

    if (userRole === 'parent') {
      items.push(
        { icon: Users, label: 'My Children', path: '/parent/students', shortcut: 'M' },
        { icon: BarChart3, label: 'Performance', path: '/parent/performance', shortcut: 'P' },
        { icon: CreditCard, label: 'School Fees', path: '/parent/fees', shortcut: 'F' },
      );
    }

    if (userRole === 'teacher') {
      items.push(
        { icon: HelpCircle, label: 'My Quiz', path: '/teacher/my-quiz', shortcut: 'Q' },
        { icon: Users, label: 'Students', path: '/teacher/students', shortcut: 'S' },
        { icon: CreditCard, label: 'Earnings', path: '/payments', shortcut: 'E' },
      );
    }

    if (userRole === 'school_admin') {
      items.push(
        { icon: Users, label: 'Students', path: '/school-admin/students', shortcut: 'S' },
        { icon: GraduationCap, label: 'Teachers', path: '/school-admin/teachers', shortcut: 'T' },
        { icon: Calendar, label: 'Attendance', path: '/school-admin/attendance', shortcut: 'A' },
        { icon: CreditCard, label: 'Fees', path: '/school-admin/fees', shortcut: 'F' },
      );
    }

    if (userRole === 'platform_admin') {
      items.push(
        { icon: Users, label: 'Users', path: '/admin/users', shortcut: 'U' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/analytics', shortcut: 'A' },
        { icon: Shield, label: 'Moderation', path: '/admin/moderation', shortcut: 'M' },
        { icon: CreditCard, label: 'Payments', path: '/admin/payments', shortcut: 'P' },
      );
    }

    items.push(
      { icon: BarChart3, label: 'Analytics', path: '/features/analytics', shortcut: 'A' },
    );

    return items;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutDialog(false);
      setShowMoreMenu(false);
      setShowUserMenu(false);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const isActive = (path: string) => activePath === path;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
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
        setShowMoreMenu(false);
        setShowUserMenu(false);
        return;
      }

      if (showMoreMenu || showUserMenu) return;

      // Build shortcut map on demand
      const shortcutMap: Record<string, string> = {
        // Primary items
        'h': getHomePath(userRole),
        'c': userRole === 'teacher' ? '/teacher/courses' : '/student/courses',
        'm': '/chat',
        'd': '/features/document-workspace',
        // More items
        'a': userRole === 'teacher' ? '/school-admin/attendance' : userRole === 'parent' ? '/parent/students' : '/announcements',
        'l': userRole === 'teacher' ? '/teacher/zoom-lessons' : '/student/zoom-lessons',
        'k': '/features/calculator',
        's': '/settings',
      };

      if (shortcutMap[event.key.toLowerCase()]) {
        event.preventDefault();
        navigate(shortcutMap[event.key.toLowerCase()]);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showMoreMenu, showUserMenu, userRole]);

  return (
    <>
      {/* Desktop Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(getHomePath(userRole))}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Liverton</h1>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium -mt-0.5">Learning Platform</p>
              </div>
            </button>
          </div>

          {/* Center: Primary Nav Items */}
          <div className="flex items-center gap-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}

            {/* More Menu Trigger */}
            <div className="relative" ref={moreButtonRef}>
              <button
                onClick={() => {
                  setShowMoreMenu(!showMoreMenu);
                  setShowUserMenu(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  showMoreMenu
                    ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="hidden md:inline">More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* More Dropdown Menu */}
              {showMoreMenu && (
                <div
                  ref={moreMenuRef}
                  className="absolute top-full right-0 mt-2 w-72 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150"
                >
                  {/* Header */}
                  <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Navigation</span>
                  </div>

                  {/* Items */}
                  <div className="py-2 px-2 max-h-[320px] overflow-y-auto">
                    <div className="space-y-0.5">
                      {getMoreItems().map((item, index) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <button
                            key={item.path + index}
                            onClick={() => {
                              setShowMoreMenu(false);
                              navigate(item.path);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 group ${
                              active
                                ? 'bg-violet-50 dark:bg-violet-950/40'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                active
                                  ? 'bg-violet-100 dark:bg-violet-900/40'
                                  : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                              }`}>
                                <Icon className={`w-3.5 h-3.5 ${
                                  active
                                    ? 'text-violet-600 dark:text-violet-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`} />
                              </div>
                              <span className={`text-sm font-medium ${
                                active
                                  ? 'text-violet-700 dark:text-violet-300'
                                  : 'text-gray-700 dark:text-gray-200'
                              }`}>
                                {item.label}
                              </span>
                            </div>
                            {item.shortcut && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                active
                                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                              }`}>
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
                    <button
                      onClick={() => { setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-150"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">Share App</span>
                    </button>
                    <button
                      onClick={() => { setShowMoreMenu(false); setShowLogoutDialog(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button
              onClick={() => navigate('/search')}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* User Avatar / Menu */}
            <div className="relative" ref={userButtonRef}>
              <button
                ref={userButtonRef}
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowMoreMenu(false);
                }}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-xs">
                    {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                    {userData?.fullName || 'User'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
                    {userRole?.replace('_', ' ')}
                  </p>
                </div>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div
                  ref={userMenuRef}
                  className="absolute top-full right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{userData?.fullName || 'User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole?.replace('_', ' ')}</p>
                  </div>
                  <div className="py-2 px-2 space-y-0.5">
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-150"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-150"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => { setShowUserMenu(false); setShowLogoutDialog(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150 text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation */}
      <LogoutConfirmDialog
        open={showLogoutDialog}
        onConfirm={handleLogout}
        onOpenChange={(open) => setShowLogoutDialog(open)}
        isLoading={isLoggingOut}
      />
    </>
  );
}
