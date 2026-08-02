import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';
import {
  Home,
  MessageSquare,
  FileText,
  BookOpen,
  MoreHorizontal,
  Settings,
  User,
  Calendar,
  Sparkles,
  CreditCard,
  Bell,
  Calculator,
  BarChart3,
  LogOut,
  Video,
  Users,
  GraduationCap,
  Shield,
  HelpCircle,
  Share2,
  X,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { toast } from 'sonner';

interface MobileBottomNavProps {
  userRole: UserRole | null;
}

type TabItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

type MoreItem = {
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

export function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, logout } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const activePath = location.pathname;

  const tabs: TabItem[] = [
    { icon: Home, label: 'Home', path: getHomePath(userRole) },
    { icon: BookOpen, label: 'Courses', path: userRole === 'teacher' ? '/teacher/courses' : '/student/courses' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: FileText, label: 'Docs', path: '/features/document-workspace' },
    { icon: MoreHorizontal, label: 'More', path: '' },
  ];

  const getMoreItems = useCallback((): MoreItem[] => {
    const baseItems: MoreItem[] = [
      { icon: Calendar, label: 'Calendar', path: '/calendar', shortcut: 'C' },
      { icon: Video, label: 'Live Lessons', path: userRole === 'teacher' ? '/teacher/zoom-lessons' : '/student/zoom-lessons', shortcut: 'L' },
      { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai', shortcut: 'H' },
      { icon: Calculator, label: 'Calculator', path: '/features/calculator', shortcut: 'K' },
    ];

    if (userRole === 'parent') {
      baseItems.push({ icon: Users, label: 'My Children', path: '/parent/students', shortcut: 'M' });
      baseItems.push({ icon: CreditCard, label: 'School Fees', path: '/parent/fees', shortcut: 'F' });
      baseItems.push({ icon: BarChart3, label: 'Performance', path: '/parent/performance', shortcut: 'P' });
    }

    if (userRole === 'teacher') {
      baseItems.push({ icon: HelpCircle, label: 'My Quiz', path: '/teacher/my-quiz', shortcut: 'Q' });
      baseItems.push({ icon: Users, label: 'Students', path: '/teacher/students', shortcut: 'S' });
      baseItems.push({ icon: CreditCard, label: 'Earnings', path: '/payments', shortcut: 'E' });
    }

    if (userRole === 'school_admin') {
      baseItems.push({ icon: Users, label: 'Students', path: '/school-admin/students', shortcut: 'S' });
      baseItems.push({ icon: GraduationCap, label: 'Teachers', path: '/school-admin/teachers', shortcut: 'T' });
      baseItems.push({ icon: Calendar, label: 'Attendance', path: '/school-admin/attendance', shortcut: 'A' });
      baseItems.push({ icon: CreditCard, label: 'Fees', path: '/school-admin/fees', shortcut: 'F' });
    }

    if (userRole === 'platform_admin') {
      baseItems.push({ icon: Users, label: 'Users', path: '/admin/users', shortcut: 'U' });
      baseItems.push({ icon: BarChart3, label: 'Analytics', path: '/admin/analytics', shortcut: 'A' });
      baseItems.push({ icon: Shield, label: 'Moderation', path: '/admin/moderation', shortcut: 'M' });
      baseItems.push({ icon: CreditCard, label: 'Payments', path: '/admin/payments', shortcut: 'P' });
    }

    // Shared items for all
    baseItems.push({ icon: Bell, label: 'Announcements', path: '/announcements', shortcut: 'N' });
    baseItems.push({ icon: User, label: 'Profile', path: '/profile', shortcut: 'R' });
    baseItems.push({ icon: Settings, label: 'Settings', path: '/settings', shortcut: 'T' });

    return baseItems;
  }, [userRole]);

  // Close more menu on outside click
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleTabClick = (item: TabItem) => {
    if (item.label === 'More') {
      setShowMoreMenu((prev) => !prev);
    } else {
      setShowMoreMenu(false);
      navigate(item.path);
    }
  };

  const handleMoreItemClick = (item: MoreItem) => {
    setShowMoreMenu(false);
    navigate(item.path);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutDialog(false);
      setShowMoreMenu(false);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const isActive = (path: string) => activePath === path;

  return (
    <>
      {/* More Popover Menu */}
      {showMoreMenu && (
        <div
          ref={moreMenuRef}
          className="fixed z-50 popover-enter"
          style={{
            bottom: '90px',
            left: '50%',
            width: 'calc(100% - 48px)',
            maxWidth: '380px',
          }}
        >
          <div className="rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-2xl overflow-hidden">
            {/* Menu Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">More Options</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* User greeting */}
            {userData?.fullName && (
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-semibold text-sm">
                      {userData.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                      {userData.fullName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole?.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items - Scrollable */}
            <div className="max-h-[340px] overflow-y-auto py-2 px-2">
              <div className="space-y-0.5">
                {getMoreItems().map((item, index) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path + index}
                      onClick={() => handleMoreItemClick(item)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                        active
                          ? 'bg-violet-50 dark:bg-violet-950/40'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                          active
                            ? 'bg-violet-100 dark:bg-violet-900/40'
                            : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            active
                              ? 'text-violet-600 dark:text-violet-400'
                              : 'text-gray-600 dark:text-gray-300'
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
                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          active
                            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}>
                          {item.shortcut}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
              <button
                onClick={() => { setShowMoreMenu(false); /* ShareAppDialog could go here */ }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-150"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Share App</span>
              </button>

              <button
                onClick={() => { setShowMoreMenu(false); setShowLogoutDialog(true); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>

          {/* Tooltip Arrow */}
          <div className="flex justify-center">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/95 dark:border-t-gray-900/95 -mt-px" />
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-2 pt-1">
        <div className="max-w-lg mx-auto tab-enter bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="flex items-center justify-around h-16 px-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isMore = item.label === 'More';
              const isActiveTab = !isMore && isActive(item.path);

              return (
                <button
                  key={item.label}
                  ref={isMore ? moreButtonRef : undefined}
                  onClick={() => handleTabClick(item)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-14 rounded-xl transition-all duration-200 ease-out ${
                    isActiveTab
                      ? 'text-violet-600 dark:text-violet-400'
                      : isMore
                        ? 'text-gray-600 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {/* Active indicator pill */}
                  {isActiveTab && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-violet-500 dark:bg-violet-400 rounded-full transition-all duration-200" />
                  )}

                  {isMore ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      showMoreMenu
                        ? 'bg-violet-500 text-white scale-110'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                      <Icon className={`w-4 h-4 transition-transform duration-200 ${showMoreMenu ? 'rotate-90' : ''}`} />
                    </div>
                  ) : (
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActiveTab ? 'scale-110' : ''}`} />
                  )}

                  <span className={`text-[10px] font-medium leading-none ${
                    isActiveTab ? 'text-violet-600 dark:text-violet-400' : ''
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

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
