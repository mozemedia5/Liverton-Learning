import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Compass, Bookmark, Store, Landmark,
  Settings as SettingsIcon, Globe, Languages, Mail, ArrowRight,
  Loader2, Pencil, Trash2, Download, Star, Heart, LayoutGrid, LogIn, Sparkles
} from 'lucide-react';
import { enhanceTextWithHanna } from '@/lib/hannaGemini';
import {
  getTeamsForUser,
  getInvitationsForUser,
  respondToInvitation,
  toggleSaveTeam,
  updateTeam,
  deleteTeam,
  teamCategories,
  requestToJoinTeam
} from '@/services/livTeamsCoreService';
import {
  getMarketplaceItems,
  getProjectFundingRequests,
  recordMarketplaceDownload
} from '@/services/livTeamsFinanceService';
import type { Team, TeamInvitation, MarketplaceItem, ProjectFundingRequest, TeamVisibility } from '@/types/livTeams';
import {
  LivLoader, LivEmptyState, LivSectionHeader, LivStatCard,
  TeamRoleBadge, TeamLogo
} from './livTeamsUi';
import { formatUGX } from './livTeamsUtils';
import TeamCreationWizard from './TeamCreationWizard';
import { CloudinaryImage } from '@/components/CloudinaryImage';
import BannerCarousel from '@/components/BannerCarousel';
import LivTeamsPromotionRail from '@/components/LivTeamsPromotionRail';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { submitLivTeamPromotion } from '@/services/livTeamsPromotionService';
import { SEO } from '@/components/SEO';

type FundingWithTeam = ProjectFundingRequest & { teamName: string };

