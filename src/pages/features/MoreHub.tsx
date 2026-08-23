import { ArrowUpRight, BookOpen, CalendarDays, FileText, HeartHandshake, MessageCircle, Settings, ShoppingBag, Sparkles, Users, UserRound, BriefcaseBusiness } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const items = [
  { title: 'Modules', description: 'Learn, teach, and revisit structured learning paths.', path: '/student/courses', educatorPath: '/teacher/courses', icon: BookOpen, tone: 'lavender' },
  { title: 'Workhub', description: 'Build modules, manage projects, and grow your practice.', path: '/features/tearn', icon: BriefcaseBusiness, tone: 'lime' },
  { title: 'Liv Teams', description: 'Coordinate people, projects, and shared momentum.', path: '/features/liv-teams', icon: Users, tone: 'teal' },
  { title: 'Liv Fund', description: 'Discover and support community-led opportunities.', path: '/features/liv-fund', icon: HeartHandshake, tone: 'peach' },
  { title: 'Liv Mart', description: 'Find useful products, services, and creator offers.', path: '/features/liv-mart', icon: ShoppingBag, tone: 'orange' },
  { title: 'Hanna AI', description: 'Ask a secure, contextual study assistant for help.', path: '/features/hanna-ai', icon: Sparkles, tone: 'dark' },
  { title: 'Documents', description: 'Create, organize, and share your working documents.', path: '/dashboard/documents', icon: FileText, tone: 'soft' },
  { title: 'Chat', description: 'Keep conversations and collaboration in one place.', path: '/chat', icon: MessageCircle, tone: 'soft' },
  { title: 'Calendar', description: 'Stay ahead of lessons, events, and deadlines.', path: '/calendar', icon: CalendarDays, tone: 'soft' },
  { title: 'Profile', description: 'Update your identity, preferences, and account details.', path: '/profile', icon: UserRound, tone: 'soft' },
  { title: 'Settings', description: 'Manage appearance, notifications, privacy, and security.', path: '/settings', icon: Settings, tone: 'soft' },
];

export default function MoreHub() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  return <div className="liv-page">
    <header className="liv-page-header"><div><span className="liv-eyebrow">Liverton ecosystem</span><h1 className="liv-title">More, made useful.</h1><p className="liv-subtitle">A calm home for every part of your learning, work, community, and account experience.</p></div><button className="liv-button liv-button-green" onClick={() => navigate('/features/hanna-ai')}><Sparkles size={16} /> Ask Hanna</button></header>
    <section className="liv-hero-card"><div><span className="liv-eyebrow">One platform, many paths</span><h2>Move from learning to doing without losing your flow.</h2><p>Everything here is connected to the same account and the same responsive workspace.</p></div><div style={{ display:'grid', placeItems:'center', minWidth:90 }}><Users size={58} color="var(--liv-green)" /></div></section>
    <div className="liv-section-head"><h2>Explore Liverton</h2><span className="liv-eyebrow">Choose your next move</span></div>
    <div className="liv-grid-3">{items.map(({ title, description, path, educatorPath, icon: Icon, tone }) => <button key={title} className={`liv-card liv-more-card liv-accent-${tone === 'lavender' ? 'lavender' : tone === 'lime' ? 'teal' : tone === 'teal' ? 'teal' : tone === 'peach' || tone === 'orange' ? 'peach' : 'soft'}`} onClick={() => navigate(userRole === 'teacher' && educatorPath ? educatorPath : path)} style={{ textAlign:'left' }}><span className="liv-row-icon"><Icon size={18} /></span><h3 style={{ margin:'18px 0 7px', fontFamily:'Space Grotesk', fontSize:18 }}>{title}</h3><p style={{ margin:0, color:'var(--liv-muted)', fontSize:12, lineHeight:1.5 }}>{description}</p><span style={{ display:'flex', alignItems:'center', gap:5, marginTop:18, fontSize:11, fontWeight:700 }}>Open <ArrowUpRight size={14} /></span></button>)}</div>
  </div>;
}
