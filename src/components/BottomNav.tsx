import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Home, BookOpen, FileText, MessageSquare, Bell, Bot } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'announcements', label: 'Announcements', icon: Bell },
  { key: 'hanna', label: 'Hanna', icon: Bot },
] as const;

function computeHomePath(role?: string | null) {
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'school_admin') return '/school-admin/dashboard';
  if (role === 'platform_admin') return '/admin/dashboard';
  return '/student/dashboard';
}

function computeCoursesPath(role?: string | null) {
  if (role === 'teacher') return '/teacher/courses';
  return '/student/courses';
}

export function BottomNav(props: { userRole?: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();

  const routes = useMemo(() => {
    const home = computeHomePath(props.userRole);
    return {
      home,
      courses: computeCoursesPath(props.userRole),
      documents: '/dashboard/documents',
      chat: '/chat',
      announcements: '/announcements',
    };
  }, [props.userRole]);

  const activeKey = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/dashboard/documents')) return 'documents';
    if (p.startsWith('/chat')) return 'chat';
    if (p.startsWith('/announcements')) return 'announcements';
    if (p.includes('/courses')) return 'courses';
    if (p.includes('/dashboard')) return 'home';
    return 'home';
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-black/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur">
      <div className="mx-auto max-w-5xl grid grid-cols-6">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;

          const onClick = () => {
            if (item.key === 'home') return navigate(routes.home);
            if (item.key === 'courses') return navigate(routes.courses);
            if (item.key === 'documents') return navigate(routes.documents);
            if (item.key === 'chat') return navigate(routes.chat);
            if (item.key === 'announcements') return navigate(routes.announcements);
            if (item.key === 'hanna') {
              window.dispatchEvent(new CustomEvent('open-hanna'));
              return;
            }
          };

          return (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              className={cn(
                'h-16 rounded-none flex flex-col items-center justify-center gap-1',
                isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
              )}
              onClick={onClick}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] leading-none">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
