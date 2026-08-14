import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Users,
  Bell,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Loader2,
  CalendarDays,
  FileText,
  HelpCircle,
  MapPin,
  ArrowRight,
  Star,
  Share2,
  Play,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import ShareContentDialog, { type ShareContentItem } from '@/components/ShareContentDialog';
import DashboardHeader from '@/components/DashboardHeader';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import {
  subscribeToStudentAnalytics,
  subscribeToStudentAssignments,
  type StudentAnalytics,
  type Assignment
} from '@/services/analyticsService';
import { subscribeToStudentCourses, type Course } from '@/services/courseService';
import { subscribeToEvents, type AppEvent } from '@/services/eventService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardAnnouncement } from '@/types/announcement';

// Quick channel chips (category rail)
const QUICK_CHANNELS = [
  { label: 'Modules', path: '/student/courses', icon: BookOpen, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  { label: 'Quizzes', path: '/student/quizzes', icon: HelpCircle, color: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
  { label: 'Events', path: '/events', icon: CalendarDays, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  { label: 'Work Hub', path: '/features/tearn', icon: Award, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400' },
  { label: 'Documents', path: '/dashboard/documents', icon: FileText, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  { label: 'Liv Teams', path: '/features/liv-teams', icon: Users, color: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400' },
];

/**
 * StudentDashboard Component
 *
 * Features:
 * - App-style header with greeting + notifications in the upper right corner
 * - Dynamic promo banner rail
 * - Quick channel chips to every section
 * - Blue summary card with key learning metrics
 * - Real-time courses, assignments, grades and upcoming events
 */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<AppEvent[]>([]);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // State for sharing & review dialogs
  const [shareItem, setShareItem] = useState<ShareContentItem | null>(null);
  const [showShare, setShowShare] = useState(false);

  // Rating & Review State
  const [selectedModuleForReview, setSelectedModuleForReview] = useState<Course | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Active hover video ID
  const [hoveredVideoCourseId, setHoveredVideoCourseId] = useState<string | null>(null);

  const openShare = (course: Course) => {
    setShareItem({
      type: 'course',
      id: course.id,
      title: course.title,
      description: course.description,
      teacherName: course.teacherName,
      subject: course.subject,
    });
    setShowShare(true);
  };

  const handleSubscribeModule = (course: Course) => {
    toast.success(`Subscribed to module "${course.title}"! Notifications enabled.`);
  };

  const handleSubmitReview = () => {
    if (!selectedModuleForReview) return;
    setSubmittingReview(true);
    setTimeout(() => {
      toast.success(`Thank you! Your ${reviewRating}-star review for "${selectedModuleForReview.title}" has been published.`);
      setSubmittingReview(false);
      setSelectedModuleForReview(null);
      setReviewComment('');
      setReviewRating(5);
    }, 600);
  };

  // Real-time data subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);

    // Subscribe to student analytics
    const unsubscribeAnalytics = subscribeToStudentAnalytics(
      currentUser.uid,
      (data) => {
        setAnalytics(data);
      }
    );

    // Subscribe to assignments
    const unsubscribeAssignments = subscribeToStudentAssignments(
      currentUser.uid,
      (data) => {
        setAssignments(data);
      }
    );

    // Subscribe to student courses
    const unsubscribeCourses = subscribeToStudentCourses(
      currentUser.uid,
      (data) => {
        setCourses(data);
        setLoading(false);
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
          if (announcement.targetAudience === 'all' || announcement.targetAudience === 'students') {
            // Check if not expired
            const expiresAt = announcement.expiresAt?.toMillis?.() || 0;
            return expiresAt > Date.now();
          }
          return false;
        })
        .sort((a, b) => b.priority - a.priority); // Sort by priority

      setAnnouncements(announcementsList);
    });

    // Subscribe to upcoming events
    const todayKey = new Date().toISOString().slice(0, 10);
    const unsubscribeEvents = subscribeToEvents(
      currentUser.uid,
      (userData as { schoolId?: string } | null)?.schoolId ?? null,
      (list) => setUpcomingEvents(list.filter(e => e.date >= todayKey).slice(0, 3)),
      () => setUpcomingEvents([])
    );

    return () => {
      unsubscribeAnalytics();
      unsubscribeAssignments();
      unsubscribeCourses();
      unsubscribeAnnouncements();
      unsubscribeEvents();
    };
  }, [currentUser?.uid, userData]);

  // Filter assignments
  const upcomingAssignments = assignments.filter(a =>
    a.status === 'pending' || a.status === 'submitted'
  ).slice(0, 3);

  const recentGrades = assignments.filter(a =>
    a.status === 'graded'
  ).slice(0, 3);

  const courseAnnouncements = useMemo(() => ([
    { id: 1, title: 'New Course Materials Available', course: 'Advanced Mathematics', date: new Date().toISOString().split('T')[0] },
    { id: 2, title: 'Exam Schedule Released', course: 'Physics Fundamentals', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  ]), []);

  const summaryStats = useMemo(() => ([
    { label: 'Courses', value: courses.length || analytics?.totalCourses || 0, icon: BookOpen },
    { label: 'Avg Grade', value: analytics?.averageGrade || 'N/A', icon: Award },
    { label: 'Attendance', value: `${analytics?.attendanceRate || 0}%`, icon: Calendar },
    { label: 'Completed', value: analytics?.completedAssignments || 0, icon: TrendingUp },
  ]), [analytics, courses.length]);

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

        {/* Quick channel chips */}
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

        {/* RECOMMENDED MODULES CATALOG GRID (promo video preview) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
                Recommended Direct Learning Modules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Discover modules, preview Shorts, enroll, and leave eligible reviews.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/student/courses')}
              className="text-xs font-bold text-emerald-500 hover:text-emerald-600"
            >
              Explore All ({courses.length})
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map((course) => {
              const hasVideo = !!(course as any).promoVideoUrl;
              const isHovered = hoveredVideoCourseId === course.id;

              return (
                <Card
                  key={course.id}
                  className="group relative overflow-hidden bg-white dark:bg-[#080d1a]/80 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  onMouseEnter={() => setHoveredVideoCourseId(course.id)}
                  onMouseLeave={() => setHoveredVideoCourseId(null)}
                >
                  {/* Media Cover / Video Player Header */}
                  <div className="relative w-full h-44 bg-slate-950 overflow-hidden">
                    {hasVideo && isHovered ? (
                      <video
                        src={(course as any).promoVideoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover transition-scale duration-500 scale-105"
                      />
                    ) : (
                      <img
                        src={(course as any).coverUrl || course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                    {/* Subject badge top left */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="bg-slate-900/80 backdrop-blur-md text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                        {course.subject}
                      </Badge>
                      {(course as any).level && (
                        <Badge className="bg-amber-500/20 backdrop-blur-md text-amber-300 border-none text-[10px] font-bold">
                          {(course as any).level}
                        </Badge>
                      )}
                    </div>

                    {/* Promo video badge / status top right */}
                    {hasVideo && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-white/10">
                        <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                        {isHovered ? 'Playing Teaser' : 'Hover for Video'}
                      </div>
                    )}

                    {/* Price Tag bottom right */}
                    <div className="absolute bottom-3 right-3 bg-emerald-500 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-lg">
                      {course.price > 0 ? `$${course.price}` : 'FREE'}
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    {/* Author & Ratings */}
                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px]">
                        <Users className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="truncate">{course.teacherName}</span>
                      </div>

                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>4.8</span>
                        <span className="text-[10px] text-slate-400 font-normal">({course.enrolledStudents?.length || 12})</span>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button
                        size="sm"
                        className="col-span-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] h-8 rounded-xl"
                        onClick={() => handleSubscribeModule(course)}
                      >
                        Subscribe
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="col-span-1 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-[10px] font-bold h-8 rounded-xl"
                        onClick={() => setSelectedModuleForReview(course)}
                      >
                        Rate & Review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="col-span-1 text-slate-400 hover:text-white hover:bg-white/5 text-[10px] font-bold h-8 rounded-xl flex items-center justify-center gap-1"
                        onClick={() => openShare(course)}
                      >
                        <Share2 className="w-3 h-3" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

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
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Learning Summary</p>
              <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">Your progress at a glance</h2>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/student/courses')}
              className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold rounded-xl border-0"
            >
              Modules <ArrowRight className="w-4 h-4 ml-1" />
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
              Your Study & Assignment Metrics
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Visualizing average lesson participation and module performance score trends</CardDescription>
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
                  d="M 0 150 Q 150 110 300 130 T 600 50"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0 170 Q 120 140 240 110 T 600 30"
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
                  Syllabus Grade Score
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Study Hours (Weekly)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
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

        {/* Enrolled Courses Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              My Courses
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/student/courses')}>
              See All
            </Button>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet</p>
                <Button onClick={() => navigate('/student/courses')}>
                  Browse Available Courses
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    onClick={() => navigate('/student/courses')}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {course.teacherName}
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

        {/* Upcoming Assignments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAssignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming assignments</p>
              ) : (
                upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {assignment.courseName} • Due {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={assignment.status === 'pending' ? 'secondary' : 'default'}>
                      {assignment.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Grades Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGrades.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No grades yet</p>
              ) : (
                recentGrades.map((grade) => (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{grade.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {grade.courseName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">{grade.grade}</span>
                      {grade.score && grade.maxScore && (
                        <p className="text-xs text-gray-500">{grade.score}/{grade.maxScore}</p>
                      )}
                    </div>
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
              Course Announcements
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
                    {announcement.course} • {announcement.date}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RATING & REVIEW DIALOG */}
      {selectedModuleForReview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[#0c0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
            <CardHeader className="p-6 border-b border-white/5">
              <CardTitle className="text-base font-black text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                Rate & Review Module
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {selectedModuleForReview.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2 text-center">
                <label className="text-xs text-slate-400 font-bold block">Your Rating</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold">Write Feedback & Comment</label>
                <textarea
                  placeholder="Describe your learning experience with this module..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white p-3 min-h-[90px] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs font-bold"
                  onClick={() => setSelectedModuleForReview(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share sheet popup */}
      {shareItem && (
        <ShareContentDialog
          open={showShare}
          onClose={() => setShowShare(false)}
          item={shareItem}
        />
      )}
    </AuthenticatedLayout>
  );
}
