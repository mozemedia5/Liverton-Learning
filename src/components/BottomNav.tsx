import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogoutConfirmDialog } from '@/components/LogoutConfirmDialog';
import { Home, MessageSquare, Settings, LogOut, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';

interface BottomNavProps {
  userRole: UserRole | null;
}

type NavItem = {
  icon: any;
  label: string;
  path: string;
};

function getHomePath(role: UserRole | null) {
  if (!role) return '/';
  if (role === 'platform_admin') return '/admin/dashboard';
  if (role === 'school_admin') return '/school-admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  // parent currently shares student dashboard in this app
  return '/student/dashboard';
}

export function BottomNav({ userRole }: BottomNavProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems: NavItem[] = useMemo(
    () => [
      { icon: Home, label: 'Home', path: getHomePath(userRole) },
      { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
      { icon: MessageSquare, label: 'Chat', path: '/chat' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
    [userRole]
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutDialog(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-lg z-40">
        <div className="flex items-center justify-around h-20 px-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogoutDialog(true)}
            className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 dark:text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-medium">Logout</span>
          </Button>
        </div>
      </nav>

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
        isLoading={isLoggingOut}
      />
    </>
  );
}
