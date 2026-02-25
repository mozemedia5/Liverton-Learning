/**
 * Parent Dashboard
 * Main dashboard for parents to view real-time overview of children's education
 * Features:
 * - Quick stats (children, courses, performance)
 * - Real-time activity feed
 * - Upcoming events
 * - Quick links to other sections
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, BookOpen, TrendingUp, Calendar, AlertCircle, DollarSign, GraduationCap, Trophy } from 'lucide-react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { getLinkedStudents } from '@/lib/parentService';
import { 
  subscribeToParentAnalytics,
  subscribeToChildrenActivities,
  type ParentAnalytics,
  type Activity
} from '@/services/analyticsService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Parent Dashboard Component
 * Main overview page for parents with real-time data
 */
export default function ParentDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [analytics, setAnalytics] = useState<ParentAnalytics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load linked students and subscribe to real-time data
   */
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);

    // Load linked students
    const loadStudents = async () => {
      try {
        const students = await getLinkedStudents(currentUser.uid);
        setLinkedStudents(students);
      } catch (error) {
        console.error('Error loading students:', error);
      }
    };

    loadStudents();

    // Subscribe to parent analytics
    const unsubscribeAnalytics = subscribeToParentAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
        setLoading(false);
      }
    );

    // Subscribe to children activities
    const unsubscribeActivities = subscribeToChildrenActivities(
      currentUser.uid,
      (data) => {
        setActivities(data);
      }
    );

    return () => {
      unsubscribeAnalytics();
      unsubscribeActivities();
    };
  }, [currentUser?.uid]);

  /**
   * Get activity icon based on type
   */
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'grade':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'assignment':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'announcement':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'attendance':
        return <GraduationCap className="h-4 w-4 text-teal-600" />;
      default:
        return null;
    }
  };

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
      <div className="p-4 md:p-8 lg:ml-0">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Parent Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's an overview of your children's education</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Children Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Children</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.childrenCount || linkedStudents.length || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Linked to your account</p>
            </CardContent>
          </Card>

          {/* Active Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalCourses || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Across all children</p>
            </CardContent>
          </Card>

          {/* Average Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.averageScore || 0}%</div>
              <p className="text-xs text-gray-600 mt-1">Overall average</p>
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <GraduationCap className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.attendanceRate || 0}%</div>
              <p className="text-xs text-gray-600 mt-1">Average across children</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Pending Assignments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
              <BookOpen className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.pendingAssignments || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Due soon</p>
            </CardContent>
          </Card>

          {/* Fees Due */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fees Due</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(analytics?.feesDue || 0).toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">Total pending</p>
            </CardContent>
          </Card>

          {/* Fees Paid */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fees Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(analytics?.feesPaid || 0).toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">This academic year</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No recent activity</p>
                  ) : (
                    activities.map(activity => (
                      <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.childName} • {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/students')}>
                  <Users className="h-4 w-4 mr-2" />
                  My Children
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/performance')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/courses')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Courses
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/quizzes')}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Quizzes & Results
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/fees')}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Fees & Payments
                </Button>
              </CardContent>
            </Card>

            {/* Linked Children */}
            <Card>
              <CardHeader>
                <CardTitle>My Children</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {linkedStudents.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">No children linked yet</p>
                  ) : (
                    linkedStudents.map(student => (
                      <div key={student.studentId} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-xs text-gray-500">{student.relationship}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
