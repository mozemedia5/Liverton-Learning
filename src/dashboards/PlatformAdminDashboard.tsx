import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users,
  GraduationCap,
  School,
  BookOpen,
  Shield,
  TrendingUp,
  CheckCircle,
  XCircle,
  Loader2,
  Megaphone,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import SalafDashboardHeader from '@/components/SalafDashboardHeader';
import { 
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  country: string;
  createdAt: any;
  schoolName?: string;
  schoolType?: string;
}

export default function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalSchools: 0,
    pendingTeachers: 0,
    pendingSchools: 0,
    totalCourses: 0,
  });

  const [pendingTeachers, setPendingTeachers] = useState<UserData[]>([]);
  const [pendingSchools, setPendingSchools] = useState<UserData[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);

    // Subscribe to all users to calculate stats and pending applications
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs.map(docSnap => ({
        uid: docSnap.id,
        ...docSnap.data()
      })) as UserData[];

      const teachers = users.filter(u => u.role === 'teacher');
      const schools = users.filter(u => u.role === 'school_admin');
      const students = users.filter(u => u.role === 'student');

      const pTeachers = teachers.filter(u => u.status === 'pending');
      const pSchools = schools.filter(u => u.status === 'pending');

      setPendingTeachers(pTeachers);
      setPendingSchools(pSchools);
      setRecentUsers(users.slice(0, 5));

      setStats(prev => ({
        ...prev,
        totalUsers: users.length,
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalSchools: schools.length,
        pendingTeachers: pTeachers.length,
        pendingSchools: pSchools.length,
      }));

      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      toast.error('Failed to load user analytics');
      setLoading(false);
    });

    // Subscribe to courses count
    const coursesQuery = query(collection(db, 'courses'));
    const unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalCourses: snapshot.size }));
    });

    return () => {
      unsubUsers();
      unsubCourses();
    };
  }, [currentUser?.uid]);

  const handleVerifyUser = async (uid: string) => {
    try {
      setActionLoading(uid);
      await updateDoc(doc(db, 'users', uid), {
        status: 'active',
        verifiedAt: Timestamp.now(),
        verifiedBy: currentUser?.uid || 'admin',
      });
      toast.success('User verified successfully');
    } catch (error) {
      console.error('Error verifying user:', error);
      toast.error('Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (uid: string) => {
    try {
      setActionLoading(uid);
      await updateDoc(doc(db, 'users', uid), {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: currentUser?.uid || 'admin',
      });
      toast.success('User rejected');
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  const categoryButtons = [
    { label: 'Banners', icon: Megaphone, path: '/admin/dashboard-banners', color: 'bg-purple-600' },
    { label: 'User Management', icon: Users, path: '/admin/users', color: 'bg-blue-600' },
    { label: 'Moderation', icon: Shield, path: '/admin/content-moderation', color: 'bg-red-600' },
    { label: 'System Analytics', icon: BarChart3, path: '/admin/system-analytics', color: 'bg-emerald-600' },
  ];

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
      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* SALAF Header */}
        <SalafDashboardHeader searchPlaceholder="Search platform users, schools, teachers..." categoryButtons={categoryButtons} />

        {/* Global Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teachers</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalTeachers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <School className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Schools</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalSchools}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Courses</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verifications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Teachers */}
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Pending Teachers
                {pendingTeachers.length > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2 text-xs">{pendingTeachers.length}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} className="text-xs text-blue-600">View All</Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {pendingTeachers.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">No pending teacher verifications</p>
                ) : (
                  pendingTeachers.map((teacher) => (
                    <div key={teacher.uid} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                      <div>
                        <p className="font-semibold text-sm">{teacher.fullName}</p>
                        <p className="text-xs text-gray-500">{teacher.email}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-green-600 border-green-200"
                          onClick={() => handleVerifyUser(teacher.uid)}
                          disabled={actionLoading === teacher.uid}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-red-600 border-red-200"
                          onClick={() => handleRejectUser(teacher.uid)}
                          disabled={actionLoading === teacher.uid}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Schools */}
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Pending Schools
                {pendingSchools.length > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2 text-xs">{pendingSchools.length}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} className="text-xs text-blue-600">View All</Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {pendingSchools.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">No pending school applications</p>
                ) : (
                  pendingSchools.map((school) => (
                    <div key={school.uid} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                      <div>
                        <p className="font-semibold text-sm">{school.schoolName || school.fullName}</p>
                        <p className="text-xs text-gray-500">{school.email}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-green-600 border-green-200"
                          onClick={() => handleVerifyUser(school.uid)}
                          disabled={actionLoading === school.uid}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-red-600 border-red-200"
                          onClick={() => handleRejectUser(school.uid)}
                          disabled={actionLoading === school.uid}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
