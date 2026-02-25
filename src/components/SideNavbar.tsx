import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
      {/* Mobile Menu Button - Smaller size to avoid blocking messages
          Fixed position, always visible on mobile
      */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-[60] p-1.5 rounded-lg bg-black/80 dark:bg-white/80 backdrop-blur-sm text-white dark:text-black hover:bg-black dark:hover:bg-white lg:hidden transition-all duration-200 shadow-md"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
        className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-background border-r border-gray-200 dark:border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header Section - Logo and User Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-background">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-sm">LL</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Liverton</h1>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Learning Platform</p>
          {userData?.fullName && (
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-3 truncate">
              {userData.fullName}
            </p>
          )}
        </div>

        {/* Main Navigation Items */}
        <div className="p-4 space-y-2">
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
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
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
                  <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-800 space-y-1 mt-1">
                    <button
                      onClick={() => handleNavigate('/features/document-workspace')}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-secondary transition-all duration-200"
                    >
                      <FileText className="w-4 h-4" />
                      <span>My Documents</span>
                    </button>
                    <button
                      onClick={() => handleNavigate('/features/document-workspace')}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200"
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
        <div className="p-4 pt-0 space-y-1">
          <div className="mx-2 my-4 border-t border-gray-200 dark:border-gray-800" />
          
          <button
            onClick={() => handleNavigate('/about')}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary transition-all duration-200"
          >
            <Info className="w-4 h-4" />
            <span>About Us</span>
          </button>
          
          <button
            onClick={() => handleNavigate('/support')}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary transition-all duration-200"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support</span>
          </button>

          <button
            onClick={() => handleNavigate('/privacy-policy')}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary transition-all duration-200"
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Logout Button Section */}
        <div className="p-4 mt-auto">
          <div className="mx-2 mb-4 border-t border-gray-200 dark:border-gray-800" />
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </nav>

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
