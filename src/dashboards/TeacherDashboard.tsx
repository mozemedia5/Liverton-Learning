import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Bell, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  Users,
  Plus,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { 
  subscribeToTeacherAnalytics, 
  subscribeToTeacherEnrollments,
  type TeacherAnalytics,
  type Enrollment
} from '@/services/analyticsService';

/**
 * TeacherDashboard Component
 * 
 * Features:
 * - Uses AuthenticatedLayout for standardized navigation
 * - Displays real-time teacher-specific statistics (earnings, courses, students)
 * - Course management and student tracking
 * - Responsive design with mobile support
 * - Dark mode support
 */
export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time data subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    
    // Subscribe to teacher analytics
    const unsubscribeAnalytics = subscribeToTeacherAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
        setLoading(false);
      }
    );

    // Subscribe to recent enrollments
    const unsubscribeEnrollments = subscribeToTeacherEnrollments(
      currentUser.uid,
      (data) => {
        setRecentEnrollments(data);
      }
    );

    return () => {
      unsubscribeAnalytics();
      unsubscribeEnrollments();
    };
  }, [currentUser?.uid]);

  // Mock courses data (until we implement courses subscription)
  const myCourses = [
    { id: 1, title: 'Advanced Mathematics', students: analytics?.totalStudents || 0, revenue: analytics?.totalEarnings || 0, status: 'active' },
    { id: 2, title: 'Physics Fundamentals', students: Math.floor((analytics?.totalStudents || 0) / 2), revenue: Math.floor((analytics?.totalEarnings || 0) / 2), status: 'active' },
    { id: 3, title: 'Algebra Basics', students: Math.floor((analytics?.totalStudents || 0) / 3), revenue: Math.floor((analytics?.totalEarnings || 0) / 3), status: 'draft' },
  ];

  const announcements = [
    { id: 1, title: 'New Course Guidelines', sender: 'Platform Admin', date: new Date().toISOString().split('T')[0] },
    { id: 2, title: 'Payment Processing Update', sender: 'Platform Admin', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  ];

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex-1 flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-4 lg:p-6 space-y-6">
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
                  <p className="text-xl font-bold">${(analytics?.totalEarnings || 0).toLocaleString()}</p>
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
                  <p className="text-xl font-bold">${(analytics?.pendingEarnings || 0).toLocaleString()}</p>
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
                  <p className="text-xl font-bold">${(analytics?.monthlyEarnings || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Courses</p>
                  <p className="text-xl font-bold">{analytics?.totalCourses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                  <p className="text-xl font-bold">{analytics?.totalStudents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                  <p className="text-xl font-bold">{analytics?.averageCourseRating || 0}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Lessons</p>
                  <p className="text-xl font-bold">{analytics?.totalLessons || 0}</p>
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
              {recentEnrollments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent enrollments</p>
              ) : (
                recentEnrollments.map((enrollment) => (
                  <div 
                    key={enrollment.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{enrollment.studentName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {enrollment.courseName} • {enrollment.progress}% complete
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))
              )}
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
      </div>
    </AuthenticatedLayout>
  );
}
