import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Toaster } from '@/components/ui/sonner';
import LogoLoader from '@/components/LogoLoader';

// Pages
import LandingPage from '@/pages/LandingPage';
import RoleSelection from '@/pages/RoleSelection';
import Login from '@/pages/Login';
import Register from '@/pages/register/Register';
import VerifyEmail from '@/pages/register/VerifyEmail';
import NotFound from '@/pages/NotFound';
import CourseView from '@/pages/CourseView';
import PublicProfile from '@/pages/PublicProfile';

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
import DashboardAnnouncementManagement from '@/pages/admin/DashboardAnnouncementManagement';

// Parent Pages
import ParentStudents from '@/pages/ParentStudents';
import ParentPerformance from '@/pages/ParentPerformance';
import ParentCourses from '@/pages/ParentCourses';
import ParentFees from '@/pages/ParentFees';
import ParentQuizzes from '@/pages/ParentQuizzes';

// Feature Pages
import Courses from '@/pages/features/Courses';
import Announcements from '@/pages/features/Announcements';
import CreateAnnouncement from '@/pages/features/CreateAnnouncement';
import DashboardBanners from '@/pages/features/DashboardBanners';
import Chat from '@/pages/features/Chat';
import Payments from '@/pages/features/Payments';
import Profile from '@/pages/features/Profile';
import Settings from '@/pages/features/Settings';
import Quizzes from '@/pages/features/Quizzes';
import CreateQuiz from '@/pages/teacher/CreateQuiz';
import TeacherQuizzes from '@/pages/teacher/TeacherQuizzes';
import MyQuiz from '@/pages/teacher/MyQuiz';
import QuizAnalytics from '@/pages/teacher/QuizAnalytics';
import TakeQuiz from '@/pages/student/TakeQuiz';
import CreateCourse from '@/pages/teacher/CreateCourse';
import TeacherCourses from '@/pages/teacher/TeacherCourses';
import ViewCourse from '@/pages/teacher/ViewCourse';
import EditCourse from '@/pages/teacher/EditCourse';
import Documents from '@/pages/features/Documents';
import DocumentEditor from '@/pages/features/DocumentEditor';
import PublicDocument from '@/pages/features/PublicDocument';

// New Global Features
import LivTeams from '@/pages/features/liv-teams/LivTeams';
import TeamWorkspace from '@/pages/features/liv-teams/TeamWorkspace';
import CalendarPage from '@/pages/features/CalendarPage';
import Events from '@/pages/features/Events';
import CreateEvent from '@/pages/features/CreateEvent';
import Calculator from '@/pages/features/Calculator';
import ProfileSystem from '@/pages/features/ProfileSystem';
import HannaChatIntegrated from '@/pages/features/HannaChatIntegrated';
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
  const location = useLocation();

  // Show loading animation during initial auth check
  // This prevents flash of login page for authenticated users
  if (!initialLoadComplete) {
    return <LogoLoader message="Initializing..." />;
  }

  // Redirect unauthenticated users to login page, preserving the intended
  // destination so they return to it after signing in (deep links)
  if (!isAuthenticated) {
    const intended = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" state={{ from: intended }} replace />;
  }

  // Email verification is now handled elegantly directly in the Profile page
  // Users are no longer blocked from accessing their dashboard

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
  const location = useLocation();

  // Show loading animation during initial auth check
  // This prevents flash of landing page for authenticated users
  if (!initialLoadComplete) {
    return <LogoLoader message="Initializing..." />;
  }

  // Redirect authenticated users: honor a preserved deep-link destination
  // first, otherwise fall back to their role dashboard
  if (isAuthenticated && userRole) {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && from !== '/login') {
      return <Navigate to={from} replace />;
    }
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
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/register/student" element={<Navigate to="/register?role=student" replace />} />
      <Route path="/register/teacher" element={<Navigate to="/register?role=teacher" replace />} />
      <Route path="/register/school-admin" element={<Navigate to="/register?role=school_admin" replace />} />
      <Route path="/register/parent" element={<Navigate to="/register?role=parent" replace />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
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
      <Route path="/student/quiz/:id" element={
        <ProtectedRoute allowedRoles={['student']}>
          <TakeQuiz />
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
      <Route path="/parent/quizzes" element={
        <ProtectedRoute allowedRoles={['parent']}>
          <ParentQuizzes />
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
          <TeacherCourses />
        </ProtectedRoute>
      } />
      <Route path="/teacher/courses/create" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <CreateCourse />
        </ProtectedRoute>
      } />
      <Route path="/teacher/courses/:courseId" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <ViewCourse />
        </ProtectedRoute>
      } />
      <Route path="/teacher/courses/:courseId/edit" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <EditCourse />
        </ProtectedRoute>
      } />
      <Route path="/teacher/quizzes/create" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <CreateQuiz />
        </ProtectedRoute>
      } />

      <Route path="/teacher/quizzes" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><TeacherQuizzes /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/quizzes/:quizId/analytics" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><QuizAnalytics /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/my-quiz" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <MyQuiz />
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
      <Route path="/admin/dashboard-announcements" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><DashboardAnnouncementManagement /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard-banners" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><DashboardBanners /></AdminLayout>
        </ProtectedRoute>
      } />

      {/* Shared Feature Routes - Protected, accessible to all authenticated users */}
      <Route path="/announcements" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Announcements /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/announcements/create" element={
        <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'platform_admin']}>
          <AuthenticatedLayout><CreateAnnouncement /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <Chat />
        </ProtectedRoute>
      } />
      {/* Deep link into a specific conversation (shareable) */}
      <Route path="/chat/:chatId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <Chat />
        </ProtectedRoute>
      } />
      {/* Shareable course detail page (opens the exact course for any signed-in user) */}
      <Route path="/courses/:courseId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><CourseView /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      {/* Shareable public profile page */}
      <Route path="/profile/:userId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><PublicProfile /></AuthenticatedLayout>
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

      {/* Document Routes - Protected, accessible to all authenticated users */}
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
      {/* Public document sharing - accessible without authentication */}
      <Route path="/documents/public/:token" element={<PublicDocument />} />

      {/* Calendar Route - Protected, accessible to all authenticated users */}
      <Route path="/calendar" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <CalendarPage />
        </ProtectedRoute>
      } />

      {/* Events Routes - Protected, accessible to all authenticated users */}
      <Route path="/events" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <Events />
        </ProtectedRoute>
      } />
      <Route path="/events/create" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <CreateEvent />
        </ProtectedRoute>
      } />

      {/* Global Feature Routes - Protected, accessible to all authenticated users */}
      <Route path="/features/liv-teams" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><LivTeams /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/liv-teams/workspace/:teamId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><TeamWorkspace /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      {/* Legacy document-management route removed — consolidated into /dashboard/documents */}
      <Route path="/features/calculator" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Calculator /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/profile" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><ProfileSystem /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/features/hanna-ai" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <HannaChatIntegrated />
        </ProtectedRoute>
      } />
      <Route path="/features/analytics" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Analytics /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* 404 - Page not found */}
      <Route path="*" element={<NotFound />} />
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
