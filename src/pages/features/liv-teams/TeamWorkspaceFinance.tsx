import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Wallet, Landmark, Store, Plus, ArrowDownLeft,
  ArrowUpRight, Heart, Sparkles, Loader2, Download, FileSpreadsheet
} from 'lucide-react';
import {
  createSavingsTransaction,
  getSavingsTransactions,
  approveSavingsTransaction,
  createProjectFundingRequest,
  getProjectFundingRequests,
  contributeToFundingRequest,
  publishProjectToMarketplace,
  getTeamMarketplaceItems
} from '@/services/livTeamsFinanceService';
import { getTeamProjects } from '@/services/livTeamsProjectService';
import type { SavingsTransaction, ProjectFundingRequest, TeamProject, MarketplaceItem, TeamRole } from '@/types/livTeams';
import { LivEmptyState, LivSectionHeader, LivStatCard } from './livTeamsUi';
import { formatUGX } from './livTeamsUtils';

interface FinanceProps {
  teamId: string;
  teamName: string;
  teamRole: TeamRole;
  savingsBalance: number;
}

export default function TeamWorkspaceFinance({ teamId, teamName, teamRole, savingsBalance }: FinanceProps) {
  const { currentUser, userData } = useAuth();

  const [subTab, setSubTab] = useState('savings');
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [fundingRequests, setFundingRequests] = useState<ProjectFundingRequest[]>([]);
  const [teamProjects, setTeamProjects] = useState<TeamProject[]>([]);
  const [teamListings, setTeamListings] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Savings form
  const [savingsModalOpen, setSavingsOpen] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState(0);
  const [savingsType, setSavingsType] = useState<'contribution' | 'withdrawal'>('contribution');
  const [savingsNotes, setSavingsNotes] = useState('');

  // Funding form
  const [fundingModalOpen, setFundingOpen] = useState(false);
  const [fundProjectId, setFundProjectId] = useState('');
  const [fundTitle, setFundTitle] = useState('');
  const [fundDesc, setFundDesc] = useState('');
  const [fundGoal, setFundGoal] = useState(0);

  // Contribute form
  const [contribModalOpen, setContribOpen] = useState(false);
  const [activeReqId, setActiveReqId] = useState('');
  const [contribAmount, setContribAmount] = useState(0);

  // Marketplace form
  const [marketModalOpen, setMarketOpen] = useState(false);
  const [marketProjId, setMarketProjId] = useState('');
  const [marketTitle, setMarketTitle] = useState('');
  const [marketDesc, setMarketDesc] = useState('');
  const [marketPrice, setMarketPrice] = useState(0);
  const [marketType, setMarketType] = useState<MarketplaceItem['type']>('notes');

  useEffect(() => {
    loadFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadFinanceData = async () => {
    if (!teamId) return;
    try {
      const [txs, reqs, projs, listings] = await Promise.all([
        getSavingsTransactions(teamId),
        getProjectFundingRequests(teamId),
        getTeamProjects(teamId),
        getTeamMarketplaceItems(teamId)
      ]);
      setTransactions(txs);
      setFundingRequests(reqs);
      setTeamProjects(projs);
      setTeamListings(listings);
    } catch (error) {
      console.error('Error loading finance details:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = useMemo(() => transactions.filter(t => t.status === 'pending').length, [transactions]);
  const completedProjects = useMemo(() => teamProjects.filter(p => p.status === 'Completed'), [teamProjects]);

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || savingsAmount <= 0) return;
    setSaving(true);
    try {
      await createSavingsTransaction(teamId, {
        userId: currentUser.uid,
        userName: userData?.fullName || 'Anonymous',
        amount: savingsAmount,
        type: savingsType,
        notes: savingsNotes.trim()
      });
      toast.success('Transaction logged. It is pending treasurer approval.');
      setSavingsOpen(false);
      setSavingsAmount(0);
      setSavingsType('contribution');
      setSavingsNotes('');
      loadFinanceData();
    } catch {
      toast.error('Failed to log transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveTx = async (txId: string, approve: boolean) => {
    if (!currentUser) return;
    try {
      await approveSavingsTransaction(teamId, txId, currentUser.uid, approve);
      toast.success(approve ? 'Transaction approved' : 'Transaction rejected');
      loadFinanceData();
    } catch {
      toast.error('Failed to process transaction');
    }
  };

  const handleFundingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !fundProjectId || fundGoal <= 0 || !fundTitle.trim()) return;
    const proj = teamProjects.find(p => p.id === fundProjectId);
    setSaving(true);
    try {
      await createProjectFundingRequest(teamId, {
        projectId: fundProjectId,
        projectName: proj?.name || 'Team Project',
        title: fundTitle.trim(),
        description: fundDesc.trim(),
        goalAmount: fundGoal
      }, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Funding campaign is live');
      setFundingOpen(false);
      setFundProjectId('');
      setFundTitle('');
      setFundDesc('');
      setFundGoal(0);
      loadFinanceData();
    } catch {
      toast.error('Failed to start funding campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || contribAmount <= 0 || !activeReqId) return;
    setSaving(true);
    try {
      await contributeToFundingRequest(teamId, activeReqId, currentUser.uid, userData?.fullName || 'Anonymous', contribAmount);
      toast.success(`Contributed ${formatUGX(contribAmount)}. Thank you!`);
      setContribOpen(false);
      setContribAmount(0);
      loadFinanceData();
    } catch {
      toast.error('Failed to register contribution');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishMarketplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !marketProjId || !marketTitle.trim()) return;
    setSaving(true);
    try {
      await publishProjectToMarketplace({
        teamId,
        teamName,
        projectId: marketProjId,
        title: marketTitle.trim(),
        description: marketDesc.trim(),
        price: marketPrice || 0,
        type: marketType
      });
      toast.success('Published to the Liv Teams marketplace');
      setMarketOpen(false);
      setMarketProjId('');
      setMarketTitle('');
      setMarketDesc('');
      setMarketPrice(0);
      loadFinanceData();
    } catch {
      toast.error('Failed to publish to marketplace');
    } finally {
      setSaving(false);
    }
  };

  const handleExportReport = () => {
    if (transactions.length === 0) {
      toast.info('No transactions to export yet');
      return;
    }
    const header = 'Date,Member,Type,Amount (UGX),Status,Notes';
    const rows = transactions.map(tx => {
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate().toISOString().slice(0, 10) : '';
      const safeNotes = (tx.notes || '').replace(/"/g, '""');
      return `"${date}","${tx.userName}","${tx.type}",${tx.amount},"${tx.status}","${safeNotes}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${teamName.replace(/\s+/g, '-').toLowerCase()}-savings-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Savings report downloaded');
  };

  const isTreasurer = ['owner', 'admin', 'treasurer'].includes(teamRole);
  const isGuest = teamRole === 'guest';

  return (
    <div className="space-y-6">
      <LivSectionHeader title="Savings, Funding & Marketplace" subtitle="Team wallet with treasurer approval, crowdfunding for projects, and marketplace publishing.">
        {!isGuest && (
          <div className="flex gap-2">
            {subTab === 'savings' && (
              <Button size="sm" onClick={() => setSavingsOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">
                <Plus className="w-4 h-4 mr-1" /> Log Transaction
              </Button>
            )}
            {subTab === 'funding' && teamProjects.length > 0 && (
              <Button size="sm" onClick={() => setFundingOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">
                <Plus className="w-4 h-4 mr-1" /> New Campaign
              </Button>
            )}
            {subTab === 'marketplace' && teamProjects.length > 0 && (
              <Button size="sm" onClick={() => setMarketOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">
                <Plus className="w-4 h-4 mr-1" /> Publish Project
              </Button>
            )}
          </div>
        )}
      </LivSectionHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LivStatCard icon={<Wallet className="w-5 h-5" />} label="Wallet Balance" value={formatUGX(savingsBalance)} color="emerald" />
        <LivStatCard icon={<ArrowDownLeft className="w-5 h-5" />} label="Transactions" value={transactions.length} color="blue" hint={pendingCount > 0 ? `${pendingCount} pending approval` : undefined} />
        <LivStatCard icon={<Landmark className="w-5 h-5" />} label="Campaigns" value={fundingRequests.length} color="purple" />
        <LivStatCard icon={<Store className="w-5 h-5" />} label="Marketplace Listings" value={teamListings.length} color="orange" />
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto gap-1 bg-transparent p-0 h-auto scrollbar-none">
          <TabsTrigger value="savings" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Wallet className="w-4 h-4" /> Savings Ledger
          </TabsTrigger>
          <TabsTrigger value="funding" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Landmark className="w-4 h-4" /> Funding Campaigns
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Store className="w-4 h-4" /> Marketplace
          </TabsTrigger>
        </TabsList>

        {/* ============================ SAVINGS ============================ */}
        <TabsContent value="savings" className="outline-none space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Transaction History</h4>
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <LivEmptyState
                  icon={<Wallet className="w-6 h-6" />}
                  title="No transactions yet"
                  description="Log the first contribution to start building the team savings wallet."
                />
              ) : (
                transactions.map(tx => (
                  <Card key={tx.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'contribution'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/40 text-red-500'
                        }`}>
                          {tx.type === 'contribution' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{tx.userName}</p>
                          <p className="text-[11px] text-slate-400 capitalize truncate">
                            {tx.type}{tx.notes ? ` • ${tx.notes}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{formatUGX(tx.amount)}</span>
                        <Badge variant="outline" className={`capitalize text-[10px] ${
                          tx.status === 'approved' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' :
                          tx.status === 'rejected' ? 'border-red-500 text-red-500' : 'border-amber-500 text-amber-500'
                        }`}>
                          {tx.status}
                        </Badge>
                        {tx.status === 'pending' && isTreasurer && tx.userId !== currentUser?.uid && (
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => handleApproveTx(tx.id, true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8">Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleApproveTx(tx.id, false)} className="text-red-500 rounded-lg h-8">Reject</Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Financial Transparency
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-sm">
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    All contributions and withdrawals are recorded and require treasurer approval, keeping the wallet fully auditable.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-gray-100 dark:border-white/5 text-center space-y-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Transactions on record</p>
                    <p className="text-emerald-500 font-bold text-lg">{transactions.length}</p>
                    <Button size="sm" variant="outline" className="w-full rounded-lg mt-2" onClick={handleExportReport}>
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============================ FUNDING ============================ */}
        <TabsContent value="funding" className="outline-none">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-12">Loading campaigns...</p>
          ) : fundingRequests.length === 0 ? (
            <LivEmptyState
              icon={<Landmark className="w-6 h-6" />}
              title="No funding campaigns"
              description={teamProjects.length === 0
                ? 'Create a project first, then start a funding campaign for it.'
                : 'Start a crowdfunding campaign to fund one of your team projects.'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fundingRequests.map(req => {
                const progress = Math.min(100, Math.round(((req.amountRaised || 0) / Math.max(1, req.goalAmount)) * 100));
                return (
                  <Card key={req.id} className="flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2 border-b border-gray-100 dark:border-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className={`capitalize text-[10px] border-0 ${
                          req.status === 'funded' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {req.status}
                        </Badge>
                        <span className="text-[11px] text-slate-400">{req.contributors?.length || 0} sponsors</span>
                      </div>
                      <CardTitle className="text-sm font-bold truncate mt-1.5">{req.title}</CardTitle>
                      <CardDescription className="text-xs truncate">Project: {req.projectName}</CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 py-3 space-y-3 flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{req.description || 'No description.'}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-emerald-600 dark:text-emerald-400">{formatUGX(req.amountRaised || 0)}</span>
                          <span className="text-slate-400">of {formatUGX(req.goalAmount)}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-400 text-right">{progress}% funded</p>
                      </div>
                      {(req.contributors || []).length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">Recent sponsors</span>
                          <div className="flex flex-wrap gap-1">
                            {req.contributors.slice(-3).map((contrib, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] py-0">
                                {contrib.userName}: {formatUGX(contrib.amount)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-3 border-t border-gray-100 dark:border-white/5">
                      {!isGuest && req.status !== 'funded' ? (
                        <Button
                          size="sm"
                          onClick={() => { setActiveReqId(req.id); setContribOpen(true); }}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                        >
                          <Heart className="w-4 h-4 mr-1.5" /> Sponsor This Project
                        </Button>
                      ) : (
                        <p className="text-xs text-center w-full py-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                          {req.status === 'funded' ? 'Fully funded — thank you!' : 'Guests cannot sponsor'}
                        </p>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============================ MARKETPLACE ============================ */}
        <TabsContent value="marketplace" className="outline-none space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Team Listings ({teamListings.length})</h4>
              {teamListings.length === 0 ? (
                <LivEmptyState
                  icon={<Store className="w-6 h-6" />}
                  title="No listings published"
                  description={completedProjects.length > 0
                    ? 'Publish a completed project to showcase it on the marketplace.'
                    : 'Complete a project, then publish it here for other learners to discover.'}
                />
              ) : (
                teamListings.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-400 capitalize truncate">
                          {(item.type || 'notes').replace('_', ' ')} • {item.downloadsCount || 0} downloads • {item.ratings?.length || 0} reviews
                        </p>
                      </div>
                      <Badge className={`${item.price === 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'} border-0`}>
                        {item.price === 0 ? 'FREE' : formatUGX(item.price)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div>
              <Card>
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" /> Why publish?
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-slate-500 dark:text-slate-400 space-y-2 leading-relaxed">
                  <p>Showcase your team's innovations, sell revision notes, research or software, and earn ratings and reviews from learners across schools.</p>
                  <p>Free and open-source listings help the whole Liverton community grow.</p>
                  {teamProjects.length > 0 && !isGuest && (
                    <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg mt-2" onClick={() => setMarketOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Publish a Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Log transaction dialog */}
      <Dialog open={savingsModalOpen} onOpenChange={setSavingsOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Wallet Transaction</DialogTitle>
            <DialogDescription>Your entry stays pending until a treasurer approves it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavingsSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="savAmt">Amount (UGX) *</Label>
              <Input type="number" min={1} id="savAmt" value={savingsAmount || ''} onChange={e => setSavingsAmount(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savType">Transaction Type *</Label>
              <Select value={savingsType} onValueChange={(val) => setSavingsType(val as 'contribution' | 'withdrawal')}>
                <SelectTrigger id="savType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">Contribution (deposit)</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="savNotes">Notes</Label>
              <Input id="savNotes" value={savingsNotes} onChange={e => setSavingsNotes(e.target.value)} placeholder="e.g. Monthly dues" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSavingsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || savingsAmount <= 0} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Funding campaign dialog */}
      <Dialog open={fundingModalOpen} onOpenChange={setFundingOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>New Funding Campaign</DialogTitle>
            <DialogDescription>Raise sponsorship for a team project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFundingSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fundProj">Project *</Label>
              <Select value={fundProjectId} onValueChange={setFundProjectId}>
                <SelectTrigger id="fundProj">
                  <SelectValue placeholder="Choose project..." />
                </SelectTrigger>
                <SelectContent>
                  {teamProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundTitle">Campaign Title *</Label>
              <Input id="fundTitle" value={fundTitle} onChange={e => setFundTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundDesc">Description</Label>
              <Textarea id="fundDesc" value={fundDesc} onChange={e => setFundDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundGoal">Funding Goal (UGX) *</Label>
              <Input type="number" min={1} id="fundGoal" value={fundGoal || ''} onChange={e => setFundGoal(Number(e.target.value))} required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFundingOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !fundProjectId || fundGoal <= 0} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Launch Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sponsor dialog */}
      <Dialog open={contribModalOpen} onOpenChange={setContribOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Sponsor Project</DialogTitle>
            <DialogDescription>Your contribution is recorded in the team's funding report.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContributionSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contAmt">Amount (UGX) *</Label>
              <Input type="number" min={1} id="contAmt" value={contribAmount || ''} onChange={e => setContribAmount(Number(e.target.value))} required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setContribOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || contribAmount <= 0} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Sponsorship'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Publish to marketplace dialog */}
      <Dialog open={marketModalOpen} onOpenChange={setMarketOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Publish to Marketplace</DialogTitle>
            <DialogDescription>Showcase or sell a completed team project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishMarketplace} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mProj">Project *</Label>
              <Select value={marketProjId} onValueChange={setMarketProjId}>
                <SelectTrigger id="mProj">
                  <SelectValue placeholder="Choose project..." />
                </SelectTrigger>
                <SelectContent>
                  {teamProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.status === 'Completed' ? ' (Completed)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mTitle">Listing Title *</Label>
              <Input id="mTitle" value={marketTitle} onChange={e => setMarketTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mDesc">Description</Label>
              <Textarea id="mDesc" value={marketDesc} onChange={e => setMarketDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mPrice">Price (UGX, 0 = free)</Label>
                <Input type="number" min={0} id="mPrice" value={marketPrice} onChange={e => setMarketPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mType">Type</Label>
                <Select value={marketType} onValueChange={(val) => setMarketType(val as MarketplaceItem['type'])}>
                  <SelectTrigger id="mType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="innovation">Innovation</SelectItem>
                    <SelectItem value="resources">Learning Resources</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="notes">Notes / Exam Prep</SelectItem>
                    <SelectItem value="open_source">Open Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMarketOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !marketProjId || !marketTitle.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Listing'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
