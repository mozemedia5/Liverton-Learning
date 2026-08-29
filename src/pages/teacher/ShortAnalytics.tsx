import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, CheckCircle2, Clock3, Eye, ExternalLink, Heart, Link2, Loader2, Plus, Radio, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToTeacherShorts, type EducationalShort } from '@/services/tearnService';

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: unknown) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date) : 'Date unavailable';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export default function ShortAnalytics() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [shorts, setShorts] = useState<EducationalShort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);
    let settled = false;
    const loadingTimeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    }, 8000);
    const unsubscribe = subscribeToTeacherShorts(
      currentUser.uid,
      (data) => {
        settled = true;
        window.clearTimeout(loadingTimeout);
        setShorts(data);
        setLoading(false);
      },
      (error) => {
        console.error('Unable to load Shorts analytics:', error);
        settled = true;
        window.clearTimeout(loadingTimeout);
        setLoading(false);
      },
    );
    return () => {
      window.clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [currentUser?.uid]);

  const rankedShorts = useMemo(() => [...shorts].sort((a, b) => (b.views - a.views) || (b.likes - a.likes)), [shorts]);

  const metrics = useMemo(() => {
    const totalViews = shorts.reduce((sum, short) => sum + (Number(short.views) || 0), 0);
    const totalLikes = shorts.reduce((sum, short) => sum + (Number(short.likes) || 0), 0);
    const linkedShorts = shorts.filter((short) => Boolean(short.courseId || short.lessonId)).length;
    const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : null;
    return { totalViews, totalLikes, linkedShorts, engagementRate };
  }, [shorts]);

  const publishingActivity = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));
      const dayKey = date.toISOString().slice(0, 10);
      return {
        key: dayKey,
        label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
        count: shorts.filter((short) => toDate(short.createdAt)?.toISOString().slice(0, 10) === dayKey).length,
      };
    });
    const max = Math.max(...days.map((day) => day.count), 1);
    return days.map((day) => ({ ...day, percent: (day.count / max) * 100 }));
  }, [shorts]);

  if (!currentUser) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 pb-24 dark:bg-slate-950 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button type="button" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back to educator workspace
            </button>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Teacher studio · performance</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Short analytics</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Review the actual reach and engagement of your published Shorts, then see which learning path learners can follow next.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => navigate('/features/tearn/shorts')}><Video className="mr-2 h-4 w-4" /> Open Shorts</Button>
            <Button className="rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700" onClick={() => navigate('/teacher/shorts/upload')}><Plus className="mr-2 h-4 w-4" /> Publish Short</Button>
          </div>
        </header>

        {loading ? (
          <Card className="rounded-3xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><CardContent className="flex min-h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Published Shorts</span><Video className="h-5 w-5 text-emerald-600" /></div><p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{shorts.length}</p><p className="mt-1 text-xs text-slate-500">Your live creator library</p></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total views</span><Eye className="h-5 w-5 text-blue-600" /></div><p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{formatNumber(metrics.totalViews)}</p><p className="mt-1 text-xs text-slate-500">Recorded by the student viewer</p></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total likes</span><Heart className="h-5 w-5 text-rose-500" /></div><p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{formatNumber(metrics.totalLikes)}</p><p className="mt-1 text-xs text-slate-500">Recorded by the student viewer</p></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Like rate</span><BarChart3 className="h-5 w-5 text-amber-600" /></div><p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{metrics.engagementRate === null ? '—' : `${metrics.engagementRate.toFixed(1)}%`}</p><p className="mt-1 text-xs text-slate-500">Likes divided by recorded views</p></CardContent></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader><CardTitle className="text-xl text-slate-950 dark:text-white">Top-performing Shorts</CardTitle><CardDescription>Ranked from the views and likes stored on each Short.</CardDescription></CardHeader>
                <CardContent>
                  {rankedShorts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No Shorts have been published yet. Publish one to start collecting real learner activity.</div> : <div className="space-y-3">{rankedShorts.slice(0, 6).map((short, index) => <div key={short.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{short.title}</p><p className="mt-1 text-xs text-slate-500">Published {formatDate(short.createdAt)} · {short.learningLinkTitle || (short.lessonId ? 'Live lesson' : short.courseId ? 'Module' : 'Legacy link')}</p></div><div className="flex shrink-0 items-center gap-3 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatNumber(short.views || 0)}</span><span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-500" />{formatNumber(short.likes || 0)}</span></div></div>)}</div>}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader><CardTitle className="text-xl text-slate-950 dark:text-white">Publishing activity</CardTitle><CardDescription>Shorts published over the last seven days from their Firestore timestamps.</CardDescription></CardHeader>
                <CardContent>
                  {shorts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No publishing activity yet.</div> : <div className="flex h-44 items-end justify-between gap-2 rounded-2xl bg-slate-50 px-4 pb-4 pt-6 dark:bg-slate-950">{publishingActivity.map((day) => <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">{day.count || ''}</span><div className="flex h-28 w-full items-end"><div className="w-full rounded-t-lg bg-emerald-500 transition-all" style={{ height: `${Math.max(day.percent, day.count ? 12 : 3)}%` }} /></div><span className="text-[11px] font-semibold text-slate-500">{day.label}</span></div>)}</div>}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-xl text-slate-950 dark:text-white">Learning path coverage</CardTitle><CardDescription>Every new Short is required to point to a module or live lesson.</CardDescription></div><Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><Link2 className="mr-1 h-3.5 w-3.5" /> {metrics.linkedShorts}/{shorts.length} linked</Badge></div></CardHeader>
              <CardContent>
                {shorts.length > 0 && <div className="mb-6"><div className="mb-2 flex justify-between text-xs font-semibold text-slate-500"><span>Shorts with a follow-up destination</span><span>{Math.round((metrics.linkedShorts / shorts.length) * 100)}%</span></div><Progress value={(metrics.linkedShorts / shorts.length) * 100} className="h-2" /></div>}
                {shorts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Publish a Short to see module and live-lesson coverage here.</div> : <div className="grid gap-3 md:grid-cols-2">{shorts.map((short) => { const isLesson = Boolean(short.lessonId); const isLinked = Boolean(short.courseId || short.lessonId); return <div key={short.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800"><div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isLinked ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'}`}>{isLinked ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{short.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500">{isLesson ? <Radio className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}{isLinked ? short.learningLinkTitle || (isLesson ? 'Linked live lesson' : 'Linked module') : 'Legacy Short without a learning path'}</p></div></div>})}</div>}
              </CardContent>
            </Card>
          </>
        )}

        {!loading && shorts.length > 0 && <p className="flex items-center gap-2 text-xs text-slate-500"><ExternalLink className="h-3.5 w-3.5" /> Metrics update in real time as learners view and like Shorts.</p>}
      </div>
    </div>
  );
}
