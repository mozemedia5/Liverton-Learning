import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  MessageSquare, 
  Bell, 
  CreditCard, 
  User, 
  Settings, 
  LogOut,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCourses } from '@/hooks/useCourses';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import SideNavbar from '@/components/SideNavbar';
import { toast } from 'sonner';

/**
 * StudentDashboard Component
 * 
 * Main dashboard for student users with:
 * - Sliding overlay navigation (SideNavbar)
 * - Course management and progress tracking
 * - Quiz management
 * - Announcements feed
 * - Document management integration
 * - Hanna AI integration
 * - Real-time data from Firebase
 */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Fetch real data from Firebase
  const { courses, loading: coursesLoading, error: coursesError } = useCourses();
  const { quizzes, loading: quizzesLoading, error: quizzesError } = useQuizzes();
  const { announcements, loading: announcementsLoading, error: announcementsError } = useAnnouncements({ maxResults: 5 });

  /**
   * Handle logout with confirmation
   * Prevents accidental logout by requiring user confirmation
   */
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  /**
   * Calculate dashboard statistics from real data
   * Provides overview of student progress and engagement
   */
  const stats = {
    enrolledCourses: courses.length,
    quizzesTaken: quizzes.length,
    averageProgress: courses.length > 0 
      ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
      : 0,
  };

  // Check if any data loading errors occurred
  const hasError = coursesError || quizzesError || announcementsError;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Sliding Overlay Navigation - Firebase Console Style */}
      <SideNavbar />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-sm">LL</span>
            </div>
            <h1 className="text-xl font-bold hidden sm:inline">Liverton Learning</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userData?.fullName || 'Student'}!</h2>
          <p className="text-gray-600 dark:text-gray-400">Here's your learning dashboard</p>
        </div>

        {/* Error Alert - Displayed if data loading fails */}
        {hasError && (
          <Card className="mb-6 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-200">
                Failed to load some data. Please refresh the page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Statistics Grid - Overview of student progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Enrolled Courses Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Enrolled Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.enrolledCourses}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Active courses</p>
            </CardContent>
          </Card>

          {/* Quizzes Taken Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Quizzes Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.quizzesTaken}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Completed</p>
            </CardContent>
          </Card>

          {/* Average Progress Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.averageProgress}%</div>
              <Progress value={stats.averageProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Courses Section - Display enrolled courses with progress tracking */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">Your Courses</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/student/courses')}
            >
              View All
            </Button>
          </div>
          {coursesLoading ? (
            <DashboardSkeleton />
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{course.title}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {course.instructor}
                        </p>
                      </div>
                      <Badge variant="secondary">{course.students} students</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {course.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-semibold">{course.progress || 0}%</span>
                      </div>
                      <Progress value={course.progress || 0} />
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      Continue Learning
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600 dark:text-gray-400">
                No courses enrolled yet. Start learning today!
              </CardContent>
            </Card>
          )}
        </div>

        {/* Announcements Section - Latest updates and notifications */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4">Latest Announcements</h3>
          {announcementsLoading ? (
            <DashboardSkeleton />
          ) : announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-semibold">{announcement.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600 dark:text-gray-400">
                No announcements yet.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quizzes Section - Available quizzes for student assessment */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">Recent Quizzes</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/student/quizzes')}
            >
              View All
            </Button>
          </div>
          {quizzesLoading ? (
            <DashboardSkeleton />
          ) : quizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {quiz.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">{quiz.questions} questions</Badge>
                      <Button onClick={() => navigate(`/quiz/${quiz.id}`)}>
                        Take Quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600 dark:text-gray-400">
                No quizzes available yet.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
