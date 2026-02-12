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
} from 'lucide-react';
import { toast } from 'sonner';

export default function SideNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, logout, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const isActive = (path: string) => location.pathname === path;

  const getDashboardPath = () => {
    switch (userRole) {
      case 'student':
      case 'parent':
        return '/student/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'school_admin':
        return '/school-admin/dashboard';
      default:
        return '/';
    }
  };

  const navItems = [
    { label: 'Dashboard', path: getDashboardPath(), icon: Home },
    { label: 'Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Announcements', path: '/announcements', icon: MessageSquare },
    { label: 'Chat', path: '/chat', icon: MessageSquare },
    { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['student', 'teacher', 'school_admin'] },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Documents', path: '/features/document-management', icon: FileText },
    { label: 'Calculator', path: '/features/calculator', icon: Calculator },
    { label: 'Hanna AI', path: '/features/hanna-ai', icon: Sparkles },
    { label: 'Analytics', path: '/features/analytics', icon: BarChart3 },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.roles && !item.roles.includes(userRole || '')) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 lg:hidden"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Navbar */}
      <nav
        className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
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

        {/* Navigation Items */}
        <div className="p-4 space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-4 my-4 border-t border-gray-200 dark:border-gray-800" />

        {/* Logout Button */}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to login again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
