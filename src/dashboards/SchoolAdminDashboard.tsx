import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users,
  GraduationCap,
  Calendar,
  Plus,
  CheckCircle,
  TrendingUp,
  DollarSign,
  CreditCard,
  Loader2,
  BookOpen,
  Sparkles,
  MessageSquare,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import SalafDashboardHeader from '@/components/SalafDashboardHeader';
import { 
  subscribeToSchoolAnalytics,
  type SchoolAnalytics
} from '@/services/analyticsService';

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time data subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeToSchoolAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const recentStudents = [
    { id: 1, name: 'Alice Johnson', grade: 'Grade 10', joined: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
    { id: 2, name: 'Bob Smith', grade: 'Grade 9', joined: new Date(Date.now() - 172800000).toISOString().split('T')[0] },
    { id: 3, name: 'Carol White', grade: 'Grade 11', joined: new Date(Date.now() - 259200000).toISOString().split('T')[0] },
  ];

  const recentTeachers = [
    { id: 1, name: 'Mr. David Brown', subject: 'Mathematics', status: 'active' },
    { id: 2, name: 'Ms. Emma Davis', subject: 'English', status: 'active' },
    { id: 3, name: 'Mr. Frank Miller', subject: 'Physics', status: 'pending' },
  ];

  const feeSummary = [
    { grade: 'Grade 9', collected: analytics?.feesCollected ? Math.floor(analytics.feesCollected / 3) : 15000, pending: 4000 },
    { grade: 'Grade 10', collected: analytics?.feesCollected ? Math.floor(analytics.feesCollected / 3) : 18000, pending: 5000 },
    { grade: 'Grade 11', collected: analytics?.feesCollected ? Math.floor(analytics.feesCollected / 3) : 12000, pending: 3000 },
  ];

  const categoryButtons = [
    { label: 'Students', icon: Users, path: '/school-admin/students', color: 'bg-blue-600' },
    { label: 'Teachers', icon: GraduationCap, path: '/school-admin/teachers', color: 'bg-emerald-600' },
    { label: 'Fees', icon: CreditCard, path: '/school-admin/fees', color: 'bg-amber-600' },
    { label: 'Motivations', icon: BookOpen, path: '/motivations', color: 'bg-purple-600' },
    { label: 'Hanna AI', icon: Sparkles, path: '/features/hanna-ai', color: 'bg-pink-600' },
    { label: 'Chat', icon: MessageSquare, path: '/chat', color: 'bg-teal-600' },
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
        <SalafDashboardHeader searchPlaceholder="Search school students, teachers, fees..." categoryButtons={categoryButtons} />

        {/* Dashboard Banner Carousel */}
        <BannerCarousel />

        {/* School Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.totalStudents || 0}</p>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Teachers</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.totalTeachers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Attendance</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.attendanceToday || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fees Collected</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${(analytics?.feesCollected || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900 col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fees Pending</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${(analytics?.feesPending || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fee Summary Section */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Fee Collection Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4">
              {feeSummary.map((item, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{item.grade}</h3>
                    <span className="text-gray-500">
                      ${item.collected.toLocaleString()} / ${(item.collected + item.pending).toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(item.collected / (item.collected + item.pending)) * 100} 
                    className="h-2 rounded-full"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
