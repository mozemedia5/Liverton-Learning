import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  Users,
  Plus,
  CheckCircle,
  Loader2,
  HelpCircle,
  ChevronRight,
  Sparkles,
  MessageSquare,
  FileText,
  Video,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import SalafDashboardHeader from '@/components/SalafDashboardHeader';
import { 
  subscribeToTeacherAnalytics, 
  subscribeToTeacherEnrollments,
  type TeacherAnalytics,
  type Enrollment
} from '@/services/analyticsService';
import { subscribeToTeacherCourses, type Course } from '@/services/courseService';
import { subscribeToTeacherQuizzes, type Quiz } from '@/services/quizService';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time data subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    let loadedCount = 0;
    const totalSubscriptions = 4;
    
    // Subscribe to teacher analytics
    const unsubscribeAnalytics = subscribeToTeacherAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
        loadedCount++;
        if (loadedCount === totalSubscriptions) setLoading(false);
      }
    );

    // Subscribe to recent enrollments
    const unsubscribeEnrollments = subscribeToTeacherEnrollments(
      currentUser.uid,
      (data) => {
        setRecentEnrollments(data);
        loadedCount++;
        if (loadedCount === totalSubscriptions) setLoading(false);
      }
    );

    // Subscribe to teacher courses
    const unsubscribeCourses = subscribeToTeacherCourses(
      currentUser.uid,
      (data) => {
        setMyCourses(data);
        loadedCount++;
        if (loadedCount === totalSubscriptions) setLoading(false);
      }
    );

    // Subscribe to teacher quizzes
    const unsubscribeQuizzes = subscribeToTeacherQuizzes(
      currentUser.uid,
      (data) => {
        setMyQuizzes(data);
        loadedCount++;
        if (loadedCount === totalSubscriptions) setLoading(false);
      }
    );

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      unsubscribeAnalytics();
      unsubscribeEnrollments();
      unsubscribeCourses();
      unsubscribeQuizzes();
    };
  }, [currentUser?.uid]);

  const categoryButtons = [
    { label: 'Create Course', icon: Plus, path: '/teacher/courses/create', color: 'bg-blue-600' },
    { label: 'Create Quiz', icon: Plus, path: '/teacher/quizzes/create', color: 'bg-indigo-600' },
    { label: 'My Courses', icon: BookOpen, path: '/teacher/courses', color: 'bg-purple-600' },
    { label: 'My Quizzes', icon: Award, path: '/teacher/quizzes', color: 'bg-teal-600' },
    { label: 'Hanna AI', icon: Sparkles, path: '/features/hanna-ai', color: 'bg-pink-600' },
    { label: 'Chat', icon: MessageSquare, path: '/chat', color: 'bg-emerald-600' },
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
        {/* SALAF App Header (User Greeting, Corner Notification Bell, Search Bar & Category Buttons) */}
        <SalafDashboardHeader
          searchPlaceholder="Search my courses, students, quizzes..."
          categoryButtons={categoryButtons}
        />

        {/* Dashboard Banner Carousel (SALAF Blue Banner Theme) */}
        <BannerCarousel />

        {/* Earnings & Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Earnings</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${(analytics?.totalEarnings || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Courses</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.totalCourses || myCourses.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Quizzes</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{myQuizzes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Courses Section */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              My Courses
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/courses')} className="text-xs text-blue-600">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {myCourses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500 mb-3">You haven't created any courses yet</p>
                <Button onClick={() => navigate('/teacher/courses/create')} className="bg-blue-600 text-white rounded-xl text-xs">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Your First Course
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myCourses.slice(0, 5).map((course) => (
                  <div 
                    key={course.id}
                    className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/teacher/courses`)}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold text-sm truncate">{course.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {course.enrolledStudents?.length || 0} students 
                        {course.price > 0 && ` • $${course.price}`}
                      </p>
                    </div>
                    <Badge variant={course.status === 'active' ? 'default' : 'secondary'} className="rounded-lg text-xs">
                      {course.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Quizzes Section */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              My Quizzes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/quizzes')} className="text-xs text-indigo-600">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {myQuizzes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500 mb-3">You haven't created any quizzes yet</p>
                <Button onClick={() => navigate('/teacher/quizzes/create')} className="bg-indigo-600 text-white rounded-xl text-xs">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Your First Quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myQuizzes.slice(0, 5).map((quiz) => (
                  <div 
                    key={quiz.id}
                    className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/teacher/quizzes/${quiz.id}/analytics`)}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold text-sm truncate">{quiz.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {quiz.questionCount} questions
                        {quiz.totalAttempts && quiz.totalAttempts > 0 && ` • ${quiz.totalAttempts} attempts`}
                      </p>
                    </div>
                    <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'} className="rounded-lg text-xs">
                      {quiz.status}
                    </Badge>
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
