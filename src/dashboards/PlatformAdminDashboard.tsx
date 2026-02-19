import { useState, useEffect } from 'react';
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
  RefreshCw,
  Loader2
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { 
  getDashboardStats, 
  getPendingVerifications,
  verifyUser,
  updateUserStatus,
  type FirestoreUser
} from '@/services/userService';
import { toast } from 'sonner';

interface PlatformStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalSchools: number;
  totalParents: number;
  totalRevenue: number;
  pendingVerifications: number;
  activeUsers: number;
  suspendedUsers: number;
}

export default function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalSchools: 0,
    totalParents: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
    activeUsers: 0,
    suspendedUsers: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<FirestoreUser[]>([]);
  const [recentUsers, setRecentUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats and pending verifications in parallel
      const [dashboardStats, pending] = await Promise.all([
        getDashboardStats(),
        getPendingVerifications()
      ]);

      setStats({
        totalUsers: dashboardStats.totalUsers,
        totalStudents: dashboardStats.totalStudents,
        totalTeachers: dashboardStats.totalTeachers,
        totalSchools: dashboardStats.totalSchools,
        totalParents: dashboardStats.totalParents,
        totalRevenue: dashboardStats.totalRevenue || 0,
        pendingVerifications: dashboardStats.pendingVerifications,
        activeUsers: dashboardStats.activeUsers,
        suspendedUsers: dashboardStats.suspendedUsers,
      });

      setPendingUsers(pending);
      setRecentUsers(dashboardStats.recentUsers);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      await verifyUser(userId);
      toast.success('User verified successfully');
      await loadDashboardData();
    } catch (error) {
      console.error('Error verifying user:', error);
      toast.error('Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? They will be suspended.')) {
      return;
    }
    
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, 'suspended');
      toast.success('User rejected and suspended');
      await loadDashboardData();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getRoleDisplayName = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Filter pending users by type
  const pendingTeachers = pendingUsers.filter(u => u.role === 'teacher');
  const pendingSchools = pendingUsers.filter(u => u.role === 'school_admin');

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage the entire Liverton Learning platform
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={loadDashboardData}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-xl font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalUsers.toLocaleString()}
                  </p>
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
                  <p className="text-xl font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalTeachers}
                  </p>
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
                  <p className="text-xl font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalSchools}
                  </p>
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
                  <p className="text-xl font-bold">
                    ${stats.totalRevenue.toLocaleString()}
                  </p>
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
              <p className="text-2xl font-bold">
                {loading ? '-' : stats.totalStudents.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Parents</p>
              <p className="text-2xl font-bold">
                {loading ? '-' : stats.totalParents.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '-' : stats.activeUsers.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? '-' : stats.suspendedUsers}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verifications Section */}
        {stats.pendingVerifications > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  {stats.pendingVerifications} user{stats.pendingVerifications !== 1 ? 's' : ''} pending verification
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Teachers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Pending Teacher Verifications 
                {pendingTeachers.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingTeachers.length}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>View All</Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </div>
              ) : pendingTeachers.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No pending teacher verifications
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTeachers.slice(0, 5).map((teacher) => (
                    <div key={teacher.uid} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{teacher.fullName}</p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                        <p className="text-xs text-gray-400">
                          {teacher.subjectsTaught?.join(', ') || 'No subjects listed'} • Applied {formatDate(teacher.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600"
                          onClick={() => handleVerifyUser(teacher.uid)}
                          disabled={actionLoading === teacher.uid}
                        >
                          {actionLoading === teacher.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600"
                          onClick={() => handleRejectUser(teacher.uid)}
                          disabled={actionLoading === teacher.uid}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Schools */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                New School Applications
                {pendingSchools.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingSchools.length}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>View All</Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </div>
              ) : pendingSchools.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No pending school applications
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSchools.slice(0, 5).map((school) => (
                    <div key={school.uid} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{school.schoolName || school.fullName}</p>
                        <p className="text-sm text-gray-500">{school.email}</p>
                        <p className="text-xs text-gray-400">
                          {school.country || 'Unknown'} • {school.schoolType || 'School'} • Applied {formatDate(school.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600"
                          onClick={() => handleVerifyUser(school.uid)}
                          disabled={actionLoading === school.uid}
                        >
                          {actionLoading === school.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600"
                          onClick={() => handleRejectUser(school.uid)}
                          disabled={actionLoading === school.uid}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Registrations */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent User Registrations</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>View All Users</Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </div>
              ) : recentUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No recent registrations
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.slice(0, 10).map((user) => (
                        <tr key={user.uid} className="border-b dark:border-gray-700">
                          <td className="px-4 py-3 font-medium">{user.fullName}</td>
                          <td className="px-4 py-3">{user.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status || 'active'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
