import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';
import ShareAppDialog from '@/components/ShareAppDialog';
import {
  Home,
  Award,
  MessageSquare,
  FileText,
  BookOpen,
  MoreHorizontal,
  Settings,
  User,
  Calendar,
  CalendarDays,
  Sparkles,
  CreditCard,
  CircleDollarSign,
  Store,
  Bell,
  Calculator,
  BarChart3,
  LogOut,
  Users,
  GraduationCap,
  Shield,
  HelpCircle,
  Share2,
  X,
  Plus,
  Activity,
  Image as ImageIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { toast } from 'sonner';
import { AskHannaIcon } from '@/components/AskHannaIcon';
import { useUnreadChatsCount } from '@/hooks/useUnreadChats';

interface MobileBottomNavProps {
  userRole: UserRole | null;
}

type TabItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  isPlusButton?: boolean;
  badge?: number;
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
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showShareApp, setShowShareApp] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  const activePath = location.pathname;
  const unreadChatsCount = useUnreadChatsCount();

  // Custom Jumia-style bottom tabs dynamically selected per user role
  const tabs: TabItem[] = useMemo(() => {
    const homePath = getHomePath(userRole);
    switch (userRole) {
      case 'platform_admin':
        return [
          { icon: Home, label: 'Home', path: homePath },
          { icon: Users, label: 'Users', path: '/admin/users' },
          { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
          { icon: Shield, label: 'Moderation', path: '/admin/moderation' },
          { icon: MoreHorizontal, label: 'More', path: '' },
        ];
      case 'teacher':
        return [
          { icon: Home, label: 'Home', path: homePath },
          { icon: BookOpen, label: 'Courses', path: '/teacher/courses' },
          { icon: Plus, label: 'Quick Add', path: '', isPlusButton: true },
          { icon: MessageSquare, label: 'Chat', path: '/chat' },
          { icon: MoreHorizontal, label: 'More', path: '' },
        ];
      case 'parent':
        return [
          { icon: Home, label: 'Home', path: homePath },
          { icon: Users, label: 'Children', path: '/parent/students' },
          { icon: BarChart3, label: 'Grades', path: '/parent/performance' },
          { icon: MessageSquare, label: 'Chat', path: '/chat' },
          { icon: MoreHorizontal, label: 'More', path: '' },
        ];
      case 'school_admin':
        return [
          { icon: Home, label: 'Home', path: homePath },
          { icon: Users, label: 'Students', path: '/school-admin/students' },
          { icon: GraduationCap, label: 'Teachers', path: '/school-admin/teachers' },
          { icon: Calendar, label: 'Attendance', path: '/school-admin/attendance' },
          { icon: MoreHorizontal, label: 'More', path: '' },
        ];
      case 'student':
      default:
        return [
          { icon: Home, label: 'Home', path: homePath },
          { icon: BookOpen, label: 'Courses', path: '/student/courses' },
          { icon: MessageSquare, label: 'Chat', path: '/chat' },
          { icon: FileText, label: 'Docs', path: '/dashboard/documents' },
          { icon: MoreHorizontal, label: 'More', path: '' },
        ];
    }
  }, [userRole]);

  const getMoreItems = useCallback((): MoreItem[] => {
    const baseItems: MoreItem[] = [];

    switch (userRole) {
      case 'platform_admin':
        baseItems.push(
          { icon: Activity, label: 'Global Monitoring', path: '/admin/monitoring' },
          { icon: Bell, label: 'Notifications', path: '/admin/dashboard-announcements' },
          { icon: ImageIcon, label: 'Dashboard Banners', path: '/admin/dashboard-banners' },
          { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
          { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: CalendarDays, label: 'Events', path: '/events' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
          { icon: Users, label: 'Liv Teams', path: '/features/liv-teams' },
          { icon: Award, label: 'Work Hub', path: '/features/tearn' },
        );
        break;
      case 'teacher':
        baseItems.push(
          { icon: HelpCircle, label: 'My Quiz', path: '/teacher/my-quiz' },
          { icon: Users, label: 'Students', path: '/teacher/students' },
          { icon: CreditCard, label: 'Earnings', path: '/payments' },
          { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: CalendarDays, label: 'Events', path: '/events' },
          { icon: Bell, label: 'Notifications', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
          { icon: Users, label: 'Liv Teams', path: '/features/liv-teams' },
          { icon: Award, label: 'Work Hub', path: '/features/tearn' },
        );
        break;
      case 'parent':
        baseItems.push(
          { icon: CreditCard, label: 'School Fees', path: '/parent/fees' },
          { icon: BookOpen, label: 'Courses', path: '/parent/courses' },
          { icon: FileText, label: 'Quizzes', path: '/parent/quizzes' },
          { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: CalendarDays, label: 'Events', path: '/events' },
          { icon: Bell, label: 'Notifications', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
          { icon: Users, label: 'Liv Teams', path: '/features/liv-teams' },
        );
        break;
      case 'school_admin':
        baseItems.push(
          { icon: CreditCard, label: 'Fees', path: '/school-admin/fees' },
          { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
          { icon: MessageSquare, label: 'Chat', path: '/chat' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: CalendarDays, label: 'Events', path: '/events' },
          { icon: Bell, label: 'Notifications', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
          { icon: Users, label: 'Liv Teams', path: '/features/liv-teams' },
          { icon: Award, label: 'Work Hub', path: '/features/tearn' },
        );
        break;
      case 'student':
      default:
        baseItems.push(
          { icon: FileText, label: 'Quizzes', path: '/student/quizzes' },
          { icon: Calendar, label: 'Calendar', path: '/calendar' },
          { icon: CalendarDays, label: 'Events', path: '/events' },
          { icon: Bell, label: 'Notifications', path: '/announcements' },
          { icon: Sparkles, label: 'Hanna AI', path: '/features/hanna-ai' },
          { icon: Calculator, label: 'Calculator', path: '/features/calculator' },
          { icon: Users, label: 'Liv Teams', path: '/features/liv-teams' },
        );
        break;
    }

    // Shared product destinations plus settings and profile
    baseItems.push(
      { icon: CircleDollarSign, label: 'Live Fund · Go get funded', path: '/features/liv-fund' },
      { icon: Store, label: 'Live Mart', path: '/features/liv-mart' },
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: User, label: 'Profile', path: '/profile' }
    );

    return baseItems;
  }, [userRole]);

  // Close menus on outside click
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
        plusMenuRef.current &&
        !plusMenuRef.current.contains(event.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(event.target as Node)
      ) {
        setShowPlusMenu(false);
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
        setShowPlusMenu(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleTabClick = (item: TabItem) => {
    if (item.isPlusButton) {
      setShowPlusMenu((prev) => !prev);
      setShowMoreMenu(false);
    } else if (item.label === 'More') {
      setShowMoreMenu((prev) => !prev);
      setShowPlusMenu(false);
    } else {
      setShowMoreMenu(false);
      setShowPlusMenu(false);
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
      {/* Teacher Plus Quick Add Popover Menu */}
      {showPlusMenu && userRole === 'teacher' && (
        <div
          ref={plusMenuRef}
          className="fixed z-50 popover-enter"
          style={{
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 48px)',
            maxWidth: '320px',
          }}
        >
          <div className="rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Quick Add</span>
              <button
                onClick={() => setShowPlusMenu(false)}
                className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  navigate('/teacher/courses/create');
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-200">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Add Course</span>
              </button>
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  navigate('/teacher/quizzes/create');
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-200">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Add Quiz</span>
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/95 dark:border-t-gray-900/95 -mt-px" />
          </div>
        </div>
      )}

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
                  const isHannaAI = item.label === 'Hanna AI';
                  return (
                    <button
                      key={item.path + index}
                      onClick={() => handleMoreItemClick(item)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                        active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                          active
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                        }`}>
                          {isHannaAI ? (
                            <span className="w-5 h-5 flex items-center justify-center overflow-hidden rounded-md flex-shrink-0">
                              <span className="scale-[1.6] flex items-center justify-center">
                                <AskHannaIcon size={20} showText={false} />
                              </span>
                            </span>
                          ) : (
                            <Icon className={`w-4 h-4 ${
                              active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-600 dark:text-gray-300'
                            }`} />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          active
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                      {item.shortcut && (
                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          active
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
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
                onClick={() => { setShowMoreMenu(false); setShowShareApp(true); }}
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
      <nav className="lp-mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 px-4 pb-2 pt-1 lg:hidden">
        <div className="max-w-lg mx-auto tab-enter bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="flex items-center justify-around h-16 px-1">
            {tabs.map((rawItem) => {
              const item = rawItem.label === 'Chat' && unreadChatsCount > 0
                ? { ...rawItem, badge: unreadChatsCount }
                : rawItem;
              const Icon = item.icon;
              const isMore = item.label === 'More';
              const isPlus = item.isPlusButton;
              const isActiveTab = !isMore && !isPlus && isActive(item.path);

              return (
                <button
                  key={item.label}
                  ref={isMore ? moreButtonRef : isPlus ? plusButtonRef : undefined}
                  onClick={() => handleTabClick(item)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-14 rounded-xl transition-all duration-200 ease-out ${
                    isActiveTab
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : isMore || isPlus
                        ? 'text-gray-600 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {/* Active indicator pill */}
                  {isActiveTab && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-200" />
                  )}

                  {isMore ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      showMoreMenu
                        ? 'bg-emerald-500 text-white scale-110'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                      <Icon className={`w-4 h-4 transition-transform duration-200 ${showMoreMenu ? 'rotate-90' : ''}`} />
                    </div>
                  ) : isPlus ? (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-emerald-500 text-white shadow-md hover:scale-110 ${
                      showPlusMenu ? 'rotate-45 bg-red-500 dark:bg-red-500' : ''
                    }`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <span className="relative">
                      <Icon className={`w-5 h-5 transition-transform duration-200 ${isActiveTab ? 'scale-110' : ''}`} />
                      {!!item.badge && item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </span>
                  )}

                  {!isPlus && (
                    <span className={`text-[10px] font-medium leading-none ${
                      isActiveTab ? 'text-emerald-500 dark:text-emerald-400' : ''
                    }`}>
                      {item.label}
                    </span>
                  )}
                  {isPlus && (
                    <span className="text-[10px] font-semibold leading-none text-emerald-500 dark:text-emerald-400">
                      Add
                    </span>
                  )}
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

      {/* Share App Dialog */}
      <ShareAppDialog
        open={showShareApp}
        onClose={() => setShowShareApp(false)}
      />
    </>
  );
}
