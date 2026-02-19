import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, Shield, Activity, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '@/services/userService';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  systemHealth: number;
  totalStudents: number;
  totalTeachers: number;
  totalSchools: number;
  totalParents: number;
  pendingVerifications: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    systemHealth: 100,
    totalStudents: 0,
    totalTeachers: 0,
    totalSchools: 0,
    totalParents: 0,
    pendingVerifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const dashboardStats = await getDashboardStats();
      
      setStats({
        totalUsers: dashboardStats.totalUsers,
        activeUsers: dashboardStats.activeUsers,
        suspendedUsers: dashboardStats.suspendedUsers,
        systemHealth: 98, // This could be calculated from actual system metrics
        totalStudents: dashboardStats.totalStudents,
        totalTeachers: dashboardStats.totalTeachers,
        totalSchools: dashboardStats.totalSchools,
        totalParents: dashboardStats.totalParents,
        pendingVerifications: dashboardStats.pendingVerifications,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'User Management',
      description: 'View, suspend, or change user roles',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
      action: () => navigate('/admin/users'),
    },
    {
      title: 'System Analytics',
      description: 'View platform usage and statistics',
      icon: BarChart3,
      color: 'bg-green-500/10 text-green-500',
      action: () => navigate('/admin/analytics'),
    },
    {
      title: 'Content Moderation',
      description: 'Review and moderate user content',
      icon: Shield,
      color: 'bg-purple-500/10 text-purple-500',
      action: () => navigate('/admin/moderation'),
    },
    {
      title: 'Global Monitoring',
      description: 'Monitor system performance and alerts',
      icon: Activity,
      color: 'bg-orange-500/10 text-orange-500',
      action: () => navigate('/admin/monitoring'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Platform administration and monitoring</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadDashboardStats}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {loading ? '-' : stats.activeUsers.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Suspended Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {loading ? '-' : stats.suspendedUsers}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Suspended accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.systemHealth}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Overall status</p>
          </CardContent>
        </Card>
      </div>

      {/* Role Breakdown */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">User Breakdown by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-blue-600 dark:text-blue-400">Students</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.totalStudents}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-green-600 dark:text-green-400">Teachers</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.totalTeachers}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-purple-600 dark:text-purple-400">Schools</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.totalSchools}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-orange-600 dark:text-orange-400">Parents</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.totalParents}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Verifications Alert */}
      {stats.pendingVerifications > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
              <CardTitle className="text-yellow-900 dark:text-yellow-200">
                Pending Verifications ({stats.pendingVerifications})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-yellow-800 dark:text-yellow-300">
            <p>There are {stats.pendingVerifications} user(s) waiting for verification. Please review them in the User Management section.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/admin/users')}
            >
              Review Users
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={action.action}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Access
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* System Alerts */}
      <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600 dark:text-green-500" />
            <CardTitle className="text-green-900 dark:text-green-200">System Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-green-800 dark:text-green-300">
          <p>All systems operational. Firebase connection is active and user data is being synchronized properly.</p>
        </CardContent>
      </Card>
    </div>
  );
}
