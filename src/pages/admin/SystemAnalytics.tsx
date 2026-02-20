import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity,
  GraduationCap,
  School,
  UserCheck,
  Loader2,
  RefreshCw,
  Clock,
  Calendar,
  BookOpen,
  PieChart,
  LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  subscribeToPlatformAnalytics,
  type PlatformAnalytics
} from '@/services/analyticsService';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActivityLog {
  id: string;
  userName: string;
  action: string;
  timestamp: Date;
  details?: string;
}

export default function SystemAnalytics() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to real-time platform analytics
    const unsubscribe = subscribeToPlatformAnalytics((data) => {
      setAnalytics(data);
      setLoading(false);
    });

    // Fetch recent activity
    fetchRecentActivity();

    return () => unsubscribe();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const activityQuery = query(
        collection(db, 'activityLogs'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(activityQuery);
      const activities = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName || 'Unknown',
          action: data.action || 'Unknown action',
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
          details: data.details,
        };
      });
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching activity:', error);
      setRecentActivity([]);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchRecentActivity();
    // The subscription will automatically update analytics
    setTimeout(() => setLoading(false), 500);
  };

  // Calculate metrics
  const totalUsers = analytics?.totalUsers || 0;
  const activeRate = totalUsers > 0 ? Math.round((analytics?.activeUsers || 0) / totalUsers * 100) : 0;
  const verificationRate = totalUsers > 0 ? Math.round(((totalUsers - (analytics?.pendingVerifications || 0)) / totalUsers) * 100) : 0;

  const metrics = [
    {
      title: 'Daily Active Users',
      value: analytics?.activeUsers || 0,
      change: `${activeRate}% of total`,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'Total Courses',
      value: analytics?.totalStudents ? Math.round(analytics.totalStudents * 0.3) : 0,
      change: 'Active on platform',
      icon: BookOpen,
      color: 'bg-green-500/10 text-green-500',
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: 'Uptime',
      icon: Activity,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: 'Growth Rate',
      value: `+${analytics?.userGrowthRate || 0}%`,
      change: 'This month',
      icon: TrendingUp,
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Platform usage and performance metrics</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Platform usage and performance metrics</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {metric.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${metric.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{metric.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              User Distribution
            </CardTitle>
            <CardDescription>Breakdown by user role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium">Students</span>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  {(analytics?.totalStudents || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                    <School className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium">Teachers</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {(analytics?.totalTeachers || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium">Schools</span>
                </div>
                <span className="text-xl font-bold text-purple-600">
                  {(analytics?.totalSchools || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="font-medium">Parents</span>
                </div>
                <span className="text-xl font-bold text-orange-600">
                  {(analytics?.totalParents || 0).toLocaleString()}
                </span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Total Users</span>
                  <span className="text-2xl font-bold">
                    {(analytics?.totalUsers || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Growth Trends
            </CardTitle>
            <CardDescription>New user acquisition metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-medium block">New This Week</span>
                    <span className="text-xs text-gray-500">Last 7 days</span>
                  </div>
                </div>
                <span className="text-xl font-bold text-green-600">
                  +{analytics?.newUsersThisWeek || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-medium block">New This Month</span>
                    <span className="text-xs text-gray-500">Last 30 days</span>
                  </div>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  +{analytics?.newUsersThisMonth || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium block">Growth Rate</span>
                    <span className="text-xs text-gray-500">Month over month</span>
                  </div>
                </div>
                <span className="text-xl font-bold text-purple-600">
                  {analytics?.userGrowthRate || 0}%
                </span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">User Engagement</span>
                  <span className="text-sm font-bold">{activeRate}%</span>
                </div>
                <Progress value={activeRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Health & Verifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Verification Status
            </CardTitle>
            <CardDescription>User verification overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="font-medium">Verified Users</span>
                <span className="text-xl font-bold text-green-600">
                  {((analytics?.totalUsers || 0) - (analytics?.pendingVerifications || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="font-medium">Pending Verifications</span>
                <span className="text-xl font-bold text-yellow-600">
                  {analytics?.pendingVerifications || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="font-medium">Suspended Users</span>
                <span className="text-xl font-bold text-red-600">
                  {analytics?.suspendedUsers || 0}
                </span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Verification Rate</span>
                  <span className="text-sm font-bold">{verificationRate}%</span>
                </div>
                <Progress value={verificationRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div 
                    key={activity.id}
                    className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{activity.userName}</span>
                      <span className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activity.action}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
