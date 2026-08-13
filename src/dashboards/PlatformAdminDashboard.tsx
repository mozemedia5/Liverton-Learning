import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Sparkles,
  BookOpen,
  FileText,
  Image as ImageIcon,
  TrendingUp
} from 'lucide-react';
import BannerCarousel from '@/components/BannerCarousel';
import MotivationCorner from '@/components/MotivationCorner';
import { 
  getDashboardStats, 
  getPendingVerifications,
  verifyUser,
  updateUserStatus,
  type FirestoreUser
} from '@/services/userService';
import { subscribeToAllCoursesAdmin, type Course } from '@/services/courseService';
import { subscribeToAllQuizzesAdmin, type Quiz } from '@/services/quizService';
import { getAllTeams, suspendTeam, unsuspendTeam, updateTeamAppealStatus } from '@/services/livTeamsCoreService';
import type { Team } from '@/types/livTeams';
import { toast } from 'sonner';
import { AlertTriangle, Activity as ActivityIcon, ShieldAlert, Award } from 'lucide-react';

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
  const [platformTeams, setPlatformTeams] = useState<Team[]>([]);
  const [suspendingTeamId, setSuspendingTeamId] = useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
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
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to all courses and quizzes for full visibility
    const unsubscribeCourses = subscribeToAllCoursesAdmin((courses) => {
      setAllCourses(courses);
    });

    const unsubscribeQuizzes = subscribeToAllQuizzesAdmin((quizzes) => {
      setAllQuizzes(quizzes);
    });

    return () => {
      unsubscribeCourses();
      unsubscribeQuizzes();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats and pending verifications in parallel
      const [dashboardStats, pending, teamsData] = await Promise.all([
        getDashboardStats(),
        getPendingVerifications(),
        getAllTeams()
      ]);

      setPlatformTeams(teamsData);

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

  // Flagged/threatening words check
  const FLAGGED_WORDS = ['murder', 'violence', 'kill', 'threat', 'weapon', 'poison', 'suicide', 'assault'];
  const isThreateningTeam = (team: Team) => {
    const text = `${team.name} ${team.description} ${team.purpose}`.toLowerCase();
    return FLAGGED_WORDS.some(word => text.includes(word));
  };

  const threateningTeams = platformTeams.filter(team => (team.status || 'active') === 'active' && isThreateningTeam(team));
  const suspendedTeams = platformTeams.filter(team => team.status === 'suspended');

  const handleSuspendTeam = async (teamId: string) => {
    if (!suspensionReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    setSuspendingTeamId(teamId);
    try {
      await suspendTeam(teamId, suspensionReason.trim());
      toast.success('Team suspended and owner notified via Inbox message!');
      setSuspensionReason('');
      const updatedTeams = await getAllTeams();
      setPlatformTeams(updatedTeams);
    } catch (err) {
      toast.error('Failed to suspend team');
    } finally {
      setSuspendingTeamId(null);
    }
  };

  const handleUnsuspendTeam = async (teamId: string) => {
    try {
      await unsuspendTeam(teamId);
      toast.success('Team unsuspended successfully!');
      const updatedTeams = await getAllTeams();
      setPlatformTeams(updatedTeams);
    } catch (err) {
      toast.error('Failed to unsuspend team');
    }
  };

  const handleUpdateAppealStatus = async (teamId: string, nextStatus: 'pending' | 'under_review' | 'resolved' | 'rejected', notes: string = '') => {
    try {
      await updateTeamAppealStatus(teamId, nextStatus, notes);
      toast.success(`Appeal status updated to ${nextStatus.replace('_', ' ')}`);
      const updatedTeams = await getAllTeams();
      setPlatformTeams(updatedTeams);
    } catch (err) {
      toast.error('Failed to update appeal status');
    }
  };

  // Filter pending users by type
  const pendingTeachers = pendingUsers.filter(u => u.role === 'teacher');
  const pendingSchools = pendingUsers.filter(u => u.role === 'school_admin');

  return (
    <div className="space-y-6">
        {/* Dashboard Banner */}
        <BannerCarousel />

        {/* Motivation Corner widget */}
        <MotivationCorner />

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

        {/* Visual Analytics Graph - identical to Liv Teams aesthetic */}
        <Card className="bg-[#030f26]/30 border border-white/5 backdrop-blur-xl rounded-[24px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Global Platform Activity & Financial Analytics
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Monitoring real-time student registration rate and general platform revenue inflow</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="relative w-full h-52 bg-slate-950/40 rounded-2xl border border-white/5 flex items-end p-4">
              <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 opacity-5 pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border-t border-l border-white" />
                ))}
              </div>
              <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 200" preserveAspectRatio="none">
                <path
                  d="M 0 170 Q 150 110 300 130 T 600 30"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0 150 Q 120 140 240 90 T 600 10"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
              </svg>
              <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] font-bold">
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Active student signups (monthly)
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Platform gross revenue inflow ($)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <p className="font-semibold">Notifications</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Post & view messages</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Open</Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10"
            onClick={() => navigate('/admin/dashboard-banners')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Dashboard Banners</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Manage rotating banners</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Manage</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Courses</p>
              <p className="text-2xl font-bold">
                {allCourses.length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 dark:bg-gray-900">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Quizzes</p>
              <p className="text-2xl font-bold">
                {allQuizzes.length}
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
          {/* Notifications Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  Notifications
                </CardTitle>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/announcements/create')}
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
                  View all notifications
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

        {/* Platform Content Visibility Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* All Courses Monitor */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                All Platform Courses
                <Badge variant="secondary" className="ml-2">{allCourses.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/student/courses')}>View Browse</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {allCourses.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No courses created on platform yet</p>
                ) : (
                  allCourses.map((course) => (
                    <div key={course.id} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-sm">{course.title}</h4>
                          <p className="text-xs text-gray-500">Teacher: {course.teacherName}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{course.subject}</Badge>
                            <Badge variant="outline" className="text-[10px]">{course.status}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">${course.price}</p>
                          <p className="text-[10px] text-gray-400">{course.lessons} lessons</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Quizzes Monitor */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                All Platform Quizzes
                <Badge variant="secondary" className="ml-2">{allQuizzes.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/quizzes')}>Manage</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {allQuizzes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No quizzes created on platform yet</p>
                ) : (
                  allQuizzes.map((quiz) => (
                    <div key={quiz.id} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-sm">{quiz.title}</h4>
                          <p className="text-xs text-gray-500">Teacher: {quiz.teacherName}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{quiz.subject}</Badge>
                            <Badge variant="outline" className="text-[10px]">{quiz.status}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">{quiz.questionCount} Qs</p>
                          <p className="text-[10px] text-gray-400">{quiz.totalAttempts || 0} attempts</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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

        {/* Dedicated Premium Section: Liv Teams Statistics, Unhealthy Content Monitor, Banned/Appeal Controls */}
        <div className="space-y-6 pt-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-emerald-500" /> Liv Teams Workspace statistics & Governance Monitor
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                    <ActivityIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Teams</p>
                    <p className="text-lg font-bold">{platformTeams.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Flagged Unhealthy</p>
                    <p className="text-lg font-bold text-amber-600">{threateningTeams.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Suspended Teams</p>
                    <p className="text-lg font-bold text-red-600">{suspendedTeams.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Team Members</p>
                    <p className="text-lg font-bold">
                      {platformTeams.reduce((sum, t) => sum + (t.members?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Unhealthy Content / Threat Monitor */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" /> Threat Tracker / Unhealthy Team Monitor
                  </CardTitle>
                  <Badge variant="destructive" className="text-[10px] rounded-md px-2">REAL-TIME</Badge>
                </div>
                <CardDescription className="text-xs">
                  Teams automatically flagged based on key words matching violence or unsafe student behaviors.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {threateningTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs flex flex-col items-center justify-center">
                    <ActivityIcon className="w-8 h-8 text-emerald-500 mb-2 opacity-50" />
                    <p className="font-bold">All Platform Teams are Clean & Healthy</p>
                    <p className="text-slate-400">Zero threat keywords or unhealthy topics detected.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threateningTeams.map(team => (
                      <div key={team.id} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-red-500 truncate">{team.name}</h4>
                            <Badge variant="outline" className="text-[9px] capitalize text-slate-500 border-slate-300">
                              {team.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Goal: "{team.purpose}"</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">"{team.description}"</p>
                        </div>
                        <div className="space-y-2 flex-shrink-0">
                          <Input
                            placeholder="Enter suspension reason..."
                            className="h-8 text-xs rounded-lg w-44"
                            value={suspendingTeamId === team.id ? suspensionReason : ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setSuspendingTeamId(team.id);
                              setSuspensionReason(e.target.value);
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSuspendTeam(team.id)}
                            disabled={suspendingTeamId === team.id && !suspensionReason.trim()}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs w-full h-8 font-bold"
                          >
                            {suspendingTeamId === team.id ? 'Suspending...' : 'Suspend Team'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suspended Teams & Appeals Review Section */}
            <Card>
              <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <ShieldAlert className="w-4 h-4 text-slate-400" /> Suspension Appeals Hub
                </CardTitle>
                <CardDescription className="text-xs">
                  Review and reinstate teams after owner submitted suspension appeals.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {suspendedTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                    <p className="font-semibold text-slate-400">No suspended teams on platform</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suspendedTeams.map(team => {
                      const appealStatus = team.appealStatus || 'none';
                      const hasAppeal = appealStatus !== 'none';

                      let badgeColor = 'text-red-500 bg-red-500/10';
                      let badgeText = 'Suspended';
                      if (appealStatus === 'pending') {
                        badgeColor = 'text-amber-500 bg-amber-500/10';
                        badgeText = 'Pending Appeal';
                      } else if (appealStatus === 'under_review') {
                        badgeColor = 'text-blue-500 bg-blue-500/10';
                        badgeText = 'Under Review';
                      } else if (appealStatus === 'rejected') {
                        badgeColor = 'text-red-500 bg-red-500/10';
                        badgeText = 'Appeal Rejected';
                      }

                      return (
                        <div key={team.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/5 space-y-2.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs truncate max-w-[140px]">{team.name}</span>
                            <Badge variant="outline" className={`text-[9px] border-0 uppercase font-bold ${badgeColor}`}>
                              {badgeText}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-400">Reason: "{team.suspensionReason || 'Rules violation'}"</p>

                          {hasAppeal && team.appealText && (
                            <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/5 space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Owner's Appeal:</span>
                              <p className="text-[11px] italic text-slate-700 dark:text-slate-300">"{team.appealText}"</p>
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5 pt-1">
                            <div className="flex gap-1.5">
                              {appealStatus === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateAppealStatus(team.id, 'under_review')}
                                  className="text-[10px] h-7 px-2 font-bold w-1/2 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                                >
                                  Set Under Review
                                </Button>
                              )}
                              {hasAppeal && appealStatus !== 'resolved' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateAppealStatus(team.id, 'resolved')}
                                    className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white h-7 px-2 font-bold flex-1 rounded-lg"
                                  >
                                    Accept & Re-activate
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const feedback = window.prompt('Enter rejection feedback for the team owner:', 'Appeal declined. Team remains suspended due to guidlines violation.');
                                      if (feedback !== null) {
                                        handleUpdateAppealStatus(team.id, 'rejected', feedback);
                                      }
                                    }}
                                    className="text-[10px] border-red-500/30 text-red-500 hover:bg-red-500/10 h-7 px-2 font-bold flex-1 rounded-lg"
                                  >
                                    Reject Appeal
                                  </Button>
                                </>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnsuspendTeam(team.id)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white h-6 font-bold w-full rounded-md"
                            >
                              Direct Unsuspend / Re-activate
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Simple Tabular list to keep track on stats of all teams (Platform Admin NEVER creates) */}
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
              <CardTitle className="text-sm font-semibold">Track Platform Teams Stat ({platformTeams.length})</CardTitle>
              <CardDescription className="text-xs">
                Platform governance and statistical monitoring sheet. Banned teams are filtered out from user searches.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Team Profile</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Members</th>
                      <th className="px-4 py-3 font-semibold text-right">Savings Balance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformTeams.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs">No team workspaces created yet.</td>
                      </tr>
                    ) : (
                      platformTeams.map(team => (
                        <tr key={team.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{team.name}</div>
                            <div className="text-[10px] text-slate-400 max-w-[180px] truncate">{team.purpose}</div>
                          </td>
                          <td className="px-4 py-3 capitalize">{team.category}</td>
                          <td className="px-4 py-3">{team.ownerName}</td>
                          <td className="px-4 py-3">{team.members?.length || 0} / {team.maxMembers}</td>
                          <td className="px-4 py-3 font-semibold text-right text-emerald-500">
                            UGX {(team.savingsBalance || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={team.status === 'suspended' ? 'destructive' : 'default'} className="uppercase text-[9px] rounded-md px-1.5 py-0">
                              {team.status || 'active'}
                            </Badge>
                          </td>
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
  );
}
