import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award,
  DollarSign,
  GraduationCap,
  School,
  Calendar,
  Clock,
  Loader2,
  UserCheck,
  CreditCard,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToStudentAnalytics,
  subscribeToTeacherAnalytics,
  subscribeToSchoolAnalytics,
  subscribeToParentAnalytics,
  subscribeToPlatformAnalytics,
  type StudentAnalytics,
  type TeacherAnalytics,
  type SchoolAnalytics,
  type ParentAnalytics,
  type PlatformAnalytics
} from '@/services/analyticsService';

// Role-based analytics component
export default function Analytics() {
  const { userRole, currentUser } = useAuth();

  if (!userRole || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Render role-specific analytics
  switch (userRole) {
    case 'student':
      return <StudentAnalyticsView studentId={currentUser.uid} />;
    case 'teacher':
      return <TeacherAnalyticsView teacherId={currentUser.uid} />;
    case 'school_admin':
      return <SchoolAnalyticsView schoolId={currentUser.uid} />;
    case 'parent':
      return <ParentAnalyticsView parentId={currentUser.uid} />;
    case 'platform_admin':
      return <PlatformAnalyticsView />;
    default:
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">Analytics not available for your role.</p>
            </CardContent>
          </Card>
        </div>
      );
  }
}

// ==========================================
// STUDENT ANALYTICS VIEW
// ==========================================
function StudentAnalyticsView({ studentId }: { studentId: string }) {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToStudentAnalytics(studentId, (data) => {
      setAnalytics(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Courses',
      value: analytics?.totalCourses || 0,
      unit: 'courses',
      icon: BookOpen,
      color: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Completed',
      value: analytics?.completedCourses || 0,
      unit: 'courses',
      icon: Award,
      color: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Average Grade',
      value: analytics?.averageGrade || 'N/A',
      unit: '',
      icon: BarChart3,
      color: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Attendance',
      value: `${analytics?.attendanceRate || 0}%`,
      unit: '',
      icon: Calendar,
      color: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Learning Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning progress and performance metrics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </div>
                    {stat.unit && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {stat.unit}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Progress & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Course Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Learning Progress
              </CardTitle>
              <CardDescription>Your course completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">In Progress</span>
                  <span className="text-2xl font-bold text-blue-600">{analytics?.inProgressCourses || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-2xl font-bold text-green-600">{analytics?.completedCourses || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Score</span>
                  <span className="text-2xl font-bold text-purple-600">{analytics?.averageScore || 0}%</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-bold">{analytics?.averageScore || 0}%</span>
                  </div>
                  <Progress value={analytics?.averageScore || 0} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Study Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Study Statistics
              </CardTitle>
              <CardDescription>Your learning activity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Study Time</span>
                  <span className="text-2xl font-bold">{Math.round((analytics?.totalStudyTime || 0) / 60)}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Streak</span>
                  <span className="text-2xl font-bold text-orange-600">{analytics?.streak || 0} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Assignments Completed</span>
                  <span className="text-2xl font-bold text-green-600">{analytics?.completedAssignments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending Assignments</span>
                  <span className="text-2xl font-bold text-yellow-600">{analytics?.pendingAssignments || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TEACHER ANALYTICS VIEW
// ==========================================
function TeacherAnalyticsView({ teacherId }: { teacherId: string }) {
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToTeacherAnalytics(teacherId, (data) => {
      setAnalytics(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Earnings',
      value: `$${(analytics?.totalEarnings || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Total Students',
      value: analytics?.totalStudents || 0,
      icon: Users,
      color: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Active Courses',
      value: analytics?.totalCourses || 0,
      icon: BookOpen,
      color: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Avg Rating',
      value: `${analytics?.averageCourseRating || 0}/5`,
      icon: Award,
      color: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Teaching Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your teaching performance and earnings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
              <CardDescription>Your financial performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Monthly Earnings</span>
                  <span className="text-xl font-bold text-green-600">
                    ${(analytics?.monthlyEarnings || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Pending Payout</span>
                  <span className="text-xl font-bold text-yellow-600">
                    ${(analytics?.pendingEarnings || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Active Students</span>
                  <span className="text-xl font-bold text-blue-600">
                    {analytics?.activeStudents || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Statistics</CardTitle>
              <CardDescription>Your course performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Total Lessons</span>
                  <span className="text-xl font-bold">{analytics?.totalLessons || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Completed Lessons</span>
                  <span className="text-xl font-bold text-green-600">
                    {analytics?.completedLessons || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Student Engagement</span>
                  <span className="text-xl font-bold text-purple-600">
                    {analytics?.totalStudents ? Math.round((analytics.activeStudents / analytics.totalStudents) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SCHOOL ADMIN ANALYTICS VIEW
// ==========================================
function SchoolAnalyticsView({ schoolId }: { schoolId: string }) {
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSchoolAnalytics(schoolId, (data) => {
      setAnalytics(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Students',
      value: analytics?.totalStudents || 0,
      icon: Users,
      color: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Teachers',
      value: analytics?.totalTeachers || 0,
      icon: GraduationCap,
      color: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Courses',
      value: analytics?.totalCourses || 0,
      icon: BookOpen,
      color: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Attendance Today',
      value: `${analytics?.attendanceToday || 0}%`,
      icon: UserCheck,
      color: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  const totalFees = (analytics?.feesCollected || 0) + (analytics?.feesPending || 0) + (analytics?.feesOverdue || 0);
  const collectionRate = totalFees > 0 ? Math.round((analytics?.feesCollected || 0) / totalFees * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            School Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your school's performance and metrics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Fee Collection
              </CardTitle>
              <CardDescription>Financial overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="font-medium">Collected</span>
                  <span className="text-xl font-bold text-green-600">
                    ${(analytics?.feesCollected || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="font-medium">Pending</span>
                  <span className="text-xl font-bold text-yellow-600">
                    ${(analytics?.feesPending || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="font-medium">Overdue</span>
                  <span className="text-xl font-bold text-red-600">
                    ${(analytics?.feesOverdue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Collection Rate</span>
                    <span className="text-sm font-bold">{collectionRate}%</span>
                  </div>
                  <Progress value={collectionRate} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                School Activity
              </CardTitle>
              <CardDescription>Enrollment and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Active Enrollments</span>
                  <span className="text-xl font-bold text-blue-600">
                    {analytics?.activeEnrollments || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Recent Enrollments</span>
                  <span className="text-xl font-bold text-purple-600">
                    {analytics?.recentEnrollments || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Monthly Revenue</span>
                  <span className="text-xl font-bold text-green-600">
                    ${(analytics?.monthlyRevenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PARENT ANALYTICS VIEW
// ==========================================
function ParentAnalyticsView({ parentId }: { parentId: string }) {
  const [analytics, setAnalytics] = useState<ParentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToParentAnalytics(parentId, (data) => {
      setAnalytics(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [parentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Children',
      value: analytics?.childrenCount || 0,
      unit: 'children',
      icon: Users,
      color: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Total Courses',
      value: analytics?.totalCourses || 0,
      unit: 'courses',
      icon: BookOpen,
      color: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Average Grade',
      value: analytics?.averageGrade || 'N/A',
      unit: '',
      icon: Award,
      color: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Attendance',
      value: `${analytics?.attendanceRate || 0}%`,
      unit: '',
      icon: Calendar,
      color: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  const totalFees = (analytics?.feesPaid || 0) + (analytics?.feesDue || 0);
  const paymentRate = totalFees > 0 ? Math.round((analytics?.feesPaid || 0) / totalFees * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Family Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your children's progress and academic performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </div>
                    {stat.unit && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {stat.unit}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Academic Performance
              </CardTitle>
              <CardDescription>Your children's academic metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Average Score</span>
                  <span className="text-xl font-bold text-blue-600">
                    {analytics?.averageScore || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Pending Assignments</span>
                  <span className="text-xl font-bold text-yellow-600">
                    {analytics?.pendingAssignments || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Upcoming Events</span>
                  <span className="text-xl font-bold text-purple-600">
                    {analytics?.upcomingEvents || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Fee Status
              </CardTitle>
              <CardDescription>Payment overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="font-medium">Paid</span>
                  <span className="text-xl font-bold text-green-600">
                    ${(analytics?.feesPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="font-medium">Due</span>
                  <span className="text-xl font-bold text-yellow-600">
                    ${(analytics?.feesDue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Payment Rate</span>
                    <span className="text-sm font-bold">{paymentRate}%</span>
                  </div>
                  <Progress value={paymentRate} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PLATFORM ADMIN ANALYTICS VIEW
// ==========================================
function PlatformAnalyticsView() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPlatformAnalytics((data) => {
      setAnalytics(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Students',
      value: analytics?.totalStudents || 0,
      icon: GraduationCap,
      color: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Teachers',
      value: analytics?.totalTeachers || 0,
      icon: School,
      color: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Active Users',
      value: analytics?.activeUsers || 0,
      icon: Activity,
      color: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Platform Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor platform-wide metrics and user activity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                User Distribution
              </CardTitle>
              <CardDescription>Breakdown by user type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="font-medium">Schools</span>
                  <span className="text-xl font-bold text-blue-600">
                    {analytics?.totalSchools || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="font-medium">Parents</span>
                  <span className="text-xl font-bold text-purple-600">
                    {analytics?.totalParents || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="font-medium">Suspended Users</span>
                  <span className="text-xl font-bold text-red-600">
                    {analytics?.suspendedUsers || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="font-medium">Pending Verifications</span>
                  <span className="text-xl font-bold text-yellow-600">
                    {analytics?.pendingVerifications || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Growth Metrics
              </CardTitle>
              <CardDescription>User growth statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">New This Week</span>
                  <span className="text-xl font-bold text-green-600">
                    +{analytics?.newUsersThisWeek || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">New This Month</span>
                  <span className="text-xl font-bold text-blue-600">
                    +{analytics?.newUsersThisMonth || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">Growth Rate</span>
                  <span className="text-xl font-bold text-purple-600">
                    {analytics?.userGrowthRate || 0}%
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Platform Health</span>
                    <Badge variant="default">Excellent</Badge>
                  </div>
                  <Progress value={95} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
