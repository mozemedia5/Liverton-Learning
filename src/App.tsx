import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Toaster } from '@/components/ui/sonner';
import LogoLoader from '@/components/LogoLoader';

// Pages
import LandingPage from '@/pages/LandingPage';
import RoleSelection from '@/pages/RoleSelection';
import Login from '@/pages/Login';
import StudentRegister from '@/pages/register/StudentRegister';
import TeacherRegister from '@/pages/register/TeacherRegister';
import SchoolAdminRegister from '@/pages/register/SchoolAdminRegister';
import ParentRegister from '@/pages/register/ParentRegister';

import VerifyStudentEmail from '@/pages/register/VerifyStudentEmail';
// Dashboards
import StudentDashboard from '@/dashboards/StudentDashboard';
import TeacherDashboard from '@/dashboards/TeacherDashboard';
import SchoolAdminDashboard from '@/dashboards/SchoolAdminDashboard';
import ParentDashboard from '@/pages/ParentDashboard';
import PlatformAdminDashboard from '@/dashboards/PlatformAdminDashboard';
import AdminLayout from '@/components/AdminLayout';
import UserManagement from '@/pages/admin/UserManagement';
import SystemAnalytics from '@/pages/admin/SystemAnalytics';
import ContentModeration from '@/pages/admin/ContentModeration';
import GlobalMonitoring from '@/pages/admin/GlobalMonitoring';

// Parent Pages
import ParentStudents from '@/pages/ParentStudents';
import ParentPerformance from '@/pages/ParentPerformance';
import ParentCourses from '@/pages/ParentCourses';
import ParentFees from '@/pages/ParentFees';

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

// Teacher Pages
import TeacherCourses from '@/pages/teacher/TeacherCourses';
import CreateCourse from '@/pages/teacher/CreateCourse';
import TeacherStudents from '@/pages/teacher/TeacherStudents';

// New Global Features
import DocumentManagement from '@/pages/features/DocumentManagement';
import DocumentWorkspaceWrapper from "@/components/DocumentWorkspaceWrapper";
import UnifiedDocumentEditor from '@/pages/features/UnifiedDocumentEditor';
import Calculator from '@/pages/features/Calculator';
import ProfileSystem from '@/pages/features/ProfileSystem';
import HannaAI from '@/pages/features/HannaAI';
import Analytics from '@/pages/features/Analytics';
import TeacherZoomLessons from '@/components/ZoomLessons/TeacherZoomLessons';
import StudentZoomLessons from '@/components/ZoomLessons/StudentZoomLessons';
import ParentZoomLessons from '@/components/ZoomLessons/ParentZoomLessons';

// About Pages
import About from '@/pages/about/About';
import AboutSchools from '@/pages/about/AboutSchools';
import AboutTeachers from '@/pages/about/AboutTeachers';
import AboutStudents from '@/pages/about/AboutStudents';

// Support & Legal Pages
import Support from '@/pages/Support';
import PrivacyPolicy from '@/pages/PrivacyPolicy';

import './App.css';

/**
 * ProtectedRoute Component
 * 
 * Ensures only authenticated users can access protected routes.
 * Shows loading animation during initial auth state check.
 * Optionally restricts access based on user roles.
 * 
 * @param children - The component to render if user is authenticated
 * @param allowedRoles - Optional array of roles allowed to access this route
 */
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, userRole, initialLoadComplete } = useAuth();

  // Show loading animation during initial auth check
  // This prevents flash of login page for authenticated users
  if (!initialLoadComplete) {
    return <LogoLoader message="Initializing..." />;
  }

  // Redirect unauthenticated users to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access control if roles are specified
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * PublicRoute Component
 * 
 * Handles public pages (landing, login, register, etc.)
 * Redirects authenticated users to their respective dashboards.
 * Shows loading animation during initial auth check to prevent redirect flashing.
 * 
 * @param children - The component to render if user is not authenticated
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userRole, initialLoadComplete } = useAuth();

  // Show loading animation during initial auth check
  // This prevents flash of landing page for authenticated users
  if (!initialLoadComplete) {
    return <LogoLoader message="Initializing..." />;
  }

  // Redirect authenticated users to their dashboard based on role
  if (isAuthenticated && userRole) {
    const dashboardRoutes: Record<string, string> = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      school_admin: '/school-admin/dashboard',
      parent: '/parent/dashboard',
      platform_admin: '/admin/dashboard',
    };
    return <Navigate to={dashboardRoutes[userRole] || '/'} replace />;
  }

  return <>{children}</>;
}

/**
 * PublicAccessibleRoute Component
 * 
 * Allows BOTH authenticated and unauthenticated users to access pages.
 * Used for pages like Support, Privacy Policy, About that should be accessible to everyone.
 * Shows loading animation during initial auth check.
 * 
 * @param children - The component to render
 */
function PublicAccessibleRoute({ children }: { children: React.ReactNode }) {
  const { initialLoadComplete } = useAuth();

  // Show loading animation during initial auth check
  if (!initialLoadComplete) {
    return <LogoLoader message="Initializing..." />;
  }

  return <>{children}</>;
}

