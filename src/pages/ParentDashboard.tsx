import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  Award,
  CreditCard,
  Clock,
  Loader2,
  ChevronRight,
  Sparkles,
  MessageSquare,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import SalafDashboardHeader from '@/components/SalafDashboardHeader';
import { 
  subscribeToParentAnalytics,
  type ParentAnalytics
} from '@/services/analyticsService';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<ParentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeToParentAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const categoryButtons = [
    { label: 'My Children', icon: Users, path: '/parent/students', color: 'bg-blue-600' },
    { label: 'Performance', icon: Award, path: '/parent/performance', color: 'bg-emerald-600' },
    { label: 'Fee Payments', icon: CreditCard, path: '/parent/fees', color: 'bg-amber-600' },
    { label: 'Hanna AI', icon: Sparkles, path: '/features/hanna-ai', color: 'bg-pink-600' },
    { label: 'Chat', icon: MessageSquare, path: '/chat', color: 'bg-teal-600' },
    { label: 'Documents', icon: FileText, path: '/documents', color: 'bg-indigo-600' },
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
        <SalafDashboardHeader searchPlaceholder="Search children, courses, grades..." categoryButtons={categoryButtons} />

        {/* Banner Carousel */}
        <BannerCarousel />

        {/* Parent Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Children</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.totalChildren || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Courses</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.totalActiveCourses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Grade</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.averageGrade || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pending Fees</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${analytics?.pendingFees || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Children Progress Cards */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Children Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {(!analytics?.studentIds || analytics.studentIds.length === 0) ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No children linked to your account yet.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.studentIds.map((studentId) => (
                  <div
                    key={studentId}
                    className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/parent/performance')}
                  >
                    <div>
                      <h3 className="font-semibold text-sm">Student ID: {studentId}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Active Student
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0 text-xs font-semibold">
                        View Performance
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
