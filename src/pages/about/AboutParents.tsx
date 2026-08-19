import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Heart, LayoutGrid, MessageCircle, Sparkles, Store, Users } from 'lucide-react';

const sections = [
  { icon: BookOpen, title: 'Learning and documentation', body: 'Students can discover modules, attend lessons, complete assignments and quizzes, review feedback, track progress, and build a personal learning record. Educators can author modules, sequence lessons, attach resources, schedule live lessons, grade work, and use analytics to support learners.' },
  { icon: Users, title: 'Organizations and roles', body: 'Liverton treats schools, universities, training centers, NGOs, companies, research groups, and communities as Organizations. Members can have contextual roles such as learner, educator, mentor, project manager, treasurer, administrator, or viewer, with permissions matched to the work they do.' },
  { icon: MessageCircle, title: 'Liv Teams', body: 'Liv Teams is a collaboration workspace for chat, project planning, calendars, resources, role assignments, polls, live sessions, milestones, and team updates. It is connected to the same Liverton identity used for learning and projects.' },
  { icon: Sparkles, title: 'Hanna AI', body: 'Hanna is not limited to study help. Hanna can explain concepts, summarize documents, improve writing, create plans, break projects into tasks, help prepare lessons, draft team updates, organize meeting notes, and support Liv Teams workflows.' },
  { icon: Store, title: 'LivMart and LivFund', body: 'LivMart helps creators and organizations share or sell educational resources, project outputs, and useful learning materials. LivFund helps eligible projects present their goals, evidence, budgets, and progress so communities can discover and support meaningful work.' },
  { icon: LayoutGrid, title: 'Connected platform architecture', body: 'The application is organized around shared identities and persistent entities including Users, Profiles, Organizations, Teams, Modules, Lessons, Assignments, Projects, Wallets, LivFund campaigns, LivMart listings, Hanna conversations, notifications, activity events, media assets, and audit records.' },
];

export default function AboutParents() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#171717]">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[#f7f6f2]/90 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 font-semibold"><ArrowLeft className="h-4 w-4" /> Back to Liverton</button>
          <button onClick={() => navigate('/get-started')} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Get started <ArrowRight className="ml-1 inline h-4 w-4" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <section className="max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#ded0ff] px-3 py-2 text-xs font-bold uppercase tracking-[.14em] text-[#6e25b8]"><Heart className="h-4 w-4" /> Parent & organization guide</div>
          <h1 className="font-['Space_Grotesk'] text-5xl font-bold tracking-[-.07em] sm:text-7xl">One connected place for <span className="text-[#a71df4]">learning, people, and progress.</span></h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-black/60">This guide explains how Liverton Learning works across students, educators, parents, organizations, teams, projects, and opportunity. It is designed to make the platform easier to understand before you sign up and easier to use after you do.</p>
        </section>
        <section className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{sections.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-3xl bg-white p-7 shadow-[0_14px_45px_rgba(25,18,32,.08)]"><div className="mb-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9e0ff] text-[#a71df4]"><Icon className="h-5 w-5" /></div><h2 className="font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">{title}</h2><p className="mt-3 text-sm leading-6 text-black/60">{body}</p></article>)}</section>
        <section className="mt-16 rounded-3xl bg-black p-8 text-white sm:p-12"><h2 className="font-['Space_Grotesk'] text-3xl font-bold tracking-[-.05em] sm:text-5xl">What to expect when you join</h2><div className="mt-8 grid gap-4 sm:grid-cols-2">{['A shared Liverton identity across learning, teams, projects, LivFund, LivMart, and Hanna.', 'Clear role-based access so learners, educators, parents, and organization members see what they need.', 'Persistent progress, project, communication, and activity records instead of disconnected mock experiences.', 'A mobile-friendly interface with responsive cards, focused navigation, useful empty states, and safe loading feedback.'].map(item => <div key={item} className="flex gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-white/75"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#d9f776]" />{item}</div>)}</div></section>
        <div className="mt-12 flex flex-wrap gap-3"><button onClick={() => navigate('/about/students')} className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-semibold">Student guide</button><button onClick={() => navigate('/about/teachers')} className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-semibold">Educator guide</button><button onClick={() => navigate('/about/schools')} className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-semibold">Organization guide</button></div>
      </main>
    </div>
  );
}
