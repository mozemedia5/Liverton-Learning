import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ShareAppDialog from '@/components/ShareAppDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Menu,
  X,
  Home,
  BookOpen,
  MessageSquare,
  CreditCard,
  User,
  Settings,
  LogOut,
  FileText,
  Calculator,
  Sparkles,
  BarChart3,
  ChevronRight,
  Plus,
  Info,
  HelpCircle,
  Shield,
  Users,
  Video,
  GraduationCap,
  Calendar,
  Bell,
  Activity,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * SideNavbar Component
 * 
 * Features:
 * - Overlay-style sidebar that slides over content (not pushing it)
 * - Mobile-responsive with hamburger menu
 * - Logout confirmation dialog (prevents accidental logout)
 * - Documents section with ability to add new documents
 * - Hanna AI integration in navigation
 * - Role-based navigation filtering
 * - Navigation plugins: About, Support, Privacy Policy
 * - Smooth animations and transitions
 * - Smaller hamburger button to avoid blocking messages
 */
export default function SideNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, logout, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDocumentsSubmenu, setShowDocumentsSubmenu] = useState(false);
  const [showShareApp, setShowShareApp] = useState(false);

  /**
   * Handle logout with confirmation
   * Prevents accidental logout by requiring user confirmation
   */
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      setIsOpen(false);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  /**
   * Check if a route is currently active
   */
  const isActive = (path: string) => location.pathname === path;

  /**
   * Get the appropriate dashboard path based on user role
   */
  const getDashboardPath = () => {
    switch (userRole) {
      case 'student':
        return '/student/dashboard';
      case 'parent':
        return '/parent/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'school_admin':
        return '/school-admin/dashboard';
      case 'platform_admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  /**
   * Navigation items configuration
   * Each item can have optional roles to restrict visibility
   */
  const navItems = [
    { label: 'Dashboard', path: getDashboardPath(), icon: Home },
    
    // Student & Parent shared routes
    { label: 'Courses', path: '/student/courses', icon: BookOpen, roles: ['student', 'parent'] },
    { label: 'Live Lessons', path: '/student/zoom-lessons', icon: Video, roles: ['student', 'parent'] },
    { label: 'Quizzes', path: '/student/quizzes', icon: FileText, roles: ['student', 'parent'] },
    
    // Parent-specific routes
    { label: 'My Children', path: '/parent/students', icon: Users, roles: ['parent'] },
    { label: 'Performance', path: '/parent/performance', icon: BarChart3, roles: ['parent'] },
    { label: 'School Fees', path: '/parent/fees', icon: CreditCard, roles: ['parent'] },
    
    // Teacher-specific routes
    { label: 'My Courses', path: '/teacher/courses', icon: BookOpen, roles: ['teacher'] },
    { label: 'My Quiz', path: '/teacher/my-quiz', icon: HelpCircle, roles: ['teacher'] },
    { label: 'Students', path: '/teacher/students', icon: Users, roles: ['teacher'] },
    { label: 'Live Lessons', path: '/teacher/zoom-lessons', icon: Video, roles: ['teacher'] },
    { label: 'Earnings', path: '/payments', icon: CreditCard, roles: ['teacher'] },

    // School Admin-specific routes
    { label: 'Students', path: '/school-admin/students', icon: Users, roles: ['school_admin'] },
    { label: 'Teachers', path: '/school-admin/teachers', icon: GraduationCap, roles: ['school_admin'] },
    { label: 'Attendance', path: '/school-admin/attendance', icon: Calendar, roles: ['school_admin'] },
    { label: 'Fees', path: '/school-admin/fees', icon: CreditCard, roles: ['school_admin'] },

    // Platform Admin-specific routes
    { label: 'Users', path: '/admin/users', icon: Users, roles: ['platform_admin'] },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, roles: ['platform_admin'] },
    { label: 'Moderation', path: '/admin/moderation', icon: Shield, roles: ['platform_admin'] },
    { label: 'Monitoring', path: '/admin/monitoring', icon: Activity, roles: ['platform_admin'] },
    { label: 'Payments', path: '/admin/payments', icon: CreditCard, roles: ['platform_admin'] },
    { label: 'Dashboard Banners', path: '/admin/dashboard-banners', icon: ImageIcon, roles: ['platform_admin'] },

    // Shared routes for all authenticated users
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Announcements', path: '/announcements', icon: Bell },
    { label: 'Chat', path: '/chat', icon: MessageSquare },
    { label: 'Hanna AI', path: '/features/hanna-ai', icon: Sparkles },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Documents', path: '/features/document-workspace', icon: FileText, hasSubmenu: true },
    { label: 'Calculator', path: '/features/calculator', icon: Calculator },
    { label: 'Analytics', path: '/features/analytics', icon: BarChart3, roles: ['student', 'teacher', 'school_admin', 'parent'] },
  ];

  /**
   * Filter navigation items based on user role
   */
  const filteredNavItems = navItems.filter(item => {
    if (item.roles && !item.roles.includes(userRole || '')) {
      return false;
    }
    return true;
  });

  /**
   * Handle navigation and close sidebar
   */
  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setShowDocumentsSubmenu(false);
  };

  return (
    <>
      {/* Modern Floating Hamburger Button
          Pill-shaped with gradient glow, smooth animation, non-intrusive
          Positioned at top-left with subtle design that integrates beautifully  
      */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed top-4 left-4 z-[60] lg:hidden
          flex items-center justify-center
          w-10 h-10 rounded-2xl
          transition-all duration-300 ease-in-out
          shadow-lg hover:shadow-xl
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/30 dark:focus:ring-white/30
          ${isOpen 
            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-black rotate-0 scale-105' 
            : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:scale-110 border border-gray-200 dark:border-gray-700'
          }
        `}
        aria-label="Toggle navigation menu"
      >
        <div className="relative w-5 h-5 flex flex-col items-center justify-center gap-[4px]">
          {isOpen ? (
            <X className="w-4 h-4 transition-all duration-200" />
          ) : (
            <>
              <span className={`block h-[2px] w-5 rounded-full bg-current transition-all duration-300`} />
              <span className={`block h-[2px] w-3.5 rounded-full bg-current transition-all duration-300 self-start`} />
              <span className={`block h-[2px] w-4 rounded-full bg-current transition-all duration-300`} />
            </>
          )}
        </div>
      </button>

      {/* Overlay Backdrop - Prevents interaction with content behind sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Side Navbar - Overlay Style (Drawer) */}
      <nav
        className={`fixed left-0 top-0 h-screen w-72 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header Section - Gradient brand header */}
        <div className="relative p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-950 dark:to-black sticky top-0">
          {/* Close button inside nav header */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-gray-900 font-black text-sm tracking-tight">LL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Liverton</h1>
              <p className="text-xs text-gray-400">Learning Platform</p>
            </div>
          </div>
          {userData?.fullName && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs">
                  {userData.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-200 truncate">
                {userData.fullName}
              </p>
            </div>
          )}
        </div>

        {/* Main Navigation Items */}
        <div className="p-3 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isDocuments = item.label === 'Documents';

            return (
              <div key={item.path} className="space-y-1">
                <button
                  onClick={() => {
                    if (isDocuments) {
                      setShowDocumentsSubmenu(!showDocumentsSubmenu);
                    } else {
                      handleNavigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black font-semibold shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      active 
                        ? 'bg-white/20 dark:bg-black/20' 
                        : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200'
                    }`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {isDocuments && (
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-200 ${
                        showDocumentsSubmenu ? 'rotate-90' : ''
                      } ${active ? 'text-white dark:text-black' : 'text-gray-400'}`}
                    />
                  )}
                </button>

                {/* Documents Submenu */}
                {isDocuments && showDocumentsSubmenu && (
                  <div className="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-1 mt-1">
                    <button
                      onClick={() => handleNavigate('/features/document-workspace')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-200"
                    >
                      <FileText className="w-4 h-4" />
                      <span>My Documents</span>
                    </button>
                    <button
                      onClick={() => handleNavigate('/features/document-workspace')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Document</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Navigation Links (About, Support, etc.) */}
        <div className="p-3 pt-0 space-y-1">
          <div className="mx-2 my-3 border-t border-gray-100 dark:border-gray-800" />
          
          <button
            onClick={() => handleNavigate('/about')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200"
          >
            <Info className="w-4 h-4" />
            <span>About Us</span>
          </button>
          
          <button
            onClick={() => handleNavigate('/support')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support</span>
          </button>

          <button
            onClick={() => handleNavigate('/privacy-policy')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200"
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          {/* Share App */}
          <button
            onClick={() => { setShowShareApp(true); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-200 font-medium"
          >
            <Share2 className="w-4 h-4" />
            <span>Share App</span>
          </button>
        </div>

        {/* Logout Button Section */}
        <div className="p-3 mt-auto pb-6">
          <div className="mx-2 mb-3 border-t border-gray-100 dark:border-gray-800" />
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* Share App Dialog */}
      <ShareAppDialog open={showShareApp} onClose={() => setShowShareApp(false)} />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Logout Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to logout? You will need to login again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel className="px-4 py-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
            >
              Logout
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