export default function LivTeams() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, userData, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState('home');
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [fundingItems, setFundingItems] = useState<FundingWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);

  // Creation wizard state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [promotionUploading, setPromotionUploading] = useState(false);
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotionForm, setPromotionForm] = useState({ title: '', description: '', imageUrl: '', destinationUrl: '', expiresAt: '' });

  // Edit team state (Settings tab)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<TeamVisibility>('public');
  const [editMaxMembers, setEditMaxMembers] = useState(50);
  const [editWelcome, setEditWelcome] = useState('');
  const [editRules, setEditRules] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [enhancingDescription, setEnhancingDescription] = useState(false);

  const handlePromotionImageUpload = async (file: File) => {
    if (!currentUser) return;
    setPromotionUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file, 'image', {
        userId: currentUser.uid,
        referenceId: 'liv-team-promotion',
        purpose: 'liv_team_promotion',
        showErrorToast: false,
      });
      setPromotionForm((form) => ({ ...form, imageUrl }));
      toast.success('Promotion image uploaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload promotion image.');
    } finally {
      setPromotionUploading(false);
    }
  };

  const handlePromotionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !userData || myTeams.length === 0) return;
    if (!promotionForm.title.trim() || !promotionForm.description.trim() || !promotionForm.destinationUrl.trim()) {
      toast.error('Add a title, description, and destination link.');
      return;
    }
    setPromotionSaving(true);
    try {
      const team = myTeams[0];
      await submitLivTeamPromotion({
        teamId: team.id,
        teamName: team.name,
        createdBy: currentUser.uid,
        createdByName: userData.fullName || currentUser.displayName || 'Team member',
        title: promotionForm.title.trim(),
        description: promotionForm.description.trim(),
        imageUrl: promotionForm.imageUrl.trim(),
        destinationUrl: promotionForm.destinationUrl.trim(),
        expiresAt: promotionForm.expiresAt ? new Date(`${promotionForm.expiresAt}T23:59:59`) : null,
      });
      toast.success('Promotion submitted for platform review.');
      setPromotionDialogOpen(false);
      setPromotionForm({ title: '', description: '', imageUrl: '', destinationUrl: '', expiresAt: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit promotion.');
    } finally {
      setPromotionSaving(false);
    }
  };

  const handleEnhanceDescriptionWithHanna = async () => {
    if (!editDescription.trim()) {
      toast.info('Please draft a quick description first!');
      return;
    }
    setEnhancingDescription(true);
    try {
      const enhanced = await enhanceTextWithHanna(editDescription, 'team_description');
      setEditDescription(enhanced);
      toast.success('✨ Description enhanced with Hanna AI!');
    } catch {
      toast.error('Failed to enhance description.');
    } finally {
      setEnhancingDescription(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [allTeams, invites, mItems] = await Promise.all([
        getTeamsForUser(currentUser.uid),
        getInvitationsForUser(currentUser.email || ''),
        getMarketplaceItems()
      ]);
      setTeams(allTeams);
      setInvitations(invites);
      setMarketplaceItems(mItems);

      // Gather open funding campaigns across teams the user belongs to
      const mine = allTeams.filter(t => t.members.some(m => m.userId === currentUser.uid));
      const fundingLists = await Promise.all(
        mine.map(async t => {
          try {
            const reqs = await getProjectFundingRequests(t.id);
            return reqs.map(r => ({ ...r, teamName: t.name }));
          } catch {
            return [] as FundingWithTeam[];
          }
        })
      );
      setFundingItems(fundingLists.flat());
    } catch (error) {
      console.error('Error loading Liv Teams data:', error);
      toast.error('Failed to load Liv Teams data');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get('tab') === 'invitations') setActiveTab('invitations');
  }, [searchParams]);

  /* ------------------------------ Actions ------------------------------ */

  const handleTeamCreated = (teamId: string) => {
    loadData();
    navigate(`/features/liv-teams/workspace/${teamId}`);
  };

  const handleJoinTeam = async (team: Team) => {
    if (!currentUser || !userData) return;
    setJoiningTeamId(team.id);
    try {
      await requestToJoinTeam(team.id, currentUser.uid, userData.fullName || 'Anonymous', currentUser.email || '');
      toast.success(`Your request to join "${team.name}" has been sent! An owner or admin will review and approve it.`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send join request');
      loadData();
    } finally {
      setJoiningTeamId(null);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!currentUser) return;
    try {
      const invitation = invitations.find((invite) => invite.id === inviteId);
      await respondToInvitation(inviteId, true, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Joined team successfully!');
      await loadData();
      if (invitation?.teamId) navigate(`/features/liv-teams/workspace/${invitation.teamId}`);
    } catch {
      toast.error('Error joining team');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await respondToInvitation(inviteId, false, '', '');
      toast.success('Invitation declined');
      loadData();
    } catch {
      toast.error('Error declining invitation');
    }
  };

  const handleToggleSave = async (teamId: string) => {
    if (!currentUser) return;
    try {
      const saved = await toggleSaveTeam(teamId, currentUser.uid);
      toast.success(saved ? 'Added to Saved Teams' : 'Removed from Saved Teams');
      loadData();
    } catch {
      toast.error('Failed to update save status');
    }
  };

  const handleGetMarketplaceItem = async (item: MarketplaceItem) => {
    await recordMarketplaceDownload(item.id, item.price > 0);
    if (item.fileUrl) {
      window.open(item.fileUrl, '_blank', 'noopener,noreferrer');
      toast.success(item.price > 0 ? 'Purchase recorded. Opening files...' : 'Downloading files...');
    } else {
      toast.info('This listing has no downloadable files yet. Contact the team for access.');
    }
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditDescription(team.description || '');
    setEditVisibility(team.visibility);
    setEditMaxMembers(team.maxMembers || 50);
    setEditWelcome(team.welcomeMessage || '');
    setEditRules(team.rules || '');
  };

  const handleSaveTeamSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !currentUser) return;
    setSavingEdit(true);
    try {
      await updateTeam(editingTeam.id, {
        name: editName.trim() || editingTeam.name,
        description: editDescription.trim(),
        visibility: editVisibility,
        maxMembers: 1000,
        welcomeMessage: editWelcome.trim(),
        rules: editRules.trim()
      }, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Team settings updated');
      setEditingTeam(null);
      loadData();
    } catch {
      toast.error('Failed to update team settings');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    const ok = window.confirm(`Delete "${team.name}" permanently? This removes the workspace for all members.`);
    if (!ok) return;
    try {
      await deleteTeam(team.id);
      toast.success('Team deleted');
      loadData();
    } catch {
      toast.error('Failed to delete team');
    }
  };

  /* ------------------------------ Derived data ------------------------------ */

  const myTeams = useMemo(() => {
    if (!currentUser) return [];
    return teams.filter(t => t.members.some(m => m.userId === currentUser.uid));
  }, [teams, currentUser]);

  const discoverTeams = useMemo(() => {
    if (!currentUser) return [];
    return teams.filter(t => t.visibility === 'public' && (t.status || 'active') === 'active' && !t.members.some(m => m.userId === currentUser.uid));
  }, [teams, currentUser]);

  const savedTeams = useMemo(() => {
    if (!currentUser) return [];
    return teams.filter(t => t.savedByUsers?.includes(currentUser.uid));
  }, [teams, currentUser]);

  const ownedTeams = useMemo(() => {
    if (!currentUser) return [];
    return teams.filter(t => t.ownerId === currentUser.uid);
  }, [teams, currentUser]);

  const filteredDiscover = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return discoverTeams.filter(t => {
      const categoryMatches = categoryFilter === 'All' || t.category === categoryFilter;
      if (!categoryMatches) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    });
  }, [discoverTeams, searchQuery, categoryFilter]);

  const openFundingItems = useMemo(
    () => fundingItems.filter(f => f.status === 'active'),
    [fundingItems]
  );

  /* ------------------------------ Shared renderers ------------------------------ */

  const renderTeamCard = (team: Team, mode: 'discover' | 'mine' | 'saved' | 'home') => {
    const myMembership = team.members.find(m => m.userId === currentUser?.uid);
    const isSaved = team.savedByUsers?.includes(currentUser?.uid || '');
    const isFull = team.members.length >= 1000;

    if (mode === 'discover') {
      return (
        <Card key={team.id} className="liv-team-card liv-team-card-discover border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0a0a0f]/40 backdrop-blur-md hover:shadow-md transition-all duration-200">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex-shrink-0"><TeamLogo name={team.name} logoUrl={team.logoUrl} size="md" /></div>
            <div className="min-w-0 flex-1"><CardTitle className="text-sm font-extrabold truncate text-slate-800 dark:text-slate-100">{team.name}</CardTitle><p className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3 h-3 text-emerald-500" /> {team.members.length} member{team.members.length !== 1 ? 's' : ''}</p></div>
            <Button size="icon" variant="ghost" aria-label={isSaved ? 'Unsave team' : 'Save team'} onClick={() => handleToggleSave(team.id)} className={`w-8 h-8 rounded-full flex-shrink-0 ${isSaved ? 'text-amber-500' : 'text-slate-400'}`}><Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} /></Button>
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs h-8 px-3 font-bold flex-shrink-0" disabled={isFull || joiningTeamId === team.id} onClick={() => handleJoinTeam(team)}>{joiningTeamId === team.id ? <Loader2 className="w-3 h-3 animate-spin" /> : isFull ? 'Full' : 'Join'}</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={team.id} className="liv-team-card overflow-hidden flex flex-col justify-between">
        <div>
          <div className="relative">
            <CloudinaryImage
              src={team.coverUrl}
              alt={`${team.name} cover`}
              aspect="3/1"
              widths={[320, 640, 960]}
              sizes="(max-width: 768px) 100vw, 33vw"
              fallback={<div className="w-full h-full bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5" />}
            />
            <Badge className="absolute top-3 right-3 z-10 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 capitalize border-0">
              {team.category}
            </Badge>
          </div>

          <CardHeader className="pt-0 pb-2 flex flex-row items-center gap-3">
            <div className="-mt-8 relative z-10 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-950 shadow-md overflow-hidden flex-shrink-0">
              <TeamLogo name={team.name} logoUrl={team.logoUrl} size="lg" />
            </div>
            <div className="min-w-0 pt-2">
              <CardTitle className="text-base font-bold truncate">{team.name}</CardTitle>
              <CardDescription className="text-xs truncate">{team.purpose || team.category}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 py-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
              {team.description || 'A collaborative learning workspace on Liverton Learning.'}
            </p>
            {(team.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {team.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2">#{tag}</Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {team.country || 'Global'}</span>
              <span className="flex items-center gap-1"><Languages className="w-3.5 h-3.5" /> {team.language || 'English'}</span>
            </div>
          </CardContent>
        </div>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3 pb-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-500" />
            {team.members.length}{team.maxMembers ? ` / ${team.maxMembers}` : ''} members
          </span>
          <div className="flex items-center gap-1.5">
            {mode === 'mine' && (
              <>
                <TeamRoleBadge role={myMembership?.role} className="mr-1 hidden sm:inline-flex" />
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                  onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}
                >
                  Open <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </>
            )}
            {mode === 'saved' && (
              <>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleToggleSave(team.id)}>
                  Unsave
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                  onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}
                >
                  View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </>
            )}
            {mode === 'home' && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}
              >
                View <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  /* ------------------------------ Render ------------------------------ */

  return (
    <div className="liv-livteams-page space-y-6">
      <SEO title="Liv Teams" description="Collaborative workspaces for revision groups, clubs, projects, savings and innovation on Liverton Learning." noIndex />

      {/* Page header */}
          <Card className="liv-livteams-header">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-glow flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Liv Teams</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Collaborative workspaces for revision groups, clubs, projects, savings and innovation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {myTeams.length > 0 && (
              <Button
                variant="outline"
                className="rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                onClick={() => setPromotionDialogOpen(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" /> Promote your team
              </Button>
            )}
            {myTeams.length === 0 && (
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md flex-shrink-0"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Create Team
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platform Banners for Liv Teams */}
      <BannerCarousel pageScope="liv_teams" />
      <LivTeamsPromotionRail />

      {/* Sleek Tab Navigation Bar with Dropdown View Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-emerald-500/20 font-semibold rounded-xl text-xs h-10">
              <SelectValue placeholder="Select section..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-emerald-500/20">
              <SelectItem value="home"><span className="inline-flex items-center gap-2"><LayoutGrid className="w-3.5 h-3.5" /> Home Overview</span></SelectItem>
              <SelectItem value="my-teams"><span className="inline-flex items-center gap-2"><Users className="w-3.5 h-3.5" /> My Teams ({myTeams.length})</span></SelectItem>
              <SelectItem value="discover"><span className="inline-flex items-center gap-2"><Compass className="w-3.5 h-3.5" /> Discover Teams</span></SelectItem>
              <SelectItem value="invitations"><span className="inline-flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Invitations ({invitations.length})</span></SelectItem>
              <SelectItem value="saved"><span className="inline-flex items-center gap-2"><Bookmark className="w-3.5 h-3.5" /> Saved Teams ({savedTeams.length})</span></SelectItem>
              <SelectItem value="marketplace"><span className="inline-flex items-center gap-2"><Store className="w-3.5 h-3.5" /> Marketplace</span></SelectItem>
              <SelectItem value="funding"><span className="inline-flex items-center gap-2"><Landmark className="w-3.5 h-3.5" /> Funding Campaigns</span></SelectItem>
              <SelectItem value="settings"><span className="inline-flex items-center gap-2"><SettingsIcon className="w-3.5 h-3.5" /> Settings</span></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="hidden" aria-label="Liv Teams sections">
          {[
            { value: 'home', label: 'Home', icon: <LayoutGrid className="w-4 h-4" /> },
            { value: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
            { value: 'my-teams', label: 'My Teams', icon: <Users className="w-4 h-4" /> },
            { value: 'invitations', label: 'Invitations', icon: <Mail className="w-4 h-4" />, count: invitations.length },
            { value: 'saved', label: 'Saved', icon: <Bookmark className="w-4 h-4" /> },
            { value: 'marketplace', label: 'Marketplace', icon: <Store className="w-4 h-4" /> },
            { value: 'funding', label: 'Funding', icon: <Landmark className="w-4 h-4" /> },
            { value: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 border border-transparent data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              {tab.icon} {tab.label}
              {!!tab.count && tab.count > 0 && (
                <span className="ml-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ============================ HOME ============================ */}
        <TabsContent value="home" className="space-y-6 outline-none">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <LivStatCard icon={<Users className="w-5 h-5" />} label="My Teams" value={myTeams.length} color="emerald" />
            <LivStatCard icon={<Mail className="w-5 h-5" />} label="Pending Invites" value={invitations.length} color="blue" />
            <LivStatCard icon={<Bookmark className="w-5 h-5" />} label="Saved Teams" value={savedTeams.length} color="amber" />
            <LivStatCard icon={<Store className="w-5 h-5" />} label="Marketplace Items" value={marketplaceItems.length} color="purple" />
          </div>

          {/* MY TEAMS DISPLAYED FIRST WHEN USER HAS TEAMS */}
          {myTeams.length > 0 && (
            <div className="space-y-4">
              <LivSectionHeader title="Your Workspaces" subtitle="Teams you belong to. Click to open your workspace.">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setActiveTab('my-teams')}>
                  View all ({myTeams.length}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </LivSectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTeams.slice(0, 6).map(team => renderTeamCard(team, 'mine'))}
              </div>
            </div>
          )}

          {/* QUICK ACTION CARDS (CREATE TEAM POSITIONED CLEANLY BELOW EXISTING TEAMS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer group hover:border-emerald-500/30 transition-all" onClick={() => setCreateDialogOpen(true)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Create New Team</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Start a club, revision room or project hub</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer group" onClick={() => setActiveTab('discover')}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Discover Teams</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Join public learning communities</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer group" onClick={() => setActiveTab('marketplace')}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Marketplace</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Explore team innovations & resources</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <LivSectionHeader title="New Public Teams" subtitle="Recently created communities you can join.">
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setActiveTab('discover')}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </LivSectionHeader>
            {loading ? (
              <LivLoader message="Loading teams..." />
            ) : discoverTeams.length === 0 ? (
              <LivEmptyState
                icon={<Compass className="w-6 h-6" />}
                title="No public teams yet"
                description="Be the first to create a public learning team for others to join."
              >
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Create Team
                </Button>
              </LivEmptyState>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discoverTeams.slice(0, 6).map(team => renderTeamCard(team, 'home'))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============================ DISCOVER ============================ */}
        <TabsContent value="discover" className="space-y-6 outline-none">
          <LivSectionHeader title="Discover Teams" subtitle="Find public learning teams by name, category or tag.">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search teams..."
                className="pl-10 rounded-xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </LivSectionHeader>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['All', ...teamCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  categoryFilter === cat
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-emerald-500/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <LivLoader message="Loading teams..." />
          ) : filteredDiscover.length === 0 ? (
            <LivEmptyState
              icon={<Search className="w-6 h-6" />}
              title="No teams found"
              description={searchQuery || categoryFilter !== 'All'
                ? 'Try adjusting your search or category filter.'
                : 'No public teams are available to join right now. Create one!'}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDiscover.map(team => renderTeamCard(team, 'discover'))}
            </div>
          )}
        </TabsContent>

        {/* ============================ MY TEAMS ============================ */}
        <TabsContent value="my-teams" className="space-y-6 outline-none">
          <LivSectionHeader title="My Teams" subtitle="Workspaces you own or participate in." />
          {loading ? (
            <LivLoader message="Loading your teams..." />
          ) : myTeams.length === 0 ? (
            <LivEmptyState
              icon={<Users className="w-6 h-6" />}
              title="You haven't joined any teams yet"
              description="Discover public teams or create your own workspace."
            >
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setActiveTab('discover')}>Discover Teams</Button>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Create Team
                </Button>
              </div>
            </LivEmptyState>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTeams.map(team => renderTeamCard(team, 'mine'))}
            </div>
          )}
        </TabsContent>

        {/* ============================ INVITATIONS ============================ */}
        <TabsContent value="invitations" className="space-y-6 outline-none">
          <LivSectionHeader title="Invitations" subtitle="Accept an invitation to join a team workspace instantly." />
          {loading ? (
            <LivLoader message="Loading invitations..." />
          ) : invitations.length === 0 ? (
            <LivEmptyState
              icon={<Mail className="w-6 h-6" />}
              title="No pending invitations"
              description="When someone invites you to a team, it will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map(invite => (
                <Card key={invite.id}>
                  <CardHeader className="flex flex-row items-center gap-3 pb-3">
                    <TeamLogo name={invite.teamName} logoUrl={invite.teamLogo} size="md" className="rounded-full" />
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-bold truncate">{invite.teamName}</CardTitle>
                      <CardDescription className="text-xs">
                        Invited by {invite.senderName} as <TeamRoleBadge role={invite.role} className="ml-1" />
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-white/5 pt-3 pb-3">
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeclineInvite(invite.id)}>
                      Decline
                    </Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => handleAcceptInvite(invite.id)}>
                      Accept & Join
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================ SAVED ============================ */}
        <TabsContent value="saved" className="space-y-6 outline-none">
          <LivSectionHeader title="Saved Teams" subtitle="Bookmarked teams you want to revisit." />
          {loading ? (
            <LivLoader message="Loading saved teams..." />
          ) : savedTeams.length === 0 ? (
            <LivEmptyState
              icon={<Bookmark className="w-6 h-6" />}
              title="No saved teams"
              description="Tap the bookmark icon on any public team in Discover to save it here."
            >
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setActiveTab('discover')}>Discover Teams</Button>
            </LivEmptyState>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTeams.map(team => renderTeamCard(team, 'saved'))}
            </div>
          )}
        </TabsContent>

        {/* ============================ MARKETPLACE ============================ */}
        <TabsContent value="marketplace" className="space-y-6 outline-none">
          <LivSectionHeader title="Marketplace" subtitle="Innovations, notes, research and software published by learning teams." />
          {loading ? (
            <LivLoader message="Loading marketplace..." />
          ) : marketplaceItems.length === 0 ? (
            <LivEmptyState
              icon={<Store className="w-6 h-6" />}
              title="Nothing published yet"
              description="Completed team projects can be published to the marketplace from inside a team workspace."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplaceItems.map(item => {
                const ratings = item.ratings || [];
                const avgRating = ratings.length > 0
                  ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
                  : 0;
                return (
                  <Card key={item.id} className="overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="relative">
                        <CloudinaryImage
                          src={item.coverUrl}
                          alt={item.title}
                          aspect="3/1"
                          widths={[320, 640, 960]}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          fallback={<div className="w-full h-full bg-gradient-to-tr from-emerald-500/10 to-teal-500/10" />}
                        />
                        <Badge className="absolute top-2 right-2 z-10 capitalize bg-emerald-500 text-white text-[10px] border-0">
                          {(item.type || 'notes').replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardHeader className="p-4 pb-1">
                        <CardTitle className="text-sm font-bold truncate">{item.title}</CardTitle>
                        <CardDescription className="text-xs truncate">By {item.teamName}</CardDescription>
                      </CardHeader>
                      <CardContent className="px-4 py-2 space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">{item.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Star className={`w-3.5 h-3.5 ${avgRating > 0 ? 'text-amber-400 fill-current' : ''}`} />
                            {avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'} ({ratings.length})
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" /> {item.downloadsCount || 0}
                          </span>
                        </div>
                      </CardContent>
                    </div>
                    <CardFooter className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 p-4">
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {item.price === 0 ? 'FREE' : formatUGX(item.price)}
                      </span>
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                        onClick={() => handleGetMarketplaceItem(item)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        {item.price > 0 ? 'Purchase' : 'Download'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============================ FUNDING ============================ */}
        <TabsContent value="funding" className="space-y-6 outline-none">
          <LivSectionHeader title="Funding Campaigns" subtitle="Open crowdfunding and sponsorship requests from your teams." />
          {loading ? (
            <LivLoader message="Loading funding campaigns..." />
          ) : myTeams.length === 0 ? (
            <LivEmptyState
              icon={<Landmark className="w-6 h-6" />}
              title="Join a team first"
              description="Funding campaigns are created inside team workspaces. Join or create a team to get started."
            />
          ) : openFundingItems.length === 0 ? (
            <LivEmptyState
              icon={<Landmark className="w-6 h-6" />}
              title="No active funding campaigns"
              description="Open a team workspace and start a funding request from the Finance tab to support your projects."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openFundingItems.map(req => {
                const progress = Math.min(100, Math.round(((req.amountRaised || 0) / Math.max(1, req.goalAmount)) * 100));
                return (
                  <Card key={req.id} className="flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="capitalize text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                          {req.status}
                        </Badge>
                        <span className="text-[11px] text-slate-400 truncate">{req.teamName}</span>
                      </div>
                      <CardTitle className="text-sm font-bold truncate mt-1">{req.title}</CardTitle>
                      <CardDescription className="text-xs truncate">Project: {req.projectName}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-emerald-600 dark:text-emerald-400">{formatUGX(req.amountRaised || 0)} raised</span>
                        <span className="text-slate-400">{formatUGX(req.goalAmount)}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-gray-100 dark:border-white/5 p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-lg"
                        onClick={() => navigate(`/features/liv-teams/workspace/${req.teamId}`)}
                      >
                        <Heart className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Open Workspace to Sponsor
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============================ SETTINGS ============================ */}
        <TabsContent value="settings" className="space-y-6 outline-none">
          <LivSectionHeader title="Liv Teams Settings" subtitle="Manage the teams you own and review your collaboration profile." />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Teams you own ({ownedTeams.length})</h4>
              {loading ? (
                <LivLoader message="Loading your teams..." />
              ) : ownedTeams.length === 0 ? (
                <LivEmptyState
                  icon={<SettingsIcon className="w-6 h-6" />}
                  title="You don't own any teams"
                  description="Teams you create will appear here for quick management."
                >
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Create Team
                  </Button>
                </LivEmptyState>
              ) : (
                <div className="space-y-3">
                  {ownedTeams.map(team => (
                    <Card key={team.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <TeamLogo name={team.name} logoUrl={team.logoUrl} size="md" />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{team.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {team.members.length} members • <span className="capitalize">{team.visibility}</span> • Max {team.maxMembers}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}>
                            Open
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openEditDialog(team)}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteTeam(team)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
                  <CardTitle className="text-sm font-semibold">Your Collaboration Profile</CardTitle>
                  <CardDescription className="text-xs">Current account capabilities in Liv Teams</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Account role</span>
                    <span className="font-semibold capitalize">{userRole?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Teams joined</span>
                    <span className="font-semibold">{myTeams.length}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Teams allowed</span>
                    <span className="font-semibold">Unlimited</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Media storage</span>
                    <span className="font-semibold text-emerald-500">Verified Cloud Storage</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================ TEAM CREATION WIZARD ============================ */}
      <TeamCreationWizard
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleTeamCreated}
      />


      {/* ============================ PROMOTION SUBMISSION DIALOG ============================ */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Promote your Liv Team</DialogTitle>
            <DialogDescription>
              Submit an image, message, and destination link. A Platform Administrator must approve it before it appears publicly.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePromotionSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="promotionTitle">Promotion title</Label>
              <Input id="promotionTitle" value={promotionForm.title} onChange={e => setPromotionForm(form => ({ ...form, title: e.target.value }))} maxLength={80} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotionDescription">Description</Label>
              <Textarea id="promotionDescription" value={promotionForm.description} onChange={e => setPromotionForm(form => ({ ...form, description: e.target.value }))} maxLength={240} rows={4} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotionUrl">Destination link</Label>
              <Input id="promotionUrl" type="url" placeholder="https://your-team.example" value={promotionForm.destinationUrl} onChange={e => setPromotionForm(form => ({ ...form, destinationUrl: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotionImage">Promotional image (optional)</Label>
              <Input id="promotionImage" type="file" accept="image/*" disabled={promotionUploading} onChange={e => { const file = e.target.files?.[0]; if (file) void handlePromotionImageUpload(file); }} />
              {promotionUploading && <p className="text-xs text-slate-500">Uploading image securely…</p>}
              {promotionForm.imageUrl && <img src={promotionForm.imageUrl} alt="Promotion preview" className="h-28 w-full rounded-xl object-cover" />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotionExpiry">Expiry date (optional)</Label>
              <Input id="promotionExpiry" type="date" min={new Date().toISOString().split('T')[0]} value={promotionForm.expiresAt} onChange={e => setPromotionForm(form => ({ ...form, expiresAt: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromotionDialogOpen(false)} disabled={promotionSaving}>Cancel</Button>
              <Button type="submit" disabled={promotionSaving || promotionUploading}>{promotionSaving ? <Loader2 className="animate-spin" /> : 'Submit for review'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================ EDIT TEAM DIALOG ============================ */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team Settings</DialogTitle>
            <DialogDescription>Update the public profile and rules of {editingTeam?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTeamSettings} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName">Team Name</Label>
              <Input id="editName" value={editName} onChange={e => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editDesc">Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={enhancingDescription || !editDescription.trim()}
                  onClick={handleEnhanceDescriptionWithHanna}
                  className="h-6 text-[10px] text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 gap-1 font-bold rounded-md px-2"
                >
                  {enhancingDescription ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                  )}
                  Generate with Hanna
                </Button>
              </div>
              <Textarea id="editDesc" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editVisibility">Visibility</Label>
                <Select value={editVisibility} onValueChange={(val) => setEditVisibility(val as TeamVisibility)}>
                  <SelectTrigger id="editVisibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="invite-only">Invite only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2"><Label>Team capacity</Label><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Up to 1,000 members</p></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editWelcome">Welcome Message</Label>
              <Input id="editWelcome" value={editWelcome} onChange={e => setEditWelcome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRules">Team Rules</Label>
              <Textarea id="editRules" value={editRules} onChange={e => setEditRules(e.target.value)} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingTeam(null)}>Cancel</Button>
              <Button type="submit" disabled={savingEdit} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {savingEdit ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
