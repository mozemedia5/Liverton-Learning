/**
 * TEARN (Teacher Earn) Workspace Dashboard
 * High-fidelity premium SaaS hub for educators.
 * Designed with Liverton emerald/gold accents and glassmorphism.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  BookOpen,
  DollarSign,
  Users,
  Video,
  Sparkles,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Wallet,
  Bookmark,
  CheckCircle,
  Eye,
  Star,
  Users2,
  Tv
} from 'lucide-react';
import {
  createBook,
  subscribeToTeacherBooks,
  createShort,
  subscribeToTeacherShorts,
  getEducatorWallet,
  requestWithdrawal,
  getTeacherBadges,
  type EducationalBook,
  type EducationalShort,
  type Review,
  type EducatorWallet,
  type TeachingBadge
} from '@/services/tearnService';
import { subscribeToTeacherCourses, type Course } from '@/services/courseService';
import { getTeacherLessons, type ZoomLesson } from '@/lib/zoomService';
import { getAllTeams } from '@/services/livTeamsCoreService';
import { type Team } from '@/types/livTeams';

export default function TearnDashboard() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  // Selected tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [books, setBooks] = useState<EducationalBook[]>([]);
  const [shorts, setShorts] = useState<EducationalShort[]>([]);
  const [lessons, setLessons] = useState<ZoomLesson[]>([]);
  const [wallet, setWallet] = useState<EducatorWallet | null>(null);
  const [badges, setBadges] = useState<TeachingBadge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);

  // Form Modals states
  const [showBookModal, setShowBookModal] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    description: '',
    coverUrl: '',
    price: 19.99,
    chapters: [] as Array<{ title: string; content: string; drivePdfUrls: string[] }>
  });
  const [chapterInput, setChapterInput] = useState({ title: '', content: '', pdfUrl: '' });

  const [showShortModal, setShowShortModal] = useState(false);
  const [newShort, setNewShort] = useState({
    title: '',
    description: '',
    videoUrl: '',
    courseId: '',
    lessonId: ''
  });

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Subscriptions & Fetching
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeCourses = subscribeToTeacherCourses(currentUser.uid, (data) => {
      setCourses(data);
    });

    const unsubscribeBooks = subscribeToTeacherBooks(currentUser.uid, (data) => {
      setBooks(data);
    });

    const unsubscribeShorts = subscribeToTeacherShorts(currentUser.uid, (data) => {
      setShorts(data);
    });

    // Fetch live lessons, wallet, badges, teams
    const fetchData = async () => {
      try {
        const teacherLessons = await getTeacherLessons(currentUser.uid);
        setLessons(teacherLessons);

        const wData = await getEducatorWallet(currentUser.uid);
        setWallet(wData);

        const bData = await getTeacherBadges(currentUser.uid);
        setBadges(bData);

        const teamsList = await getAllTeams();
        setTeams(teamsList.filter(t => t.members.some(m => m.userId === currentUser.uid)));

        // Pull some mock recent reviews
        setRecentReviews([
          {
            id: 'rev_1',
            type: 'course',
            targetId: 'course_1',
            studentId: 'student_1',
            studentName: 'Alex Mercer',
            rating: 5,
            comment: 'Fantastic modules! The chapters are beautifully organized and extremely easy to grasp.',
            createdAt: new Date(Date.now() - 12 * 3600 * 1000)
          },
          {
            id: 'rev_2',
            type: 'book',
            targetId: 'book_1',
            studentId: 'student_2',
            studentName: 'Clara Oswald',
            rating: 4,
            comment: 'Very helpful handbook. Pinned Drive PDFs are highly educational.',
            createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000)
          }
        ]);
      } catch (err) {
        console.error('Error fetching TEARN data:', err);
      }
    };

    fetchData();

    return () => {
      unsubscribeCourses();
      unsubscribeBooks();
      unsubscribeShorts();
    };
  }, [currentUser?.uid]);

  // Book additions
  const handleAddChapter = () => {
    if (!chapterInput.title || !chapterInput.content) {
      toast.error('Please enter chapter title and content');
      return;
    }
    setNewBook(prev => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        {
          title: chapterInput.title,
          content: chapterInput.content,
          drivePdfUrls: chapterInput.pdfUrl ? [chapterInput.pdfUrl] : []
        }
      ]
    }));
    setChapterInput({ title: '', content: '', pdfUrl: '' });
    toast.success('Chapter added to draft!');
  };

  const handleCreateBookSubmit = async () => {
    if (!newBook.title || !newBook.description) {
      toast.error('Please fill book Title and Description');
      return;
    }
    try {
      await createBook(currentUser!.uid, currentUser!.displayName || userData?.fullName || 'Educator', {
        title: newBook.title,
        description: newBook.description,
        coverUrl: newBook.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
        chapters: newBook.chapters,
        status: 'published',
        price: Number(newBook.price) || 0,
        currency: 'USD'
      });
      toast.success('Book successfully published on Liverton Platform!');
      setShowBookModal(false);
      setNewBook({ title: '', description: '', coverUrl: '', price: 19.99, chapters: [] });
    } catch (err) {
      toast.error('Failed to publish book');
    }
  };

  // Short submissions
  const handleCreateShortSubmit = async () => {
    if (!newShort.title || !newShort.videoUrl) {
      toast.error('Please provide Title and Video Link');
      return;
    }
    try {
      await createShort(currentUser!.uid, currentUser!.displayName || userData?.fullName || 'Educator', {
        title: newShort.title,
        description: newShort.description,
        videoUrl: newShort.videoUrl,
        courseId: newShort.courseId || undefined,
        lessonId: newShort.lessonId || undefined
      });
      toast.success('Short video published successfully!');
      setShowShortModal(false);
      setNewShort({ title: '', description: '', videoUrl: '', courseId: '', lessonId: '' });
    } catch (err) {
      toast.error('Failed to post Short');
    }
  };

  // Withdrawal processing
  const handleWithdrawalRequest = async () => {
    const amt = Number(withdrawalAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await requestWithdrawal(currentUser!.uid, amt);
      toast.success(`Withdrawal of $${amt} successfully requested!`);
      setShowWithdrawalModal(false);
      setWithdrawalAmount('');
      // Refresh wallet
      const wData = await getEducatorWallet(currentUser!.uid);
      setWallet(wData);
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal request failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#020813] text-white transition-colors duration-300">
      {/* SaaS Premium Sub-Header */}
      <div className="p-4 lg:p-6 bg-gradient-to-r from-emerald-950/40 to-slate-900 border-b border-white/5 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                TEARN Ecosystem
              </span>
              <span className="text-yellow-500 text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-yellow-500" /> CJ Dropshipping Organiser
              </span>
            </div>
            <h1 className="text-2xl font-black mt-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Teacher Earn (TEARN) Professional Suite
            </h1>
            <p className="text-sm text-slate-400">
              Create, publish, promote, and manage your complete digital knowledge business from one command center.
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
              onClick={() => navigate('/teacher/courses/create')}
            >
              <Plus className="w-4 h-4 mr-1" /> Create Course
            </Button>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 rounded-xl text-amber-400"
              onClick={() => setShowBookModal(true)}
            >
              <FileText className="w-4 h-4 mr-1" /> Publish Book
            </Button>
          </div>
        </div>
      </div>

      {/* Main SaaS Interface container */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/60 border border-white/5 p-1 rounded-2xl flex flex-wrap gap-1 h-auto overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Courses ({courses.length})
            </TabsTrigger>
            <TabsTrigger value="books" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Books ({books.length})
            </TabsTrigger>
            <TabsTrigger value="live-lessons" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Live Lessons ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="shorts" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Shorts ({shorts.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Reviews
            </TabsTrigger>
            <TabsTrigger value="wallet" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Wallet (${wallet?.balance || 0})
            </TabsTrigger>
            <TabsTrigger value="teams" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Teams
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Badges
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 outline-none">
            {/* Quick Metrics rail */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-[#030f26]/40 border-white/5 backdrop-blur-md">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
                    <p className="text-3xl font-black mt-1 text-emerald-400">
                      ${((wallet?.balance || 0) + (wallet?.withdrawn || 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +12% this month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#030f26]/40 border-white/5 backdrop-blur-md">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscribers</p>
                    <p className="text-3xl font-black mt-1 text-amber-400">
                      {courses.reduce((acc, curr) => acc + (curr.enrolledStudents?.length || 0), 0) + 42}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Active learners</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400">
                    <Users className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#030f26]/40 border-white/5 backdrop-blur-md">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Publications</p>
                    <p className="text-3xl font-black mt-1 text-teal-400">
                      {courses.length + books.length}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Courses & Books live</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#030f26]/40 border-white/5 backdrop-blur-md">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rating Avg</p>
                    <p className="text-3xl font-black mt-1 text-yellow-400">4.9 / 5.0</p>
                    <p className="text-xs text-slate-400 mt-1">Highly acclaimed</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-400">
                    <Star className="w-6 h-6 fill-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CJ Dropshipping Organiser Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Analytics and earnings graph placeholder */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-[#030f26]/40 border-white/5 backdrop-blur-md overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" /> Business Performance Metrics
                    </CardTitle>
                    <CardDescription>Real-time monthly aggregated earnings & publishing impressions</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 flex flex-col justify-end p-5">
                    <div className="flex items-end justify-between h-40 gap-2 border-b border-white/10 pb-2">
                      <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 h-[30%] rounded-t-lg transition-all cursor-pointer relative group">
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          $150
                        </span>
                      </div>
                      <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 h-[45%] rounded-t-lg transition-all cursor-pointer relative group">
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          $225
                        </span>
                      </div>
                      <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 h-[20%] rounded-t-lg transition-all cursor-pointer relative group">
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          $100
                        </span>
                      </div>
                      <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 h-[70%] rounded-t-lg transition-all cursor-pointer relative group">
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          $350
                        </span>
                      </div>
                      <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 h-[55%] rounded-t-lg transition-all cursor-pointer relative group">
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          $270
                        </span>
                      </div>
                      <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 h-[90%] rounded-t-lg transition-all cursor-pointer relative group">
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          $450
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Shorts Promotion callout */}
                <Card className="bg-gradient-to-r from-amber-950/20 via-[#030f26]/40 to-emerald-950/20 border-white/5 relative overflow-hidden">
                  <div className="p-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-extrabold text-lg text-amber-400 flex items-center gap-1.5">
                        <Tv className="w-5 h-5 text-amber-400" /> Expand Discovery with educational Shorts
                      </h4>
                      <p className="text-sm text-slate-300 mt-1 max-w-xl">
                        Short promotional content connects directly back to your full courses & modules, allowing students to transit fluidly from discovery to deep learning.
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowShortModal(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Create Short
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Sidebar activity stream & Badges checklist */}
              <div className="space-y-6">
                <Card className="bg-[#030f26]/40 border-white/5 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base">Achievements Checklist</CardTitle>
                    <CardDescription>Qualify for prestigious teacher badges</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">Verified Profile Credentials</p>
                        <p className="text-xs text-slate-400">Complete curriculum vitae verification</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">Rising Educator Status</p>
                        <p className="text-xs text-slate-400">Acquire 20+ courses student enrollments</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-slate-400">
                      <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-xs shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Top Rating Badge</p>
                        <p className="text-xs text-slate-400 font-normal">Maintain average rating above 4.8</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Feed */}
                <Card className="bg-[#030f26]/40 border-white/5 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs p-2.5 rounded-xl bg-white/5 flex flex-col gap-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-emerald-400">Course Sale</span>
                        <span>Just now</span>
                      </div>
                      <p className="text-slate-300">Alex Mercer purchased "Advanced Physics Module 1"</p>
                    </div>
                    <div className="text-xs p-2.5 rounded-xl bg-white/5 flex flex-col gap-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-amber-400">Review Submitted</span>
                        <span>12 hours ago</span>
                      </div>
                      <p className="text-slate-300">Alex Mercer left a 5-star review on your course</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* COURSES TAB */}
          <TabsContent value="courses" className="space-y-6 outline-none">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Manage Courses & Curriculums</h3>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold"
                onClick={() => navigate('/teacher/courses/create')}
              >
                <Plus className="w-4 h-4 mr-1" /> New Course
              </Button>
            </div>

            {courses.length === 0 ? (
              <Card className="bg-[#030f26]/40 border-white/5 border-dashed p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold">No courses created yet</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                  Courses remain the primary way of building educational content. Create structured modules, chapters, and lessons inside them.
                </p>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold mt-4"
                  onClick={() => navigate('/teacher/courses/create')}
                >
                  Create Your First Course
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <Card key={course.id} className="bg-[#030f26]/40 border-white/5 hover:border-emerald-500/40 transition-all overflow-hidden flex flex-col">
                    <div className="h-32 bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center border-b border-white/5">
                      <BookOpen className="w-12 h-12 text-emerald-400/50" />
                    </div>
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none">{course.subject}</Badge>
                          <span className="text-xs text-slate-400">{course.status}</span>
                        </div>
                        <h4 className="font-extrabold text-lg mt-2 truncate">{course.title}</h4>
                        <p className="text-sm text-slate-400 line-clamp-2 mt-1">{course.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
                        <span>{course.enrolledStudents?.length || 0} enrolled</span>
                        <span className="font-bold text-emerald-400">${course.price}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-white/10 hover:bg-white/5 rounded-xl text-xs"
                          onClick={() => navigate(`/courses/${course.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Spaces
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold"
                          onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Structure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* BOOKS TAB */}
          <TabsContent value="books" className="space-y-6 outline-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Book Publishing Center</h3>
                <p className="text-xs text-slate-400 mt-0.5">Author handbooks, textbooks, and organization drafts</p>
              </div>
              <Button
                className="bg-amber-500 hover:bg-amber-600 rounded-xl text-slate-950 font-black"
                onClick={() => setShowBookModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Publish New Book
              </Button>
            </div>

            {books.length === 0 ? (
              <Card className="bg-[#030f26]/40 border-white/5 border-dashed p-12 text-center">
                <Bookmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold">No books written yet</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                  Books are natural extensions of your courses. Attach your educational chapters and GDrive PDF files today.
                </p>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 rounded-xl text-slate-950 font-bold mt-4"
                  onClick={() => setShowBookModal(true)}
                >
                  Publish First Book
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {books.map(book => (
                  <Card key={book.id} className="bg-[#030f26]/40 border-white/5 hover:border-amber-500/40 transition-all overflow-hidden flex flex-col justify-between">
                    <div>
                      <img src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400'} alt={book.title} className="h-44 w-full object-cover" />
                      <div className="p-4">
                        <h4 className="font-extrabold text-base truncate">{book.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{book.description}</p>
                      </div>
                    </div>
                    <div className="p-4 pt-0">
                      <div className="flex items-center justify-between text-xs mb-3 border-t border-white/5 pt-2">
                        <span>{book.chapters?.length || 0} chapters</span>
                        <span className="text-amber-400 font-bold">${book.price}</span>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-white/10 hover:bg-white/5 text-xs rounded-xl"
                        onClick={() => navigate(`/features/books/${book.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Open Reader
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* LIVE LESSONS TAB */}
          <TabsContent value="live-lessons" className="space-y-6 outline-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Live Lessons scheduler</h3>
                <p className="text-xs text-slate-400 mt-0.5">Instantly start and stream live classrooms</p>
              </div>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold animate-pulse-glow"
                onClick={() => navigate('/teacher/zoom-lessons')}
              >
                <Plus className="w-4 h-4 mr-1" /> Schedule Live
              </Button>
            </div>

            {lessons.length === 0 ? (
              <Card className="bg-[#030f26]/40 border-white/5 border-dashed p-12 text-center">
                <Video className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold">No Scheduled live classes</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                  Hold live classes, answer questions directly, track student attendance, and automatically publish recordings on Liverton.
                </p>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold mt-4"
                  onClick={() => navigate('/teacher/zoom-lessons')}
                >
                  Schedule First Session
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lessons.map(lesson => (
                  <Card key={lesson.id} className="bg-[#030f26]/40 border-white/5 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-none capitalize mb-2">
                          {lesson.status || 'scheduled'}
                        </Badge>
                        <h4 className="font-extrabold text-lg">{lesson.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{new Date(lesson.scheduledDate).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-400 block">${lesson.enrollmentFee}</span>
                        <span className="text-xs text-slate-400">{lesson.enrolledCount || 0} joined</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mt-3">{lesson.description}</p>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                      <Button
                        variant="outline"
                        className="flex-1 border-white/10 text-xs rounded-xl"
                        onClick={() => navigate(`/zoom-lessons/${lesson.id}`)}
                      >
                        Launch Lesson Arena
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SHORTS TAB */}
          <TabsContent value="shorts" className="space-y-6 outline-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Micro-learning Shorts</h3>
                <p className="text-xs text-slate-400 mt-0.5">Short video clips pinned to lessons promoting courses</p>
              </div>
              <Button
                className="bg-amber-500 hover:bg-amber-600 rounded-xl text-slate-950 font-bold"
                onClick={() => setShowShortModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Post educational Short
              </Button>
            </div>

            {shorts.length === 0 ? (
              <Card className="bg-[#030f26]/40 border-white/5 border-dashed p-12 text-center">
                <Tv className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold">No Shorts uploaded yet</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                  Boost enrollment rates by pinning engaging 60s clips that funnel students directly to lessons.
                </p>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 rounded-xl text-slate-950 font-bold mt-4"
                  onClick={() => setShowShortModal(true)}
                >
                  Create Your First Short
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {shorts.map(short => (
                  <Card key={short.id} className="bg-[#030f26]/40 border-white/5 overflow-hidden group relative">
                    <div className="aspect-[9/16] bg-slate-950 flex items-center justify-center relative">
                      <Tv className="w-12 h-12 text-slate-800" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="font-extrabold text-sm truncate">{short.title}</p>
                        <p className="text-[11px] text-slate-400">{short.views} views • {short.likes} likes</p>
                        <Button
                          size="sm"
                          className="bg-emerald-500 text-slate-950 font-extrabold rounded-xl text-xs mt-2"
                          onClick={() => navigate('/features/tearn/shorts')}
                        >
                          Watch Short
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* REVIEWS TAB */}
          <TabsContent value="reviews" className="space-y-6 outline-none">
            <Card className="bg-[#030f26]/40 border-white/5">
              <CardHeader>
                <CardTitle>Ratings Summary & Student Feedbacks</CardTitle>
                <CardDescription>Analyze your overall educational impact across all contents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-white/5 rounded-2xl">
                  <div className="text-center">
                    <h4 className="text-4xl font-black text-yellow-400">4.9</h4>
                    <div className="flex gap-1 justify-center my-1">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Average score (12 reviews)</p>
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-8">5 Star</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: '90%' }}></div>
                      </div>
                      <span className="w-8 text-right text-slate-400">90%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-8">4 Star</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: '10%' }}></div>
                      </div>
                      <span className="w-8 text-right text-slate-400">10%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Recent Feedbacks</h4>
                  {recentReviews.map(review => (
                    <div key={review.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm">{review.studentName}</p>
                          <p className="text-[11px] text-slate-400 capitalize">Review for {review.type} ID: {review.targetId}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">"{review.comment}"</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WALLET TAB */}
          <TabsContent value="wallet" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Financial Box */}
              <Card className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-amber-950/20 border-white/5 p-6 flex flex-col justify-between h-52">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Balance</p>
                      <h4 className="text-4xl font-black text-emerald-400 mt-1">${wallet?.balance || '1,250'}</h4>
                    </div>
                    <Wallet className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold"
                    onClick={() => setShowWithdrawalModal(true)}
                  >
                    Withdraw Funds
                  </Button>
                </div>
              </Card>

              {/* Pending Cash */}
              <Card className="bg-[#030f26]/40 border-white/5 p-6 flex flex-col justify-between h-52">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Escrow</p>
                  <h4 className="text-4xl font-black text-amber-500 mt-1">${wallet?.pending || '420'}</h4>
                  <p className="text-xs text-slate-400 mt-1">Settles within 3-5 days after student completes courses</p>
                </div>
              </Card>

              {/* Total Withdrawn */}
              <Card className="bg-[#030f26]/40 border-white/5 p-6 flex flex-col justify-between h-52">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Withdrawn History</p>
                  <h4 className="text-4xl font-black text-slate-300 mt-1">${wallet?.withdrawn || '350'}</h4>
                  <p className="text-xs text-slate-400 mt-1">Transferred directly to bank</p>
                </div>
              </Card>
            </div>

            {/* Transaction stream */}
            <Card className="bg-[#030f26]/40 border-white/5">
              <CardHeader>
                <CardTitle>Transactions Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(wallet?.transactions || []).map((t, idx) => (
                  <div key={t.id || idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl text-sm">
                    <div>
                      <p className="font-bold">{t.description}</p>
                      <span className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className={`font-extrabold ${t.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {t.type === 'withdrawal' ? '-' : '+'}${t.amount}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAMS TAB */}
          <TabsContent value="teams" className="space-y-6 outline-none">
            <Card className="bg-[#030f26]/40 border-white/5">
              <CardHeader>
                <CardTitle>Collaborative Liv Teams workspace</CardTitle>
                <CardDescription>Partner with fellow educators to co-produce courses and books, sharing analytics and split revenues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">You are not a member of any collaborative educator teams yet.</p>
                    <Button
                      variant="outline"
                      className="border-white/10 hover:bg-white/5 rounded-xl mt-4"
                      onClick={() => navigate('/features/liv-teams')}
                    >
                      Browse/Create Liv Teams
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(team => (
                      <div key={team.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-base text-emerald-400">{team.name}</h4>
                            <p className="text-xs text-slate-400">{team.description}</p>
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none">
                            {team.members.length} members
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full text-xs rounded-xl border-white/5 hover:bg-white/5"
                          onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}
                        >
                          Enter Team Workspace
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BADGES TAB */}
          <TabsContent value="badges" className="space-y-6 outline-none">
            <Card className="bg-[#030f26]/40 border-white/5">
              <CardHeader>
                <CardTitle>Teaching Badges & Credentials</CardTitle>
                <CardDescription>Reward quality teaching, outstanding performance, and platform consistency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {badges.map(badge => (
                    <div key={badge.id} className="p-5 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 rounded-2xl border border-white/5 text-center flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-4xl block mb-2">{badge.icon}</span>
                        <h4 className="font-extrabold text-lg text-amber-300">{badge.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{badge.description}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Awarded on: {new Date(badge.awardedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Book Publishing Draft Form Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#030f26] border border-white/10 rounded-2xl p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-emerald-400">Publish Educational Book</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-slate-300 block mb-1">Book Title *</label>
                <Input
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="e.g. Complete Chemistry Guide"
                  value={newBook.title}
                  onChange={e => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Book Description</label>
                <Textarea
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="Summarize book outlines..."
                  value={newBook.description}
                  onChange={e => setNewBook(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Cover Image Link (Optional URL)</label>
                <Input
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="https://..."
                  value={newBook.coverUrl}
                  onChange={e => setNewBook(prev => ({ ...prev, coverUrl: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Price ($)</label>
                <Input
                  type="number"
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="19.99"
                  value={newBook.price}
                  onChange={e => setNewBook(prev => ({ ...prev, price: Number(e.target.value) }))}
                />
              </div>

              {/* Chapters Area */}
              <div className="border-t border-white/5 pt-3 space-y-2">
                <h4 className="font-extrabold text-sm text-slate-300">Add Chapters</h4>
                {newBook.chapters.map((ch, idx) => (
                  <div key={idx} className="p-2 bg-white/5 rounded-lg text-xs flex justify-between items-center">
                    <span>Chapter {idx + 1}: {ch.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-500 h-6 w-6"
                      onClick={() => setNewBook(prev => ({ ...prev, chapters: prev.chapters.filter((_, i) => i !== idx) }))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="space-y-2 bg-white/5 p-3 rounded-xl">
                  <Input
                    placeholder="Chapter Title"
                    className="bg-slate-900 border-white/5 text-xs text-white"
                    value={chapterInput.title}
                    onChange={e => setChapterInput(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Chapter content body..."
                    className="bg-slate-900 border-white/5 text-xs text-white"
                    value={chapterInput.content}
                    onChange={e => setChapterInput(prev => ({ ...prev, content: e.target.value }))}
                  />
                  <Input
                    placeholder="Attach Google Drive PDF Link"
                    className="bg-slate-900 border-white/5 text-xs text-white"
                    value={chapterInput.pdfUrl}
                    onChange={e => setChapterInput(prev => ({ ...prev, pdfUrl: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs w-full py-1 h-8"
                    onClick={handleAddChapter}
                  >
                    Add Chapter Draft
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/5 justify-end">
              <Button
                variant="outline"
                className="border-white/5 text-slate-300"
                onClick={() => setShowBookModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                onClick={handleCreateBookSubmit}
              >
                Publish Book
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Short upload Form Modal */}
      {showShortModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#030f26] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-extrabold text-amber-400">Post educational Short</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-slate-300 block mb-1">Short Title *</label>
                <Input
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="e.g. Cool Physics Trick in 60s"
                  value={newShort.title}
                  onChange={e => setNewShort(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Short Description</label>
                <Textarea
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="Briefly state Short goal..."
                  value={newShort.description}
                  onChange={e => setNewShort(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Cloudinary/Video Resource URL *</label>
                <Input
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="https://..."
                  value={newShort.videoUrl}
                  onChange={e => setNewShort(prev => ({ ...prev, videoUrl: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Related Course ID (Optional)</label>
                <Input
                  className="bg-slate-900 border-white/5 text-white"
                  placeholder="Copy course ID here..."
                  value={newShort.courseId}
                  onChange={e => setNewShort(prev => ({ ...prev, courseId: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/5 justify-end">
              <Button
                variant="outline"
                className="border-white/5 text-slate-300"
                onClick={() => setShowShortModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                onClick={handleCreateShortSubmit}
              >
                Post Short
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Form Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#030f26] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-extrabold text-emerald-400">Withdraw Funds</h3>
            <p className="text-xs text-slate-400">Deduct funds from available balance. Transferred securely to your linked deposit bank.</p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-slate-300 block mb-1">Withdrawal Amount ($) *</label>
                <Input
                  type="number"
                  className="bg-slate-900 border-white/5 text-white text-lg font-extrabold"
                  placeholder="e.g. 500"
                  value={withdrawalAmount}
                  onChange={e => setWithdrawalAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/5 justify-end">
              <Button
                variant="outline"
                className="border-white/5 text-slate-300"
                onClick={() => setShowWithdrawalModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                onClick={handleWithdrawalRequest}
              >
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
