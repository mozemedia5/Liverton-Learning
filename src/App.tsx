import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Toaster } from '@/components/ui/sonner';

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

// New Global Features
import DocumentManagement from '@/pages/features/DocumentManagement';
import Calculator from '@/pages/features/Calculator';
import ProfileSystem from '@/pages/features/ProfileSystem';
import HannaAI from '@/pages/features/HannaAI';
import Analytics from '@/pages/features/Analytics';

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

      {/* Shared Feature Routes */}
      <Route path="/announcements" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Announcements /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Chat /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/payments" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin']}> 
          <AuthenticatedLayout><Payments /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Profile /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Settings /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      <Route path="/dashboard/documents" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Documents /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/documents/:docId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><DocumentEditor /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/public/:token" element={<PublicDocument />} />

      {/* Global Feature Routes */}
      <Route path="/features/document-management" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><DocumentManagement /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/calculator" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Calculator /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/profile" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><ProfileSystem /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/hanna-ai" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><HannaAI /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/analytics" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Analytics /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  // PWA service worker registration disabled to prevent MIME type errors
  // Will be re-enabled once service worker configuration is fixed

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
