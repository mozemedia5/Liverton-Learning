import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Home,
  BookOpen,
  FileText,
  MessageSquare,
  Bell,
  Bot,
} from 'lucide-react';

/**
 * Navigation items for the bottom navigation bar
 * These are the main sections accessible from any dashboard
 */
const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'announcements', label: 'Announcements', icon: Bell },
  { key: 'hanna', label: 'Hanna', icon: Bot },
] as const;

/**
 * Compute the home path based on user role
 * Ensures users are directed to their appropriate dashboard
 */
function computeHomePath(role?: string | null) {
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'school_admin') return '/school-admin/dashboard';
  if (role === 'platform_admin') return '/admin/dashboard';
  return '/student/dashboard';
}

/**
 * Compute the courses path based on user role
 */
function computeCoursesPath(role?: string | null) {
  if (role === 'teacher') return '/teacher/courses';
  return '/student/courses';
}

/**
 * DashboardShell Component
 * 
 * Features:
 * - Full-width layout (sidebar overlays, doesn't partition)
 * - Bottom navigation for mobile-first design
 * - Sticky header with title and optional right content
 * - Responsive padding to accommodate bottom nav
 * - Dark mode support
 * 
 * Props:
 * - title: Page title displayed in header
 * - children: Main content
 * - userRole: User's role for path computation
 * - headerRight: Optional content for header right side
 */
export function DashboardShell(props: {
  title: string;
  children: React.ReactNode;
  userRole?: string | null;
  headerRight?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Compute navigation routes based on user role
   */
  const routes = useMemo(() => {
    const home = computeHomePath(props.userRole);
    return {
      home,
      courses: computeCoursesPath(props.userRole),
      documents: '/features/document-management',
      chat: '/chat',
      announcements: '/announcements',
    };
  }, [props.userRole]);

  /**
   * Determine which navigation item is currently active
   */
  const activeKey = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/features/document-management')) return 'documents';
    if (p.startsWith('/chat')) return 'chat';
    if (p.startsWith('/announcements')) return 'announcements';
    if (p.includes('/courses')) return 'courses';
    if (p.includes('/dashboard')) return 'home';
    return 'home';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background text-black dark:text-white">
      {/* Sticky Header - Always visible at top */}
      <header className="sticky top-0 z-40 bg-white dark:bg-background border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{props.title}</h1>
          </div>
          <div className="flex items-center gap-2">{props.headerRight}</div>
        </div>
      </header>

      {/* Main Content Area
          Full width - sidebar overlays on top, doesn't partition the layout
          Padding bottom accommodates fixed bottom navigation
      */}
      <main className="pb-24 w-full">
        {props.children}
      </main>

      {/* Bottom Navigation Bar - Mobile-first design
          Fixed position, overlays content
          Provides quick access to main sections
          Responsive grid layout
      */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-background/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur">
        <div className="mx-auto max-w-5xl grid grid-cols-6">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            const isActive = activeKey === item.key;
            
            /**
             * Handle navigation based on item type
             * Hanna AI dispatches custom event instead of navigating
             */
            const onClick = () => {
              if (item.key === 'home') return navigate(routes.home);
              if (item.key === 'courses') return navigate(routes.courses);
              if (item.key === 'documents') return navigate(routes.documents);
              if (item.key === 'chat') return navigate(routes.chat);
              if (item.key === 'announcements') return navigate(routes.announcements);
              if (item.key === 'hanna') {
                // Dispatch custom event for Hanna AI modal
                const ev = new CustomEvent('open-hanna');
                window.dispatchEvent(ev);
                return;
              }
            };

            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                className={cn(
                  'h-16 rounded-none flex flex-col items-center justify-center gap-1 transition-colors duration-200',
                  isActive 
                    ? 'text-black dark:text-white bg-gray-100 dark:bg-secondary' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
                onClick={onClick}
              >
                <Icon className={cn('w-5 h-5')} />
                <span className="text-[11px] leading-none font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
