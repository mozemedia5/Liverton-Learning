import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  BookOpen,
  ArrowLeft,
  Play,
  Clock3,
  Star,
  Share2,
  Sparkles,
  Flame,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToAllCourses, subscribeToStudentCourses, type Course } from '@/services/courseService';
import {
  subscribeToAllCourseReviewSummaries,
  type CourseReviewSummary,
} from '@/services/courseReviewService';
import { subscribeToCourseViewCounts } from '@/services/courseStatsService';
import ShareContentDialog, { type ShareContentItem } from '@/components/ShareContentDialog';
import { CloudinaryImage } from '@/components/CloudinaryImage';

const subjects = [
  'All',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Computer Science',
];

const normalize = (value?: string) => (value || '').trim().toLowerCase();

const isFreeModule = (module: Course) => module.isFree === true || Number(module.price || 0) <= 0;

const moduleLevel = (module: Course) => module.level || module.grade || 'All levels';

const viewCount = (module: Course) =>
  Number(module.analytics?.views || module.analytics?.viewCount || module.analytics?.mostViewed || 0);

const popularityScore = (module: Course, liveViewCounts: Record<string, number> = {}) => (liveViewCounts[module.id] || viewCount(module)) + (module.enrolledStudents?.length || 0) * 4;

function formatPrice(module: Course) {
  if (isFreeModule(module)) return 'Free';
  return `${module.currency || 'UGX'} ${Number(module.price).toLocaleString()}`;
}

function matchesLearnerContext(module: Course, userSubjects: string[], userLevels: string[]) {
  const subject = normalize(module.subject);
  const level = normalize(moduleLevel(module));
  const subjectMatch = userSubjects.some((value) => subject.includes(value) || value.includes(subject));
  const levelMatch = userLevels.some((value) => level.includes(value) || value.includes(level));
  return subjectMatch || levelMatch;
}

function Rating({ summary }: { summary?: CourseReviewSummary }) {
  const average = summary?.averageRating || 0;
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400" aria-label={`${average} out of 5 stars from ${summary?.reviewCount || 0} reviews`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold text-slate-700 dark:text-slate-200">{average.toFixed(1)}</span>
      <span>({summary?.reviewCount || 0})</span>
    </span>
  );
}

