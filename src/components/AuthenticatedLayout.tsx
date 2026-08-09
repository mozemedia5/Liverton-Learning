import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DesktopNavbar } from '@/components/DesktopNavbar';
import { HannaButton } from '@/components/HannaButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementListener } from '@/hooks/useAnnouncementListener';
import { useChatMessageNotifications } from '@/hooks/useChatMessageNotifications';
import { toast } from 'sonner';

export default function AuthenticatedLayout(props: { children?: React.ReactNode }) {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Listen for real-time announcements
  useAnnouncementListener();

  // Listen for new chat messages (cool toast notifications with deep links)
  useChatMessageNotifications();

  const show = isAuthenticated;

  useEffect(() => {
    // Close any open hanna modal on route change (optional future enhancement)
  }, [location.pathname]);

  // Show prominent setup profile reminder toast if we just signed up
  useEffect(() => {
    if (localStorage.getItem('show_setup_prompt') === 'true') {
      setTimeout(() => {
        toast.success('🎉 Welcome to Liverton Learning! Finish setting up your liverton dashboard.', {
          duration: 12000,
          action: {
            label: 'Go to Profile',
            onClick: () => navigate('/profile')
          }
        });
        localStorage.removeItem('show_setup_prompt');
      }, 800);
    }
  }, [navigate]);

  const isFullScreenPage = location.pathname.startsWith('/chat') || location.pathname === '/features/hanna-ai';

  const mainClasses = isFullScreenPage
    ? `relative z-10 w-full h-screen lg:h-screen pb-[76px] lg:pb-0 overflow-hidden transition-all duration-300 ${
        show ? (isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72') : ''
      }`
    : `relative z-10 w-full min-h-screen pt-0 pb-24 lg:pb-4 transition-all duration-300 px-4 sm:px-6 lg:px-8 ${
        show ? (isSidebarCollapsed ? 'lg:pl-[112px]' : 'lg:pl-[312px]') : ''
      }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
      {/* Background glowing emerald & gold blobs to enhance glassmorphism rendering */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Mobile: BottomNav only */}
      {show && (
        <>
          {/* Mobile: Bottom Nav (visible on small screens) */}
          <div className="lg:hidden">
            <MobileBottomNav userRole={userRole} />
          </div>

          {/* Desktop: Collapsible Sidebar (visible on large screens) */}
          <div className="hidden lg:block">
            <DesktopNavbar
              userRole={userRole}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className={mainClasses}>
        {isFullScreenPage ? (
          <div className="w-full h-full">
            {props.children ?? <Outlet />}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto py-6">
            {props.children ?? <Outlet />}
          </div>
        )}
      </main>

      {/* Show the floating hanna button only when NOT on the hanna ai dedicated full screen chat page */}
      {show && !isFullScreenPage && <HannaButton />}
    </div>
  );
}
