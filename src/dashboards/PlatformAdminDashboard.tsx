import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users,
  GraduationCap,
  School,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

export default function PlatformAdminDashboard() {
  const navigate = useNavigate();

  // Mock data
  const platformStats = {
    totalUsers: 5234,
    totalStudents: 4521,
    totalTeachers: 342,
    totalSchools: 89,
    totalParents: 382,
    totalRevenue: 125000,
    pendingVerifications: 23,
  };

  const pendingTeachers = [
    { id: 1, name: 'John Smith', email: 'john@example.com', subjects: 'Mathematics, Physics', applied: '2026-02-08' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', subjects: 'English', applied: '2026-02-07' },
    { id: 3, name: 'Mike Davis', email: 'mike@example.com', subjects: 'Chemistry', applied: '2026-02-06' },
  ];

  const pendingSchools = [
    { id: 1, name: 'Sunshine Academy', country: 'Uganda', type: 'Secondary School', applied: '2026-02-08' },
    { id: 2, name: 'Bright Future School', country: 'Kenya', type: 'Primary School', applied: '2026-02-07' },
  ];

  const recentPayments = [
    { id: 1, user: 'Alice Johnson', type: 'Course Purchase', amount: 50, status: 'completed', date: '2026-02-09' },
    { id: 2, user: 'Bob Smith', type: 'School Subscription', amount: 500, status: 'completed', date: '2026-02-08' },
    { id: 3, user: 'Carol White', type: 'Course Purchase', amount: 75, status: 'pending', date: '2026-02-08' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">Platform Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage the entire Liverton Learning platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-xl font-bold">{platformStats.totalUsers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teachers</p>
                  <p className="text-xl font-bold">{platformStats.totalTeachers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <School className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Schools</p>
                  <p className="text-xl font-bold">{platformStats.totalSchools}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                  <p className="text-xl font-bold">${platformStats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Students</p>
              <p className="text-2xl font-bold">{platformStats.totalStudents.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Parents</p>
              <p className="text-2xl font-bold">{platformStats.totalParents.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Verifications</p>
              <p className="text-2xl font-bold text-yellow-600">{platformStats.pendingVerifications}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Hanna AI Active</p>
              <p className="text-2xl font-bold text-green-600">98%</p>
            </CardContent>
          </Card>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Teachers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pending Teacher Verifications</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingTeachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-gray-500">{teacher.subjects}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Schools */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">New School Applications</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingSchools.map((school) => (
                  <div key={school.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{school.name}</p>
                      <p className="text-sm text-gray-500">{school.country} • {school.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Platform Transactions</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/payments')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr key={payment.id} className="border-b dark:border-gray-700">
                        <td className="px-4 py-3 font-medium">{payment.user}</td>
                        <td className="px-4 py-3">{payment.type}</td>
                        <td className="px-4 py-3">${payment.amount}</td>
                        <td className="px-4 py-3">
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{payment.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
