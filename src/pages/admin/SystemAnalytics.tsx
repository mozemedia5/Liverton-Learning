import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

export default function SystemAnalytics() {
  const metrics = [
    {
      title: 'Daily Active Users',
      value: '1,245',
      change: '+12%',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'Total Courses',
      value: '342',
      change: '+8%',
      icon: BarChart3,
      color: 'bg-green-500/10 text-green-500',
    },
    {
      title: 'Documents Created',
      value: '5,821',
      change: '+23%',
      icon: Activity,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: 'System Uptime',
      value: '99.98%',
      change: 'Excellent',
      icon: TrendingUp,
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Platform usage and performance metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
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
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{metric.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Chart visualization coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
