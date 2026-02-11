import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Toaster } from '@/components/ui/sonner';
import { registerServiceWorker } from '@/lib/pwa';

// Pages
import LandingPage from '@/pages/LandingPage';
import RoleSelection from '@/pages/RoleSelection';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import StudentRegister from '@/pages/register/StudentRegister';
import TeacherRegister from '@/pages/register/TeacherRegister';
import SchoolAdminRegister from '@/pages/register/SchoolAdminRegister';
import ParentRegister from '@/pages/register/ParentRegister';

// Dashboards
import StudentDashboard from '@/dashboards/StudentDashboard';
import TeacherDashboard from '@/dashboards/TeacherDashboard';
import SchoolAdminDashboard from '@/dashboards/SchoolAdminDashboard';
import PlatformAdminDashboard from '@/dashboards/PlatformAdminDashboard';

// Feature Pages
import Courses from '@/pages/features/Courses';
import Announcements from '@/pages/features/Announcements';
import Chat from '@/pages/features/Chat';
import Payments from '@/pages/features/Payments';
import Profile from '@/pages/features/Profile';
import Settings from '@/pages/features/Settings';
import Quizzes from '@/pages/features/Quizzes';
import Documents from '@/pages/features/Documents';
import DocumentEditor from '@/pages/features/DocumentEditor';
import PublicDocument from '@/pages/features/PublicDocument';

// About Pages
import About from '@/pages/about/About';
import AboutSchools from '@/pages/about/AboutSchools';
import AboutTeachers from '@/pages/about/AboutTeachers';
import AboutStudents from '@/pages/about/AboutStudents';

import './App.css';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, userRole, initialLoadComplete } = useAuth();

  // Only show loading during initial auth check, not on every navigation
  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userRole, initialLoadComplete } = useAuth();

  // Don't show anything while loading - just render the page
  // The page will handle redirects if needed
  if (!initialLoadComplete) {
    return <>{children}</>;
  }

  if (isAuthenticated && userRole) {
    const dashboardRoutes: Record<string, string> = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      school_admin: '/school-admin/dashboard',
      platform_admin: '/admin/dashboard',
      parent: '/student/dashboard',
    };
    return <Navigate to={dashboardRoutes[userRole] || '/'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/get-started" element={<PublicRoute><RoleSelection /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/register/student" element={<PublicRoute><StudentRegister /></PublicRoute>} />
      <Route path="/register/teacher" element={<PublicRoute><TeacherRegister /></PublicRoute>} />
      <Route path="/register/school-admin" element={<PublicRoute><SchoolAdminRegister /></PublicRoute>} />
      <Route path="/register/parent" element={<PublicRoute><ParentRegister /></PublicRoute>} />
      
      {/* About Pages */}
      <Route path="/about" element={<About />} />
      <Route path="/about/schools" element={<AboutSchools />} />
      <Route path="/about/teachers" element={<AboutTeachers />} />
      <Route path="/about/students" element={<AboutStudents />} />

      {/* Student Routes */}
      <Route path="/student/dashboard" element={
        <ProtectedRoute allowedRoles={['student', 'parent']}>
          <AuthenticatedLayout><StudentDashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/student/courses" element={
        <ProtectedRoute allowedRoles={['student', 'parent']}>
          <AuthenticatedLayout><Courses /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/student/quizzes" element={
        <ProtectedRoute allowedRoles={['student', 'parent']}>
          <AuthenticatedLayout><Quizzes /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><TeacherDashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/courses" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><Courses /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* School Admin Routes */}
      <Route path="/school-admin/dashboard" element={
        <ProtectedRoute allowedRoles={['school_admin']}>
          <AuthenticatedLayout><SchoolAdminDashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Platform Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AuthenticatedLayout><PlatformAdminDashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Shared Feature Routes */}
      <Route path="/announcements" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Announcements /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Chat /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/payments" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'platform_admin']}>
          <AuthenticatedLayout><Payments /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Profile /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Settings /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      <Route path="/dashboard/documents" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Documents /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/documents/:docId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><DocumentEditor /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/public/:token" element={<PublicDocument />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Register service worker on app load
    registerServiceWorker();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
