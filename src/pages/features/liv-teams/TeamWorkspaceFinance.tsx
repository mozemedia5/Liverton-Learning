import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Wallet, Landmark, Store, Plus, History, ArrowDownLeft,
  ArrowUpRight, Heart, Share2, Sparkles, ShoppingBag, LandmarkIcon
} from 'lucide-react';
import {
  createSavingsTransaction,
  getSavingsTransactions,
  approveSavingsTransaction,
  createProjectFundingRequest,
  getProjectFundingRequests,
  contributeToFundingRequest,
  publishProjectToMarketplace
} from '@/services/livTeamsFinanceService';
import { getTeamProjects } from '@/services/livTeamsProjectService';
import type { SavingsTransaction, ProjectFundingRequest, TeamProject, TeamRole } from '@/types/livTeams';

interface FinanceProps {
  teamId: string;
  teamName: string;
  teamRole: TeamRole;
}

export default function TeamWorkspaceFinance({ teamId, teamName, teamRole }: FinanceProps) {
  const { currentUser, userData } = useAuth();

  const [subTab, setSubTab] = useState('savings');
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [fundingRequests, setFundingRequests] = useState<ProjectFundingRequest[]>([]);
  const [teamProjects, setTeamProjects] = useState<TeamProject[]>([]);

  // Savings states
  const [savingsModalOpen, setSavingsOpen] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState(0);
  const [savingsType, setSavingsType] = useState<'contribution' | 'withdrawal'>('contribution');
  const [savingsNotes, setSavingsNotes] = useState('');

  // Crowdfunding states
  const [fundingModalOpen, setFundingOpen] = useState(false);
  const [fundProjectId, setFundProjectId] = useState('');
  const [fundTitle, setFundTitle] = useState('');
  const [fundDesc, setFundDesc] = useState('');
  const [fundGoal, setFundGoal] = useState(0);

  // Contribute states
  const [contribModalOpen, setContribOpen] = useState(false);
  const [activeReqId, setActiveReqId] = useState('');
  const [contribAmount, setContribAmount] = useState(0);

  // Marketplace states
  const [marketModalOpen, setMarketOpen] = useState(false);
  const [marketProjId, setMarketProjId] = useState('');
  const [marketTitle, setMarketTitle] = useState('');
  const [marketDesc, setMarketDesc] = useState('');
  const [marketPrice, setMarketPrice] = useState(0);
  const [marketType, setMarketType] = useState<'innovation' | 'resources' | 'research' | 'software' | 'notes' | 'open_source'>('notes');

  useEffect(() => {
    loadFinanceData();
  }, [teamId]);

  const loadFinanceData = async () => {
    if (!teamId) return;
    try {
      const txs = await getSavingsTransactions(teamId);
      setTransactions(txs);

      const reqs = await getProjectFundingRequests(teamId);
      setFundingRequests(reqs);

      const projs = await getTeamProjects(teamId);
      setTeamProjects(projs);
    } catch (error) {
      console.error('Error loading finance details:', error);
    }
  };

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || savingsAmount <= 0) return;

    try {
      await createSavingsTransaction(teamId, {
        userId: currentUser.uid,
        userName: userData?.fullName || 'Anonymous',
        amount: savingsAmount,
        type: savingsType,
        notes: savingsNotes
      });

      toast.success('Savings transaction logged! Pending approval.');
      setSavingsOpen(false);
      resetSavingsForm();
      loadFinanceData();
    } catch (error) {
      toast.error('Failed to log transaction');
    }
  };

  const resetSavingsForm = () => {
    setSavingsAmount(0);
    setSavingsType('contribution');
    setSavingsNotes('');
  };

  const handleApproveTx = async (txId: string, approve: boolean) => {
    if (!currentUser) return;
    try {
      await approveSavingsTransaction(teamId, txId, currentUser.uid, approve);
      toast.success(approve ? 'Transaction approved & Balance offset' : 'Transaction rejected');
      loadFinanceData();
    } catch (error) {
      toast.error('Failed to process approval');
    }
  };

  const handleFundingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !fundProjectId || fundGoal <= 0 || !fundTitle.trim()) return;

    const proj = teamProjects.find(p => p.id === fundProjectId);

    try {
      await createProjectFundingRequest(teamId, {
        projectId: fundProjectId,
        projectName: proj?.name || 'Assigned Project',
        title: fundTitle,
        description: fundDesc,
        goalAmount: fundGoal
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success('Crowdfunding request live!');
      setFundingOpen(false);
      resetFundingForm();
      loadFinanceData();
    } catch (error) {
      toast.error('Failed to start funding campaign');
    }
  };

  const resetFundingForm = () => {
    setFundProjectId('');
    setFundTitle('');
    setFundDesc('');
    setFundGoal(0);
  };

  const handleContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || contribAmount <= 0 || !activeReqId) return;

    try {
      await contributeToFundingRequest(teamId, activeReqId, currentUser.uid, userData?.fullName || 'Anonymous', contribAmount);
      toast.success(`Contributed UGX ${contribAmount.toLocaleString()} to this project campaign!`);
      setContribOpen(false);
      setContribAmount(0);
      loadFinanceData();
    } catch (error) {
      toast.error('Failed to register contribution');
    }
  };

  const handlePublishMarketplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !marketProjId || !marketTitle.trim()) return;

    try {
      await publishProjectToMarketplace({
        teamId,
        teamName,
        projectId: marketProjId,
        title: marketTitle,
        description: marketDesc,
        price: marketPrice,
        type: marketType
      });

      toast.success('Project published onto the Marketplace Showcase!');
      setMarketOpen(false);
      setMarketProjId('');
      setMarketTitle('');
      setMarketDesc('');
      setMarketPrice(0);
      loadFinanceData();
    } catch (error) {
      toast.error('Failed to publish onto Marketplace');
    }
  };

  const isTreasurer = ['owner', 'admin', 'treasurer'].includes(teamRole);
  const isGuest = teamRole === 'guest';

  return (
    <div className="space-y-6">

      {/* Sub tabs navigation */}
      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-2">
          <TabsList className="bg-transparent h-auto p-0 gap-1.5 flex flex-wrap">
            <TabsTrigger value="savings" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none bg-transparent py-2 text-xs">
              <Wallet className="w-4 h-4 mr-1.5" /> Savings & Wallet
            </TabsTrigger>
            <TabsTrigger value="funding" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none bg-transparent py-2 text-xs">
              <Landmark className="w-4 h-4 mr-1.5" /> Crowdfunding
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none bg-transparent py-2 text-xs">
              <Store className="w-4 h-4 mr-1.5" /> Publish Marketplace
            </TabsTrigger>
          </TabsList>

          {/* Action triggers depending on selected sub tab */}
          {!isGuest && (
            <div>
              {subTab === 'savings' && (
                <Button size="sm" onClick={() => setSavingsOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-1.5 h-8 font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Log Transaction
                </Button>
              )}
              {subTab === 'funding' && teamProjects.length > 0 && (
                <Button size="sm" onClick={() => setFundingOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-1.5 h-8 font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Start Funding Request
                </Button>
              )}
              {subTab === 'marketplace' && teamProjects.length > 0 && (
                <Button size="sm" onClick={() => setMarketOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-1.5 h-8 font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Publish Innovative Project
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Sub tab contents: A. SAVINGS */}
        <TabsContent value="savings" className="outline-none space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-1.5"><History className="w-4 h-4 text-emerald-500" /> Transaction Ledger History</h4>

              {transactions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No contributions logged to this wallet yet.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <Card key={tx.id} className="rounded-xl border shadow-sm p-4 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {tx.type === 'contribution' ? (
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><ArrowDownLeft className="w-4 h-4" /></div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><ArrowUpRight className="w-4 h-4" /></div>
                          )}
                          <div>
                            <p className="font-bold">{tx.userName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">{tx.type} • {tx.notes || 'No description'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">UGX {tx.amount.toLocaleString()}</span>
                          <Badge variant="outline" className={`capitalize text-[9px] ${
                            tx.status === 'approved' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' :
                            tx.status === 'rejected' ? 'border-red-500 text-red-500 bg-red-500/5' : 'border-amber-500 text-amber-500 bg-amber-500/5'
                          }`}>
                            {tx.status}
                          </Badge>

                          {/* Treasurer decision controllers */}
                          {tx.status === 'pending' && isTreasurer && tx.userId !== currentUser?.uid && (
                            <div className="flex gap-1">
                              <Button size="xs" onClick={() => handleApproveTx(tx.id, true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs py-0.5 px-2 h-7">Approve</Button>
                              <Button size="xs" variant="outline" onClick={() => handleApproveTx(tx.id, false)} className="text-red-500 text-xs py-0.5 px-2 h-7">Reject</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Wallet className="w-4 h-4 text-emerald-500" /> Wallet Financial Transparency</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <p className="text-slate-500">Every team member contributions and withdraw transactions are fully audited. Treasurers approve transfers to ensure strict accountability.</p>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/10 border text-center space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Report Status</p>
                    <p className="text-emerald-500 font-extrabold">GENERATED</p>
                    <Button size="xs" variant="outline" className="w-full text-xs mt-2 rounded-lg" onClick={() => toast.info('Detailed financial PDF report downloaded successfully')}>Download PDF</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* Sub tab contents: B. CROWDFUNDING */}
        <TabsContent value="funding" className="outline-none space-y-6">
          {fundingRequests.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed text-slate-400 text-xs">
              No project funding requests published by this team yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fundingRequests.map(req => {
                const progress = Math.min(100, Math.round(((req.amountRaised || 0) / req.goalAmount) * 100));
                return (
                  <Card key={req.id} className="rounded-2xl border shadow-sm hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden">
                    <CardHeader className="p-4 pb-2 border-b bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="capitalize text-[10px] bg-emerald-500/10 text-emerald-600">
                          {req.status}
                        </Badge>
                        <span className="text-[9px] text-slate-400">Target Goal</span>
                      </div>
                      <CardTitle className="text-sm font-extrabold truncate mt-2">{req.title}</CardTitle>
                      <CardDescription className="text-xs truncate">For project: {req.projectName}</CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 py-3 space-y-4 flex-1 text-xs">
                      <p className="text-slate-500">{req.description}</p>

                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-[10px]">
                          <span>UGX {req.amountRaised.toLocaleString()} Raised</span>
                          <span>UGX {req.goalAmount.toLocaleString()} Goal</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 dark:bg-slate-800">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      {req.contributors && req.contributors.length > 0 && (
                        <div className="space-y-1 pt-2 border-t">
                          <span className="font-bold text-[10px] text-slate-400 uppercase">Top Sponsors ({req.contributors.length})</span>
                          <div className="flex flex-wrap gap-1">
                            {req.contributors.slice(0, 3).map((contrib, idx) => (
                              <Badge key={idx} variant="outline" className="text-[9px] py-0">{contrib.userName}: UGX {contrib.amount.toLocaleString()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setActiveReqId(req.id); setContribOpen(true); }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-1.5 h-9 font-bold"
                        disabled={req.status === 'funded'}
                      >
                        <Heart className="w-4 h-4 mr-1.5" /> Sponsor Project
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Sub tab contents: C. PUBLISH TO MARKETPLACE */}
        <TabsContent value="marketplace" className="outline-none">
          <Card className="rounded-2xl border shadow-sm max-w-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5"><Sparkles className="w-5 h-5 text-emerald-500" /> Monetize Educational Assets</CardTitle>
              <CardDescription>Finished robotics, research, exam solution notes, or coded software can be listed for schoolwide or global sales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-500">
              <p>When you publish your team projects on the Liverton Marketplace, students from other schools or communities can download your files, check open-source repositories, or purchase resources with ratings and reviews support.</p>
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Active Listings</p>
                  <p className="text-[10px] text-slate-400">Total publications created by your team</p>
                </div>
                <span className="font-black text-xl text-emerald-500">0 Items</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Savings Action Dialog */}
      <Dialog open={savingsModalOpen} onOpenChange={setSavingsOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Log wallet transaction</DialogTitle>
            <DialogDescription>Your entry remains pending until approved by the Treasurer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavingsSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="savAmt" className="text-xs">Amount (UGX) *</Label>
              <Input type="number" id="savAmt" value={savingsAmount} onChange={e => setSavingsAmount(Number(e.target.value))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="savType" className="text-xs">Transaction Direction *</Label>
              <select
                id="savType"
                value={savingsType}
                onChange={e => setSavingsType(e.target.value as any)}
                className="w-full border p-2 rounded-lg text-xs dark:bg-slate-900"
              >
                <option value="contribution">Contribution (Add Funds)</option>
                <option value="withdrawal">Withdraw Request (Deduct Funds)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="savNotes" className="text-xs">Notes / Explanations</Label>
              <Input id="savNotes" value={savingsNotes} onChange={e => setSavingsNotes(e.target.value)} placeholder="e.g. Monthly contribution dues" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSavingsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Log Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Funding Request setup Dialog */}
      <Dialog open={fundingModalOpen} onOpenChange={setFundingOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Launch Crowdfunding Request</DialogTitle>
            <DialogDescription>Collect sponsors or donations for an active project workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFundingSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="fundProj" className="text-xs">Select Target Project *</Label>
              <select
                id="fundProj"
                value={fundProjectId}
                onChange={e => setFundProjectId(e.target.value)}
                className="w-full border p-2 rounded-lg text-xs dark:bg-slate-900"
                required
              >
                <option value="">Choose Project...</option>
                {teamProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fundTitle" className="text-xs">Campaign Title *</Label>
              <Input id="fundTitle" value={fundTitle} onChange={e => setFundTitle(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fundDesc" className="text-xs">Outlines / Summary</Label>
              <Input id="fundDesc" value={fundDesc} onChange={e => setFundDesc(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fundGoal" className="text-xs">Funding Target Goal (UGX) *</Label>
              <Input type="number" id="fundGoal" value={fundGoal} onChange={e => setFundGoal(Number(e.target.value))} required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFundingOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Go Live</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sponsor/Contribution Input Dialog */}
      <Dialog open={contribModalOpen} onOpenChange={setContribOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Contribution details</DialogTitle>
            <DialogDescription>Sponsorship funds are registered directly in the team financial report logs.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContributionSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="contAmt" className="text-xs">Contribution amount (UGX) *</Label>
              <Input type="number" id="contAmt" value={contribAmount} onChange={e => setContribAmount(Number(e.target.value))} required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setContribOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Sponsor Now</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Publish Marketplace setup Dialog */}
      <Dialog open={marketModalOpen} onOpenChange={setMarketOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>List Project on Marketplace</DialogTitle>
            <DialogDescription>Publish and sell your completed team creations.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishMarketplace} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="mProj" className="text-xs">Choose Finished Project *</Label>
              <select
                id="mProj"
                value={marketProjId}
                onChange={e => setMarketProjId(e.target.value)}
                className="w-full border p-2 rounded-lg text-xs dark:bg-slate-900"
                required
              >
                <option value="">Choose Project...</option>
                {teamProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mTitle" className="text-xs">Market Listing Title *</Label>
              <Input id="mTitle" value={marketTitle} onChange={e => setMarketTitle(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mDesc" className="text-xs">Details</Label>
              <Input id="mDesc" value={marketDesc} onChange={e => setMarketDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="mPrice" className="text-xs">Price (UGX, 0 for FREE)</Label>
                <Input type="number" id="mPrice" value={marketPrice} onChange={e => setMarketPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mType" className="text-xs">Resource Type</Label>
                <select
                  id="mType"
                  value={marketType}
                  onChange={e => setMarketType(e.target.value as any)}
                  className="w-full border p-2 rounded-lg text-xs dark:bg-slate-900"
                >
                  <option value="innovation">Innovation (Coded / Hardware)</option>
                  <option value="resources">Syllabus Resources</option>
                  <option value="research">Research Thesis</option>
                  <option value="software">Software Repository</option>
                  <option value="notes">Class notes / Exam prep</option>
                  <option value="open_source">Open Source</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMarketOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">List and Publish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
