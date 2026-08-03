import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Loader2, Pencil, Trash2, Download, Star, Heart, LayoutGrid, LogIn
} from 'lucide-react';
import {
  createTeam,
  getAllTeams,
  getInvitationsForUser,
  respondToInvitation,
  toggleSaveTeam,
  joinPublicTeam,
  updateTeam,
  deleteTeam,
  teamCategories
} from '@/services/livTeamsCoreService';
import {
  getMarketplaceItems,
  getProjectFundingRequests,
  recordMarketplaceDownload
} from '@/services/livTeamsFinanceService';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import type { Team, TeamInvitation, MarketplaceItem, ProjectFundingRequest, TeamVisibility } from '@/types/livTeams';
import {
  LivLoader, LivEmptyState, LivSectionHeader, LivStatCard,
  TeamRoleBadge, TeamLogo
} from './livTeamsUi';
import { formatUGX } from './livTeamsUtils';

type FundingWithTeam = ProjectFundingRequest & { teamName: string };

export default function LivTeams() {
  const navigate = useNavigate();
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

  // Creation state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Science');
  const [purpose, setPurpose] = useState('');
  const [country, setCountry] = useState('Uganda');
  const [school, setSchool] = useState('');
  const [district, setDistrict] = useState('');
  const [language, setLanguage] = useState('English');
  const [visibility, setVisibility] = useState<TeamVisibility>('public');
  const [maxMembers, setMaxMembers] = useState(50);
  const [rules, setRules] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome to the Team!');
  const [tagsText, setTagsText] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  // Edit team state (Settings tab)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<TeamVisibility>('public');
  const [editMaxMembers, setEditMaxMembers] = useState(50);
  const [editWelcome, setEditWelcome] = useState('');
  const [editRules, setEditRules] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [allTeams, invites, mItems] = await Promise.all([
        getAllTeams(),
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

  /* ------------------------------ Actions ------------------------------ */

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setLogoUploading(true);
    try {
      const url = await uploadToCloudinary(e.target.files[0], 'image');
      setLogoUrl(url);
      toast.success('Logo uploaded successfully');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setCoverUploading(true);
    try {
      const url = await uploadToCloudinary(e.target.files[0], 'image');
      setCoverUrl(url);
      toast.success('Cover image uploaded successfully');
    } catch {
      toast.error('Failed to upload cover image');
    } finally {
      setCoverUploading(false);
    }
  };

  const resetCreateForm = () => {
    setTeamName('');
    setDescription('');
    setCategory('Science');
    setPurpose('');
    setCountry('Uganda');
    setSchool('');
    setDistrict('');
    setLanguage('English');
    setVisibility('public');
    setMaxMembers(50);
    setRules('');
    setWelcomeMessage('Welcome to the Team!');
    setTagsText('');
    setLogoUrl('');
    setCoverUrl('');
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;
    if (!teamName.trim()) {
      toast.error('Team Name is required');
      return;
    }
    if (logoUploading || coverUploading) {
      toast.error('Please wait for uploads to finish');
      return;
    }

    setCreating(true);
    try {
      const teamId = await createTeam({
        name: teamName.trim(),
        logoUrl,
        coverUrl,
        description: description.trim(),
        category,
        purpose: purpose.trim(),
        country: country.trim() || 'Global',
        school: school.trim(),
        district: district.trim(),
        language: language.trim() || 'English',
        visibility,
        maxMembers: Math.max(1, maxMembers || 50),
        rules: rules.trim(),
        welcomeMessage: welcomeMessage.trim() || 'Welcome to the Team!',
        tags: tagsText.split(',').map(t => t.trim()).filter(Boolean)
      }, currentUser.uid, userData.fullName || 'Anonymous', currentUser.email || '');

      toast.success('Team created successfully! Your workspace is ready.');
      setCreateDialogOpen(false);
      resetCreateForm();
      navigate(`/features/liv-teams/workspace/${teamId}`);
    } catch {
      toast.error('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeam = async (team: Team) => {
    if (!currentUser || !userData) return;
    setJoiningTeamId(team.id);
    try {
      await joinPublicTeam(team, currentUser.uid, userData.fullName || 'Anonymous', currentUser.email || '');
      toast.success(`Welcome to ${team.name}!`);
      navigate(`/features/liv-teams/workspace/${team.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join team');
      loadData();
    } finally {
      setJoiningTeamId(null);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!currentUser) return;
    try {
      await respondToInvitation(inviteId, true, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Joined team successfully!');
      loadData();
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
        maxMembers: Math.max(editingTeam.members.length, editMaxMembers || 50),
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
    return teams.filter(t => t.visibility === 'public' && !t.members.some(m => m.userId === currentUser.uid));
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
    const isFull = team.members.length >= (team.maxMembers || 50);

    return (
      <Card key={team.id} className="overflow-hidden flex flex-col justify-between">
        <div>
          <div className="h-24 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 relative">
            {team.coverUrl && (
              <img src={team.coverUrl} className="w-full h-full object-cover" alt={`${team.name} cover`} />
            )}
            <Badge className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 capitalize border-0">
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
            {mode === 'discover' && (
              <>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={isSaved ? 'Unsave team' : 'Save team'}
                  onClick={() => handleToggleSave(team.id)}
                  className={isSaved ? 'text-amber-500' : 'text-slate-400'}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                  disabled={isFull || joiningTeamId === team.id}
                  onClick={() => handleJoinTeam(team)}
                >
                  {joiningTeamId === team.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <><LogIn className="w-3.5 h-3.5 mr-1" /> {isFull ? 'Team Full' : 'Join Team'}</>
                  )}
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
    <div className="space-y-6">

      {/* Page header */}
      <Card>
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
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md flex-shrink-0"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Team
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto gap-1 bg-transparent p-0 h-auto scrollbar-none">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer group" onClick={() => setCreateDialogOpen(true)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Create a Team</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <div className="h-24 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 relative">
                        {item.coverUrl && <img src={item.coverUrl} className="w-full h-full object-cover" alt={item.title} />}
                        <Badge className="absolute top-2 right-2 capitalize bg-emerald-500 text-white text-[10px] border-0">
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
                    <span className="font-semibold text-emerald-500">Cloudinary (configured)</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================ CREATE TEAM DIALOG ============================ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create a Liv Team</DialogTitle>
            <DialogDescription>
              Your workspace is generated instantly with a dashboard, chat, projects, files, calendar, savings wallet and analytics.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name *</Label>
                <Input id="teamName" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Science Project Team" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamLogo">Team Logo (image)</Label>
                <Input id="teamLogo" type="file" accept="image/*" onChange={handleLogoUpload} />
                {logoUploading && <p className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading logo...</p>}
                {logoUrl && <img src={logoUrl} className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-white/10" alt="Logo preview" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamCover">Cover Image (image)</Label>
                <Input id="teamCover" type="file" accept="image/*" onChange={handleCoverUpload} />
                {coverUploading && <p className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading cover...</p>}
                {coverUrl && <img src={coverUrl} className="w-32 h-16 rounded-xl object-cover border border-gray-200 dark:border-white/10" alt="Cover preview" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this team about?" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Team Purpose / Goal</Label>
              <Input id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Preparing for the Physics National Olympiad" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={e => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School (optional)</Label>
                <Input id="school" value={school} onChange={e => setSchool(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District (optional)</Label>
                <Input id="district" value={district} onChange={e => setDistrict(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Primary Language</Label>
                <Input id="language" value={language} onChange={e => setLanguage(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={visibility} onValueChange={(val) => setVisibility(val as TeamVisibility)}>
                  <SelectTrigger id="visibility">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public — anyone can join</SelectItem>
                    <SelectItem value="private">Private — members only</SelectItem>
                    <SelectItem value="invite-only">Invite only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMembers">Max Members</Label>
                <Input type="number" min={1} id="maxMembers" value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">Team Rules / Code of Conduct</Label>
              <Textarea id="rules" value={rules} onChange={e => setRules(e.target.value)} placeholder="Be respectful, submit work on time..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="welcome">Welcome Message</Label>
                <Input id="welcome" value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="science, physics, revision" />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating || logoUploading || coverUploading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Team Workspace'}
              </Button>
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
              <Label htmlFor="editDesc">Description</Label>
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
              <div className="space-y-2">
                <Label htmlFor="editMax">Max Members</Label>
                <Input type="number" min={editingTeam?.members.length || 1} id="editMax" value={editMaxMembers} onChange={e => setEditMaxMembers(Number(e.target.value))} />
              </div>
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
