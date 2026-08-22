import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, CheckCircle2, Clock3, Loader2, Radio, UploadCloud, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { subscribeToTeacherCourses, type Course } from '@/services/courseService';
import { createShort, type ShortLearningLinkType } from '@/services/tearnService';
import { getTeacherLessons, type ZoomLesson } from '@/lib/zoomService';

const MAX_SHORT_SIZE = 200 * 1024 * 1024;

type SelectedLink = {
  type: ShortLearningLinkType;
  id: string;
  title: string;
  description: string;
};

function formatLessonDate(value: string | undefined) {
  if (!value) return 'Schedule not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getLessonTimestamp(value: string | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function ShortUpload() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [modules, setModules] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<ZoomLesson[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shortFile, setShortFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    linkType: 'module' as ShortLearningLinkType,
    courseId: '',
    lessonId: '',
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoadingLinks(true);
    const unsubscribe = subscribeToTeacherCourses(currentUser.uid, setModules);
    getTeacherLessons(currentUser.uid)
      .then(setLessons)
      .catch((error) => {
        console.error('Unable to load teacher live lessons:', error);
        toast.error('Live lessons could not be loaded. You can still link a module.');
      })
      .finally(() => setLoadingLinks(false));
    return unsubscribe;
  }, [currentUser?.uid]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const selectedLink = useMemo<SelectedLink | null>(() => {
    if (form.linkType === 'module') {
      const module = modules.find((item) => item.id === form.courseId);
      return module
        ? {
            type: 'module',
            id: module.id,
            title: module.title,
            description: `Follow this module${module.status === 'active' ? '' : ' when it is published'}.`,
          }
        : null;
    }

    const lesson = lessons.find((item) => item.id === form.lessonId);
    return lesson
      ? {
          type: 'liveLesson',
          id: lesson.id,
          title: lesson.title,
          description: `Live lesson · ${formatLessonDate(lesson.scheduledDate)}`,
        }
      : null;
  }, [form.courseId, form.lessonId, form.linkType, lessons, modules]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => getLessonTimestamp(a.scheduledDate) - getLessonTimestamp(b.scheduledDate)),
    [lessons],
  );

  const setLinkType = (linkType: ShortLearningLinkType) => {
    setForm((previous) => ({
      ...previous,
      linkType,
      courseId: linkType === 'module' ? previous.courseId : '',
      lessonId: linkType === 'liveLesson' ? previous.lessonId : '',
    }));
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please choose a video file.');
      return;
    }
    if (file.size > MAX_SHORT_SIZE) {
      toast.error('Short videos must be 200 MB or smaller.');
      return;
    }
    setShortFile(file);
    setForm((previous) => ({ ...previous, videoUrl: '' }));
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!currentUser?.uid) {
      toast.error('Your educator session is not ready. Please sign in again.');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Add a title for the Short.');
      return;
    }
    if (!shortFile && !form.videoUrl.trim()) {
      toast.error('Upload a video file or provide a hosted video URL.');
      return;
    }
    if (!selectedLink) {
      toast.error(`Select a ${form.linkType === 'module' ? 'module' : 'live lesson'} so learners know what to follow.`);
      return;
    }

    setPublishing(true);
    setUploadProgress(0);
    try {
      const videoUrl = shortFile
        ? await uploadToCloudinary(shortFile, 'short_video', {
            onProgress: setUploadProgress,
            showErrorToast: false,
          })
        : form.videoUrl.trim();

      await createShort(currentUser.uid, userData?.fullName || currentUser.displayName || 'Educator', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        videoUrl,
        learningLinkType: selectedLink.type,
        learningLinkTitle: selectedLink.title,
        courseId: selectedLink.type === 'module' ? selectedLink.id : undefined,
        lessonId: selectedLink.type === 'liveLesson' ? selectedLink.id : undefined,
      });

      toast.success('Short published with its learning path.');
      navigate('/teacher/shorts/analytics');
    } catch (error) {
      console.error('Short publishing failed:', error);
      toast.error(error instanceof Error ? error.message : 'Short publishing failed. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-5 pb-24 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" /> Back to educator workspace
            </button>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Teacher studio · Shorts</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Publish a learning Short</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Turn a focused idea into a discovery moment. Every Short must point learners to one real module or live lesson so the next step is clear.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/teacher/shorts/analytics')}>
            <BarChart3 className="mr-2 h-4 w-4" /> View Short analytics
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl text-slate-950 dark:text-white">Short details</CardTitle>
              <CardDescription>Upload a vertical video and give learners enough context to decide whether to continue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <Label htmlFor="short-title">Title</Label>
                <Input
                  id="short-title"
                  value={form.title}
                  onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                  placeholder="e.g. The 30-second rule for balancing equations"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="short-description">Description <span className="font-normal text-slate-400">(optional)</span></Label>
                <Textarea
                  id="short-description"
                  value={form.description}
                  onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  placeholder="What will the learner understand after watching?"
                  className="min-h-24 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Video</Label>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">MP4, WebM, MOV, or another browser-supported video format · max 200 MB.</p>
                </div>
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 px-5 text-center transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40">
                  {shortFile ? <Video className="mb-3 h-8 w-8 text-emerald-600" /> : <UploadCloud className="mb-3 h-8 w-8 text-emerald-600" />}
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{shortFile?.name || 'Choose a Short video'}</span>
                  <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{shortFile ? `${(shortFile.size / 1024 / 1024).toFixed(1)} MB selected` : 'Click to browse your device'}</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleFileSelected(event.target.files[0])} disabled={publishing} />
                </label>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:bg-slate-900">or hosted URL</span></div>
                </div>
                <Input
                  value={form.videoUrl}
                  onChange={(event) => {
                    setShortFile(null);
                    setVideoPreviewUrl('');
                    setForm((previous) => ({ ...previous, videoUrl: event.target.value }));
                  }}
                  placeholder="https://…"
                  className="rounded-xl"
                  disabled={publishing}
                />
              </div>

              {publishing && shortFile && (
                <div className="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300"><span>Uploading video</span><span>{uploadProgress}%</span></div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label>Required learning path</Label>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose exactly one destination. This becomes the learner’s follow-up button inside Shorts.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setLinkType('module')} className={`rounded-2xl border p-4 text-left transition-colors ${form.linkType === 'module' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 hover:border-emerald-300 dark:border-slate-700'}`}>
                    <BookOpen className={`mb-2 h-5 w-5 ${form.linkType === 'module' ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">Link a module</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Send learners to the full module curriculum.</span>
                  </button>
                  <button type="button" onClick={() => setLinkType('liveLesson')} className={`rounded-2xl border p-4 text-left transition-colors ${form.linkType === 'liveLesson' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 hover:border-emerald-300 dark:border-slate-700'}`}>
                    <Radio className={`mb-2 h-5 w-5 ${form.linkType === 'liveLesson' ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">Link a live lesson</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Send learners to a scheduled live learning room.</span>
                  </button>
                </div>

                {form.linkType === 'module' ? (
                  <Select value={form.courseId} onValueChange={(value) => setForm((previous) => ({ ...previous, courseId: value }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder={loadingLinks ? 'Loading modules…' : 'Select a module'} /></SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => <SelectItem key={module.id} value={module.id}>{module.title} · {module.status === 'active' ? 'Published' : 'Draft'}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={form.lessonId} onValueChange={(value) => setForm((previous) => ({ ...previous, lessonId: value }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder={loadingLinks ? 'Loading live lessons…' : 'Select a live lesson'} /></SelectTrigger>
                    <SelectContent>
                      {sortedLessons.map((lesson) => <SelectItem key={lesson.id} value={lesson.id}>{lesson.title} · {formatLessonDate(lesson.scheduledDate)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {!loadingLinks && form.linkType === 'module' && modules.length === 0 && <p className="text-xs font-semibold text-amber-600">No modules found. Create a module first, then return here.</p>}
                {!loadingLinks && form.linkType === 'liveLesson' && lessons.length === 0 && <p className="text-xs font-semibold text-amber-600">No live lessons found. Schedule one first, then return here.</p>}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => navigate(-1)} disabled={publishing}>Cancel</Button>
                <Button type="button" className="rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700" onClick={handlePublish} disabled={publishing || loadingLinks}>
                  {publishing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…</> : <><UploadCloud className="mr-2 h-4 w-4" /> Publish Short</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-3xl border-slate-200 bg-slate-950 text-white shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Video className="h-5 w-5 text-emerald-400" /> Learner preview</CardTitle>
                <CardDescription className="text-slate-400">The selected follow-up path is saved with the Short and shown in the student viewer.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mx-auto flex aspect-[9/16] max-h-[520px] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                  {videoPreviewUrl ? <video src={videoPreviewUrl} controls muted playsInline className="h-full w-full object-cover" /> : <div className="px-6 text-center text-sm text-slate-500"><Video className="mx-auto mb-3 h-10 w-10 text-slate-700" /><p>Your video preview will appear here after you choose a file.</p></div>}
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                  <p className="text-sm font-black">{form.title || 'Your Short title'}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{form.description || 'A concise explanation helps learners decide to continue.'}</p>
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    {selectedLink ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
                    <span>{selectedLink ? <><strong>{selectedLink.type === 'module' ? 'Follow module' : 'Open live lesson'}:</strong> {selectedLink.title}</> : 'Select a module or live lesson to preview the learner path.'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-bold text-slate-900 dark:text-white">A clear next step improves learning</p><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Students will see a direct action in the Short viewer. Modules open the curriculum; live lessons open the lesson room.</p></div></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
