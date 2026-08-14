import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Award,
  Bell,
  CreditCard,
  TrendingUp,
  DollarSign,
  Users,
  Plus,
  CheckCircle,
  Loader2,
  HelpCircle,
  CalendarDays,
  FileText,
  ArrowRight,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import MotivationCorner from '@/components/MotivationCorner';
import DashboardHeader from '@/components/DashboardHeader';
import QuickCreateWidget from '@/components/QuickCreateWidget';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import {
  subscribeToTeacherAnalytics,
  subscribeToTeacherEnrollments,
  type TeacherAnalytics,
  type Enrollment
} from '@/services/analyticsService';
import { subscribeToTeacherCourses, type Course } from '@/services/courseService';
import { subscribeToTeacherQuizzes, type Quiz } from '@/services/quizService';
import { subscribeToEvents, type AppEvent } from '@/services/eventService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardAnnouncement } from '@/types/announcement';

// Quick channel chips (WorkHub-style category rail)
const QUICK_CHANNELS = [
  { label: 'Modules', path: '/teacher/courses', icon: BookOpen, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  { label: 'Quizzes', path: '/teacher/quizzes', icon: HelpCircle, color: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
  { label: 'Events', path: '/events', icon: CalendarDays, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  { label: 'Work Hub', path: '/features/tearn', icon: Award, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400' },
  { label: 'Documents', path: '/dashboard/documents', icon: FileText, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  { label: 'Students', path: '/teacher/students', icon: Users, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400' },
  { label: 'Liv Teams', path: '/features/liv-teams', icon: Users, color: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400' },
];

/**
 * TeacherDashboard Component
 *
 * Features:
 * - App-style header with greeting + notifications in the upper right corner
 * - Dynamic learning banner rail
 * - Quick-create action grid (add quiz/course/event/document/lesson/announcement)
 * - Quick channel chips to reach every section of the app
 * - Blue "entire summary" card with the key metrics
 * - Real-time earnings, courses, quizzes, enrollments and upcoming events
 */
export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<AppEvent[]>([]);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time data subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    let loadedCount = 0;
    const totalSubscriptions = 5;
    const markLoaded = () => {
      loadedCount++;
      if (loadedCount === totalSubscriptions) {
        setLoading(false);
      }
    };

    // Subscribe to teacher analytics
    const unsubscribeAnalytics = subscribeToTeacherAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
        markLoaded();
      }
    );

    // Subscribe to recent enrollments
    const unsubscribeEnrollments = subscribeToTeacherEnrollments(
      currentUser.uid,
      (data) => {
        setRecentEnrollments(data);
        markLoaded();
      }
    );

    // Subscribe to teacher courses
    const unsubscribeCourses = subscribeToTeacherCourses(
      currentUser.uid,
      (data) => {
        setMyCourses(data);
        markLoaded();
      }
    );

    // Subscribe to teacher quizzes
    const unsubscribeQuizzes = subscribeToTeacherQuizzes(
      currentUser.uid,
      (data) => {
        setMyQuizzes(data);
        markLoaded();
      }
    );

    // Subscribe to dashboard announcements
    const announcementsQuery = query(
      collection(db, 'dashboardAnnouncements'),
      where('isActive', '==', true),
      where('status', '==', 'active')
    );

    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as DashboardAnnouncement)
        .filter(announcement => {
          // Filter by target audience
          if (announcement.targetAudience === 'all' || announcement.targetAudience === 'teachers') {
            // Check if not expired
            const expiresAt = announcement.expiresAt?.toMillis?.() || 0;
            return expiresAt > Date.now();
          }
          return false;
        })
        .sort((a, b) => b.priority - a.priority); // Sort by priority

      setAnnouncements(announcementsList);
      markLoaded();
    });

    // Subscribe to my upcoming events
    const todayKey = new Date().toISOString().slice(0, 10);
    const unsubscribeEvents = subscribeToEvents(
      currentUser.uid,
      (userData as { schoolId?: string } | null)?.schoolId ?? null,
      (list) => setUpcomingEvents(list.filter(e => e.date >= todayKey).slice(0, 3)),
      () => setUpcomingEvents([])
    );

    // Set a timeout to stop loading after 5 seconds even if data hasn't arrived
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      unsubscribeAnalytics();
      unsubscribeEnrollments();
      unsubscribeCourses();
      unsubscribeQuizzes();
      unsubscribeAnnouncements();
      unsubscribeEvents();
    };
  }, [currentUser?.uid, userData]);

  const summaryStats = useMemo(() => ([
    { label: 'Courses', value: analytics?.totalCourses ?? myCourses.length, icon: BookOpen },
    { label: 'Students', value: analytics?.totalStudents ?? 0, icon: Users },
    { label: 'Quizzes', value: myQuizzes.length, icon: HelpCircle },
    { label: 'Rating', value: `${analytics?.averageCourseRating || 0}/5`, icon: TrendingUp },
  ]), [analytics, myCourses.length, myQuizzes.length]);

  const courseAnnouncements = useMemo(() => ([
    { id: 1, title: 'New Course Guidelines', sender: 'Platform Admin', date: new Date().toISOString().split('T')[0] },
    { id: 2, title: 'Payment Processing Update', sender: 'Platform Admin', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  ]), []);

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
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header: greeting + notifications in the upper right corner */}
        <DashboardHeader />

        {/* Dynamic Dashboard Banner rail */}
        <BannerCarousel />

        {/* Unified TEARN Hub Fast Banners for High-fidelity SaaS entry */}
        <Card className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-indigo-950/20 border-emerald-500/20 shadow-lg overflow-hidden relative">
          <div className="p-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-lg text-emerald-400 flex items-center gap-1.5">
                <Award className="w-5 h-5 text-emerald-400" /> Enter TEARN Workspace
              </h4>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Access your teacher wallet, view monthly business revenues, co-author books with teams, upload bite-sized micro Shorts, and audit live classes.
              </p>
            </div>
            <Button
              onClick={() => navigate('/features/tearn')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shrink-0"
            >
              Open TEARN Workspace <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>

        {/* Quick channel chips - reach every part of the app */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {QUICK_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <button
                key={channel.label}
                onClick={() => navigate(channel.path)}
                className="flex flex-col items-center gap-2 min-w-[72px] group"
              >
                <span className={`w-12 h-12 rounded-2xl ${channel.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{channel.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Create action grid (add quiz / course / event / doc / lesson / announce) */}
        <QuickCreateWidget />

        {/* Motivation Corner widget */}
        <MotivationCorner />

        {/* Dashboard Announcements Banner */}
        {announcements.length > 0 && (
          <AnnouncementBanner
            announcements={announcements}
            autoSlideInterval={5000}
          />
        )}

        {/* Blue "entire summary" card */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/10 text-white p-5 sm:p-6 shadow-glass backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-12 w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Workspace Summary</p>
              <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">Your teaching at a glance</h2>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/payments')}
              className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold rounded-xl border-0"
            >
              Earnings <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            {summaryStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 p-3.5">
                  <Icon className="w-5 h-5 text-emerald-400 mb-2" />
                  <p className="text-xl sm:text-2xl font-black leading-none text-white">{stat.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Analytics Graph - identical to Liv Teams aesthetic */}
        <Card className="bg-[#030f26]/30 border-white/5 backdrop-blur-xl rounded-[24px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Syllabus & Revenue Growth Trends
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Tracking co-creator splitted earnings and student assignment completion score trends</CardDescription>
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
                  d="M 0 160 Q 150 120 300 140 T 600 60"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0 180 Q 120 150 240 120 T 600 40"
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
                  Direct splitted payouts ($)
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Active student syllabus views
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Earnings Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                  <p className="text-xl font-bold">${(analytics?.totalEarnings || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Earnings Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-xl font-bold">${(analytics?.pendingEarnings || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month Earnings Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                  <p className="text-xl font-bold">${(analytics?.monthlyEarnings || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Upcoming Events
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/events')}>
              See All
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No upcoming events</p>
                <Button onClick={() => navigate('/events/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    onClick={() => navigate('/events')}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(`${event.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {event.time ? ` • ${event.time}` : ''}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5" /> {event.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{event.category}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Quizzes Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              My Quizzes
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/teacher/quizzes')}>
              See All
            </Button>
          </CardHeader>
          <CardContent>
            {myQuizzes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't created any quizzes yet</p>
                <Button onClick={() => navigate('/teacher/quizzes/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myQuizzes.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    onClick={() => navigate(`/teacher/quizzes/${quiz.id}/analytics`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{quiz.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {quiz.questionCount} questions
                        {quiz.totalAttempts && quiz.totalAttempts > 0 && ` • ${quiz.totalAttempts} attempt${quiz.totalAttempts !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {quiz.averageScore !== undefined && quiz.totalAttempts && quiz.totalAttempts > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">{quiz.averageScore.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500">avg score</p>
                        </div>
                      )}
                      <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'}>
                        {quiz.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Courses Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              My Courses
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/teacher/courses')}>
              See All
            </Button>
          </CardHeader>
          <CardContent>
            {myCourses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't created any courses yet</p>
                <Button onClick={() => navigate('/teacher/courses/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Course
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myCourses.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    onClick={() => navigate(`/teacher/courses`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {course.enrolledStudents?.length || 0} students
                        {course.price > 0 && ` • $${course.price}`}
                      </p>
                    </div>
                    <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                      {course.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Students Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Enrollments
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/teacher/students')}>
              See All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEnrollments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent enrollments</p>
              ) : (
                recentEnrollments.slice(0, 5).map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{enrollment.studentName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {enrollment.courseName}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Announcements Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Announcements
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/announcements')}>
              See All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courseAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <h3 className="font-semibold">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {announcement.sender} • {announcement.date}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