function ModuleCard({
  module,
  summary,
  onOpen,
  onShare,
}: {
  module: Course;
  summary?: CourseReviewSummary;
  onOpen: (module: Course) => void;
  onShare: (module: Course) => void;
}) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-zinc-950">
      <button
        type="button"
        className="relative block w-full text-left"
        onClick={() => onOpen(module)}
        aria-label={`Open ${module.title}`}
      >
        <CloudinaryImage
          src={module.thumbnail || module.coverUrl}
          alt={module.title}
          aspect="4/3"
          widths={[320, 480, 640]}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          crop="fill"
          fallback={<div className="flex h-full min-h-[116px] items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600"><BookOpen className="h-10 w-10 text-white/80" /></div>}
          className="transition duration-300 group-hover:scale-[1.03]"
        />
        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow-sm ${isFreeModule(module) ? 'bg-emerald-500 text-white' : 'bg-slate-900/90 text-white'}`}>
          {isFreeModule(module) ? 'Free' : 'Paid'}
        </span>
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-800 shadow-sm dark:bg-zinc-900/95 dark:text-white">
          {formatPrice(module)}
        </span>
      </button>

      <div className="space-y-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {module.subject || 'General'} <span className="text-slate-300">·</span> {moduleLevel(module)}
          </p>
          <button
            type="button"
            onClick={() => onShare(module)}
            className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40"
            aria-label={`Share ${module.title}`}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button type="button" className="block w-full text-left" onClick={() => onOpen(module)}>
          <h3 className="line-clamp-2 min-h-[2.65rem] text-[15px] font-semibold leading-[1.3] text-slate-900 dark:text-white">
            {module.title}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-[2.35rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {module.shortDescription || module.description || 'Explore this learning module on Liverton.'}
          </p>
        </button>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex min-w-0 items-center gap-1 truncate"><Users className="h-3 w-3 shrink-0" /> {module.teacherName || 'Teacher'}</span>
            {module.lessons > 0 && <span className="flex shrink-0 items-center gap-1"><Play className="h-3 w-3" /> {module.lessons}</span>}
          </div>
          <Rating summary={summary} />
        </div>
      </div>
    </article>
  );
}

function ModuleSection({
  title,
  eyebrow,
  icon,
  modules,
  summaries,
  onOpen,
  onShare,
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  modules: Course[];
  summaries: Record<string, CourseReviewSummary>;
  onOpen: (module: Course) => void;
  onShare: (module: Course) => void;
}) {
  if (modules.length === 0) return null;
  return (
    <section className="space-y-3" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">{icon} {eyebrow}</p>
          <h2 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`} className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-400"><span className="hidden sm:inline">View all</span><ChevronRight className="h-4 w-4" /></span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {modules.slice(0, 4).map((module) => (
          <ModuleCard key={module.id} module={module} summary={summaries[module.id]} onOpen={onOpen} onShare={onShare} />
        ))}
      </div>
    </section>
  );
}

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userRole, userData } = useAuth();
  const [modules, setModules] = useState<Course[]>([]);
  const [myModules, setMyModules] = useState<Course[]>([]);
  const [viewMode, setViewMode] = useState<'explore' | 'mine'>('explore');
  const [reviewSummaries, setReviewSummaries] = useState<Record<string, CourseReviewSummary>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [shareItem, setShareItem] = useState<ShareContentItem | null>(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (searchParams.get('view') === 'mine') setViewMode('mine');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const unsubscribeModules = subscribeToAllCourses((data) => {
      setModules(data);
      setLoading(false);
    });
    const unsubscribeMine = userData?.uid ? subscribeToStudentCourses(userData.uid, setMyModules) : () => undefined;
    const unsubscribeReviews = subscribeToAllCourseReviewSummaries(setReviewSummaries);
    const unsubscribeViews = subscribeToCourseViewCounts(setViewCounts);
    return () => {
      unsubscribeModules();
      unsubscribeMine();
      unsubscribeReviews();
      unsubscribeViews();
    };
  }, [userData?.uid]);

  const openShare = (module: Course) => {
    setShareItem({
      type: 'course',
      id: module.id,
      title: module.title,
      description: module.description,
      teacherName: module.teacherName,
      subject: module.subject,
      coverUrl: module.coverUrl || module.thumbnail,
      isFree: module.isFree || Number(module.price || 0) <= 0,
      price: module.price,
      currency: module.currency,
    });
    setShowShare(true);
  };

  const filteredModules = useMemo(() => {
    const query = normalize(searchQuery);
    return modules.filter((module) => {
      const haystack = [module.title, module.teacherName, module.subject, module.description, ...(module.tags || [])].map(normalize).join(' ');
      const matchesSearch = !query || haystack.includes(query);
      const matchesSubject = selectedSubject === 'All' || normalize(module.subject) === normalize(selectedSubject);
      return matchesSearch && matchesSubject;
    });
  }, [modules, searchQuery, selectedSubject]);

  const sortedByPopularity = useMemo(() => [...filteredModules].sort((a, b) => popularityScore(b, viewCounts) - popularityScore(a, viewCounts)), [filteredModules, viewCounts]);
  const trendingModules = useMemo(() => [...filteredModules].sort((a, b) => popularityScore(b, viewCounts) - popularityScore(a, viewCounts)), [filteredModules, viewCounts]);
  const mostViewedModules = useMemo(() => [...filteredModules].sort((a, b) => (viewCounts[b.id] || viewCount(b)) - (viewCounts[a.id] || viewCount(a))), [filteredModules, viewCounts]);

  const userSubjects = [
    ...(userData?.subjects || []),
    ...(userData?.subjectsTaught || []),
  ].map(normalize).filter(Boolean);
  const userLevels = [userData?.levelOfEducation, userData?.educationLevel].map(normalize).filter(Boolean);
  const contextualRecommendations = filteredModules.filter((module) => matchesLearnerContext(module, userSubjects, userLevels));
  const recommendedModules = contextualRecommendations.length > 0 ? contextualRecommendations : sortedByPopularity;

  const handleOpen = (module: Course) => navigate(`/student/courses/${module.id}`);
  const displayedModules = viewMode === 'mine' ? myModules : filteredModules;

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 transition-colors duration-300 dark:bg-black dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f8faf9]/95 backdrop-blur dark:border-white/10 dark:bg-black/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back" className="shrink-0 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-900">
                <img src="/logo.png" alt="Liverton Learning" className="h-[88%] w-[88%] object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold">Modules</p>
                <p className="hidden text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:block">Liverton Learning</p>
              </div>
            </div>
          </div>
          {userRole === 'teacher' && <Button onClick={() => navigate('/teacher/courses/create')} className="shrink-0 rounded-xl bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-black"><BookOpen className="mr-2 h-4 w-4" /> Create Module</Button>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 lg:px-6 lg:py-8">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> Learn at your pace</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Explore learning modules</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">Find focused lessons, practical skills, and teacher-led learning built for where you are now.</p>
          </div>
        </section>

          <section className="flex flex-wrap items-center gap-2" aria-label="Module views">
            <Button variant={viewMode === 'explore' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('explore')} className="rounded-full">Explore modules</Button>
            <Button variant={viewMode === 'mine' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('mine')} className="rounded-full">My modules ({myModules.length})</Button>
          </section>

          <section className="space-y-3" aria-label="Search and filter modules">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search modules or teachers..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-950" />
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500"><SlidersHorizontal className="h-4 w-4" /> Filter by subject</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {subjects.map((subject) => <Button key={subject} variant={selectedSubject === subject ? 'default' : 'outline'} size="sm" onClick={() => setSelectedSubject(subject)} className="shrink-0 rounded-full px-4 text-xs">{subject}</Button>)}
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
        ) : viewMode === 'mine' ? (
          <>
            {myModules.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-white/10">You have not enrolled in any modules yet. Explore modules to get started.</div> : <ModuleSection title="My enrolled modules" eyebrow="Your learning library updates live" icon={<BookOpen className="h-3.5 w-3.5" />} modules={displayedModules} summaries={reviewSummaries} onOpen={handleOpen} onShare={openShare} />}
          </>
        ) : (
          <>
            <ModuleSection title="Recommended for you" eyebrow={contextualRecommendations.length > 0 ? 'Based on your learning profile' : 'Popular picks to get you started'} icon={<Sparkles className="h-3.5 w-3.5" />} modules={recommendedModules} summaries={reviewSummaries} onOpen={handleOpen} onShare={openShare} />
            <ModuleSection title="Trending now" eyebrow="Learners are exploring" icon={<Flame className="h-3.5 w-3.5" />} modules={trendingModules} summaries={reviewSummaries} onOpen={handleOpen} onShare={openShare} />
            <ModuleSection title="Most viewed" eyebrow="Top attention this week" icon={<Eye className="h-3.5 w-3.5" />} modules={mostViewedModules} summaries={reviewSummaries} onOpen={handleOpen} onShare={openShare} />

            <section className="space-y-4" aria-labelledby="all-modules-heading">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Browse the library</p>
                  <h2 id="all-modules-heading" className="text-xl font-bold tracking-tight">All modules <span className="ml-1 text-sm font-medium text-slate-400">{filteredModules.length}</span></h2>
                </div>
                <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex"><Clock3 className="h-3.5 w-3.5" /> Updated live</span>
              </div>
              {filteredModules.length > 0 ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{filteredModules.map((module) => <ModuleCard key={module.id} module={module} summary={reviewSummaries[module.id]} onOpen={handleOpen} onShare={openShare} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/15 dark:bg-zinc-950"><BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" /><h3 className="font-semibold">No modules found</h3><p className="mt-1 text-sm text-slate-500">Try another search term or subject filter.</p></div>}
            </section>
          </>
        )}
      </main>

      <ShareContentDialog open={showShare} onClose={() => setShowShare(false)} item={shareItem} />
    </div>
  );
}
