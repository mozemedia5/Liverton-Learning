import { useNavigate } from 'react-router-dom';
import type { ElementType } from 'react';
import { ArrowUpRight, BarChart3, BookOpen, CheckCircle2, ChevronRight, Clock3, FilePlus2, MessageCircle, PlaySquare, Plus, Sparkles, Star, Users, Video, WalletCards } from 'lucide-react';

const modules = [
  { title: 'Design thinking for young creators', meta: '8 lessons · 24 learners', rating: '4.9', progress: 78, tone: 'mint' },
  { title: 'Everyday financial literacy', meta: '6 lessons · 18 learners', rating: '4.8', progress: 54, tone: 'lavender' },
  { title: 'Build your first portfolio', meta: '10 lessons · 31 learners', rating: '4.7', progress: 34, tone: 'peach' },
];

const statCards: Array<[string, string, string, ElementType]> = [['Published modules','12','+3 this month',BookOpen],['Active learners','248','+18% this week',Users],['Average rating','4.8 / 5','Across your library',Star],['Earnings','KSh 84,600','Ready to withdraw',WalletCards]];
const learnerPulse: Array<[string, string, string, ElementType]> = [['Maya Wanjiru','Completed lesson 5 · 12 min ago','92%',BarChart3],['Liam Otieno','Needs a nudge on the quiz','68%',Clock3],['Nia Kamau','Joined your new module','New',MessageCircle]];

const quickActions = [
  { label: 'Lesson', icon: BookOpen, path: '/teacher/courses/create' },
  { label: 'Quiz', icon: CheckCircle2, path: '/teacher/quizzes/create' },
  { label: 'Short video', icon: PlaySquare, path: '/features/tearn/shorts' },
  { label: 'Assignment', icon: FilePlus2, path: '/teacher/courses/create' },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  return <div className="liv-page">
    <header className="liv-page-header"><div><span className="liv-eyebrow">Educator studio · Tuesday, 19 August</span><h1 className="liv-title">Good morning, Alex.</h1><p className="liv-subtitle">Your teaching workspace is ready. Keep your learners moving with one clear next step.</p></div><button className="liv-button liv-button-green" onClick={() => navigate('/teacher/courses/create')}><Plus size={16} /> Create module</button></header>

    <section className="liv-hero-card"><div><span className="liv-eyebrow">This week in your studio</span><h2>Turn your best ideas into learning people remember.</h2><p>Create structured modules, invite co-creators, and publish lessons with outcomes your learners can see.</p><div style={{ display:'flex', gap:8, marginTop:20 }}><button className="liv-button liv-button-green" onClick={() => navigate('/teacher/courses/create')}>Start a module <ArrowUpRight size={15} /></button><button className="liv-button liv-button-light" onClick={() => navigate('/features/liv-teams')}><Users size={15} /> Invite a creator</button></div></div></section>

    <div className="liv-grid-4" style={{ marginTop:14 }}>
      {statCards.map(([label,value,note,Icon]) => <div className="liv-card liv-stat" key={String(label)}><div className="liv-stat-top"><span>{label}</span><span className="liv-stat-icon"><Icon size={16} /></span></div><strong className="liv-stat-value">{value}</strong><span className="liv-stat-note">{note}</span></div>)}
    </div>

    <div className="liv-section-head"><h2>Quick create</h2><span className="liv-eyebrow">Build in small steps</span></div>
    <div className="liv-chip-row">{quickActions.map(({ label, icon: Icon, path }) => <button key={label} className="liv-chip" onClick={() => navigate(path)}><Icon size={14} style={{ verticalAlign:'-3px', marginRight:6 }} />{label}</button>)}</div>

    <div className="liv-section-head"><h2>Your modules</h2><button onClick={() => navigate('/teacher/courses')}>View library <ChevronRight size={14} style={{ verticalAlign:'-3px' }} /></button></div>
    <div className="liv-grid-3">{modules.map((module) => <article className="liv-card" key={module.title}><div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}><span className="liv-chip is-selected">Published</span><button style={{ border:0, background:'transparent', color:'#8b908a' }} aria-label="More module options">•••</button></div><h3 style={{ fontFamily:'Space Grotesk', fontSize:18, letterSpacing:'-.04em', lineHeight:1.08, margin:'19px 0 7px' }}>{module.title}</h3><p style={{ color:'var(--liv-muted)', fontSize:11, margin:0 }}>{module.meta}</p><div style={{ display:'flex', alignItems:'center', gap:5, margin:'15px 0 20px' }}><Star size={13} fill="#b87819" color="#b87819" /><span style={{ fontSize:12, fontWeight:700 }}>{module.rating}</span><span style={{ color:'#9ba097', fontSize:11 }}>learner rating</span></div><div className="liv-inline-label"><span>Learning activity</span><strong>{module.progress}%</strong></div><div className="liv-progress"><span style={{ width:`${module.progress}%`, background: module.tone === 'mint' ? 'var(--liv-green)' : module.tone === 'lavender' ? 'var(--liv-purple)' : '#ffae7d' }} /></div><button className="liv-button liv-button-light" style={{ marginTop:18, width:'100%', justifyContent:'center' }} onClick={() => navigate('/teacher/courses')}>Open module <ArrowUpRight size={14} /></button></article>)}</div>

    <div className="liv-grid-2" style={{ marginTop:14 }}><section className="liv-card"><div className="liv-section-head" style={{ marginTop:0 }}><h2>Learner pulse</h2><button onClick={() => navigate('/teacher/students')}>See all</button></div><div className="liv-list">{learnerPulse.map(([name,meta,stat,Icon]) => <div className="liv-list-row" key={String(name)}><span className="liv-row-icon"><Icon size={17} /></span><div><h3>{name}</h3><p>{meta}</p></div><span className="liv-row-end">{stat}</span></div>)}</div></section><section className="liv-card"><div className="liv-section-head" style={{ marginTop:0 }}><h2>Collaboration desk</h2><button onClick={() => navigate('/features/liv-teams')}>Open Teams</button></div><div className="liv-list"><div className="liv-list-row"><span className="liv-row-icon"><Video size={17} /></span><div><h3>Record a 60-second explainer</h3><p>Shorts Arena · due Friday</p></div><span className="liv-row-end"><Sparkles size={15} /></span></div><div className="liv-list-row"><span className="liv-row-icon"><Users size={17} /></span><div><h3>Invite Brian to co-create</h3><p>Portfolio module · pending</p></div><span className="liv-row-end"><ChevronRight size={16} /></span></div><div className="liv-list-row"><span className="liv-row-icon"><WalletCards size={17} /></span><div><h3>New Live Mart payout</h3><p>Your completed project is listed</p></div><span className="liv-row-end">KSh 12k</span></div></div></section></div>
  </div>;
}
