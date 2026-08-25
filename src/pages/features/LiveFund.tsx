import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDollarSign, Clock3, Heart, Loader2, Plus, Sparkles, Target, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BannerCarousel from '@/components/BannerCarousel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getAllTeams } from '@/services/livTeamsCoreService';
import { getTeamProjectsForEconomicFeatures, getLivFundCampaigns, getLivFundContributions, createLivFundCampaign, createPendingLivFundContribution, calculateSuccessfulFunding } from '@/services/livFundMartService';
import type { LivFundCampaign, TeamProject } from '@/types/livTeams';

interface CampaignView { campaign: LivFundCampaign; raisedMinor: number; }
const formatUGX = (minor: number) => `UGX ${(minor / 100).toLocaleString('en-UG', { maximumFractionDigits: 0 })}`;

export default function LiveFund() {
  const { currentUser, userData } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState<CampaignView | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ projectId: '', title: '', description: '', objective: '', purpose: '', target: '', deadline: '' });
  const [contribution, setContribution] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [loadedCampaigns, teams] = await Promise.all([getLivFundCampaigns(), getAllTeams()]);
      const views = await Promise.all(loadedCampaigns.map(async campaign => ({ campaign, raisedMinor: calculateSuccessfulFunding(await getLivFundContributions(campaign.id)) })));
      const ownedTeams = teams.filter(team => team.members.some(member => member.userId === currentUser?.uid));
      const projectGroups = await Promise.all(ownedTeams.map(team => getTeamProjectsForEconomicFeatures(team.id)));
      setCampaigns(views);
      setProjects(projectGroups.flat());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load LivFund');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [currentUser?.uid]);

  const activeCampaigns = useMemo(() => campaigns.filter(item => ['Active', 'Approved', 'Funded'].includes(item.campaign.status)), [campaigns]);
  const totalRaised = campaigns.reduce((sum, item) => sum + item.raisedMinor, 0);
  const selectedProject = projects.find(project => project.id === form.projectId);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !selectedProject) return;
    setSaving(true);
    try {
      await createLivFundCampaign({ project: selectedProject, userId: currentUser.uid, ownerName: userData?.fullName || currentUser.displayName || 'Project owner', title: form.title, description: form.description, objective: form.objective, purpose: form.purpose, targetAmountMinor: Math.round(Number(form.target) * 100), currency: 'UGX', deadline: form.deadline });
      toast.success('LivFund campaign saved as Draft. Submit it for review before collecting funds.');
      setCreateOpen(false); setForm({ projectId: '', title: '', description: '', objective: '', purpose: '', target: '', deadline: '' }); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create campaign'); }
    finally { setSaving(false); }
  };

  const startContribution = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !contributeOpen) return;
    const amountMinor = Math.round(Number(contribution) * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return;
    setSaving(true);
    try {
      await createPendingLivFundContribution({ campaignId: contributeOpen.campaign.id, contributorId: currentUser.uid, contributorName: userData?.fullName || currentUser.displayName || 'Supporter', amountMinor, currency: contributeOpen.campaign.currency, provider: 'pending-provider-setup', providerReference: `pending-${Date.now()}`, idempotencyKey: `${contributeOpen.campaign.id}-${currentUser.uid}-${Date.now()}` });
      toast.success('Contribution created as pending. It will count only after verified provider confirmation.');
      setContributeOpen(null); setContribution('');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create contribution'); }
    finally { setSaving(false); }
  };

  return <AuthenticatedLayout><div className="lf-page"><BannerCarousel pageScope="liv_fund" /><header className="lf-header"><div><span className="lp-overline">Grow ideas</span><h1>LivFund</h1><p>Go Get Funded — structured funding for real Liverton projects.</p></div><Button className="lf-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Start from a project</Button></header><section className="lf-hero"><div><span className="lf-kicker"><Sparkles size={14} /> Funding with purpose</span><h2>Make your next<br /><em>good idea happen.</em></h2><p>Every campaign is linked to a Liverton project, milestones, ownership, evidence, and an auditable contribution ledger.</p><Button className="lf-dark" onClick={() => document.getElementById('campaigns')?.scrollIntoView({ behavior: 'smooth' })}>Explore campaigns <ArrowRight size={16} /></Button></div><div className="lf-hero-stat"><CircleDollarSign size={26} /><strong>{formatUGX(totalRaised)}</strong><span>verified successful funding</span><div className="lf-sparkline"><i /><i /><i /><i /><i /><i /><i /></div></div></section><div className="lf-stats"><div><Target size={18} /><strong>{activeCampaigns.length}</strong><span>active campaigns</span></div><div><Users size={18} /><strong>{campaigns.length}</strong><span>linked projects</span></div><div><CheckCircle2 size={18} /><strong>Ledger</strong><span>successful only</span></div><div><Clock3 size={18} /><strong>Pending</strong><span>provider confirmation</span></div></div><section id="campaigns" className="lf-list"><div className="lf-list-heading"><div><span className="lp-overline">Find your next yes</span><h2>Projects worth backing</h2></div></div>{loading ? <div className="flex items-center gap-2 p-8"><Loader2 className="animate-spin" /> Loading authoritative campaigns…</div> : <div className="lf-grid">{campaigns.length === 0 ? <div className="p-8 text-slate-500">No campaigns have been submitted yet. Start with an eligible project.</div> : campaigns.map(({ campaign, raisedMinor }) => { const percent = Math.min(100, Math.round((raisedMinor / campaign.targetAmountMinor) * 100)); return <article className="lf-card" key={campaign.id}><div className="lf-card-art" style={{ background: 'linear-gradient(135deg, #c9f36b, #fff)' }}><span>{campaign.status}</span><Heart size={18} /></div><div className="lf-card-body"><small>{campaign.ownerName} · {campaign.currency}</small><h3>{campaign.title}</h3><p>{campaign.description}</p><div className="lf-progress"><i style={{ width: `${percent}%` }} /></div><div className="lf-money"><strong>{formatUGX(raisedMinor)}</strong><span>of {formatUGX(campaign.targetAmountMinor)}</span><b>{percent}%</b></div><Button disabled={campaign.status !== 'Active'} onClick={() => setContributeOpen({ campaign, raisedMinor })}>Contribute <ArrowRight size={14} /></Button></div></article>; })}</div>}</section><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Create a LivFund campaign</DialogTitle><DialogDescription>Campaigns must be attached to a project with objectives, budget, and milestones. New campaigns begin as Draft.</DialogDescription></DialogHeader><form onSubmit={create} className="space-y-3"><div><Label>Eligible project</Label><select className="w-full border rounded-md p-2" value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })}><option value="">Select project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.status}</option>)}</select></div><Input placeholder="Campaign title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required /><Textarea placeholder="Project-facing description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required /><Input placeholder="Objective" value={form.objective} onChange={event => setForm({ ...form, objective: event.target.value })} required /><Input placeholder="Funding purpose" value={form.purpose} onChange={event => setForm({ ...form, purpose: event.target.value })} required /><Input type="number" min="1" placeholder="Target amount in UGX" value={form.target} onChange={event => setForm({ ...form, target: event.target.value })} required /><Input type="date" value={form.deadline} onChange={event => setForm({ ...form, deadline: event.target.value })} /><DialogFooter><Button type="submit" disabled={saving || !selectedProject}>{saving ? <Loader2 className="animate-spin" /> : 'Save Draft'}</Button></DialogFooter></form></DialogContent></Dialog><Dialog open={!!contributeOpen} onOpenChange={open => !open && setContributeOpen(null)}><DialogContent><DialogHeader><DialogTitle>Contribute to {contributeOpen?.campaign.title}</DialogTitle><DialogDescription>This creates a pending payment record. It will not count toward funding until the provider confirms it server-side.</DialogDescription></DialogHeader><form onSubmit={startContribution} className="space-y-3"><Input type="number" min="1" placeholder="Amount in UGX" value={contribution} onChange={event => setContribution(event.target.value)} required /><DialogFooter><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : 'Create pending contribution'}</Button></DialogFooter></form></DialogContent></Dialog></div></AuthenticatedLayout>;
}
