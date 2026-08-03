import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Compass, Home, LayoutDashboard } from 'lucide-react';
import { SEO } from '@/components/SEO';

const dashboardRoutes: Record<string, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  school_admin: '/school-admin/dashboard',
  parent: '/parent/dashboard',
  platform_admin: '/admin/dashboard',
};

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();
  const dashboardPath = (userRole && dashboardRoutes[userRole]) || '/student/dashboard';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <SEO title="Page not found" description="The page you are looking for does not exist on Liverton Learning." noIndex />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative inline-flex">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
            <Compass className="w-12 h-12 text-emerald-500" />
          </div>
          <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">This page went off the syllabus</h1>
          <p className="text-slate-500 dark:text-slate-400">
            The link may be broken, the content may have been moved, or you may not have access to it.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl w-full sm:w-auto"
              onClick={() => navigate(dashboardPath)}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          ) : (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl w-full sm:w-auto"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          )}
          <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
