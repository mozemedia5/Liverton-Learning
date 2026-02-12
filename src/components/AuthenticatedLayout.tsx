import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNavbar from '@/components/SideNavbar';
import { HannaButton } from '@/components/HannaButton';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthenticatedLayout(props: { children?: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // When not authenticated, this layout should not be used (routes are protected),
  // but we keep it safe.
  const show = isAuthenticated;

  // If some pages already include their own HannaButton, we can avoid duplicates by
  // allowing them to opt out via query param; keep default to show.
  const hideHanna = new URLSearchParams(location.search).get('hideHanna') === '1';

  useEffect(() => {
    // Close any open hanna modal on route change (optional future enhancement)
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {show && <SideNavbar />}
      
      {/* Main Content Area */}
      <main className="lg:ml-0">
        {props.children ?? <Outlet />}
      </main>

      {show && !hideHanna && <HannaButton />}
    </div>
  );
}
