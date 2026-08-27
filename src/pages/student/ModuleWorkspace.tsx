import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageCircle,
  Music,
  Send,
  Sparkles,
  Star,
  Upload,
  UserPlus,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import {
  enrollStudent,
  getCourse,
  subscribeToCourseQuizzes,
  type Course,
  type CourseMaterial,
  type Quiz as CourseQuiz,
} from '@/services/courseService';
import { getOrCreateChat, type ChatContact } from '@/services/chatService';
import { checkIsFollowing, followTeacher, unfollowTeacher } from '@/services/tearnService';
import {
  saveModuleProgress,
  subscribeToModuleProgress,
  subscribeToModuleSubmissions,
  submitModuleAssignment,
  type ModuleProgressRecord,
  type ModuleSubmission,
} from '@/services/moduleLearningService';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { initializeModulePayment } from '@/services/paymentService';
import UnifiedMediaViewer from '@/components/UnifiedMediaViewer';

interface LessonRecord {
  id?: string;
  title?: string;
  description?: string;
  duration?: string;
  assignment?: {
    instructions?: string;
    requirements?: string;
    deadline?: string;
    points?: number;
  };
}

type WorkspaceTab = 'overview' | 'lessons' | 'resources' | 'assignments' | 'quizzes' | 'discussion';

const tabs: Array<[WorkspaceTab, string]> = [
  ['overview', 'Overview'],
  ['lessons', 'Lessons'],
  ['resources', 'Resources'],
  ['assignments', 'Assignments'],
  ['quizzes', 'Quizzes'],
  ['discussion', 'Discussion'],
];

const checklist: Array<{ tab: WorkspaceTab; label: string; icon: LucideIcon }> = [
  { tab: 'lessons', label: 'Review lessons', icon: BookOpen },
  { tab: 'resources', label: 'Open learning resources', icon: FileText },
  { tab: 'assignments', label: 'Submit assignments', icon: ClipboardCheck },
  { tab: 'quizzes', label: 'Take a quiz', icon: Star },
];

function displayDate(value?: string | Date) {
  if (!value) return 'No deadline';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function materialKind(material: CourseMaterial): 'image' | 'video' | 'audio' | 'pdf' | 'office' | 'file' {
  const mime = (material.mimeType || '').toLowerCase();
  const extension = (material.fileName || material.name || '').toLowerCase().split('.').pop();
  if (material.type === 'image' || mime.startsWith('image/')) return 'image';
  if (material.type === 'video' || mime.startsWith('video/')) return 'video';
  if (material.type === 'audio' || mime.startsWith('audio/')) return 'audio';
  if (material.type === 'pdf' || mime === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '') || ['document', 'spreadsheet', 'presentation'].includes(material.type)) return 'office';
  return 'file';
}

