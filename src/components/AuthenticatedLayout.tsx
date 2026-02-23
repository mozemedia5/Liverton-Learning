import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNavbar from '@/components/SideNavbar';
import { HannaButton } from '@/components/HannaButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementListener } from '@/hooks/useAnnouncementListener';

export default function AuthenticatedLayout(props: { children?: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Listen for real-time announcements
  useAnnouncementListener();

  // When not authenticated, this layout should not be used (routes are protected),
  // but we keep it safe.
  const show = isAuthenticated;

  // Only show HannaButton on dashboard pages
  const isDashboardPage = [
    '/student/dashboard',
    '/teacher/dashboard',
    '/school-admin/dashboard',
    '/parent/dashboard',
    '/admin/dashboard'
  ].includes(location.pathname);

  useEffect(() => {
    // Close any open hanna modal on route change (optional future enhancement)
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      {show && <SideNavbar />}
      
      {/* Main Content Area - Full width, navbar overlays on top */}
      <main className="w-full min-h-screen">
        {props.children ?? <Outlet />}
      </main>

      {show && isDashboardPage && <HannaButton />}
    </div>
  );
}
