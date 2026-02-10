import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { Analytics } from '@vercel/analytics/react';

// Pages
import LandingPage from '@/pages/LandingPage';
import RoleSelection from '@/pages/RoleSelection';
import Login from '@/pages/Login';
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

// About Pages
import About from '@/pages/about/About';
import AboutSchools from '@/pages/about/AboutSchools';
import AboutTeachers from '@/pages/about/AboutTeachers';
import AboutStudents from '@/pages/about/AboutStudents';
import PWADebug from '@/pages/PWADebug';

import './App.css';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/student/courses" element={
        <ProtectedRoute allowedRoles={['student', 'parent']}>
          <Courses />
        </ProtectedRoute>
      } />
      <Route path="/student/quizzes" element={
        <ProtectedRoute allowedRoles={['student', 'parent']}>
          <Quizzes />
        </ProtectedRoute>
      } />

      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      <Route path="/teacher/courses" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <Courses />
        </ProtectedRoute>
      } />

      {/* School Admin Routes */}
      <Route path="/school-admin/dashboard" element={
        <ProtectedRoute allowedRoles={['school_admin']}>
          <SchoolAdminDashboard />
        </ProtectedRoute>
      } />

      {/* Platform Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <PlatformAdminDashboard />
        </ProtectedRoute>
      } />

      {/* Shared Feature Routes */}
      <Route path="/announcements" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <Announcements />
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <Chat />
        </ProtectedRoute>
      } />
      <Route path="/payments" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'platform_admin']}>
          <Payments />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <Settings />
        </ProtectedRoute>
      } />

      {/* PWA Debug */}
      <Route path="/pwa-debug" element={<PWADebug />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" />
          <PWAInstallPrompt />
          <Analytics />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
