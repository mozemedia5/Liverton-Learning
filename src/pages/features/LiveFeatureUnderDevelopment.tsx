import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleDollarSign, HeartHandshake, Lightbulb, Sparkles, Store, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/button';

type LiveFeature = 'mart' | 'fund';

const featureContent: Record<LiveFeature, {
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: typeof Store;
  accent: string;
  what: string;
  how: string[];
  benefits: string[];
}> = {
  mart: {
    name: 'LivMart',
    eyebrow: 'Education marketplace · Coming next',
    title: 'Match great learning work with the people who need it.',
    description: 'LivMart will help educators, learners, organizations, and creators discover and exchange useful scholastic materials, lesson kits, classroom tools, and completed educational projects in one trusted space.',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=85',
    imageAlt: 'Students collaborating around a table with learning materials',
    icon: Store,
    accent: 'from-emerald-500 to-cyan-500',
    what: 'Educators and organizations will be able to publish useful educational products, while learners and schools will be able to find, compare, and acquire resources that support real learning outcomes.',
    how: ['Educators can list lesson plans, revision packs, classroom resources, and scholastic materials.', 'Learners and schools can discover resources by subject, level, format, and learning goal.', 'Creators can showcase completed projects that are ready to be reused, adapted, or licensed.', 'Liverton will support clear descriptions, responsible pricing, ownership information, and safe delivery.'],
    benefits: ['Makes good educational work easier to discover.', 'Creates new opportunity for educators and student creators.', 'Helps schools access practical resources without searching across disconnected platforms.', 'Connects completed projects to new classrooms and communities.'],
  },
  fund: {
    name: 'LiveFund',
    eyebrow: 'Community support · Coming next',
    title: 'Give promising learning projects a way forward.',
    description: 'LiveFund will be Liverton’s charitable support space for people and organizations helping others complete meaningful education, community, and access projects.',
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1400&q=85',
    imageAlt: 'People joining hands in a community support circle',
    icon: HeartHandshake,
    accent: 'from-violet-500 to-fuchsia-500',
    what: 'LiveFund will focus on giving and community support rather than commercial sales. Campaigns will explain who needs help, what the project will accomplish, how contributions will be used, and what evidence will show progress.',
    how: ['A school, educator, organization, or community team can describe a verified need or education project.', 'Supporters can understand the purpose, milestones, budget, and expected community benefit.', 'Contributions can help complete projects such as learning spaces, access initiatives, supplies, and community programs.', 'Progress updates and evidence can keep supporters informed and strengthen trust.'],
    benefits: ['Channels generosity toward clear education and community needs.', 'Makes project goals, milestones, and impact easier to understand.', 'Gives supporters a practical way to help learners and communities.', 'Builds accountability through updates and evidence rather than vague appeals.'],
  },
};

export default function LiveFeatureUnderDevelopment({ feature }: { feature: LiveFeature }) {
  const navigate = useNavigate();
  const content = featureContent[feature];
  const Icon = content.icon;

  return <AuthenticatedLayout><div className="min-h-screen bg-[#f7faf8] text-slate-900 dark:bg-[#07090d] dark:text-white"><main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-10"><Button variant="ghost" onClick={() => navigate('/')} className="mb-6 rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Back to homepage</Button><section className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl"><div className={`absolute inset-0 bg-gradient-to-br ${content.accent} opacity-20`} /><div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:p-14"><div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-white/80"><Sparkles className="h-3.5 w-3.5" /> Under development</span><p className="mt-7 text-xs font-black uppercase tracking-[.22em] text-emerald-300">{content.eyebrow}</p><h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">{content.title}</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">{content.description}</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => document.getElementById('feature-details')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl bg-white text-slate-950 hover:bg-emerald-50">Learn about {content.name} <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" onClick={() => navigate('/')} className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10">Go to homepage</Button></div></div><div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/10 p-2 shadow-2xl"><img src={content.image} alt={content.imageAlt} className="h-72 w-full rounded-[1.1rem] object-cover sm:h-96" /><div className="absolute bottom-6 left-6 right-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/80 p-3 backdrop-blur-xl"><span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${content.accent}`}><Icon className="h-5 w-5 text-white" /></span><span><strong className="block text-sm">{content.name}</strong><small className="text-white/60">We are preparing a safe, useful experience for Liverton members.</small></span></div></div></div></section><section id="feature-details" className="scroll-mt-8 py-14"><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div><span className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">What this feature will do</span><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Designed for meaningful learning outcomes.</h2><p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">{content.what}</p></div><div className="grid gap-3 sm:grid-cols-2">{content.benefits.map((benefit) => <div key={benefit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[.04]"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><p className="mt-3 text-sm font-semibold leading-relaxed">{benefit}</p></div>)}</div></div><div className="mt-12 grid gap-6 lg:grid-cols-2"><article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/[.04] dark:ring-white/10"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Lightbulb className="h-5 w-5" /></span><div><h3 className="font-black">How people will use it</h3><p className="text-xs text-slate-500">A clear path from idea to useful action.</p></div></div><div className="mt-6 space-y-4">{content.how.map((step, index) => <div key={step} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-black text-white dark:bg-white dark:text-slate-900">{index + 1}</span><p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step}</p></div>)}</div></article><article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 dark:from-emerald-950/30 dark:to-cyan-950/20"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" /><div className="relative"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-white/10"><Users className="h-5 w-5" /></span><h3 className="font-black">Why it belongs in Liverton</h3></div><p className="mt-6 text-sm leading-relaxed text-slate-700 dark:text-slate-200">Liverton connects learning, collaboration, opportunity, and community. {content.name} is being designed to extend that connection while protecting trust, clarity, and responsible participation.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/80 p-4 dark:bg-white/10"><BookOpen className="h-5 w-5 text-emerald-600" /><strong className="mt-3 block text-sm">Learning first</strong><span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">Every workflow should help people teach, learn, or support access.</span></div><div className="rounded-2xl bg-white/80 p-4 dark:bg-white/10">{feature === 'fund' ? <CircleDollarSign className="h-5 w-5 text-violet-600" /> : <Store className="h-5 w-5 text-violet-600" />}<strong className="mt-3 block text-sm">Built with care</strong><span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">Safety, transparency, and useful evidence will guide the release.</span></div></div></div></article></div></section></main></div></AuthenticatedLayout>;
}