function materialIcon(material: CourseMaterial) {
  const kind = materialKind(material);
  if (kind === 'image') return <ImageIcon className="h-4 w-4" />;
  if (kind === 'video') return <Video className="h-4 w-4" />;
  if (kind === 'audio') return <Music className="h-4 w-4" />;
  if (kind === 'pdf' || kind === 'office') return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function MaterialViewer({ material }: { material: CourseMaterial }) {
  const kind = materialKind(material);
  const url = material.url;
  if (!url) return <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">This resource does not have a file attached yet.</div>;
  if (kind === 'image') return <img src={url} alt={material.name} className="max-h-[66vh] w-full rounded-2xl bg-slate-950 object-contain" />;
  if (kind === 'video') return <video src={url} controls preload="metadata" className="max-h-[66vh] w-full rounded-2xl bg-black" />;
  if (kind === 'audio') return <div className="rounded-2xl bg-slate-950 p-8"><audio src={url} controls className="w-full" /></div>;
  if (kind === 'pdf') return <iframe src={`${url}#toolbar=1&view=FitH`} title={material.name} className="h-[66vh] w-full rounded-2xl border border-slate-200 bg-white" />;
  if (kind === 'office') {
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return <iframe src={officeUrl} title={material.name} className="h-[66vh] w-full rounded-2xl border border-slate-200 bg-white" />;
  }
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center"><File className="mx-auto mb-3 h-10 w-10 text-emerald-500" /><p className="font-semibold">Preview is not available for this file type.</p><p className="mt-1 text-sm text-slate-500">Download the original resource to open it in a compatible application.</p></div>;
}

function ResourcePanel({
  course,
  progress,
  selectedMaterial,
  setSelectedMaterial,
  markMaterialComplete,
}: {
  course: Course;
  progress: ModuleProgressRecord | null;
  selectedMaterial: CourseMaterial | null;
  setSelectedMaterial: (material: CourseMaterial) => void;
  markMaterialComplete: (material: CourseMaterial) => void;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const isComplete = selectedMaterial ? progress?.completedMaterialIds.includes(selectedMaterial.id) : false;
  return <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Resources</CardTitle><CardDescription>Select a file to view it here.</CardDescription></CardHeader>
      <CardContent className="space-y-2">
        {(course.materials || []).map((material) => <button key={material.id} type="button" onClick={() => setSelectedMaterial(material)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selectedMaterial?.id === material.id ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">{materialIcon(material)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{material.name}</span><span className="block text-[11px] capitalize text-slate-400">{material.type}</span></span>
          {progress?.completedMaterialIds.includes(material.id) && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
        </button>)}
        {(course.materials || []).length === 0 && <p className="py-8 text-center text-sm text-slate-500">No resources have been uploaded yet.</p>}
      </CardContent>
    </Card>
    <Card className="min-h-[420px] rounded-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div><CardTitle>{selectedMaterial?.name || 'Choose a resource'}</CardTitle><CardDescription>{selectedMaterial ? 'View the resource without leaving your module.' : 'PDFs, videos, images, audio, and supported office files open inside this workspace.'}</CardDescription></div>
        {selectedMaterial && <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => setViewerOpen(true)} className="rounded-xl">Open viewer</Button><Button size="sm" variant="outline" asChild className="rounded-xl"><a href={selectedMaterial.url} download={selectedMaterial.name}><Download className="mr-1.5 h-3.5 w-3.5" /> Download</a></Button><Button size="sm" onClick={() => markMaterialComplete(selectedMaterial)} disabled={isComplete} className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">{isComplete ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}{isComplete ? 'Complete' : 'Mark complete'}</Button></div>}
      </CardHeader>
      <CardContent>{selectedMaterial ? <MaterialViewer material={selectedMaterial} /> : <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl bg-slate-50 text-center dark:bg-white/5"><FileText className="mb-3 h-10 w-10 text-slate-300" /><p className="font-semibold">Select a resource to begin</p></div>}</CardContent>
    </Card>
    <UnifiedMediaViewer item={selectedMaterial ? { url: selectedMaterial.url, name: selectedMaterial.name, mimeType: selectedMaterial.mimeType, type: materialKind(selectedMaterial) === 'office' ? 'document' : materialKind(selectedMaterial) } : null} open={viewerOpen} onOpenChange={setViewerOpen} />
  </div>;
}

export default function ModuleWorkspace() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<CourseQuiz[]>([]);
  const [progress, setProgress] = useState<ModuleProgressRecord | null>(null);
  const [submissions, setSubmissions] = useState<ModuleSubmission[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [assignmentResponse, setAssignmentResponse] = useState('');
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<LessonRecord | null>(null);
  const [uploadingAssignment, setUploadingAssignment] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    getCourse(courseId).then(setCourse).catch(() => toast.error('Unable to load this module.')).finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    return subscribeToCourseQuizzes(courseId, setQuizzes);
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !currentUser) return;
    const stopProgress = subscribeToModuleProgress(courseId, currentUser.uid, setProgress);
    const stopSubmissions = subscribeToModuleSubmissions(courseId, currentUser.uid, setSubmissions);
    return () => { stopProgress(); stopSubmissions(); };
  }, [courseId, currentUser]);

  useEffect(() => {
    if (!course?.teacherId || !currentUser || course.teacherId === currentUser.uid) return;
    checkIsFollowing(currentUser.uid, course.teacherId).then(setFollowing).catch(() => setFollowing(false));
  }, [course?.teacherId, currentUser]);

  const lessons = useMemo(() => (Array.isArray(course?.lessonsList) ? course.lessonsList : []) as LessonRecord[], [course?.lessonsList]);
  const assignments = useMemo(() => lessons.map((lesson, index) => lesson.assignment ? ({ ...lesson, id: lesson.id || `lesson-${index}`, title: lesson.title || `Lesson ${index + 1} assignment` }) : null).filter(Boolean) as LessonRecord[], [lessons]);
  const isOwner = course?.teacherId === currentUser?.uid;
  const isEnrolled = Boolean(currentUser && course?.enrolledStudents?.includes(currentUser.uid));
  const isFree = Boolean(course && (course.isFree || Number(course.price || 0) <= 0));
  const hasAccess = Boolean(isOwner || isEnrolled);
  const totalLearningItems = Math.max((course?.materials?.length || 0) + lessons.length, 1);
  const calculatedProgress = progress?.percentage ?? 0;

  const startPaidCheckout = async () => {
    if (!course) return;
    setActionLoading(true);
    try {
      const result = await initializeModulePayment(course.id);
      if (result.alreadyEnrolled) {
        setCourse((old) => old ? { ...old, enrolledStudents: [...(old.enrolledStudents || []), currentUser?.uid || ''] } : old);
        toast.success('Your access is already active.');
        return;
      }
      if (!result.checkoutUrl) throw new Error('Payment checkout link was not returned.');
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'We could not start payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const enrollForFree = async () => {
    if (!currentUser || !course) return;
    setActionLoading(true);
    try {
      await enrollStudent(course.id, currentUser.uid, userData?.fullName || currentUser.displayName || 'Liverton learner', currentUser.email || undefined);
      setCourse((old) => old ? { ...old, enrolledStudents: [...(old.enrolledStudents || []), currentUser.uid] } : old);
      toast.success('You are enrolled. Your learning space is ready.');
    } catch { toast.error('We could not enroll you right now. Please try again.'); }
    finally { setActionLoading(false); }
  };

  const markMaterialComplete = async (material: CourseMaterial) => {
    if (!courseId || !currentUser) return;
    const completed = new Set(progress?.completedMaterialIds || []);
    completed.add(material.id);
    const completedMaterialIds = [...completed];
    const percentage = Math.min(100, Math.round((completedMaterialIds.length + (progress?.completedLessonIds.length || 0)) / totalLearningItems * 100));
    try {
      await saveModuleProgress(courseId, currentUser.uid, { completedMaterialIds, completedLessonIds: progress?.completedLessonIds || [], percentage });
      toast.success('Resource marked as complete.');
    } catch { toast.error('Progress could not be saved.'); }
  };

  const startTeacherChat = async () => {
    if (!course || !currentUser || !userData) return;
    try {
      const teacher: ChatContact = { uid: course.teacherId, fullName: course.teacherName, email: '', role: 'teacher' };
      const chatId = await getOrCreateChat(currentUser.uid, course.teacherId, userData, teacher, `Question about ${course.title}`);
      navigate(`/chat/${chatId}?share=${encodeURIComponent(`Hi ${course.teacherName}, I have a question about ${course.title}.`)}`);
    } catch { toast.error('We could not open the teacher chat.'); }
  };

  const toggleFollow = async () => {
    if (!currentUser || !course) return;
    try {
      if (following) await unfollowTeacher(currentUser.uid, course.teacherId);
      else await followTeacher(currentUser.uid, course.teacherId);
      setFollowing(!following);
      toast.success(following ? 'Teacher removed from your following list.' : 'You are now following this teacher.');
    } catch { toast.error('We could not update your following list.'); }
  };

  const submitAssignment = async () => {
    if (!courseId || !currentUser || !course || !selectedAssignment || (!assignmentResponse.trim() && !assignmentFile)) return;
    setUploadingAssignment(true);
    try {
      let attachmentUrl: string | undefined;
      if (assignmentFile) attachmentUrl = await uploadToCloudinary(assignmentFile, 'document', { referenceId: courseId, purpose: 'module_assignment', showErrorToast: false });
      await submitModuleAssignment({ courseId, studentId: currentUser.uid, studentName: userData?.fullName || currentUser.displayName || 'Liverton learner', teacherId: course.teacherId, assignmentId: selectedAssignment.id || selectedAssignment.title || 'assignment', assignmentTitle: selectedAssignment.title || 'Module assignment', response: assignmentResponse.trim(), attachmentUrl, attachmentName: assignmentFile?.name });
      setAssignmentResponse('');
      setAssignmentFile(null);
      toast.success('Assignment submitted to your teacher.');
    } catch { toast.error('Assignment submission failed. Please try again.'); }
    finally { setUploadingAssignment(false); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /><span className="text-sm text-slate-500">Loading module workspace...</span></div>;
  if (!course) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-300" /><h1 className="text-xl font-bold">Module not found</h1><Button onClick={() => navigate('/student/courses')} className="mt-5 rounded-xl">Back to modules</Button></div>;

  if (!hasAccess) return <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 lg:px-6"><Button variant="ghost" onClick={() => navigate('/student/courses')} className="rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Modules</Button><Card className="overflow-hidden rounded-[2rem]"><div className="bg-slate-950 px-6 py-12 text-white sm:px-10"><Badge className="bg-emerald-500 text-white">{isFree ? 'Free module' : 'Paid module'}</Badge><h1 className="mt-4 text-3xl font-black tracking-tight">{course.title}</h1><p className="mt-3 max-w-2xl text-slate-300">{course.description || 'Build your skills with a teacher-led learning path.'}</p></div><CardContent className="space-y-5 p-6 sm:p-10"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Teacher</p><p className="mt-1 font-semibold">{course.teacherName}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Resources</p><p className="mt-1 font-semibold">{course.materials?.length || 0} resources</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Access</p><p className="mt-1 font-semibold">{isFree ? 'Start for free' : `${course.currency || 'UGX'} ${Number(course.price).toLocaleString()}`}</p></div></div><div className="flex flex-wrap gap-3"><Button onClick={isFree ? enrollForFree : startPaidCheckout} disabled={actionLoading} className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">{actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFree ? <Sparkles className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}{isFree ? 'Start learning for free' : 'Continue to payment'}</Button><Button variant="outline" onClick={() => navigate(`/courses/${course.id}`)} className="rounded-xl">View module details</Button></div></CardContent></Card></div>;

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900 dark:bg-black dark:text-white">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f7faf8]/95 backdrop-blur dark:border-white/10 dark:bg-black/90"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6"><Button variant="ghost" size="sm" onClick={() => navigate('/student/courses')} className="rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Modules</Button><div className="hidden min-w-0 flex-1 px-3 sm:block"><p className="truncate text-sm font-bold">{course.title}</p><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{course.subject} · {course.teacherName}</p></div><div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 text-xs font-semibold text-slate-500 sm:flex"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {calculatedProgress}% complete</span><Button variant="outline" size="sm" onClick={toggleFollow} className="rounded-xl">{following ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <UserPlus className="mr-1.5 h-4 w-4" />}{following ? 'Following' : 'Follow teacher'}</Button></div></div></header>
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 lg:px-6 lg:py-7">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10"><div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" /><div className="relative"><div className="flex flex-wrap items-center gap-2"><Badge className="bg-emerald-500 text-white">{isFree ? 'Free access' : 'Enrolled'}</Badge>{course.grade && <Badge variant="outline" className="border-white/20 text-white">{course.grade}</Badge>}</div><h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">{course.title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{course.description || 'A structured learning module designed to help you move from understanding to practice.'}</p><div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300"><span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-emerald-300" /> {course.enrolledStudents?.length || 0} learners</span><span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-emerald-300" /> {lessons.length || course.lessons || 0} lessons</span><span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-300" /> {course.materials?.length || 0} resources</span></div></div></div><Card className="rounded-[2rem] border-0 shadow-lg"><CardHeader><CardDescription>Your learning progress</CardDescription><CardTitle className="text-3xl">{calculatedProgress}%</CardTitle></CardHeader><CardContent><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${calculatedProgress}%` }} /></div><p className="mt-3 text-xs text-slate-500">Mark resources complete as you work through the module.</p><Button onClick={startTeacherChat} variant="outline" className="mt-4 w-full rounded-xl"><MessageCircle className="mr-2 h-4 w-4" /> Ask the teacher</Button></CardContent></Card></section>
      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-zinc-950" aria-label="Module sections">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setActiveTab(value)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${activeTab === value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>{label}{value === 'assignments' && assignments.length > 0 ? ` (${assignments.length})` : ''}</button>)}</nav>
      {activeTab === 'overview' && <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-500" /> Learning path</CardTitle><CardDescription>Everything you need to complete {course.title} with confidence.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{(course.learningObjectives || course.learningOutcomes || ['Understand the core ideas in this module', 'Practice with teacher-provided resources', 'Complete the activities and quizzes']).map((objective) => <div key={objective} className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><p className="text-sm leading-relaxed">{objective}</p></div>)}</div><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Prerequisites</p><p className="text-sm text-slate-600 dark:text-slate-300">{course.prerequisites?.join(', ') || 'No prerequisites listed. Start with the overview and move at your own pace.'}</p></div></CardContent></Card><Card className="rounded-2xl"><CardHeader><CardTitle>Module checklist</CardTitle><CardDescription>Pick your next step.</CardDescription></CardHeader><CardContent className="space-y-2">{checklist.map(({ tab, label, icon: Icon }) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-white/10 dark:hover:bg-emerald-950/20"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600"><Icon className="h-4 w-4" /></span><span className="flex-1 text-sm font-semibold">{label}</span><ArrowRight className="h-4 w-4 text-slate-400" /></button>)}</CardContent></Card></section>}
      {activeTab === 'lessons' && <Card className="rounded-2xl"><CardHeader><CardTitle>Lessons</CardTitle><CardDescription>Follow the module sequence and keep track of what you have covered.</CardDescription></CardHeader><CardContent className="space-y-3">{lessons.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Your teacher has not added lesson notes yet.</p> : lessons.map((lesson, index) => <div key={lesson.id || index} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 dark:border-white/10"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{lesson.title || `Lesson ${index + 1}`}</h3>{lesson.duration && <Badge variant="outline">{lesson.duration}</Badge>}</div><p className="mt-1 text-sm leading-relaxed text-slate-500">{lesson.description || 'Work through the lesson resources, then complete the activity if one is included.'}</p>{lesson.assignment && <button type="button" onClick={() => { setSelectedAssignment(lesson); setActiveTab('assignments'); }} className="mt-3 text-xs font-bold text-emerald-600 hover:underline">Open lesson assignment</button>}</div></div>)}</CardContent></Card>}
      {activeTab === 'resources' && <ResourcePanel course={course} progress={progress} selectedMaterial={selectedMaterial} setSelectedMaterial={setSelectedMaterial} markMaterialComplete={markMaterialComplete} />}
      {activeTab === 'assignments' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]"><Card className="rounded-2xl"><CardHeader><CardTitle>Assignments</CardTitle><CardDescription>Respond to the teacher and submit your work from this module.</CardDescription></CardHeader><CardContent className="space-y-3">{assignments.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No assignments have been added yet.</p> : assignments.map((assignment) => { const submitted = submissions.some((item) => item.assignmentId === assignment.id); return <button key={assignment.id} type="button" onClick={() => setSelectedAssignment(assignment)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedAssignment?.id === assignment.id ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-100 hover:border-emerald-200 dark:border-white/10'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{assignment.title}</h3><p className="mt-1 text-sm text-slate-500">{assignment.assignment?.instructions || 'Complete the activity and submit your response.'}</p></div>{submitted ? <Badge className="bg-emerald-500 text-white">Submitted</Badge> : <Badge variant="outline">Pending</Badge>}</div><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400"><span>Due {displayDate(assignment.assignment?.deadline)}</span>{assignment.assignment?.points && <span>{assignment.assignment.points} points</span>}</div></button>; })}</CardContent></Card><Card className="rounded-2xl"><CardHeader><CardTitle>{selectedAssignment?.title || 'Select an assignment'}</CardTitle><CardDescription>{selectedAssignment ? 'Your teacher can review your response and attached file.' : 'Choose an assignment from the list to prepare a submission.'}</CardDescription></CardHeader><CardContent className="space-y-4">{selectedAssignment ? <><div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">{selectedAssignment.assignment?.requirements || selectedAssignment.assignment?.instructions || 'Follow the teacher instructions for this activity.'}</div><Textarea value={assignmentResponse} onChange={(event) => setAssignmentResponse(event.target.value)} placeholder="Write your response here..." className="min-h-32 rounded-xl" /><div className="rounded-xl border border-dashed border-slate-200 p-3 dark:border-white/10"><Input type="file" onChange={(event) => setAssignmentFile(event.target.files?.[0] || null)} className="text-xs" /><p className="mt-2 text-[11px] text-slate-400">Optional: attach a PDF, document, image, or other project file.</p></div><Button onClick={submitAssignment} disabled={uploadingAssignment || (!assignmentResponse.trim() && !assignmentFile)} className="w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">{uploadingAssignment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{uploadingAssignment ? 'Submitting...' : 'Submit assignment'}</Button></> : <div className="py-10 text-center text-sm text-slate-500"><ClipboardCheck className="mx-auto mb-3 h-9 w-9 text-slate-300" />Choose an assignment to begin.</div>}</CardContent></Card></div>}
      {activeTab === 'quizzes' && <Card className="rounded-2xl"><CardHeader><CardTitle>Module quizzes</CardTitle><CardDescription>Check your understanding and keep your results with the module.</CardDescription></CardHeader><CardContent className="space-y-3">{quizzes.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No quizzes have been published for this module yet.</p> : quizzes.map((quiz) => <div key={quiz.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center dark:border-white/10"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/30"><Star className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{quiz.title}</h3><p className="mt-1 text-sm text-slate-500">{quiz.questions?.length || 0} questions{quiz.timeLimit ? ` · ${quiz.timeLimit} min` : ''}</p></div><Button onClick={() => navigate(`/student/quiz/${quiz.id}`)} className="rounded-xl bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900">Start quiz <ArrowRight className="ml-2 h-4 w-4" /></Button></div>)}</CardContent></Card>}
      {activeTab === 'discussion' && <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-500" /> Module discussion</CardTitle><CardDescription>Ask the teacher about this module or continue the conversation in your inbox.</CardDescription></CardHeader><CardContent><div className="rounded-2xl bg-slate-950 p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Teacher support</p><h3 className="mt-2 text-xl font-bold">Keep your questions connected to the lesson.</h3><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">Open a persistent chat with {course.teacherName}; your module title is included so the conversation starts with the right context.</p><Button onClick={startTeacherChat} className="mt-5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"><Send className="mr-2 h-4 w-4" /> Chat with {course.teacherName}</Button></div></CardContent></Card>}
    </main>
  </div>;
}
