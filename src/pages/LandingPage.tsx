import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  GraduationCap,
  Heart,
  Lightbulb,
  Menu,
  MessageCircle,
  Moon,
  Play,
  Sparkles,
  Store,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AskHannaIcon from '@/components/AskHannaIcon';
import './landing.css';
import './auth.css';

type Role = 'student' | 'educator' | 'organization';

const roleContent: Record<Role, { label: string; title: string; body: string; stat: string; statLabel: string }> = {
  student: {
    label: 'For learners',
    title: 'Find your people. Build your next chapter.',
    body: 'Explore learning paths, join live teams, and turn every small win into momentum you can feel.',
    stat: '84%',
    statLabel: 'average progress this week',
  },
  educator: {
    label: 'For educators',
    title: 'Teach with more room to make an impact.',
    body: 'Create rich modules, bring collaborators in, and give every learner a clearer path forward.',
    stat: '4.9/5',
    statLabel: 'creator satisfaction score',
  },
  organization: {
    label: 'For organizations',
    title: 'Make learning a shared advantage.',
    body: 'Coordinate programs, teams, projects, funding, and opportunity from one calm workspace.',
    stat: '31',
    statLabel: 'active community members',
  },
};

const imageSources = [
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=85',
];

function Logo() {
  return (
    <span className="liverton-logo" aria-label="Liverton">
      <span className="liverton-logo-mark"><img src="/liverton-mark.jpg" alt="" /></span>
      <span className="liverton-logo-wordmark">liverton <span className="liverton-logo-learning">learning</span><span className="liverton-logo-dot">.</span></span>
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState<Role>('student');
  const [showVideo, setShowVideo] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [heroWord, setHeroWord] = useState('future');
  const [heroWordPhase, setHeroWordPhase] = useState<'hold' | 'delete' | 'write'>('hold');
  const heroWords = ['future', 'ideas', 'confidence', 'community', 'impact'];
  const content = roleContent[role];

  useEffect(() => {
    let wordIndex = 0;
    let cycleTimer: number | undefined;
    const cycle = () => {
      setHeroWordPhase('delete');
      window.setTimeout(() => {
        wordIndex = (wordIndex + 1) % heroWords.length;
        setHeroWord(heroWords[wordIndex]);
        setHeroWordPhase('write');
      }, 360);
      cycleTimer = window.setTimeout(() => {
        setHeroWordPhase('hold');
        cycle();
      }, 3200);
    };
    cycleTimer = window.setTimeout(cycle, 2600);
    return () => { if (cycleTimer) window.clearTimeout(cycleTimer); };
  }, []);

  useEffect(() => {
    document.title = 'Liverton — Learn together. Go further.';
  }, []);

  const go = (path: string) => {
    setMenuOpen(false);
    if (!isAuthenticated && path.startsWith('/features')) {
      navigate('/login', { state: { from: path } });
      return;
    }
    navigate(path);
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="liverton-home">
      <nav className="home-nav">
        <button className="home-brand" onClick={() => scrollTo('top')}><Logo /></button>
        <div className={`home-nav-links ${menuOpen ? 'is-open' : ''}`}>
          <button onClick={() => scrollTo('why-liverton')}>Why Liverton</button>
          <button onClick={() => scrollTo('ecosystem')}>Explore</button>
          <button onClick={() => scrollTo('stories')}>Stories</button>
          <button className="nav-theme" onClick={toggleTheme} aria-pressed={theme === 'dark'} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="nav-login" onClick={() => navigate('/login')}>Log in</button>
          <button className="nav-cta" onClick={() => navigate('/get-started')}>Get started <ArrowRight size={16} /></button>
        </div>
        <button className="nav-menu" aria-label="Open navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
      </nav>

      <main id="top">
        <section className="home-hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-spark">✦</span> One home for every learning journey</div>
            <h1>Make room for<br /><em className={`hero-word hero-word-${heroWordPhase}`}>{heroWord}.</em></h1>
            <p className="hero-lede">Liverton brings learning, collaboration, funding, and opportunity into one beautifully simple workspace.</p>
            <div className="hero-actions">
              <button className="primary-cta" onClick={() => navigate('/get-started')}>Start your journey <ArrowRight size={18} /></button>
              <button className="secondary-cta" onClick={() => setShowVideo(true)}><span className="play-chip"><Play size={13} fill="currentColor" /></span> Watch the story</button>
            </div>
            <div className="hero-proof"><div className="proof-avatars"><span>AM</span><span>JD</span><span>SK</span><span>LV</span></div><div><div className="proof-stars">★★★★★</div><small>Loved by learners, educators & teams</small></div></div>
          </div>
          <div className="hero-visual" aria-label="Liverton learning community preview">
            <div className="hero-sun" />
            <div className="hero-image-card hero-image-main"><img src={imageSources[0]} alt="Students learning together in a bright classroom" /><div className="image-caption"><span>Learning looks better together.</span><strong>01 / 03</strong></div></div>
            <div className="hero-float-card hero-float-streak"><Sparkles size={16} /><strong>7 day<br />streak</strong><span>Keep going</span></div>
            <div className="hero-float-card hero-float-rate"><Heart size={16} fill="currentColor" /><strong>4.9</strong><span>community rating</span></div><div className="hero-flying-note flying-note-one">Learn together <span>✦</span></div><div className="hero-flying-note flying-note-two">Build what matters <span>↗</span></div>
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          </div>
        </section>

        <section className="trust-strip"><span>Built for the people moving learning forward</span><div><span>LEARNERS</span><span>EDUCATORS</span><span>ORGANIZATIONS</span><span>CREATORS</span></div></section>

        <section className="section-shell organization-scope-section" aria-labelledby="organization-scope-title">
          <div className="section-heading"><div><span className="section-kicker">Organizations in education</span><h2 id="organization-scope-title">Not only schools.<br /><em>Every organization that helps learning happen.</em></h2></div><p>Liverton is for the wider education ecosystem: the people and organizations that teach, create knowledge, assess learning, provide tools, fund access, and support communities.</p></div>
          <div className="feature-grid">
            <article className="feature-card feature-card-lilac"><span className="feature-index">LEARNING PROVIDERS</span><h3>Schools, colleges & universities</h3><p>Support early-childhood centres, primary and secondary schools, universities, colleges, online academies, and community learning spaces.</p></article>
            <article className="feature-card feature-card-peach"><span className="feature-index">SKILLS & LIFELONG LEARNING</span><h3>TVET, adult & professional learning</h3><p>Coordinate vocational institutes, polytechnics, apprenticeship providers, language centres, tutoring teams, teacher-training institutions, and continuing education.</p></article>
            <article className="feature-card feature-card-lime"><span className="feature-index">GOVERNANCE & QUALITY</span><h3>Ministries, authorities & councils</h3><p>Connect education ministries, local authorities, examination councils, curriculum bodies, accreditation agencies, inspectorates, and school networks.</p></article>
            <article className="feature-card feature-card-lilac"><span className="feature-index">CONTENT & KNOWLEDGE</span><h3>Publishers, libraries & creators</h3><p>Share textbooks, academic and trade publishing, open educational resources, curriculum design, libraries, archives, media, and learning content.</p></article>
            <article className="feature-card feature-card-peach"><span className="feature-index">ASSESSMENT & CREDENTIALS</span><h3>Testing and certification bodies</h3><p>Support examination centres, professional associations, qualification authorities, certification providers, credential evaluators, and skills-verification organizations.</p></article>
            <article className="feature-card feature-card-lime"><span className="feature-index">TECHNOLOGY & ACCESS</span><h3>EdTech and infrastructure teams</h3><p>Bring together LMS and SIS providers, device makers, connectivity partners, accessibility organizations, data teams, and digital learning platforms.</p></article>
            <article className="feature-card feature-card-lilac"><span className="feature-index">COMMUNITY & WELLBEING</span><h3>NGOs, families & community groups</h3><p>Include nonprofits, community and faith-based organizations, refugee and out-of-school programs, parent groups, youth services, counselling, and disability support.</p></article>
            <article className="feature-card feature-card-peach"><span className="feature-index">RESEARCH & PARTNERSHIPS</span><h3>Research, funders & development partners</h3><p>Connect universities, research centres, think tanks, foundations, donors, impact investors, NGOs, employers, and international development organizations.</p></article>
            <article className="feature-card feature-card-lime"><span className="feature-index">SUPPLY & OPERATIONS</span><h3>Books, equipment & service providers</h3><p>Support book suppliers, distributors, printers, laboratory and stationery vendors, transport, food, facilities, safety, and other education services.</p></article>
          </div>
        </section>

        <section className="section-shell why-section" id="why-liverton">
          <div className="section-heading"><div><span className="section-kicker">A clearer way forward</span><h2>Everything you need<br /><em>to keep going.</em></h2></div><p>From your first lesson to your boldest project, Liverton keeps the right people, tools, and opportunities close at hand.</p></div>
          <div className="feature-grid">
            <article className="feature-card feature-card-lime"><div className="feature-icon"><Compass size={21} /></div><span className="feature-index">01</span><h3>Find your path</h3><p>Discover focused modules and learning spaces that feel personal, practical, and worth returning to.</p><button onClick={() => go('/student/courses')}>Explore learning <ArrowRight size={16} /></button></article>
            <article className="feature-card feature-card-lilac"><div className="feature-icon"><Users size={21} /></div><span className="feature-index">02</span><h3>Move as a team</h3><p>Bring learners, educators, and collaborators into the same rhythm with Liv Teams.</p><button onClick={() => go('/features/liv-teams')}>Meet your team <ArrowRight size={16} /></button></article>
            <article className="feature-card feature-card-peach"><div className="feature-icon"><Lightbulb size={21} /></div><span className="feature-index">03</span><h3>Make ideas real</h3><p>Turn ambitious projects into momentum with visibility, funding, and a community that cares.</p><button onClick={() => go('/features/liv-fund')}>Explore LivFund <ArrowRight size={16} /></button></article>
          </div>
        </section>

        <section className="section-shell role-section" id="stories">
          <div className="role-header"><div><span className="section-kicker">A space for every perspective</span><h2>Choose your<br /><em>point of view.</em></h2></div><div className="role-tabs">{(Object.keys(roleContent) as Role[]).map((item) => <button key={item} className={role === item ? 'active' : ''} onClick={() => setRole(item)}>{roleContent[item].label}<span>↗</span></button>)}</div></div>
          <div className="role-showcase"><div className="role-showcase-copy"><span className="role-label">{content.label}</span><h3>{content.title}</h3><p>{content.body}</p><button className="dark-cta" onClick={() => navigate('/get-started')}>Build your space <ArrowRight size={17} /></button><div className="role-stat"><strong>{content.stat}</strong><span>{content.statLabel}</span></div></div><div className="role-image-stack"><img src={imageSources[1]} alt="A diverse group collaborating around a laptop" /><div className="mini-profile-card"><span className="mini-avatar">LL</span><div><strong>A new learner joined your space</strong><span>Just now · Liverton Learning</span></div><Check size={17} /></div></div></div>
        </section>

        <section className="section-shell ecosystem-section" id="ecosystem">
          <div className="section-heading"><div><span className="section-kicker">The Liverton ecosystem</span><h2>More than modules.<br /><em>A whole world of momentum.</em></h2></div><p>One identity, many ways to learn, build, share, and grow. Your work travels with you.</p></div>
          <div className="ecosystem-grid"><button className="ecosystem-card ecosystem-teams" onClick={() => go('/features/liv-teams')}><div className="ecosystem-card-top"><MessageCircle size={20} /><span>01</span></div><span className="feature-index">COLLABORATE</span><h3>Liv Teams</h3><p>Chat, plan projects, schedule sessions, and keep the whole team moving together.</p><span className="card-link">Open Liv Teams <ArrowRight size={16} /></span><img src={imageSources[2]} alt="Students collaborating in a modern learning space" /></button><button className="ecosystem-card ecosystem-ai" onClick={() => go('/features/hanna-ai')}><div className="ecosystem-card-top"><AskHannaIcon size={24} /><span>02</span></div><span className="feature-index">THINK WITH YOU</span><h3>Hanna AI</h3><p>A thoughtful AI partner for learning, project management, planning, writing, and Liv Teams collaboration.</p><span className="card-link">Meet Hanna <ArrowRight size={16} /></span><div className="hanna-chat"><AskHannaIcon size={30} /><div><strong>Ask Hanna anything</strong><small>Try: “Help me plan my team project”</small></div><ArrowRight size={15} /></div></button><button className="ecosystem-card ecosystem-mart" onClick={() => go('/features/liv-mart')}><div className="ecosystem-card-top"><Store size={20} /><span>03</span></div><span className="feature-index">SHARE & SELL</span><h3>LivMart</h3><p>Turn completed projects, school essentials, and creator resources into new opportunity.</p><span className="card-link">Visit LivMart <ArrowRight size={16} /></span><div className="mart-pills"><span>Lesson kits</span><span>Project guides</span><span>+12 more</span></div></button><button className="ecosystem-card ecosystem-match" onClick={() => go('/features/liv-match')}><div className="ecosystem-card-top"><Store size={20} /><span>04</span></div><span className="feature-index">COMING NEXT</span><h3>LiveMatch</h3><p>Match scholastic materials, completed projects, and useful learning products with the people who need them.</p><span className="card-link">Learn about LiveMatch <ArrowRight size={16} /></span><div className="mart-pills"><span>Educational products</span><span>Creator opportunity</span></div></button><button className="ecosystem-card ecosystem-fund" onClick={() => go('/features/liv-fund')}><div className="ecosystem-card-top"><Heart size={20} /><span>05</span></div><span className="feature-index">COMING NEXT</span><h3>LiveFund</h3><p>Support clear education and community projects through transparent charitable giving.</p><span className="card-link">Learn about LiveFund <ArrowRight size={16} /></span><div className="mart-pills"><span>Community support</span><span>Impact updates</span></div></button></div>
        </section>

        <section className="visual-mosaic section-shell"><div className="section-heading"><div><span className="section-kicker">A community in motion</span><h2>Many places.<br /><em>One shared momentum.</em></h2></div><p>Liverton is designed for real people, real programs, and real progress across classrooms, homes, teams, and communities.</p></div><div className="mosaic-grid"><figure className="mosaic-large"><img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85" alt="Students collaborating around a table" /><figcaption>Learn side by side</figcaption></figure><figure className="mosaic-small mosaic-top"><img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=85" alt="Learner working with a laptop" /><figcaption>Make ideas visible</figcaption></figure><figure className="mosaic-small mosaic-bottom"><img src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=700&q=85" alt="Diverse friends learning together" /><figcaption>Grow with community</figcaption></figure></div></section>\n\n        <section className="home-quote"><div className="quote-mark">“</div><blockquote>Liverton makes progress feel less like a solo climb and more like a shared horizon.</blockquote><div className="quote-byline"><span className="quote-avatar">NK</span><span><strong>Liverton community</strong><small>Learners, educators & organizations</small></span></div></section>

        <section className="section-shell faq-section"><div><span className="section-kicker">Learn more, by role</span><h2>See how Liverton<br /><em>fits your world.</em></h2><p className="faq-intro">Read the practical guide for your role, from first sign-up to the everyday workflows that make Liverton useful.</p><div className="role-doc-links"><button onClick={() => navigate('/about/students')}><BookOpen size={16} /> Student guide <ArrowRight size={15} /></button><button onClick={() => navigate('/about/teachers')}><GraduationCap size={16} /> Educator guide <ArrowRight size={15} /></button><button onClick={() => navigate('/about/parents')}><Heart size={16} /> Parent guide <ArrowRight size={15} /></button><button onClick={() => navigate('/about/schools')}><Users size={16} /> Organization guide <ArrowRight size={15} /></button></div></div><div className="faq-list">{['Can I join Liverton as a learner or educator?', 'What is Hanna AI?', 'Can organizations create their own learning spaces?'].map((question, index) => <div className={`faq-item ${expandedFaq === index ? 'open' : ''}`} key={question}><button onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}><span>{question}</span><ChevronDown size={18} /></button>{expandedFaq === index && <p>{index === 0 ? 'Yes. Start with the role that fits you best, then move between learning, teams, projects, and opportunity with one Liverton identity.' : index === 1 ? 'Hanna is Liverton’s AI partner for study, project planning, writing, team coordination, and everyday work. Hanna helps you clarify ideas, organize next steps, and create stronger outcomes.' : 'Yes. Organizations can coordinate people, programs, modules, projects, and financial opportunity in one connected workspace.'}</p>}</div>)}</div></section>

        <section className="final-cta"><div className="final-cta-glow" /><span className="section-kicker">Your next chapter starts here</span><h2>Make room for<br /><em>what’s next.</em></h2><p>Learning is better when you don’t have to do it alone.</p><button className="light-cta" onClick={() => navigate('/get-started')}>Get started free <ArrowRight size={18} /></button></section>
      </main>

      <footer className="home-footer"><div className="footer-brand"><Logo /><span>Learn together. Go further.</span></div><div className="footer-links"><button onClick={() => scrollTo('why-liverton')}>Why Liverton</button><button onClick={() => scrollTo('ecosystem')}>Explore</button><button onClick={() => navigate('/about')}>About</button><button onClick={() => navigate('/login')}>Log in</button></div><span className="footer-copy">© 2026 Liverton Learning</span></footer>

      {showVideo && <div className="video-modal" role="dialog" aria-modal="true" aria-label="Liverton story"><button className="video-close" onClick={() => setShowVideo(false)} aria-label="Close video"><X /></button><div className="video-frame"><video controls autoPlay poster={imageSources[0]}><source src="https://videos.pexels.com/video-files/3129595/3129595-hd_1920_1080_25fps.mp4" type="video/mp4" /></video><div className="video-fallback"><Play size={28} fill="currentColor" /><span>Liverton in motion</span></div></div></div>}
    </div>
  );
}
