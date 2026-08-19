import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  X,
} from 'lucide-react';

type Role = 'student' | 'teacher' | 'parent' | 'organization';

const roleContent: Record<Role, {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  avatar: string;
  stats: [string, string][];
}> = {
  student: {
    label: 'Students',
    eyebrow: 'Your learning space',
    title: 'Learn in a way that feels like you.',
    description: 'Discover modules, build your streak, join teams, and keep every lesson in one calm workspace.',
    accent: '#c9f36b',
    avatar: 'AM',
    stats: [['12', 'modules in progress'], ['84%', 'average score']],
  },
  teacher: {
    label: 'Educators',
    eyebrow: 'Your creator workspace',
    title: 'Turn your expertise into momentum.',
    description: 'Create rich modules, invite collaborators, assess learners, and publish work that people want to return to.',
    accent: '#bca7ff',
    avatar: 'JD',
    stats: [['24', 'active learners'], ['4.9', 'module rating']],
  },
  parent: {
    label: 'Parents',
    eyebrow: 'Your family dashboard',
    title: 'See the whole learning journey.',
    description: 'Monitor progress, celebrate milestones, and stay connected to the people helping your learner grow.',
    accent: '#ffbf8a',
    avatar: 'SK',
    stats: [['3', 'learners connected'], ['92%', 'weekly engagement']],
  },
  organization: {
    label: 'Organizations',
    eyebrow: 'Your organization hub',
    title: 'Build programs that move people forward.',
    description: 'Coordinate teams, fund projects, manage learning programs, and bring your community into one platform.',
    accent: '#8de5dc',
    avatar: 'LV',
    stats: [['8', 'programs live'], ['31', 'team members']],
  },
};

const dashboardLinks = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: BookOpen, label: 'Modules' },
  { icon: Users, label: 'Audience' },
  { icon: BarChart3, label: 'Insights' },
  { icon: Menu, label: 'More' },
];

