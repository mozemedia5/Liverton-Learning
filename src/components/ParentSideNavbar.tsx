/**
 * Parent Side Navigation Bar
 * Provides navigation for parent dashboard with all key sections
 * Features:
 * - Dashboard overview
 * - Link/manage students
 * - View student performance
 * - Courses and learning materials
 * - School fees payment
 * - Help & Support
 * - Privacy Policy
 * - About Us
 * - Logout
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  BookOpen,
  CreditCard,
  HelpCircle,
  Shield,
  Info,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

export default function ParentSideNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Navigation items
  const mainNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: '/parent/dashboard',
    },
    {
      id: 'students',
      label: 'My Children',
      icon: <Users className="h-5 w-5" />,
      path: '/parent/students',
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <TrendingUp className="h-5 w-5" />,
      path: '/parent/performance',
    },
    {
      id: 'courses',
      label: 'Courses',
      icon: <BookOpen className="h-5 w-5" />,
      path: '/parent/courses',
    },
    {
      id: 'fees',
      label: 'School Fees',
      icon: <CreditCard className="h-5 w-5" />,
      path: '/parent/fees',
    },
  ];

  const supportNavItems: NavItem[] = [
    {
      id: 'support',
      label: 'Help & Support',
      icon: <HelpCircle className="h-5 w-5" />,
      path: '/support',
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: <Shield className="h-5 w-5" />,
      path: '/privacy-policy',
    },
    {
      id: 'about',
      label: 'About Us',
      icon: <Info className="h-5 w-5" />,
      path: '/about',
    },
  ];

  /**
   * Handle navigation to a specific path
   * Closes mobile menu after navigation
   */
  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  /**
   * Handle logout action
   * Calls logout from auth context and redirects to login page
   */
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  /**
   * Check if a nav item is currently active
   * Compares current pathname with item path
   */
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Menu Button - visible only on small screens */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-blue-900 to-blue-800 dark:from-background dark:to-background text-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-blue-700 dark:border-gray-800">
          <h1 className="text-2xl font-bold">Liverton</h1>
          <p className="text-sm text-blue-200 dark:text-gray-400">Parent Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6">
          {/* Main Navigation Items */}
          <div className="px-4 space-y-2">
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider px-2 mb-4">
              Main
            </p>
            {mainNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white dark:bg-white dark:text-black'
                    : 'text-blue-100 hover:bg-blue-700 dark:text-gray-300 dark:hover:bg-secondary'
                }`}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Support Section */}
          <div className="px-4 space-y-2 mt-8 border-t border-blue-700 dark:border-gray-800 pt-6">
            <p className="text-xs font-semibold text-blue-300 dark:text-gray-400 uppercase tracking-wider px-2 mb-4">
              Support
            </p>
            {supportNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white dark:bg-white dark:text-black'
                    : 'text-blue-100 hover:bg-blue-700 dark:text-gray-300 dark:hover:bg-secondary'
                }`}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-blue-700 dark:border-gray-800">
          <Button
            onClick={() => setShowLogoutConfirm(true)}
            variant="outline"
            className="w-full bg-red-600 hover:bg-red-700 text-white border-red-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay - closes sidebar when clicked */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card rounded-lg p-6 max-w-sm mx-4">
            <h2 className="text-xl font-bold mb-4">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
