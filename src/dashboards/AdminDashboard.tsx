import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, Shield, Activity, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  systemHealth: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    systemHealth: 100,
  });

  useEffect(() => {
    // Simulate loading dashboard stats
    const loadStats = async () => {
      try {
        // TODO: Fetch actual stats from Firestore
        setStats({
          totalUsers: 1250,
          activeUsers: 1180,
          suspendedUsers: 70,
          systemHealth: 98,
        });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      }
    };

    loadStats();
  }, []);

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Platform administration and monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeUsers}</div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Suspended Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.suspendedUsers}</div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Suspended accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.systemHealth}%</div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Overall status</p>
          </CardContent>
        </Card>
      </div>

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
      <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            <CardTitle className="text-yellow-900 dark:text-yellow-200">System Alerts</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800 dark:text-yellow-300">
          <p>No critical alerts at this time. System is operating normally.</p>
        </CardContent>
      </Card>
    </div>
  );
}
