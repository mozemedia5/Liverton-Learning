import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Bell, 
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { 
  subscribeToStudentAnalytics, 
  subscribeToStudentAssignments,
  type StudentAnalytics,
  type Assignment
} from '@/services/analyticsService';
import { subscribeToStudentCourses, type Course } from '@/services/courseService';

/**
 * StudentDashboard Component
 * 
 * Features:
 * - Uses AuthenticatedLayout for standardized navigation with Hanna AI integration
 * - Displays real-time student-specific statistics (courses, progress, grades)
 * - Course enrollment and progress tracking
 * - Responsive design with mobile support
 * - Dark mode support
 * - Hanna AI integration (unique to student dashboard)
 */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time data subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    
    // Subscribe to student analytics
    const unsubscribeAnalytics = subscribeToStudentAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
      }
    );

    // Subscribe to assignments
    const unsubscribeAssignments = subscribeToStudentAssignments(
      currentUser.uid,
      (data) => {
        setAssignments(data);
      }
    );

    // Subscribe to student courses
    const unsubscribeCourses = subscribeToStudentCourses(
      currentUser.uid,
      (data) => {
        setCourses(data);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeAnalytics();
      unsubscribeAssignments();
      unsubscribeCourses();
    };
  }, [currentUser?.uid]);

  // Filter assignments
  const upcomingAssignments = assignments.filter(a => 
    a.status === 'pending' || a.status === 'submitted'
  ).slice(0, 3);

  const recentGrades = assignments.filter(a => 
    a.status === 'graded'
  ).slice(0, 3);

  const announcements = [
    { id: 1, title: 'New Course Materials Available', course: 'Advanced Mathematics', date: new Date().toISOString().split('T')[0] },
    { id: 2, title: 'Exam Schedule Released', course: 'Physics Fundamentals', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
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
                  <p className="text-xl font-bold">{courses.length || analytics?.totalCourses || 0}</p>
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
                  <p className="text-xl font-bold">{analytics?.averageGrade || 'N/A'}</p>
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
                  <p className="text-xl font-bold">{analytics?.attendanceRate || 0}%</p>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-xl font-bold">{analytics?.completedAssignments || 0}</p>
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
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet</p>
                <Button onClick={() => navigate('/student/courses')}>
                  Browse Available Courses
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <div 
                    key={course.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    onClick={() => navigate('/student/courses')}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {course.teacherName}
                      </p>
                    </div>
                    <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                      {course.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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
              {upcomingAssignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming assignments</p>
              ) : (
                upcomingAssignments.map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {assignment.courseName} • Due {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={assignment.status === 'pending' ? 'secondary' : 'default'}>
                      {assignment.status}
                    </Badge>
                  </div>
                ))
              )}
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
              {recentGrades.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No grades yet</p>
              ) : (
                recentGrades.map((grade) => (
                  <div 
                    key={grade.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{grade.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {grade.courseName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">{grade.grade}</span>
                      {grade.score && grade.maxScore && (
                        <p className="text-xs text-gray-500">{grade.score}/{grade.maxScore}</p>
                      )}
                    </div>
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
      </div>
    </AuthenticatedLayout>
  );
}
