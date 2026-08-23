import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CheckCircle2, ChevronRight, Clock3, Flame, Play, Target, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import ActivitySummaryCard from '@/components/ActivitySummaryCard';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { courses, loading, error } = useCourses(currentUser?.uid);
  const name = userData?.fullName?.split(' ')[0] || 'there';
  const activeCourses = useMemo(() => courses.filter(course => (course.progress ?? 0) < 100), [courses]);
  const completedCount = useMemo(() => courses.filter(course => (course.progress ?? 0) >= 100).length, [courses]);
  const averageProgress = courses.length ? Math.round(courses.reduce((sum, course) => sum + (course.progress ?? 0), 0) / courses.length) : 0;

  const stats: Array<[string, string, string, typeof Flame]> = [
    ['Modules', String(courses.length), courses.length ? 'Your current library' : 'No modules yet', BookOpen],
    ['Average progress', `${averageProgress}%`, courses.length ? 'Across your modules' : 'Start a module to track it', Target],
    ['Completed', String(completedCount), completedCount ? 'Keep the rhythm going' : 'Nothing completed yet', CheckCircle2],
    ['Learning time', '—', 'Tracked as you learn', Clock3],
  ];

  return <div className="liv-page">
    <header className="liv-page-header"><div><span className="liv-eyebrow">Student space · Your learning rhythm</span><h1 className="liv-title">Keep going, {name}.</h1><p className="liv-subtitle">Your learning space reflects the modules and progress connected to your account.</p></div><button className="liv-button liv-button-green" onClick={() => navigate('/student/courses')}><BookOpen size={16} /> Explore modules</button></header>
    <section className="liv-hero-card"><div><span className="liv-eyebrow">Your library</span><h2>{courses.length ? `${activeCourses.length} module${activeCourses.length === 1 ? '' : 's'} ready when you are.` : 'Your next chapter starts here.'}</h2><p>{courses.length ? 'Continue a module below or explore the library for your next focused session.' : 'Once you join a module, your real progress and next steps will appear here.'}</p><button className="liv-button liv-button-green" style={{ marginTop: 20 }} onClick={() => navigate('/student/courses')}>{courses.length ? 'Continue learning' : 'Browse modules'} <ArrowUpRight size={15} /></button></div><div style={{ display:'grid', placeItems:'center', minWidth:90 }}><Flame size={58} color="var(--liv-green)" fill="var(--liv-green)" /></div></section>
    <ActivitySummaryCard />
    <div className="liv-grid-4" style={{ marginTop: 14 }}>{stats.map(([label, value, note, Icon]) => <div className="liv-card liv-stat" key={label}><div className="liv-stat-top"><span>{label}</span><span className="liv-stat-icon"><Icon size={16} /></span></div><strong className="liv-stat-value">{value}</strong><span className="liv-stat-note">{note}</span></div>)}</div>
    <div className="liv-section-head"><h2>Continue learning</h2><button onClick={() => navigate('/student/courses')}>My library <ChevronRight size={14} style={{ verticalAlign:'-3px' }} /></button></div>
    {loading ? <div className="liv-card">Loading your modules…</div> : error ? <div className="liv-card">We could not load your modules right now. Please try again shortly.</div> : activeCourses.length === 0 ? <div className="liv-card"><div style={{ display:'flex', alignItems:'center', gap:12 }}><span className="liv-row-icon"><BookOpen size={17} /></span><div><h3 style={{ margin:0, fontSize:15 }}>No active modules yet</h3><p style={{ margin:'4px 0 0', color:'var(--liv-muted)', fontSize:11 }}>Explore the module library to find your next learning path.</p></div><button className="liv-button liv-button-light" style={{ marginLeft:'auto' }} onClick={() => navigate('/student/courses')}>Browse <ArrowUpRight size={14} /></button></div></div> : <div className="liv-grid-2">{activeCourses.slice(0, 4).map(course => { const progress = course.progress ?? 0; return <article className="liv-card" key={course.id}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><span className="liv-chip">In progress</span><button className="liv-button liv-button-green" style={{ width:38, height:38, padding:0, justifyContent:'center' }} aria-label={`Open ${course.title}`} onClick={() => navigate(`/courses/${course.id}`)}><Play size={15} fill="currentColor" /></button></div><h3 style={{ fontFamily:'Space Grotesk', fontSize:20, letterSpacing:'-.05em', margin:'21px 0 7px' }}>{course.title}</h3><p style={{ color:'var(--liv-muted)', fontSize:12, margin:0 }}>{course.description || `${course.instructor || 'Your educator'} · ${course.students || 0} learners`}</p><div style={{ marginTop:22 }}><div className="liv-inline-label"><span>{progress}% complete</span><strong>Next up</strong></div><div className="liv-progress"><span style={{ width:`${progress}%`, background: progress > 70 ? 'var(--liv-green)' : 'var(--liv-purple)' }} /></div></div></article>; })}</div>}
    <div className="liv-section-head"><h2>Teams & community</h2><button onClick={() => navigate('/features/liv-teams')}>Open Liv Teams</button></div>
    <div className="liv-card" style={{ display:'flex', alignItems:'center', gap:14 }}><span className="liv-row-icon" style={{ width:42, height:42, background:'#ece7ff', display:'grid', placeItems:'center', borderRadius:13 }}><Users size={18} /></span><div><h3 style={{ margin:0, fontSize:14 }}>Build with your community</h3><p style={{ margin:'4px 0 0', color:'var(--liv-muted)', fontSize:11 }}>Join a team to turn learning into shared momentum.</p></div><button className="liv-button liv-button-light" style={{ marginLeft:'auto' }} onClick={() => navigate('/features/liv-teams')}>View <ChevronRight size={14} /></button></div>
  </div>;
}