/**
 * AppRoutes Component
 * 
 * Defines all application routes with proper protection and access control.
 * Routes are organized by type: public, protected, dashboards, and features.
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes - Accessible to all, but redirect authenticated users to dashboard */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/get-started" element={<PublicRoute><RoleSelection /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register/student" element={<PublicRoute><StudentRegister /></PublicRoute>} />
      <Route path="/register/teacher" element={<PublicRoute><TeacherRegister /></PublicRoute>} />
      <Route path="/register/school-admin" element={<PublicRoute><SchoolAdminRegister /></PublicRoute>} />
      <Route path="/register/parent" element={<PublicRoute><ParentRegister /></PublicRoute>} />
      
      <Route path="/register/verify-student" element={<PublicRoute><VerifyStudentEmail /></PublicRoute>} />
      {/* About Pages - Accessible to all users (public) */}
      <Route path="/about" element={<PublicAccessibleRoute><About /></PublicAccessibleRoute>} />
      <Route path="/about/schools" element={<PublicAccessibleRoute><AboutSchools /></PublicAccessibleRoute>} />
      <Route path="/about/teachers" element={<PublicAccessibleRoute><AboutTeachers /></PublicAccessibleRoute>} />
      <Route path="/about/students" element={<PublicAccessibleRoute><AboutStudents /></PublicAccessibleRoute>} />

      {/* Support & Legal Pages - Accessible to all users (both authenticated and unauthenticated) */}
      <Route path="/support" element={<PublicAccessibleRoute><Support /></PublicAccessibleRoute>} />
      <Route path="/privacy-policy" element={<PublicAccessibleRoute><PrivacyPolicy /></PublicAccessibleRoute>} />

      {/* Student Routes - Protected, accessible only to students and parents */}
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

      <Route path="/student/zoom-lessons" element={<ProtectedRoute allowedRoles={['student', 'parent']}><AuthenticatedLayout><StudentZoomLessons /></AuthenticatedLayout></ProtectedRoute>} />

      {/* Parent Routes - Protected, accessible only to parents */}
      <Route path="/parent/dashboard" element={
        <ProtectedRoute allowedRoles={['parent']}>
          <ParentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/parent/students" element={
        <ProtectedRoute allowedRoles={['parent']}>
          <ParentStudents />
        </ProtectedRoute>
      } />
      <Route path="/parent/performance" element={
        <ProtectedRoute allowedRoles={['parent']}>
          <ParentPerformance />
        </ProtectedRoute>
      } />
      <Route path="/parent/courses" element={
        <ProtectedRoute allowedRoles={['parent']}>
          <ParentCourses />
        </ProtectedRoute>
      } />
      <Route path="/parent/fees" element={
      <ProtectedRoute allowedRoles={['parent']}>
          <ParentFees />
        </ProtectedRoute>
      } />

      <Route path="/parent/zoom-lessons" element={
        <ProtectedRoute allowedRoles={['parent']}>
          <AuthenticatedLayout><ParentZoomLessons /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Teacher Routes - Protected, accessible only to teachers */}
      <Route path="/teacher/dashboard" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><TeacherDashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/courses" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><TeacherCourses /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/students" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherStudents />
        </ProtectedRoute>
      } />
      <Route path="/teacher/courses/create" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <CreateCourse />
        </ProtectedRoute>
      } />

      <Route path="/teacher/zoom-lessons" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><TeacherZoomLessons /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* School Admin Routes - Protected, accessible only to school admins */}
      <Route path="/school-admin/dashboard" element={
        <ProtectedRoute allowedRoles={['school_admin']}>
          <AuthenticatedLayout><SchoolAdminDashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Platform Admin Routes - Protected, accessible only to platform admins */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><PlatformAdminDashboard /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><UserManagement /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><SystemAnalytics /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/moderation" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><ContentModeration /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/monitoring" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><GlobalMonitoring /></AdminLayout>
        </ProtectedRoute>
      } />

      {/* Shared Feature Routes - Protected, accessible to all authenticated users */}
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
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin']}> 
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

      {/* Document Routes - Protected, accessible to all authenticated users */}
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
      {/* Public document sharing - accessible without authentication */}
      <Route path="/documents/public/:token" element={<PublicDocument />} />

      {/* Document Workspace Routes - Microsoft Office 365 Style */}
      <Route path="/features/document-workspace" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><DocumentWorkspaceWrapper /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/editor/:type/:docId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <UnifiedDocumentEditor />
        </ProtectedRoute>
      } />

      {/* Global Feature Routes - Protected, accessible to all authenticated users */}
      <Route path="/features/document-management" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><DocumentManagement /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/calculator" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Calculator /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/profile" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><ProfileSystem /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/hanna-ai" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><HannaAI /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/analytics" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent']}>
          <AuthenticatedLayout><Analytics /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Fallback Route - Redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * App Component
 * 
 * Root component that sets up:
 * - Theme provider for dark/light mode support
 * - Authentication provider for user state management
 * - Router for client-side navigation
 * - Toast notifications (Sonner)
 */
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