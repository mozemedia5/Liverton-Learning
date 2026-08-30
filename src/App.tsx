import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Toaster } from '@/components/ui/sonner';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { Analytics } from '@vercel/analytics/react';

// Pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const RoleSelection = lazy(() => import('@/pages/RoleSelection'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/register/Register'));
const VerifyEmail = lazy(() => import('@/pages/register/VerifyEmail'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const CourseView = lazy(() => import('@/pages/CourseView'));
const PublicProfile = lazy(() => import('@/pages/PublicProfile'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));

const VerifyStudentEmail = lazy(() => import('@/pages/register/VerifyStudentEmail'));
// Dashboards
const StudentDashboard = lazy(() => import('@/dashboards/StudentDashboard'));
const TeacherDashboard = lazy(() => import('@/dashboards/TeacherDashboard'));
const SchoolAdminDashboard = lazy(() => import('@/dashboards/SchoolAdminDashboard'));
const ParentDashboard = lazy(() => import('@/pages/ParentDashboard'));
const PlatformAdminDashboard = lazy(() => import('@/dashboards/PlatformAdminDashboard'));
import AdminLayout from '@/components/AdminLayout';
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const SystemAnalytics = lazy(() => import('@/pages/admin/SystemAnalytics'));
const ContentModeration = lazy(() => import('@/pages/admin/ContentModeration'));
const GlobalMonitoring = lazy(() => import('@/pages/admin/GlobalMonitoring'));
const DashboardAnnouncementManagement = lazy(() => import('@/pages/admin/DashboardAnnouncementManagement'));
const LivTeamsPromotionModeration = lazy(() => import('@/pages/admin/LivTeamsPromotionModeration'));
const LivMartModeration = lazy(() => import('@/pages/admin/LivMartModeration'));

// Parent Pages
const ParentStudents = lazy(() => import('@/pages/ParentStudents'));
const ParentPerformance = lazy(() => import('@/pages/ParentPerformance'));
const ParentCourses = lazy(() => import('@/pages/ParentCourses'));
const ParentFees = lazy(() => import('@/pages/ParentFees'));
const ParentQuizzes = lazy(() => import('@/pages/ParentQuizzes'));

// Feature Pages
const Courses = lazy(() => import('@/pages/features/Courses'));
const Announcements = lazy(() => import('@/pages/features/Announcements'));
const CreateAnnouncement = lazy(() => import('@/pages/features/CreateAnnouncement'));
const DashboardBanners = lazy(() => import('@/pages/features/DashboardBanners'));
const Chat = lazy(() => import('@/pages/features/Chat'));
const Payments = lazy(() => import('@/pages/features/Payments'));
const Profile = lazy(() => import('@/pages/features/Profile'));
const Settings = lazy(() => import('@/pages/features/Settings'));
const Quizzes = lazy(() => import('@/pages/features/Quizzes'));
const CreateQuiz = lazy(() => import('@/pages/teacher/CreateQuiz'));
const TeacherQuizzes = lazy(() => import('@/pages/teacher/TeacherQuizzes'));
const MyQuiz = lazy(() => import('@/pages/teacher/MyQuiz'));
const QuizAnalytics = lazy(() => import('@/pages/teacher/QuizAnalytics'));
const TakeQuiz = lazy(() => import('@/pages/student/TakeQuiz'));
const ModuleWorkspace = lazy(() => import('@/pages/student/ModuleWorkspace'));
const UpcomingLiveLessons = lazy(() => import('@/pages/student/UpcomingLiveLessons'));
const CreateCourse = lazy(() => import('@/pages/teacher/CreateCourse'));
const TeacherCourses = lazy(() => import('@/pages/teacher/TeacherCourses'));
const ViewCourse = lazy(() => import('@/pages/teacher/ViewCourse'));
const EditCourse = lazy(() => import('@/pages/teacher/EditCourse'));
const Documents = lazy(() => import('@/pages/features/Documents'));
const DocumentEditor = lazy(() => import('@/pages/features/DocumentEditor'));
const PublicDocument = lazy(() => import('@/pages/features/PublicDocument'));

// New Global Features
const LivTeams = lazy(() => import('@/pages/features/liv-teams/LivTeams'));
const TeamWorkspace = lazy(() => import('@/pages/features/liv-teams/TeamWorkspace'));
const TeamMeetingRoom = lazy(() => import('@/pages/features/liv-teams/TeamMeetingRoom'));
const TeamInvitationPage = lazy(() => import('@/pages/features/liv-teams/TeamInvitationPage'));
const CalendarPage = lazy(() => import('@/pages/features/CalendarPage'));
const Events = lazy(() => import('@/pages/features/Events'));
const CreateEvent = lazy(() => import('@/pages/features/CreateEvent'));
const Calculator = lazy(() => import('@/pages/features/Calculator'));
const HannaChatIntegrated = lazy(() => import('@/pages/features/HannaChatIntegrated'));
const AnalyticsPage = lazy(() => import('@/pages/features/Analytics'));
const MoreHub = lazy(() => import('@/pages/features/MoreHub'));
const LiveFeatureGate = lazy(() => import('@/pages/features/LiveFeatureGate'));

const TeacherZoomLessons = lazy(() => import('@/components/ZoomLessons/TeacherZoomLessons'));
const StudentZoomLessons = lazy(() => import('@/components/ZoomLessons/StudentZoomLessons'));
const ParentZoomLessons = lazy(() => import('@/components/ZoomLessons/ParentZoomLessons'));

// TEARN Features
const TearnDashboard = lazy(() => import('@/pages/features/tearn/TearnDashboard'));
const ShortsArena = lazy(() => import('@/pages/features/tearn/ShortsArena'));
const ShortUpload = lazy(() => import('@/pages/teacher/ShortUpload'));
const ShortAnalytics = lazy(() => import('@/pages/teacher/ShortAnalytics'));
const BookReader = lazy(() => import('@/pages/features/tearn/BookReader'));
const ZoomLessonArena = lazy(() => import('@/pages/zoom-lessons/ZoomLessonArena'));

// About Pages
import About from '@/pages/about/About';
import AboutSchools from '@/pages/about/AboutSchools';
import AboutTeachers from '@/pages/about/AboutTeachers';
import AboutStudents from '@/pages/about/AboutStudents';
import PWADebug from '@/pages/PWADebug';

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
    return <Navigate to={getDashboardRoute(userRole) || '/'} replace />;
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
  // first, otherwise use the shared role dashboard mapping.
  if (isAuthenticated && userRole) {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && from !== '/login' && from !== '/register' && from !== '/get-started') {
      return <Navigate to={from} replace />;
    }
    return <Navigate to={getDashboardRoute(userRole) || '/login'} replace />;
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
    <>
      <RouteMetadata />
      <Suspense fallback={<LogoLoader message="Loading page..." size="md" />} >
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
      <Route path="/about/parents" element={<PublicAccessibleRoute><AboutParents /></PublicAccessibleRoute>} />

      {/* Support & Legal Pages - Accessible to all users (both authenticated and unauthenticated) */}
      <Route path="/support" element={<PublicAccessibleRoute><Support /></PublicAccessibleRoute>} />
      <Route path="/privacy-policy" element={<PublicAccessibleRoute><PrivacyPolicy /></PublicAccessibleRoute>} />
      <Route path="/terms" element={<PublicAccessibleRoute><TermsOfService /></PublicAccessibleRoute>} />

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
      <Route path="/student/courses/:courseId" element={
        <ProtectedRoute allowedRoles={['student', 'parent']}>
          <AuthenticatedLayout><ModuleWorkspace /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      <Route path="/student/zoom-lessons" element={<ProtectedRoute allowedRoles={['student', 'parent']}><AuthenticatedLayout><StudentZoomLessons /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/student/upcoming-lessons" element={<ProtectedRoute allowedRoles={['student', 'parent']}><AuthenticatedLayout><UpcomingLiveLessons /></AuthenticatedLayout></ProtectedRoute>} />

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
      <Route path="/teacher/shorts/upload" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><ShortUpload /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/shorts/analytics" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <AuthenticatedLayout><ShortAnalytics /></AuthenticatedLayout>
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
      <Route path="/admin/liv-teams-promotions" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><LivTeamsPromotionModeration /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/livmart-moderation" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AdminLayout><LivMartModeration /></AdminLayout>
        </ProtectedRoute>
      } />

      {/* Liv Teams invite links are public landing pages; workspaces require auth. */}
      <Route path="/features/liv-teams/invite/:inviteId" element={<PublicAccessibleRoute><TeamInvitationPage /></PublicAccessibleRoute>} />
      <Route path="/features/liv-teams" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}><AuthenticatedLayout><LivTeams /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/features/liv-teams/workspace/:teamId" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}><AuthenticatedLayout><TeamWorkspace /></AuthenticatedLayout></ProtectedRoute>} />
      <Route path="/features/liv-teams/meeting/:teamId/:meetingId" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}><AuthenticatedLayout><TeamMeetingRoom /></AuthenticatedLayout></ProtectedRoute>} />

      {/* Shared Feature Routes - Protected, accessible to all authenticated users */}
      <Route path="/announcements" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Announcements /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/announcements/create" element={
        <ProtectedRoute allowedRoles={['platform_admin']}>
          <AuthenticatedLayout><CreateAnnouncement /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Chat /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      {/* Deep link into a specific conversation (shareable) */}
      <Route path="/chat/:chatId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'school_admin', 'parent', 'platform_admin']}>
          <AuthenticatedLayout><Chat /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      {/* Shareable course detail page (opens the exact course for any user, including guests/visitors) */}
      <Route path="/courses/:courseId" element={
        <AuthenticatedLayout><CourseView /></AuthenticatedLayout>
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

      {/* PWA Debug */}
      <Route path="/pwa-debug" element={<PWADebug />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
      </Suspense>
    </>
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
          <PWAInstallPrompt />
          <Analytics />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
