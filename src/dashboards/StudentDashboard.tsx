import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Video,
  HelpCircle,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import MotivationCorner from '@/components/MotivationCorner';
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
  { label: 'Courses', path: '/student/courses', icon: BookOpen, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  { label: 'Quizzes', path: '/student/quizzes', icon: HelpCircle, color: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
  { label: 'Events', path: '/events', icon: CalendarDays, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  { label: 'Live Lessons', path: '/student/zoom-lessons', icon: Video, color: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400' },
  { label: 'Documents', path: '/dashboard/documents', icon: FileText, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  { label: 'TEARN', path: '/features/tearn', icon: Award, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400' },
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
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white p-5 sm:p-6 shadow-xl">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-12 w-40 h-40 rounded-full bg-black/10 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">Learning Summary</p>
              <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">Your progress at a glance</h2>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/student/courses')}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-full border-0"
            >
              Courses <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            {summaryStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-3">
                  <Icon className="w-5 h-5 text-blue-100 mb-2" />
                  <p className="text-xl sm:text-2xl font-extrabold leading-none">{stat.value}</p>
                  <p className="text-[11px] font-semibold text-blue-200 mt-1 uppercase tracking-wide">{stat.label}</p>
                </div>
              );
            })}
          </div>
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
    </AuthenticatedLayout>
  );
}
