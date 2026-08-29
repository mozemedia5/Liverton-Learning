import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import SalafDashboardHeader from '@/components/SalafDashboardHeader';
import { 
  subscribeToStudentAnalytics, 
  subscribeToStudentAssignments,
  type StudentAnalytics,
  type Assignment
} from '@/services/analyticsService';
import { subscribeToStudentCourses, type Course } from '@/services/courseService';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
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
      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* SALAF App Header (User Greeting, Corner Notification Bell, Search Bar & Category Buttons) */}
        <SalafDashboardHeader searchPlaceholder="Search courses, lessons, materials..." />

        {/* Dashboard Banner Carousel (SALAF Blue Banner Theme) */}
        <BannerCarousel />

        {/* Student Statistics Cards (SALAF Rounded Card Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Courses Card */}
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Courses</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{courses.length || analytics?.totalCourses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Grade Card */}
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Average Grade</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.averageGrade || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate Card */}
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Attendance</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.attendanceRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Assignments Card */}
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.completedAssignments || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses Section */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              My Enrolled Courses
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/student/courses')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Browse All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4 text-sm">You haven't enrolled in any courses yet</p>
                <Button
                  onClick={() => navigate('/student/courses')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md text-xs"
                >
                  Browse Available Courses
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <div 
                    key={course.id}
                    className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/student/courses')}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold text-sm truncate">{course.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {course.teacherName || 'Liverton Teacher'}
                      </p>
                    </div>
                    <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 text-xs font-semibold">
                      {course.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments Section */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {upcomingAssignments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No pending assignments right now</p>
              ) : (
                upcomingAssignments.map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-800 rounded-xl"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold text-sm truncate">{assignment.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {assignment.courseName} • Due {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={assignment.status === 'pending' ? 'secondary' : 'default'} className="rounded-lg text-xs">
                      {assignment.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
