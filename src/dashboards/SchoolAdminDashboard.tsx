import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users,
  GraduationCap,
  Calendar,
  Plus,
  CheckCircle,
  TrendingUp,
  DollarSign,
  CreditCard,
  Bell,
  Loader2,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { 
  subscribeToSchoolAnalytics,
  type SchoolAnalytics
} from '@/services/analyticsService';

/**
 * SchoolAdminDashboard Component
 * 
 * Features:
 * - Uses AuthenticatedLayout for standardized navigation
 * - Displays real-time school-wide statistics (students, teachers, attendance, fees)
 * - Manages student and teacher information
 * - Tracks fee collection and announcements
 * - Responsive design with mobile support
 * - Dark mode support
 */
export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time data subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    
    // Subscribe to school analytics
    const unsubscribe = subscribeToSchoolAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Mock data for recent students (until we implement real-time students subscription)
  const recentStudents = [
    { id: 1, name: 'Alice Johnson', grade: 'Grade 10', joined: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
    { id: 2, name: 'Bob Smith', grade: 'Grade 9', joined: new Date(Date.now() - 172800000).toISOString().split('T')[0] },
    { id: 3, name: 'Carol White', grade: 'Grade 11', joined: new Date(Date.now() - 259200000).toISOString().split('T')[0] },
  ];

  const recentTeachers = [
    { id: 1, name: 'Mr. David Brown', subject: 'Mathematics', status: 'active' },
    { id: 2, name: 'Ms. Emma Davis', subject: 'English', status: 'active' },
    { id: 3, name: 'Mr. Frank Miller', subject: 'Physics', status: 'pending' },
  ];

  const announcements = [
    { id: 1, title: 'Term 2 Exam Schedule', target: 'All Students', date: new Date().toISOString().split('T')[0] },
    { id: 2, title: 'Teacher Meeting', target: 'All Teachers', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  ];

  const feeSummary = [
    { grade: 'Grade 9', collected: analytics?.feesCollected ? Math.floor(analytics.feesCollected / 3) : 15000, pending: 4000 },
    { grade: 'Grade 10', collected: analytics?.feesCollected ? Math.floor(analytics.feesCollected / 3) : 18000, pending: 5000 },
    { grade: 'Grade 11', collected: analytics?.feesCollected ? Math.floor(analytics.feesCollected / 3) : 12000, pending: 3000 },
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
            <h1 className="text-2xl font-bold">Welcome, {userData?.fullName || 'Admin'}!</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your school and monitor key metrics</p>
          </div>
          <Button 
            onClick={() => navigate('/school-admin/students')}
            className="bg-black dark:bg-white text-white dark:text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>

        {/* School Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Students Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                  <p className="text-xl font-bold">{analytics?.totalStudents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Teachers Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Teachers</p>
                  <p className="text-xl font-bold">{analytics?.totalTeachers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Today Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Today</p>
                  <p className="text-xl font-bold">{analytics?.attendanceToday || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fees Collected Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fees Collected</p>
                  <p className="text-xl font-bold">${(analytics?.feesCollected || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fees Pending Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fees Pending</p>
                  <p className="text-xl font-bold">${(analytics?.feesPending || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
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
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Enrollments</p>
                  <p className="text-xl font-bold">{analytics?.activeEnrollments || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                  <p className="text-xl font-bold">${(analytics?.monthlyRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Students Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Student Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                  onClick={() => navigate(`/school-admin/students/${student.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {student.grade} • Joined {student.joined}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Teachers Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Recent Teacher Additions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTeachers.map((teacher) => (
                <div 
                  key={teacher.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{teacher.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {teacher.subject}
                    </p>
                  </div>
                  <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'}>
                    {teacher.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fee Summary Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Fee Collection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feeSummary.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{item.grade}</h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ${item.collected.toLocaleString()} / ${(item.collected + item.pending).toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(item.collected / (item.collected + item.pending)) * 100} 
                    className="h-2"
                  />
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
              Recent Announcements
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
                    {announcement.target} • {announcement.date}
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