function DashboardPreview({ role }: { role: Role }) {
  const content = roleContent[role];
  return (
    <div className="lp-preview-shell">
      <div className="lp-preview-sidebar">
        <div className="lp-mini-brand"><span className="lp-brand-mark">L</span><span>liverton</span></div>
        <div className="lp-mini-profile"><span className="lp-avatar" style={{ background: content.accent }}>{content.avatar}</span><span><strong>{content.label}</strong><small>Workspace</small></span></div>
        <div className="lp-mini-links">
          {dashboardLinks.map((item, index) => {
            const Icon = item.icon;
            return <div className={`lp-mini-link ${index === 0 ? 'active' : ''}`} key={item.label}><Icon size={16} /><span>{item.label}</span></div>;
          })}
        </div>
        <div className="lp-mini-fund"><CircleDollarSign size={18} /><strong>Live Fund</strong><small>Go get funded</small><span className="lp-fund-arrow">↗</span></div>
      </div>
      <div className="lp-preview-main">
        <div className="lp-preview-top"><div><span className="lp-overline">{content.eyebrow}</span><h3>Good morning, Alex <span>✦</span></h3></div><div className="lp-preview-actions"><span className="lp-search"><Search size={15} /> Search</span><span className="lp-notification">2</span><span className="lp-avatar lp-avatar-small">{content.avatar}</span></div></div>
        <div className="lp-hero-banner" style={{ background: `linear-gradient(135deg, ${content.accent}, #ffffff)` }}><div><span className="lp-banner-kicker">{role === 'teacher' ? 'Creator spotlight' : role === 'parent' ? 'Family pulse' : role === 'organization' ? 'Program health' : 'Keep going'}</span><h4>{role === 'teacher' ? 'Your next module is one idea away.' : role === 'parent' ? 'Maya completed 3 lessons this week.' : role === 'organization' ? 'Your learning community is in motion.' : 'Small steps make big progress.'}</h4><button>Open workspace <ArrowRight size={15} /></button></div><div className="lp-banner-orb"><Sparkles size={28} /></div></div>
        <div className="lp-preview-grid">{content.stats.map(([value, label]) => <div className="lp-stat-card" key={label}><strong>{value}</strong><span>{label}</span><div className="lp-stat-line"><i /></div></div>)}<div className="lp-stat-card lp-stat-accent"><Star size={18} fill="currentColor" /><strong>4.8</strong><span>community rating</span></div></div>
        <div className="lp-preview-section"><div className="lp-section-title"><span>Continue building</span><button>View all <ChevronRight size={15} /></button></div><div className="lp-module-row"><div className="lp-module-icon"><ClipboardCheck size={19} /></div><div><strong>{role === 'teacher' ? 'Design an assessment' : 'Creative problem solving'}</strong><small>{role === 'teacher' ? 'Draft · 6 questions · 14 min' : 'Module · 68% complete · 3 lessons left'}</small></div><span className="lp-progress"><i style={{ width: role === 'teacher' ? '44%' : '68%' }} /></span><ChevronRight size={17} /></div></div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('teacher');
  const [menuOpen, setMenuOpen] = useState(false);
  const content = roleContent[role];

  return (
    <div className="lp-page">
      <nav className="lp-nav"><div className="lp-nav-inner"><button className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span className="lp-brand-mark">L</span><span>liverton<span className="lp-logo-dot">.</span></span></button><div className={`lp-nav-links ${menuOpen ? 'open' : ''}`}><a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a><a href="#roles" onClick={() => setMenuOpen(false)}>For teams</a><a href="#stories" onClick={() => setMenuOpen(false)}>Stories</a><button className="lp-nav-login" onClick={() => navigate('/login')}>Log in</button><button className="lp-button lp-button-dark lp-nav-cta" onClick={() => navigate('/get-started')}>Get started <ArrowRight size={16} /></button></div><button className="lp-menu-button" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div></nav>
      <main>
        <section className="lp-hero" id="platform"><div className="lp-hero-copy"><div className="lp-pill"><span>✦</span> One home for every learning journey</div><h1>Make room for<br /><em>what’s next.</em></h1><p>Liverton brings learning, collaboration, funding, and opportunity into one beautifully simple workspace.</p><div className="lp-hero-actions"><button className="lp-button lp-button-dark" onClick={() => navigate('/get-started')}>Start your journey <ArrowRight size={17} /></button><button className="lp-button lp-button-quiet" onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}><Play size={16} fill="currentColor" /> See how it works</button></div><div className="lp-proof"><div className="lp-proof-avatars"><span>AM</span><span>JD</span><span>SK</span><span>LV</span></div><div><div className="lp-stars">★★★★★</div><small>Loved by learners, educators & teams</small></div></div></div><div className="lp-hero-art"><div className="lp-art-ring lp-art-ring-one" /><div className="lp-art-ring lp-art-ring-two" /><div className="lp-art-card lp-art-card-main"><span className="lp-art-label">LIVE NOW</span><strong>Build your<br /><span>brightest</span> future.</strong><div className="lp-art-footer"><span>liverton learning</span><span>↗</span></div></div><div className="lp-art-card lp-art-card-small lp-art-card-top"><Sparkles size={17} /><strong>7 day<br />streak</strong></div><div className="lp-art-card lp-art-card-small lp-art-card-bottom"><Heart size={16} fill="currentColor" /><strong>4.9<br /><small>module rating</small></strong></div></div></section>
        <section className="lp-role-strip" id="roles"><div className="lp-role-heading"><span className="lp-overline">A space for every perspective</span><h2>Choose your<br /><em>point of view.</em></h2></div><div className="lp-role-tabs">{(Object.keys(roleContent) as Role[]).map((item) => <button key={item} className={role === item ? 'active' : ''} onClick={() => setRole(item)}><span className="lp-role-icon">{item === 'teacher' ? <GraduationCap size={17} /> : item === 'student' ? <BookOpen size={17} /> : item === 'parent' ? <Heart size={17} /> : <ShieldCheck size={17} />}</span>{roleContent[item].label}<span className="lp-tab-arrow">↗</span></button>)}</div></section>
        <section className="lp-dashboard-section" id="preview"><div className="lp-dashboard-heading"><div><span className="lp-overline" style={{ color: content.accent === '#c9f36b' ? '#5a6f19' : '#6d55c7' }}>{content.eyebrow}</span><h2>{content.title}</h2></div><p>{content.description}</p></div><DashboardPreview role={role} /></section>
        <section className="lp-products" id="stories"><div className="lp-products-heading"><span className="lp-overline">The liverton ecosystem</span><h2>More than modules.<br /><em>A whole world of momentum.</em></h2></div><div className="lp-product-grid"><div className="lp-product-card lp-product-teams"><div className="lp-product-icon"><MessageCircle size={20} /></div><span className="lp-overline">Collaborate</span><h3>Live Teams</h3><p>Chat, plan projects, assign roles, schedule sessions, and keep the whole team moving together.</p><button>Explore teams <ArrowRight size={15} /></button><div className="lp-chat-bubbles"><span>Nice work on the brief!</span><span>Meeting moved to 4:30 ↗</span></div></div><div className="lp-product-card lp-product-fund"><div className="lp-product-icon"><CircleDollarSign size={20} /></div><span className="lp-overline">Grow ideas</span><h3>Live Fund</h3><p>Find support for your next learning project and give ambitious ideas the runway they deserve.</p><button>Go get funded <ArrowRight size={15} /></button><div className="lp-fund-progress"><span><i /></span><small>68% funded · 12 days left</small></div></div><div className="lp-product-card lp-product-mart"><div className="lp-product-icon"><Store size={20} /></div><span className="lp-overline">Share & sell</span><h3>Live Mart</h3><p>Turn completed projects, school essentials, and creator resources into new opportunities.</p><button>Visit the mart <ArrowRight size={15} /></button><div className="lp-mart-products"><span>Lesson kit</span><span>Project guide</span><span>+12 more</span></div></div></div></section>
      </main>
      <footer className="lp-footer"><div className="lp-footer-brand"><span className="lp-brand-mark">L</span><strong>liverton.</strong><span>Learn together. Go further.</span></div><div className="lp-footer-links"><a href="#platform">Platform</a><a href="#roles">For teams</a><a href="#stories">Stories</a><button onClick={() => navigate('/login')}>Log in</button></div><span className="lp-footer-copy">© 2026 Liverton Learning</span></footer>
    </div>
  );
}
