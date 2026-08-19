import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Filter,
  GraduationCap,
  LayoutGrid,
  Library,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type Role = 'Student' | 'Educator' | 'Parent' | 'Organization'
type Page = 'Overview' | 'Modules' | 'Teams' | 'Marketplace' | 'Insights' | 'Settings'
type RoleCopy = { eyebrow: string; title: string; subtitle: string; action: string }

type Module = {
  title: string
  category: string
  description: string
  progress: number
  lessons: number
  color: string
  accent: string
  status: string
}

const roleCopy: Record<Role, { eyebrow: string; title: string; subtitle: string; action: string }> = {
  Student: {
    eyebrow: 'Good morning, Alex',
    title: 'Keep learning,\nkeep growing.',
    subtitle: 'Your next small step is already waiting for you.',
    action: 'Explore modules',
  },
  Educator: {
    eyebrow: 'Good morning, Maya',
    title: 'Build learning\nthat moves people.',
    subtitle: 'Create, collaborate, and understand your learners at a glance.',
    action: 'Create a module',
  },
  Parent: {
    eyebrow: 'Welcome back, Jordan',
    title: 'Support their\nnext big step.',
    subtitle: 'Stay close to progress without getting in the way.',
    action: 'View learner progress',
  },
  Organization: {
    eyebrow: 'Welcome back, Northstar',
    title: 'Make learning\nwork at scale.',
    subtitle: 'Bring your teams, resources, and outcomes into one place.',
    action: 'Manage workspace',
  },
}

const modules: Module[] = [
  { title: 'Design thinking for real life', category: 'Creative practice', description: 'A practical sprint for turning messy ideas into meaningful solutions.', progress: 68, lessons: 8, color: '#f3e8ff', accent: '#8b5cf6', status: 'In progress' },
  { title: 'The confident communicator', category: 'Professional skills', description: 'Find your voice, tell better stories, and lead with clarity.', progress: 32, lessons: 6, color: '#dff7ef', accent: '#0d9488', status: 'In progress' },
  { title: 'Money, made simple', category: 'Life skills', description: 'Build a calmer relationship with money through everyday habits.', progress: 0, lessons: 10, color: '#fff0d6', accent: '#ea8b18', status: 'New module' },
]

const navItems: { label: Page; icon: typeof LayoutGrid }[] = [
  { label: 'Overview', icon: LayoutGrid },
  { label: 'Modules', icon: BookOpen },
  { label: 'Teams', icon: Users },
  { label: 'Marketplace', icon: BriefcaseBusiness },
  { label: 'Insights', icon: BarChart3 },
]

