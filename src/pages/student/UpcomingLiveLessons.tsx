import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, Users, Loader2, ArrowLeft, CheckCircle2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { enrollInLesson, getAllLessons, getStudentEnrolledLessons, type ZoomLesson } from '@/lib/zoomService';

const toDate = (value: unknown) => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function UpcomingLiveLessons() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [lessons, setLessons] = useState<ZoomLesson[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    Promise.all([getAllLessons(), getStudentEnrolledLessons(currentUser.uid)])
      .then(([all, enrolled]) => {
        setLessons(all);
        setEnrolledIds(enrolled.map((lesson) => lesson.id));
      })
      .catch((error) => {
        console.error('Unable to load upcoming live lessons:', error);
        toast.error('Upcoming live lessons could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [currentUser?.uid]);

  const upcoming = useMemo(() => lessons
    .filter((lesson) => lesson.status !== 'cancelled' && lesson.status !== 'completed')
    .filter((lesson) => {
      const date = toDate(lesson.scheduledDate);
      return date && date.getTime() >= Date.now() - 60 * 60 * 1000;
    })
    .sort((a, b) => (toDate(a.scheduledDate)?.getTime() || 0) - (toDate(b.scheduledDate)?.getTime() || 0)), [lessons]);

  const handleEnroll = async (lesson: ZoomLesson) => {
    if (!currentUser?.uid) return;
    setEnrolling(lesson.id);
    try {
      await enrollInLesson(currentUser.uid, lesson.id);
      setEnrolledIds((ids) => ids.includes(lesson.id) ? ids : [...ids, lesson.id]);
      toast.success('You are enrolled in this live lesson.');
    } catch (error) {
      console.error('Unable to enroll in live lesson:', error);
      toast.error('We could not enroll you in this live lesson.');
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8faf9] px-4 py-6 text-slate-900 dark:bg-black dark:text-white lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Liv Teams learning room</p>
            <h1 className="text-2xl font-bold tracking-tight">Upcoming live lessons</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enroll first, then join the live room from inside Liverton.</p>
          </div>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div> : upcoming.length === 0 ? (
          <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 p-12 text-center"><BookOpen className="h-10 w-10 text-slate-300" /><p className="font-semibold">No upcoming live lessons yet</p><p className="text-sm text-slate-500">Check back when a teacher publishes a new lesson.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((lesson) => {
              const enrolled = enrolledIds.includes(lesson.id);
              const scheduled = toDate(lesson.scheduledDate);
              return <Card key={lesson.id} className="overflow-hidden border-slate-200/80 dark:border-white/10 dark:bg-zinc-950">
                <CardHeader className="space-y-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{lesson.title}</CardTitle><p className="mt-1 text-sm text-slate-500">by {lesson.teacherName || 'Teacher'}</p></div><Badge variant={enrolled ? 'default' : 'outline'}>{enrolled ? 'Enrolled' : 'Upcoming'}</Badge></div></CardHeader>
                <CardContent className="space-y-4"><p className="text-sm text-slate-500 dark:text-slate-400">{lesson.description || 'A live teacher-led learning session in Liverton.'}</p><div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300"><span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-500" />{scheduled?.toLocaleDateString() || 'Date pending'}</span><span className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-500" />{scheduled?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Time pending'}</span><span className="flex items-center gap-2"><Video className="h-4 w-4 text-emerald-500" />{lesson.duration || 60} minutes</span><span className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-500" />{lesson.enrolledCount || 0}/{lesson.maxStudents || '∞'}</span></div>{enrolled ? <Button className="w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => navigate(`/liv-teams/live-lesson/${lesson.id}`)}><Video className="mr-2 h-4 w-4" />Open Liv Teams room</Button> : <Button className="w-full rounded-xl" onClick={() => handleEnroll(lesson)} disabled={enrolling === lesson.id}>{enrolling === lesson.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Enroll</Button>}</CardContent>
              </Card>;
            })}
          </div>
        )}
      </div>
    </main>
  );
}
