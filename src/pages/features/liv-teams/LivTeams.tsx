import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/DashboardShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Compass, Shield, Bookmark,
  Store, Landmark, Settings as SettingsIcon, MapPin,
  Globe, Languages, Eye, ShieldCheck, Mail, ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  createTeam,
  getAllTeams,
  getInvitationsForUser,
  respondToInvitation,
  toggleSaveTeam,
  teamCategories
} from '@/services/livTeamsCoreService';
import { getMarketplaceItems } from '@/services/livTeamsFinanceService';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import type { Team, TeamInvitation, MarketplaceItem } from '@/types/livTeams';

export default function LivTeams() {
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState('home');
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Creation State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Science');
  const [purpose, setPurpose] = useState('');
  const [country, setCountry] = useState('Uganda');
  const [school, setSchool] = useState('');
  const [district, setDistrict] = useState('');
  const [language, setLanguage] = useState('English');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite-only'>('public');
  const [maxMembers, setMaxMembers] = useState(50);
  const [rules, setRules] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome to the Team!');
  const [tagsText, setTagsText] = useState('');

  // Upload loaders
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const allTeams = await getAllTeams();
      setTeams(allTeams);

      const invites = await getInvitationsForUser(currentUser.email || '');
      setInvitations(invites);

      const mItems = await getMarketplaceItems();
      setMarketplaceItems(mItems);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load Liv Teams data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setLogoUploading(true);
    try {
      const url = await uploadToCloudinary(e.target.files[0], 'image');
      setLogoUrl(url);
      toast.success('Logo uploaded successfully');
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to upload cover image');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;
    if (!teamName.trim()) {
      toast.error('Team Name is required');
      return;
    }

    try {
      const teamId = await createTeam({
        name: teamName,
        logoUrl,
        coverUrl,
        description,
        category,
        purpose,
        country,
        school,
        district,
        language,
        visibility,
        maxMembers,
        rules,
        welcomeMessage,
        tags: tagsText.split(',').map(t => t.trim()).filter(Boolean)
      }, currentUser.uid, userData.fullName || 'Anonymous', currentUser.email || '');

      toast.success('Team Created Successfully!');
      setCreateDialogOpen(false);
      resetCreateForm();
      loadData();
      navigate(`/features/liv-teams/workspace/${teamId}`);
    } catch (error) {
      toast.error('Failed to create team');
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

  const handleAcceptInvite = async (inviteId: string) => {
    if (!currentUser) return;
    try {
      await respondToInvitation(inviteId, true, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Joined team successfully!');
      loadData();
    } catch (error) {
      toast.error('Error joining team');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await respondToInvitation(inviteId, false, '', '');
      toast.success('Invitation declined');
      loadData();
    } catch (error) {
      toast.error('Error declining invitation');
    }
  };

  const handleToggleSave = async (teamId: string) => {
    if (!currentUser) return;
    try {
      const saved = await toggleSaveTeam(teamId, currentUser.uid);
      toast.success(saved ? 'Added to Saved Teams' : 'Removed from Saved Teams');
      loadData();
    } catch (error) {
      toast.error('Failed to update save status');
    }
  };

  const myTeams = useMemo(() => {
    if (!currentUser) return [];
    return teams.filter(t => t.members.some(m => m.userId === currentUser.uid));
  }, [teams, currentUser]);

  const discoverTeams = useMemo(() => {
    if (!currentUser) return [];
    // Show public teams that user is not yet a member of
    return teams.filter(t => t.visibility === 'public' && !t.members.some(m => m.userId === currentUser.uid));
  }, [teams, currentUser]);

  const savedTeams = useMemo(() => {
    if (!currentUser) return [];
    return teams.filter(t => t.savedByUsers?.includes(currentUser.uid));
  }, [teams, currentUser]);

  const filteredDiscover = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return discoverTeams;
    return discoverTeams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }, [discoverTeams, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 shadow-glass backdrop-blur-xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
            Collaborate and Learn Together
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create student revision rooms, clubs, project management hubs, savings wallets, and publish student projects to the marketplace.
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Set Up Liv Team Workspace</DialogTitle>
              <DialogDescription>
                Enter workspace configurations. Your team workspace is immediately ready with dashboards, files, group-chats, milestones, and savings options.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName" className="font-semibold text-xs">Team Name *</Label>
                  <Input id="teamName" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Science Project Team" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="font-semibold text-xs">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
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
                  <Label className="font-semibold text-xs">Team Logo (JPEG/PNG)</Label>
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                  {logoUploading && <p className="text-xs text-slate-400">Uploading...</p>}
                  {logoUrl && <img src={logoUrl} className="w-16 h-16 rounded-lg object-cover border" alt="Logo preview" />}
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Cover Banner</Label>
                  <Input type="file" accept="image/*" onChange={handleCoverUpload} />
                  {coverUploading && <p className="text-xs text-slate-400">Uploading...</p>}
                  {coverUrl && <img src={coverUrl} className="w-32 h-16 rounded-lg object-cover border" alt="Cover preview" />}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold text-xs">Description</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short outline of what this team is all about..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose" className="font-semibold text-xs">Team Purpose / Goal</Label>
                <Input id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Preparing for Physics National Olympiad" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country" className="font-semibold text-xs">Country</Label>
                  <Input id="country" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school" className="font-semibold text-xs">School Name (Optional)</Label>
                  <Input id="school" value={school} onChange={e => setSchool(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district" className="font-semibold text-xs">District (Optional)</Label>
                  <Input id="district" value={district} onChange={e => setDistrict(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="font-semibold text-xs">Primary Language</Label>
                  <Input id="language" value={language} onChange={e => setLanguage(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visibility" className="font-semibold text-xs">Visibility</Label>
                  <Select value={visibility} onValueChange={(val: any) => setVisibility(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (Anyone can see & join)</SelectItem>
                      <SelectItem value="private">Private (Only viewable by members)</SelectItem>
                      <SelectItem value="invite-only">Invite Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxMembers" className="font-semibold text-xs">Max Members Allowed</Label>
                  <Input type="number" id="maxMembers" value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rules" className="font-semibold text-xs">Team Rules / Code of Conduct</Label>
                <Textarea id="rules" value={rules} onChange={e => setRules(e.target.value)} placeholder="Be polite, submit assignments on time..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome" className="font-semibold text-xs">Custom Welcome Message</Label>
                <Input id="welcome" value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="font-semibold text-xs">Tags (comma separated)</Label>
                <Input id="tags" value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="science, physics, homework" />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Create Team Workspace</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 h-auto bg-transparent p-0">
          <TabsTrigger value="home" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-3 border">
            <Compass className="w-4 h-4 mr-2" /> Home
          </TabsTrigger>
          <TabsTrigger value="my-teams" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-3 border">
            <Users className="w-4 h-4 mr-2" /> My Teams
          </TabsTrigger>
          <TabsTrigger value="invitations" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-3 border relative">
            <Mail className="w-4 h-4 mr-2" /> Invitations
            {invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-bold text-[10px] flex items-center justify-center animate-bounce">
                {invitations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="saved" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-3 border">
            <Bookmark className="w-4 h-4 mr-2" /> Saved
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-3 border">
            <Store className="w-4 h-4 mr-2" /> Marketplace
          </TabsTrigger>
          <TabsTrigger value="funding" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-3 border">
            <Landmark className="w-4 h-4 mr-2" /> Funding
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-3 border">
            <SettingsIcon className="w-4 h-4 mr-2" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Home / Discover Tab */}
        <TabsContent value="home" className="space-y-6 outline-none">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Discover Public Learning Teams</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Join other teachers, students, and clubs around the globe.</p>
            </div>
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search teams by name, tag, category..."
                className="pl-10 pr-4 py-2 rounded-xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">Loading teams...</div>
          ) : filteredDiscover.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed text-slate-400">
              No teams found matching your query. Be the first to start a new one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDiscover.map(team => (
                <Card key={team.id} className="overflow-hidden rounded-2xl hover:shadow-xl transition-all border border-slate-200 dark:border-white/10 flex flex-col justify-between">
                  <div>
                    {/* Cover Image fallback */}
                    <div className="h-28 bg-gradient-to-r from-teal-500/20 to-blue-500/20 relative">
                      {team.coverUrl && (
                        <img src={team.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                      )}
                      <Badge className="absolute top-3 right-3 bg-white/80 backdrop-blur text-slate-900 capitalize border">
                        {team.category}
                      </Badge>
                    </div>

                    <CardHeader className="pt-3 pb-2 relative flex flex-row items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl border bg-white dark:bg-slate-950 p-1 -mt-10 z-10 overflow-hidden shadow-lg flex-shrink-0">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} className="w-full h-full object-cover rounded-xl" alt="Logo" />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                            {team.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-bold truncate">{team.name}</CardTitle>
                        <CardDescription className="text-xs truncate">{team.purpose}</CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 py-2">
                      <p className="text-xs text-slate-500 line-clamp-2">{team.description}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {team.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2">#{tag}</Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {team.country}</span>
                        <span className="flex items-center gap-1"><Languages className="w-3.5 h-3.5" /> {team.language}</span>
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter className="flex items-center justify-between border-t bg-slate-50/50 dark:bg-slate-950/20 pt-3 pb-3">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {team.members.length} / {team.maxMembers} Members
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleSave(team.id)}
                        className={team.savedByUsers?.includes(currentUser?.uid || '') ? 'text-amber-500' : 'text-slate-400'}
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
                        onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}
                      >
                        View Team <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Teams Tab */}
        <TabsContent value="my-teams" className="space-y-6 outline-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">My Subscribed Teams</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Teams you participate in as student, moderator, teacher, or admin.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">Loading your teams...</div>
          ) : myTeams.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed text-slate-400 space-y-3">
              <p>You haven't joined any teams yet.</p>
              <Button variant="outline" onClick={() => setActiveTab('home')}>Discover Teams</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTeams.map(team => {
                const myMembership = team.members.find(m => m.userId === currentUser?.uid);
                return (
                  <Card key={team.id} className="overflow-hidden rounded-2xl hover:shadow-xl transition-all border border-emerald-500/20 flex flex-col justify-between">
                    <div>
                      <div className="h-24 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 relative">
                        {team.coverUrl && (
                          <img src={team.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                        )}
                        <Badge className="absolute top-3 right-3 bg-emerald-500 text-white capitalize">
                          My Role: {myMembership?.role?.replace('_', ' ')}
                        </Badge>
                      </div>

                      <CardHeader className="pt-3 pb-2 relative flex flex-row items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl border bg-white dark:bg-slate-950 p-1 -mt-8 z-10 overflow-hidden shadow-lg flex-shrink-0">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} className="w-full h-full object-cover rounded-xl" alt="Logo" />
                          ) : (
                            <div className="w-full h-full rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-base">
                              {team.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-bold truncate">{team.name}</CardTitle>
                          <CardDescription className="text-xs truncate">{team.purpose}</CardDescription>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2 py-2">
                        <p className="text-xs text-slate-500 line-clamp-2">{team.description}</p>
                      </CardContent>
                    </div>

                    <CardFooter className="flex items-center justify-between border-t bg-slate-50/50 dark:bg-slate-950/20 pt-3 pb-3">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-4 h-4 text-emerald-500" />
                        {team.members.length} Members
                      </span>
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
                        onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}
                      >
                        Enter Workspace <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-6 outline-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Pending Invitations</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Accept invitations from peers or instructors to access workspaces.</p>
          </div>

          {invitations.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed text-slate-400">
              You have no pending invitations.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map(invite => (
                <Card key={invite.id} className="rounded-2xl border-emerald-500/20 shadow-sm flex flex-col justify-between">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="w-12 h-12 rounded-full border bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                      {invite.teamLogo ? <img src={invite.teamLogo} className="w-full h-full rounded-full object-cover" /> : invite.teamName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">Invite to join: {invite.teamName}</CardTitle>
                      <CardDescription className="text-xs">
                        Sent by {invite.senderName} • Invited to be <Badge variant="secondary" className="capitalize">{invite.role.replace('_', ' ')}</Badge>
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-end gap-2 border-t pt-3 pb-3">
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeclineInvite(invite.id)}>Decline</Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleAcceptInvite(invite.id)}>Accept & Join</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Saved Tab */}
        <TabsContent value="saved" className="space-y-6 outline-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Saved / Bookmarked Teams</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Easily find learning spaces you wish to watch or revisit.</p>
          </div>

          {savedTeams.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed text-slate-400">
              No saved teams. Click on the bookmark icon on any public team card to save it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedTeams.map(team => (
                <Card key={team.id} className="overflow-hidden rounded-2xl border flex flex-col justify-between">
                  <div>
                    <div className="h-24 bg-gradient-to-r from-blue-500/10 to-indigo-500/10" />
                    <CardHeader className="pt-3 pb-2 flex flex-row items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold -mt-8 shadow-md">
                        {team.name.charAt(0)}
                      </div>
                      <CardTitle className="text-sm font-bold truncate">{team.name}</CardTitle>
                    </CardHeader>
                  </div>
                  <CardFooter className="flex items-center justify-between border-t pt-2 pb-2">
                    <Button size="xs" variant="ghost" className="text-red-500 text-xs" onClick={() => handleToggleSave(team.id)}>Unsave</Button>
                    <Button size="xs" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => navigate(`/features/liv-teams/workspace/${team.id}`)}>Enter Team</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-6 outline-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Marketplace / Innovations Showcase</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Explore finished innovative software, notes, and previous assignments solved by learning teams.</p>
          </div>

          {marketplaceItems.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed text-slate-400">
              No marketplace products published yet. Compile team projects and list them on the marketplace!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketplaceItems.map(item => (
                <Card key={item.id} className="rounded-2xl border hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden">
                  <div className="h-28 bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 relative">
                    {item.coverUrl && <img src={item.coverUrl} className="w-full h-full object-cover" />}
                    <Badge className="absolute top-2 right-2 capitalize bg-emerald-500 text-white text-[10px]">
                      {item.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardHeader className="p-4 pb-1">
                    <CardTitle className="text-sm font-bold truncate">{item.title}</CardTitle>
                    <CardDescription className="text-xs truncate">By {item.teamName}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 py-2">
                    <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t p-4 bg-slate-50/50 dark:bg-slate-900/10">
                    <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      {item.price === 0 ? 'FREE' : `UGX ${item.price.toLocaleString()}`}
                    </span>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs" onClick={() => toast.success('Downloaded / Purchased successfully')}>
                      Get Project Files
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Funding Tab */}
        <TabsContent value="funding" className="space-y-6 outline-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Funding Opportunities</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Teams can request resources or sponsorships for school activities, robotics championships, or savings groups.</p>
          </div>
          <div className="p-8 text-center rounded-2xl border border-dashed text-slate-400">
            Enter any Workspace team to log crowdfunding requests or sponsors contributors.
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 outline-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Liv Teams Hub Configurations</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Review team preferences, maximum member caps, or visibility settings.</p>
          </div>
          <Card className="rounded-2xl max-w-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Workspace Status</CardTitle>
              <CardDescription>Details about your current collaboration limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b pb-2">
                <span>Current Account Role</span>
                <span className="font-bold capitalize">{userRole?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b pb-2">
                <span>Teams Allowed</span>
                <span className="font-bold">Unlimited</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Cloud Storage Presets</span>
                <span className="font-bold text-emerald-500">Configured (Cloudinary)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
