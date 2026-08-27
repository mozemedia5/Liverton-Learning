import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BarChart3, BookOpen, CheckCircle2, ChevronRight, Clock3, FilePlus2, Plus, Star, Users, Video, WalletCards } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToTeacherCourses, type Course } from '@/services/courseService';
import ActivitySummaryCard from '@/components/ActivitySummaryCard';
import RoleVideoUpdate from '@/components/RoleVideoUpdate';
import DashboardHero from '@/components/DashboardHero';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') return new Date((value as { toMillis: () => number }).toMillis());
  if (typeof value === 'number') return new Date(value < 100000000000 ? value * 1000 : value);
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: unknown) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date) : 'Date unavailable';
}

const quickActions = [
  { label: 'Create module', icon: BookOpen, path: '/features/tearn' },
  { label: 'Create quiz', icon: CheckCircle2, path: '/teacher/quizzes/create' },
  { label: 'Create Short', icon: Video, path: '/teacher/shorts/upload' },
  { label: 'Add assignment', icon: FilePlus2, path: '/features/tearn' },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [modules, setModules] = useState<Course[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    return subscribeToTeacherCourses(currentUser.uid, setModules);
  }, [currentUser?.uid]);

  const metrics = useMemo(() => {
    const learners = modules.reduce((sum, module) => sum + (module.enrolledStudents?.length || 0), 0);
    const ratings = modules.map(module => Number((module as Course & { rating?: number }).rating)).filter(Number.isFinite);
    const averageRating = ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : '—';
    const published = modules.filter(module => module.status === 'active').length;
    return { learners, averageRating, published };
  }, [modules]);

  const statCards: Array<[string, string, string, ElementType]> = [
    ['Published modules', String(metrics.published), `of ${modules.length} total`, BookOpen],
    ['Active learners', String(metrics.learners), 'from your modules', Users],
    ['Average rating', metrics.averageRating, 'from learner feedback', Star],
    ['Educator tools', 'Live', 'modules, lessons and Shorts', WalletCards]
  ];

  return <div className="liv-page">
    <RoleVideoUpdate />
    <DashboardHero eyebrow={`Educator studio · ${formatDate(Date.now())}`} title={`Good morning, ${userData?.fullName?.split(' ')[0] || 'Educator'}.`} rotatingWords={['teach', 'inspire', 'publish', 'grow']} description="Your educator workspace is ready. Keep your learners moving with one clear next step." actionLabel="Create module" onAction={() => navigate('/features/tearn')} actionIcon={Plus} />

    <section className="liv-hero-card"><div><span className="liv-eyebrow">Your educator workspace</span><h2>Turn your best ideas into learning people remember.</h2><p>Create structured modules, invite co-creators, and publish lessons with outcomes your learners can see.</p><div style={{ display: 'flex', gap: 8, marginTop: 20 }}><button className="liv-button liv-button-green" onClick={() => navigate('/features/tearn')}>Open Educators Workhub <ArrowUpRight size={15} /></button><button className="liv-button liv-button-light" onClick={() => navigate('/features/liv-teams')}><Users size={15} /> Invite a creator</button></div></div>    </section>
    <ActivitySummaryCard />

    <div className="liv-grid-4" style={{ marginTop: 14 }}>
      {statCards.map(([label, value, note, Icon]) => <div className="liv-card liv-stat" key={String(label)}><div className="liv-stat-top"><span>{label}</span><span className="liv-stat-icon"><Icon size={16} /></span></div><strong className="liv-stat-value">{value}</strong><span className="liv-stat-note">{note}</span></div>)}
    </div>

    <div className="liv-section-head"><h2>Quick create</h2><span className="liv-eyebrow">Build in small steps</span></div>
    <div className="liv-chip-row">{quickActions.map(({ label, icon: Icon, path }) => <button key={label} className="liv-chip" onClick={() => navigate(path)}><Icon size={14} style={{ verticalAlign: '-3px', marginRight: 6 }} />{label}</button>)}</div>

    <div className="liv-section-head"><h2>Your modules</h2><button onClick={() => navigate('/teacher/courses')}>View library <ChevronRight size={14} style={{ verticalAlign: '-3px' }} /></button></div>
    {modules.length === 0 ? <div className="liv-card" style={{ padding: 28, color: 'var(--liv-muted)' }}>No modules yet. Create your first module in the Educators Workhub.</div> : <div className="liv-grid-3">{modules.map((module) => { const lessons = ((module as any).lessonsList || []).length; const progress = Number((module as any).progress); const hasProgress = Number.isFinite(progress); return <article className="liv-card" key={module.id}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}><span className="liv-chip is-selected">{module.status === 'active' ? 'Published' : 'Draft'}</span><span style={{ color: '#8b908a', fontSize: 11 }}>{formatDate(module.updatedAt)}</span></div><h3 style={{ fontFamily: 'Space Grotesk', fontSize: 18, letterSpacing: '-.04em', lineHeight: 1.08, margin: '19px 0 7px' }}>{module.title}</h3><p style={{ color: 'var(--liv-muted)', fontSize: 11, margin: 0 }}>{lessons} lessons · {module.enrolledStudents?.length || 0} learners</p><div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '15px 0 20px' }}><Clock3 size={13} color="#b87819" /><span style={{ fontSize: 12, fontWeight: 700 }}>{module.duration || 'Duration not set'}</span><span style={{ color: '#9ba097', fontSize: 11 }}>learning time</span></div>{hasProgress && <><div className="liv-inline-label"><span>Learning activity</span><strong>{progress}%</strong></div><div className="liv-progress"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: 'var(--liv-green)' }} /></div></>}<button className="liv-button liv-button-light" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }} onClick={() => navigate(`/teacher/courses/${module.id}`)}>Open module <ArrowUpRight size={14} /></button></article>; })}</div>}

    <div className="liv-grid-2" style={{ marginTop: 14 }}><section className="liv-card"><div className="liv-section-head" style={{ marginTop: 0 }}><h2>Learning activity</h2><button onClick={() => navigate('/teacher/courses')}>See modules</button></div><div className="liv-list"><button type="button" className="liv-list-row" onClick={() => navigate('/features/analytics')}><span className="liv-row-icon"><BarChart3 size={17} /></span><div><h3>Live module analytics</h3><p>Open analytics to review learner activity and module performance.</p></div><span className="liv-row-end"><ArrowUpRight size={15} /></span></button><button type="button" className="liv-list-row" onClick={() => navigate('/calendar')}><span className="liv-row-icon"><Clock3 size={17} /></span><div><h3>Plan upcoming learning</h3><p>Open Calendar to manage lessons, events, and deadlines.</p></div><span className="liv-row-end"><ChevronRight size={16} /></span></button></div></section><section className="liv-card"><div className="liv-section-head" style={{ marginTop: 0 }}><h2>Collaboration desk</h2><button onClick={() => navigate('/features/liv-teams')}>Open Teams</button></div><div className="liv-list"><button type="button" className="liv-list-row" onClick={() => navigate('/teacher/shorts/upload')}><span className="liv-row-icon"><Video size={17} /></span><div><h3>Create a lesson Short</h3><p>Upload a Short and connect it to a module or live lesson.</p></div><span className="liv-row-end"><ArrowUpRight size={15} /></span></button><button type="button" className="liv-list-row" onClick={() => navigate('/teacher/shorts/analytics')}><span className="liv-row-icon"><BarChart3 size={17} /></span><div><h3>Review Short analytics</h3><p>Track real views, likes, and learning-path coverage.</p></div><span className="liv-row-end"><ChevronRight size={16} /></span></button><button type="button" className="liv-list-row" onClick={() => navigate('/features/liv-teams')}><span className="liv-row-icon"><Users size={17} /></span><div><h3>Invite a co-creator</h3><p>Open Liv Teams to collaborate and connect the team to a module.</p></div><span className="liv-row-end"><ChevronRight size={16} /></span></button></div></section></div>
  </div>;
}
