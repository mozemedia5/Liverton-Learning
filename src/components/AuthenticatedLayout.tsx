import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNavbar from '@/components/SideNavbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DesktopNavbar } from '@/components/DesktopNavbar';
import { HannaButton } from '@/components/HannaButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementListener } from '@/hooks/useAnnouncementListener';

export default function AuthenticatedLayout(props: { children?: React.ReactNode }) {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();

  // Listen for real-time announcements
  useAnnouncementListener();

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
      {/* Mobile: SideNavbar (hamburger drawer) + BottomNav */}
      {show && (
        <>
          {/* Mobile: Bottom Nav (visible on small screens) */}
          <div className="lg:hidden">
            <SideNavbar />
            <MobileBottomNav userRole={userRole} />
          </div>

          {/* Desktop: Top Navbar (visible on large screens) */}
          <div className="hidden lg:block">
            <DesktopNavbar userRole={userRole} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className="w-full min-h-screen pt-0 lg:pt-16 pb-24 lg:pb-4">
        {props.children ?? <Outlet />}
      </main>

      {show && isDashboardPage && <HannaButton />}
    </div>
  );
}
