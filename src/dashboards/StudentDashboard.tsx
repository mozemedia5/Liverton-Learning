import { useNavigate } from 'react-router-dom';
import SideNavbar from '@/components/SideNavbar';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Bell, 
  User,
  TrendingUp,
  Calendar,
  Award,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * StudentDashboard Component
 * 
 * Features:
 * - Uses SideNavbar for sliding overlay navigation with Hanna AI integration
 * - Displays student-specific statistics (courses, progress, grades)
 * - Course enrollment and progress tracking
 * - Responsive design with mobile support
 * - Dark mode support
 * - Hanna AI integration (unique to student dashboard)
 */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mock data for student dashboard
  const enrolledCourses = [
    { id: 1, title: 'Advanced Mathematics', instructor: 'Mr. Smith', progress: 75, status: 'active' },
    { id: 2, title: 'Physics Fundamentals', instructor: 'Ms. Johnson', progress: 60, status: 'active' },
    { id: 3, title: 'English Literature', instructor: 'Mr. Brown', progress: 85, status: 'active' },
  ];

  const studentStats = {
    totalCourses: 3,
    averageGrade: 'A-',
    attendanceRate: 92,
    completedAssignments: 24,
  };

  const upcomingAssignments = [
    { id: 1, title: 'Math Problem Set 5', course: 'Advanced Mathematics', dueDate: '2026-02-15', status: 'pending' },
    { id: 2, title: 'Physics Lab Report', course: 'Physics Fundamentals', dueDate: '2026-02-18', status: 'pending' },
    { id: 3, title: 'Essay on Shakespeare', course: 'English Literature', dueDate: '2026-02-20', status: 'pending' },
  ];

  const recentGrades = [
    { id: 1, assignment: 'Algebra Quiz', course: 'Advanced Mathematics', grade: 'A', date: '2026-02-08' },
    { id: 2, assignment: 'Physics Midterm', course: 'Physics Fundamentals', grade: 'B+', date: '2026-02-07' },
    { id: 3, assignment: 'Reading Assignment', course: 'English Literature', grade: 'A-', date: '2026-02-06' },
  ];

  const announcements = [
    { id: 1, title: 'New Course Materials Available', course: 'Advanced Mathematics', date: '2026-02-09' },
    { id: 2, title: 'Exam Schedule Released', course: 'Physics Fundamentals', date: '2026-02-08' },
  ];



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Use SideNavbar for overlay navigation with Hanna AI */}
      <SideNavbar />

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
            <h1 className="text-2xl font-bold">Welcome, {userData?.fullName || 'Student'}!</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your courses and assignments</p>
          </div>
          <Button 
            onClick={() => navigate('/student/courses')}
            className="bg-black dark:bg-white text-white dark:text-black"
          >
            Browse Courses
          </Button>
        </div>

        {/* Student Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Courses Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Courses</p>
                  <p className="text-xl font-bold">{studentStats.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Grade Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Grade</p>
                  <p className="text-xl font-bold">{studentStats.averageGrade}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Attendance</p>
                  <p className="text-xl font-bold">{studentStats.attendanceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Assignments Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Assignments Done</p>
                  <p className="text-xl font-bold">{studentStats.completedAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              My Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enrolledCourses.map((course) => (
                <div 
                  key={course.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                  onClick={() => navigate(`/student/courses/${course.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{course.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {course.instructor} • {course.progress}% complete
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

        {/* Upcoming Assignments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div 
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{assignment.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {assignment.course} • Due {assignment.dueDate}
                    </p>
                  </div>
                  <Badge variant={assignment.status === 'pending' ? 'secondary' : 'default'}>
                    {assignment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Grades Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGrades.map((grade) => (
                <div 
                  key={grade.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{grade.assignment}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {grade.course} • {grade.date}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-green-600">{grade.grade}</span>
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
              Course Announcements
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
                    {announcement.course} • {announcement.date}
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
