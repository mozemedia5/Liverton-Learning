import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DesktopNavbar } from '@/components/DesktopNavbar';
import { HannaButton } from '@/components/HannaButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementListener } from '@/hooks/useAnnouncementListener';
import { useChatMessageNotifications } from '@/hooks/useChatMessageNotifications';

export default function AuthenticatedLayout(props: { children?: React.ReactNode }) {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useAnnouncementListener();
  useChatMessageNotifications();

  useEffect(() => {
    // Keep the shell predictable on route changes and avoid stale mobile sheets.
  }, [location.pathname]);

  const isFullScreenPage = location.pathname.startsWith('/chat') || location.pathname === '/features/hanna-ai';
  const isHannaAiFullScreenPage = location.pathname === '/features/hanna-ai';
  const isDashboardPage = /^\/(?:dashboard|student\/dashboard|teacher\/dashboard|parent\/dashboard|school-admin\/dashboard|admin\/dashboard)\/?$/.test(location.pathname);

  return (
    <div className="liv-shell">
      {isAuthenticated && (
        <>
          <div className="hidden lg:block">
            <DesktopNavbar userRole={userRole} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
          </div>
          {!isHannaAiFullScreenPage && (
            <div className="lg:hidden">
              <MobileBottomNav />
            </div>
          )}
        </>
      )}

      <main className={`liv-main ${isSidebarCollapsed ? 'liv-main-collapsed' : ''} ${isFullScreenPage ? 'liv-main-fullscreen' : ''}`}>
        {props.children ?? <Outlet />}
      </main>

      {isAuthenticated && isDashboardPage && !isFullScreenPage && <HannaButton />}
    </div>
  );
}