function App() {
  const [role, setRole] = useState<Role>('Student')
  const [page, setPage] = useState<Page>('Overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<string[]>([])

  const copy = roleCopy[role]
  const filteredModules = useMemo(() => modules.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [query])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  function go(next: Page) {
    setPage(next)
    setSidebarOpen(false)
  }

  function toggleSaved(title: string) {
    setSaved((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title])
    notify(saved.includes(title) ? 'Removed from your library' : 'Saved to your library')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark">L</div>
          <span>Learn<span className="brand-dot">.</span></span>
          <button className="icon-button close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-card">
          <div className="avatar avatar-purple">AM</div>
          <div><strong>{role === 'Organization' ? 'Northstar' : role === 'Educator' ? 'Maya Okafor' : role === 'Parent' ? 'Jordan Smith' : 'Alex Morgan'}</strong><small>{role} workspace</small></div>
          <ChevronDown size={16} className="muted" />
        </div>
        <div className="side-label">Workspace</div>
        <nav className="side-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={page === label ? 'active' : ''} onClick={() => go(label)}><Icon size={19} /><span>{label}</span>{label === 'Teams' && <span className="nav-badge">3</span>}</button>)}</nav>
        <div className="side-label side-label-bottom">Manage</div>
        <nav className="side-nav"><button className={page === 'Settings' ? 'active' : ''} onClick={() => go('Settings')}><Settings size={19} /><span>Settings</span></button><button onClick={() => notify('Help center opened')}><CircleHelp size={19} /><span>Help center</span></button></nav>
        <div className="sidebar-bottom"><div className="upgrade-card"><Sparkles size={18} /><strong>Unlock more with Pro</strong><span>Advanced insights, live cohorts, and more.</span><button onClick={() => notify('Pro trial started — welcome aboard!')}>Try Pro for free <ArrowRight size={14} /></button></div><div className="user-row"><div className="avatar avatar-photo">AM</div><div><strong>Alex Morgan</strong><small>alex@learn.co</small></div><MoreHorizontal size={18} className="muted" /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{page}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => notify('Share link copied to clipboard')} aria-label="Share workspace"><Share2 size={18} /></button><button className="icon-button notification" onClick={() => notify('You are all caught up')} aria-label="Notifications"><Bell size={18} /><i /></button><button className="profile-trigger" onClick={() => setShowRoleMenu(!showRoleMenu)}><div className="avatar avatar-photo">AM</div><ChevronDown size={15} /></button></div>{showRoleMenu && <div className="role-menu"><span>Preview workspace as</span>{(['Student', 'Educator', 'Parent', 'Organization'] as Role[]).map((item) => <button key={item} onClick={() => { setRole(item); setShowRoleMenu(false); notify(`${item} workspace selected`) }}>{item}{role === item && <Check size={15} />}</button>)}</div>}</header>

        {page === 'Overview' && <Overview copy={copy} role={role} onAction={() => role === 'Educator' ? setShowCreate(true) : go('Modules')} onNotify={notify} />}
        {page === 'Modules' && <ModulesPage modules={filteredModules} query={query} setQuery={setQuery} saved={saved} toggleSaved={toggleSaved} onCreate={() => setShowCreate(true)} />}
        {page === 'Teams' && <TeamsPage onNotify={notify} />}
        {page === 'Marketplace' && <MarketplacePage onNotify={notify} />}
        {page === 'Insights' && <InsightsPage />}
        {page === 'Settings' && <SettingsPage onNotify={notify} />}

        <footer className="mobile-nav">{navItems.slice(0, 4).map(({ label, icon: Icon }) => <button key={label} className={page === label ? 'active' : ''} onClick={() => go(label)}><Icon size={20} /><span>{label === 'Overview' ? 'Home' : label}</span></button>)}<button className={page === 'Settings' ? 'active' : ''} onClick={() => go('Settings')}><Menu size={20} /><span>More</span></button></footer>
      </main>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={() => { setShowCreate(false); notify('Your new module is ready to edit') }} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

function Overview({ copy, role, onAction, onNotify }: { copy: RoleCopy; role: Role; onAction: () => void; onNotify: (m: string) => void }) {
  return <div className="page-wrap"><section className="hero-grid"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" /> {copy.eyebrow}</span><h1>{copy.title.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</h1><p>{copy.subtitle}</p><div className="hero-actions"><button className="primary-button" onClick={onAction}>{copy.action}<ArrowRight size={17} /></button><button className="ghost-button" onClick={() => onNotify('Welcome to the Learn tour')}><Sparkles size={16} /> Take a tour</button></div></div><div className="hero-art"><div className="art-note note-one"><Target size={17} /><span><strong>+24%</strong><small>weekly growth</small></span></div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-core"><GraduationCap size={44} /><span>Learn<br /><em>with purpose.</em></span></div><div className="art-note note-two"><Clock3 size={17} /><span><strong>12 min</strong><small>daily focus</small></span></div></div></section><section className="section-heading"><div><span className="section-kicker">Your learning space</span><h2>Pick up where you left off</h2></div><button className="text-button" onClick={onAction}>View all <ArrowRight size={16} /></button></section><div className="module-grid">{modules.map((item) => <ModuleCard key={item.title} item={item} onClick={onAction} />)}</div><section className="lower-grid"><div className="panel activity-panel"><div className="panel-heading"><div><span className="section-kicker">This week</span><h3>Learning activity</h3></div><button className="icon-button" onClick={() => onNotify('Activity details opened')}><MoreHorizontal size={18} /></button></div><div className="activity-bars"><div style={{ height: '44%' }} /><div style={{ height: '68%' }} /><div style={{ height: '35%' }} /><div style={{ height: '82%' }} /><div style={{ height: '58%' }} /><div style={{ height: '95%' }} /><div style={{ height: '72%' }} /></div><div className="days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div><div className="panel quick-panel"><div className="panel-heading"><div><span className="section-kicker">Your snapshot</span><h3>Small wins add up</h3></div><Zap size={21} className="yellow-icon" /></div><div className="stat-row"><div><strong>6</strong><span>lessons done</span></div><div><strong>84%</strong><span>focus score</span></div></div><div className="progress-line"><span style={{ width: '72%' }} /></div><p>You're 2 lessons away from your weekly goal.</p><button className="dark-button" onClick={() => onNotify(`${role} goal updated`)}>Update my goal <ArrowRight size={15} /></button></div></section></div>
}

function ModuleCard({ item, onClick }: { item: Module; onClick: () => void }) { return <article className="module-card" onClick={onClick}><div className="module-visual" style={{ background: item.color }}><div className="visual-shape" style={{ background: item.accent }}><BookOpen size={26} /></div><span className="module-status">{item.status}</span><button className="card-more" onClick={(event) => event.stopPropagation()}><MoreHorizontal size={16} /></button></div><div className="module-body"><span className="category">{item.category}</span><h3>{item.title}</h3><p>{item.description}</p><div className="module-meta"><span>{item.lessons} lessons</span><span>{item.progress}% complete</span></div><div className="progress-line"><span style={{ width: `${Math.max(item.progress, 4)}%`, background: item.accent }} /></div></div></article> }

function ModulesPage({ modules, query, setQuery, saved, toggleSaved, onCreate }: { modules: Module[]; query: string; setQuery: (v: string) => void; saved: string[]; toggleSaved: (t: string) => void; onCreate: () => void }) { return <div className="page-wrap"><div className="page-title-row"><div><span className="section-kicker">The library</span><h1>Modules</h1><p>Curated paths for the things you want to get better at.</p></div><button className="primary-button" onClick={onCreate}><Plus size={17} /> Create module</button></div><div className="toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules" /></div><button className="filter-button"><Filter size={16} /> All categories <ChevronDown size={15} /></button></div><div className="module-grid modules-page-grid">{modules.map((item) => <article className="module-card" key={item.title}><div className="module-visual" style={{ background: item.color }}><div className="visual-shape" style={{ background: item.accent }}><BookOpen size={26} /></div><span className="module-status">{item.status}</span></div><div className="module-body"><div className="card-title-row"><span className="category">{item.category}</span><button className={`save-button ${saved.includes(item.title) ? 'saved' : ''}`} onClick={() => toggleSaved(item.title)}>{saved.includes(item.title) ? 'Saved' : 'Save'}</button></div><h3>{item.title}</h3><p>{item.description}</p><div className="module-meta"><span>{item.lessons} lessons</span><span>{item.progress}% complete</span></div><div className="progress-line"><span style={{ width: `${Math.max(item.progress, 4)}%`, background: item.accent }} /></div></div></article>)}</div></div> }

function TeamsPage({ onNotify }: { onNotify: (m: string) => void }) { return <div className="page-wrap"><div className="page-title-row"><div><span className="section-kicker">Live collaboration</span><h1>Teams</h1><p>Build better outcomes together, one focused project at a time.</p></div><button className="primary-button" onClick={() => onNotify('Invite link copied')}><Plus size={17} /> Invite someone</button></div><div className="team-grid"><div className="panel team-main"><div className="panel-heading"><div><span className="section-kicker">Active spaces</span><h3>Your project rooms</h3></div><button className="text-button" onClick={() => onNotify('All teams loaded')}>See all <ArrowRight size={15} /></button></div>{['Community garden research', 'The climate classroom', 'Portfolio review circle'].map((name, i) => <div className="team-row" key={name}><div className={`team-icon team-${i + 1}`}><Users size={18} /></div><div><strong>{name}</strong><span>{i + 3} collaborators · Updated {i + 1}h ago</span></div><div className="member-stack"><i>AM</i><i>JK</i><i>+{i + 2}</i></div><ArrowRight size={17} className="muted" /></div>)}</div><div className="panel invite-panel"><div className="invite-orb"><Sparkles size={26} /></div><span className="section-kicker">Liv teams</span><h3>Make room for good ideas.</h3><p>Share notes, assign next steps, and keep every project moving.</p><button className="dark-button" onClick={() => onNotify('New team created')}>Start a new team <ArrowRight size={15} /></button></div></div></div> }

function MarketplacePage({ onNotify }: { onNotify: (m: string) => void }) { return <div className="page-wrap"><div className="page-title-row"><div><span className="section-kicker">Learn marketplace</span><h1>Make & match</h1><p>Find useful resources, projects, and people worth learning from.</p></div><button className="primary-button" onClick={() => onNotify('Seller tools opened')}><BriefcaseBusiness size={17} /> Sell a resource</button></div><div className="market-hero"><div><span className="market-pill">LivMart / Featured</span><h2>Learning is better<br />when it travels.</h2><p>Discover thoughtful resources made by educators and organizations in the Learn community.</p><button className="light-button" onClick={() => onNotify('Exploring featured resources')}>Explore featured <ArrowRight size={15} /></button></div><div className="market-shapes"><div /><div /><div /></div></div><div className="market-grid">{['Field notes for curious minds', 'The classroom toolkit', 'Build your first workshop'].map((title, i) => <div className="market-card" key={title}><div className={`market-image market-image-${i + 1}`}><span>{['01', '02', '03'][i]}</span></div><span className="category">{['Workbook', 'Resource pack', 'Workshop'][i]}</span><h3>{title}</h3><div className="market-price">{i === 0 ? 'Free' : `$${12 + i * 8}.00`} <span>→</span></div></div>)}</div></div> }

function InsightsPage() { return <div className="page-wrap"><div className="page-title-row"><div><span className="section-kicker">A clearer view</span><h1>Insights</h1><p>See how your learning rhythm is building over time.</p></div><button className="outline-button">Last 7 days <ChevronDown size={15} /></button></div><div className="insight-stats"><div className="insight-stat"><span className="stat-icon purple"><BookOpen size={18} /></span><strong>12</strong><small>Lessons completed</small><em>+18% this week</em></div><div className="insight-stat"><span className="stat-icon green"><Clock3 size={18} /></span><strong>4h 32m</strong><small>Time invested</small><em>+42m this week</em></div><div className="insight-stat"><span className="stat-icon orange"><Target size={18} /></span><strong>84%</strong><small>Focus score</small><em>You're on a roll</em></div></div><div className="panel chart-panel"><div className="panel-heading"><div><span className="section-kicker">Consistency</span><h3>Your learning activity</h3></div><div className="chart-legend"><i /> Minutes learned</div></div><div className="chart"><div className="chart-grid"><span /><span /><span /><span /></div><svg viewBox="0 0 700 230" preserveAspectRatio="none"><path d="M0 185 C80 180 75 125 145 145 S215 180 270 118 S350 135 410 92 S475 130 530 65 S615 83 700 26" fill="none" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" /><path d="M0 185 C80 180 75 125 145 145 S215 180 270 118 S350 135 410 92 S475 130 530 65 S615 83 700 26 V230 H0 Z" fill="url(#fade)" opacity=".45" /><defs><linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs></svg></div><div className="chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div> }

function SettingsPage({ onNotify }: { onNotify: (m: string) => void }) { return <div className="page-wrap narrow-page"><div className="page-title-row"><div><span className="section-kicker">Your workspace</span><h1>Settings</h1><p>Make Learn feel like yours.</p></div></div><div className="settings-list"><div className="settings-group"><span className="settings-label">Account</span><button><div className="settings-icon"><Users size={18} /></div><span><strong>Profile & account</strong><small>Alex Morgan · alex@learn.co</small></span><ArrowRight size={17} /></button><button><div className="settings-icon"><Bell size={18} /></div><span><strong>Notifications</strong><small>Weekly digest, team updates</small></span><ArrowRight size={17} /></button></div><div className="settings-group"><span className="settings-label">Preferences</span><button><div className="settings-icon"><Sparkles size={18} /></div><span><strong>Appearance</strong><small>Light · Calm violet</small></span><ArrowRight size={17} /></button><button><div className="settings-icon"><Library size={18} /></div><span><strong>Saved library</strong><small>12 resources saved</small></span><ArrowRight size={17} /></button></div><button className="logout-button" onClick={() => onNotify('You are safely signed out in this demo')}>Log out</button></div></div> }

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) { return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-heading"><div><span className="section-kicker">New workspace asset</span><h2>Create a module</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><label>Module name<input placeholder="e.g. Introduction to creative thinking" /></label><label>Description<textarea placeholder="What will learners take away?" rows={4} /></label><div className="modal-row"><label>Format<select><option>Course module</option><option>Workshop</option><option>Short series</option></select></label><label>Visibility<select><option>Only me</option><option>My workspace</option><option>Public</option></select></label></div><button className="primary-button full-button" onClick={onCreate}>Create module <ArrowRight size={16} /></button></div></div> }

export default App
export { App }
