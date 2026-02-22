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
  Loader2,
  Bell,
  MessageSquare,
  Plus,
  ArrowRight,
  Calculator,
  Sparkles
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
    
    try {
      // Handle Firebase Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      
      // Handle objects that look like Timestamps
      if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      
      // Handle Date objects or strings/numbers
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    
    return 'Invalid Date';
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

        {/* Quick Access Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10"
            onClick={() => navigate('/features/hanna-ai')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Hanna AI</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">AI Assistant</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Open</Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10"
            onClick={() => navigate('/features/calculator')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Calculator</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Math tools</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Open</Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10"
            onClick={() => navigate('/chat')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Chat</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Communication</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Open</Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10"
            onClick={() => navigate('/announcements')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Announcements</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Latest updates</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Open</Button>
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
              <Button 
                variant="link" 
                className="mt-2 p-0 h-auto text-yellow-700 dark:text-yellow-300"
                onClick={() => navigate('/admin/users')}
              >
                Review pending users
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Access: Announcements & Chat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Announcements Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  Announcements
                </CardTitle>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/announcements')}
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant="outline" className="text-[10px]">System</Badge>
                    <span className="text-[10px] text-gray-500">Today</span>
                  </div>
                  <h4 className="text-sm font-semibold">Platform Maintenance</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">Scheduled maintenance on Feb 25th...</p>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-sm justify-between"
                  onClick={() => navigate('/announcements')}
                >
                  View all announcements
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Recent Chats
                </CardTitle>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/chat')}
              >
                Open Chat
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer" onClick={() => navigate('/chat')}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    H
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium truncate">Hanna AI</p>
                      <span className="text-[10px] text-gray-500">Now</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">How can I help you today?</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-sm justify-between"
                  onClick={() => navigate('/chat')}
                >
                  Go to messages
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
              <div className="space-y-4">
                {pendingTeachers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No pending teacher verifications</p>
                ) : (
                  pendingTeachers.map((teacher) => (
                    <div key={teacher.uid} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{teacher.fullName}</p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Applied: {formatDate(teacher.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRejectUser(teacher.uid)}
                          disabled={actionLoading === teacher.uid}
                        >
                          {actionLoading === teacher.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
              <div className="space-y-4">
                {pendingSchools.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No pending school applications</p>
                ) : (
                  pendingSchools.map((school) => (
                    <div key={school.uid} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{school.schoolName || school.fullName}</p>
                        <p className="text-sm text-gray-500">{school.country} • {school.schoolType}</p>
                        <p className="text-xs text-gray-400 mt-1">Applied: {formatDate(school.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRejectUser(school.uid)}
                          disabled={actionLoading === school.uid}
                        >
                          {actionLoading === school.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Platform Signups</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>View All Users</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Country</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td>
                      </tr>
                    ) : (
                      recentUsers.map((user) => (
                        <tr key={user.uid} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{user.fullName}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{getRoleDisplayName(user.role)}</Badge>
                          </td>
                          <td className="px-4 py-3">{user.country}</td>
                          <td className="px-4 py-3">
                            <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                              {user.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                        </tr>
                      ))
                    )}
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
