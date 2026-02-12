import { useNavigate } from 'react-router-dom';
import TeacherSideNavbar from '@/components/TeacherSideNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Bell, 
  CreditCard, 
  User,
  TrendingUp,
  DollarSign,
  Users,
  Plus,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * TeacherDashboard Component
 * 
 * Features:
 * - Uses TeacherSideNavbar for sliding overlay navigation
 * - Displays teacher-specific statistics (earnings, courses, students)
 * - Course management and student tracking
 * - Responsive design with mobile support
 * - Dark mode support
 * 
 * Note: Hanna AI is NOT included in teacher dashboard (removed as per requirements)
 */
export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mock data for teacher dashboard
  const myCourses = [
    { id: 1, title: 'Advanced Mathematics', students: 45, revenue: 2250, status: 'active' },
    { id: 2, title: 'Physics Fundamentals', students: 32, revenue: 1600, status: 'active' },
    { id: 3, title: 'Algebra Basics', students: 28, revenue: 840, status: 'draft' },
  ];

  const earnings = {
    total: 4690,
    pending: 850,
    thisMonth: 1200,
  };

  const recentStudents = [
    { id: 1, name: 'John Doe', course: 'Advanced Mathematics', enrolled: '2026-02-05' },
    { id: 2, name: 'Jane Smith', course: 'Physics Fundamentals', enrolled: '2026-02-04' },
    { id: 3, name: 'Mike Johnson', course: 'Advanced Mathematics', enrolled: '2026-02-03' },
  ];

  const announcements = [
    { id: 1, title: 'New Course Guidelines', sender: 'Platform Admin', date: '2026-02-09' },
    { id: 2, title: 'Payment Processing Update', sender: 'Platform Admin', date: '2026-02-07' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Use TeacherSideNavbar for overlay navigation */}
      <TeacherSideNavbar />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 lg:pl-64">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="font-semibold hidden sm:inline">Liverton Learning</span>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/announcements')}>
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 lg:p-6 space-y-6 lg:ml-0">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {userData?.fullName || 'Teacher'}!</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your courses and students</p>
          </div>
          <Button 
            onClick={() => navigate('/teacher/courses')}
            className="bg-black dark:bg-white text-white dark:text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>

        {/* Earnings Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Earnings Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                  <p className="text-xl font-bold">${earnings.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Earnings Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-xl font-bold">${earnings.pending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month Earnings Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                  <p className="text-xl font-bold">${earnings.thisMonth.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Courses Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              My Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myCourses.map((course) => (
                <div 
                  key={course.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                  onClick={() => navigate(`/teacher/courses/${course.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{course.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {course.students} students • ${course.revenue.toLocaleString()} revenue
                    </p>
                  </div>
                  <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                    {course.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Students Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {student.course} • Enrolled {student.enrolled}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Announcements Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div 
                  key={announcement.id}
                  className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <h3 className="font-semibold">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {announcement.sender} • {announcement.date}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
