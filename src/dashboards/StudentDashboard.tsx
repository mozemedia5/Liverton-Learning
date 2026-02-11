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
  Menu,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCourses } from '@/hooks/useCourses';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch real data from Firebase
  const { courses, loading: coursesLoading, error: coursesError } = useCourses();
  const { quizzes, loading: quizzesLoading, error: quizzesError } = useQuizzes();
  const { announcements, loading: announcementsLoading, error: announcementsError } = useAnnouncements({ maxResults: 5 });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const navItems = [
    { icon: <BookOpen className="w-5 h-5" />, label: 'Home', path: '/student/dashboard', active: true },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Courses', path: '/student/courses' },
    { icon: <CheckCircle className="w-5 h-5" />, label: 'Quizzes', path: '/student/quizzes' },
    { icon: <Bell className="w-5 h-5" />, label: 'Announcements', path: '/announcements' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Chat', path: '/chat' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', path: '/payments' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  // Calculate stats from real data
  const stats = {
    enrolledCourses: courses.length,
    quizzesTaken: quizzes.length,
    averageProgress: courses.length > 0 
      ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
      : 0,
  };

  const hasError = coursesError || quizzesError || announcementsError;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-xl font-bold">Liverton Learning</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'block' : 'hidden'
        } lg:block w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 min-h-screen`}>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={item.active ? 'default' : 'ghost'}
                className="w-full justify-start gap-3"
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome back, {userData?.name || 'Student'}!</h2>
            <p className="text-gray-600 dark:text-gray-400">Here's your learning dashboard</p>
          </div>

          {/* Error Alert */}
          {hasError && (
            <Card className="mb-6 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 dark:text-red-200">
                  Failed to load some data. Please refresh the page.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

          {/* Courses Section */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Your Courses</h3>
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
                      <Button className="w-full mt-4" onClick={() => navigate(`/course/${course.id}`)}>
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

          {/* Announcements Section */}
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

          {/* Quizzes Section */}
          <div>
            <h3 className="text-2xl font-bold mb-4">Recent Quizzes</h3>
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
    </div>
  );
}
