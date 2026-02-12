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
  Users,
  GraduationCap,
  Calendar,
  CreditCard,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  FileText,
  Calculator,
  BarChart3,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * SchoolAdminSideNavbar Component
 * 
 * Features:
 * - Overlay-style sidebar that slides over content (not pushing it)
 * - Mobile-responsive with hamburger menu
 * - Logout confirmation dialog (prevents accidental logout)
 * - Documents section with ability to add new documents
 * - NO Hanna AI (removed for school admin dashboard)
 * - Role-based navigation filtering
 * - Smooth animations and transitions
 */
export default function SchoolAdminSideNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userData } = useAuth();
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
   * Navigation items configuration for school admins
   */
  const navItems = [
    { label: 'Dashboard', path: '/school-admin/dashboard', icon: Home },
    { label: 'Students', path: '/school-admin/students', icon: Users },
    { label: 'Teachers', path: '/school-admin/teachers', icon: GraduationCap },
    { label: 'Attendance', path: '/school-admin/attendance', icon: Calendar },
    { label: 'Fees', path: '/school-admin/fees', icon: CreditCard },
    { label: 'Announcements', path: '/announcements', icon: Bell },
    { label: 'Chat', path: '/chat', icon: MessageSquare },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  /**
   * Handle navigation and close sidebar
   */
  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setShowDocumentsSubmenu(false);
  };

  /**
   * Handle adding new document
   */
  const handleAddDocument = () => {
    navigate('/features/document-management');
    setIsOpen(false);
    setShowDocumentsSubmenu(false);
  };

  return (
    <>
      {/* Mobile Menu Button - Fixed position, always visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 lg:hidden transition-all duration-200"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
        className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header Section - Logo and User Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-black">
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Documents Section - Collapsible submenu */}
        <div className="px-4 py-2">
          <button
            onClick={() => setShowDocumentsSubmenu(!showDocumentsSubmenu)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive('/features/document-management')
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium flex-1">Documents</span>
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                showDocumentsSubmenu ? 'rotate-90' : ''
              }`}
            />
          </button>

          {/* Documents Submenu */}
          {showDocumentsSubmenu && (
            <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-800 pl-4">
              <button
                onClick={() => handleNavigate('/features/document-management')}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all duration-200"
              >
                <FileText className="w-4 h-4" />
                <span>My Documents</span>
              </button>
              <button
                onClick={handleAddDocument}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Add Document</span>
              </button>
            </div>
          )}
        </div>

        {/* Additional Features Section */}
        <div className="px-4 py-2 space-y-2">
          <button
            onClick={() => handleNavigate('/features/calculator')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive('/features/calculator')
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <Calculator className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Calculator</span>
          </button>
          <button
            onClick={() => handleNavigate('/features/analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive('/features/analytics')
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Analytics</span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 my-4 border-t border-gray-200 dark:border-gray-800" />

        {/* Logout Button - With confirmation dialog */}
        <div className="p-4">
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
