import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Zap, Database } from 'lucide-react';

interface SystemMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  icon: React.ReactNode;
}

export default function GlobalMonitoring() {
  const systemMetrics: SystemMetric[] = [
    {
      name: 'API Response Time',
      status: 'healthy',
      value: '145ms',
      icon: <Zap className="w-5 h-5" />,
    },
    {
      name: 'Database Performance',
      status: 'healthy',
      value: '98.5%',
      icon: <Database className="w-5 h-5" />,
    },
    {
      name: 'Server Load',
      status: 'warning',
      value: '72%',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    {
      name: 'Storage Usage',
      status: 'healthy',
      value: '45%',
      icon: <Database className="w-5 h-5" />,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Global Monitoring</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">System performance and health status</p>
      </div>

      {/* System Status Overview */}
      <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
            <CardTitle className="text-green-900 dark:text-green-200">System Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-green-800 dark:text-green-300">
          <p>All systems operational. Last update: 2 minutes ago</p>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.name}
                </CardTitle>
                <div className="text-gray-400">{metric.icon}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(metric.status)}
                  <Badge className={getStatusColor(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>Last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-200">High Server Load</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">Server load reached 72% at 10:15 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">Database Backup Completed</p>
                <p className="text-sm text-green-800 dark:text-green-300">Daily backup completed successfully at 9:00 PM</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Authentication Service', status: 'healthy' },
              { name: 'Document Storage', status: 'healthy' },
              { name: 'Email Service', status: 'healthy' },
              { name: 'Analytics Engine', status: 'warning' },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-white">{service.name}</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <Badge className={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
