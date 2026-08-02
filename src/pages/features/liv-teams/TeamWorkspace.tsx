import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Users, Calendar, FileText, Landmark, MessageSquare, TrendingUp,
  ArrowLeft, Trophy, CalendarDays, Wallet, Activity, Trash2,
  Shield, Loader2, LogIn, LogOut, Pencil, Lock, LayoutGrid, Megaphone,
  Globe, UserPlus
} from 'lucide-react';

import {
  subscribeToTeam,
  updateTeam,
  deleteTeam,
  removeMemberFromTeam,
  updateMemberRole,
  getTeamActivityFeed,
  sendTeamInvitation,
  joinPublicTeam,
  syncTeamMemberIds
} from '@/services/livTeamsCoreService';
import { getTeamProjects } from '@/services/livTeamsProjectService';
import { getTeamMeetings } from '@/services/livTeamsChatService';
import type { Team, TeamMember, TeamRole, TeamActivityFeedItem, TeamVisibility } from '@/types/livTeams';
import { LivLoader, LivSectionHeader, LivStatCard, TeamRoleBadge, TeamLogo } from './livTeamsUi';
import { formatUGX } from './livTeamsUtils';

// Workspace tab views
import TeamWorkspaceChat from './TeamWorkspaceChat';
import TeamWorkspaceResources from './TeamWorkspaceResources';
import TeamWorkspaceProjects from './TeamWorkspaceProjects';
import TeamWorkspaceCalendar from './TeamWorkspaceCalendar';
import TeamWorkspaceFinance from './TeamWorkspaceFinance';
import TeamWorkspacePolls from './TeamWorkspacePolls';
import TeamWorkspaceAnalytics from './TeamWorkspaceAnalytics';

const teamRoleOptions: { value: TeamRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'teacher_mentor', label: 'Teacher Mentor' },
  { value: 'student_member', label: 'Student Member' },
  { value: 'guest', label: 'Guest (read only)' },
];

export default function TeamWorkspace() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Invite state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('student_member');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Edit workspace state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<TeamVisibility>('public');
  const [editMaxMembers, setEditMaxMembers] = useState(50);
  const [editWelcome, setEditWelcome] = useState('');
  const [editRules, setEditRules] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Dashboard data
  const [activities, setActivities] = useState<TeamActivityFeedItem[]>([]);
  const [projectsCount, setProjectsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [joining, setJoining] = useState(false);

  // Real-time team subscription
  useEffect(() => {
    if (!teamId || !currentUser) return;
    setLoading(true);
    const unsubscribe = subscribeToTeam(
      teamId,
      (teamObj) => {
        if (!teamObj) {
          toast.error('Team not found');
          navigate('/features/liv-teams');
          return;
        }
        const isMember = teamObj.members.some(m => m.userId === currentUser.uid);
        if (teamObj.visibility !== 'public' && !isMember && userRole !== 'platform_admin') {
          setAccessDenied(true);
        } else {
          setAccessDenied(false);
          setTeam(teamObj);
          // Legacy migration: backfill memberIds for rules (owner only)
          if (teamObj.ownerId === currentUser.uid) {
            syncTeamMemberIds(teamObj.id);
          }
        }
        setLoading(false);
      },
      () => {
        // Firestore rejected the read (e.g. private team, not a member)
        setAccessDenied(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [teamId, currentUser, userRole, navigate]);

  const loadExtras = useCallback(async () => {
    if (!teamId) return;
    try {
      const [logs, projects, meetings] = await Promise.all([
        getTeamActivityFeed(teamId),
        getTeamProjects(teamId),
        getTeamMeetings(teamId)
      ]);
      setActivities(logs.slice(0, 10));
      setProjectsCount(projects.filter(p => p.status !== 'Archived').length);
      setMeetingsCount(meetings.length);
    } catch (error) {
      console.error('Error fetching workspace metrics:', error);
    }
  }, [teamId]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  /* ------------------------------ Actions ------------------------------ */

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !currentUser || !inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      await sendTeamInvitation({
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logoUrl,
        invitedEmail: inviteEmail.trim(),
        role: inviteRole,
        senderId: currentUser.uid,
        senderName: userData?.fullName || 'Anonymous'
      });
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteOpen(false);
    } catch {
      toast.error('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleJoin = async () => {
    if (!team || !currentUser || !userData) return;
    setJoining(true);
    try {
      await joinPublicTeam(team, currentUser.uid, userData.fullName || 'Anonymous', currentUser.email || '');
      toast.success(`Welcome to ${team.name}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team || !currentUser) return;
    const myMembership = team.members.find(m => m.userId === currentUser.uid);
    if (!myMembership) return;
    const ok = window.confirm(`Leave ${team.name}? You will need a new invitation to rejoin.`);
    if (!ok) return;
    try {
      await removeMemberFromTeam(team.id, myMembership, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('You left the team');
      navigate('/features/liv-teams');
    } catch {
      toast.error('Failed to leave team');
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!team || !currentUser) return;
    const ok = window.confirm(`Remove ${member.fullName} from the team?`);
    if (!ok) return;
    try {
      await removeMemberFromTeam(team.id, member, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleChangeRole = async (memberUserId: string, nextRole: TeamRole) => {
    if (!team || !currentUser) return;
    try {
      await updateMemberRole(team.id, memberUserId, nextRole, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Member role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteTeamWorkspace = async () => {
    if (!team) return;
    const ok = window.confirm('Permanently delete this team workspace? Chats, projects and records will be removed for everyone.');
    if (!ok) return;
    try {
      await deleteTeam(team.id);
      toast.success('Team workspace deleted');
      navigate('/features/liv-teams');
    } catch {
      toast.error('Failed to delete team');
    }
  };

  const openEditDialog = () => {
    if (!team) return;
    setEditName(team.name);
    setEditDescription(team.description || '');
    setEditVisibility(team.visibility);
    setEditMaxMembers(team.maxMembers || 50);
    setEditWelcome(team.welcomeMessage || '');
    setEditRules(team.rules || '');
    setEditOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !currentUser) return;
    setSavingEdit(true);
    try {
      await updateTeam(team.id, {
        name: editName.trim() || team.name,
        description: editDescription.trim(),
        visibility: editVisibility,
        maxMembers: Math.max(team.members.length, editMaxMembers || 50),
        welcomeMessage: editWelcome.trim(),
        rules: editRules.trim()
      }, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Workspace settings updated');
      setEditOpen(false);
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setSavingEdit(false);
    }
  };

  /* ------------------------------ Render guards ------------------------------ */

  if (loading) {
    return <LivLoader message="Loading team workspace..." />;
  }

  if (accessDenied || !team) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold">This workspace is private</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">You need an invitation from a team admin to access it.</p>
        </div>
        <Button variant="outline" className="rounded-lg" onClick={() => navigate('/features/liv-teams')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Liv Teams
        </Button>
      </div>
    );
  }

  const currentMember = team.members.find(m => m.userId === currentUser?.uid);
  const currentMemberRole: TeamRole = currentMember?.role || 'guest';
  const isOwner = currentMemberRole === 'owner' || userRole === 'platform_admin';
  const isAdminOrOwner = isOwner || currentMemberRole === 'admin';
  const isMember = !!currentMember;
  const canParticipate = isMember || userRole === 'platform_admin';
  const isFull = team.members.length >= (team.maxMembers || 50);

  const workspaceTabs = [
    { value: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" />, locked: false },
    { value: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" />, locked: !canParticipate },
    { value: 'members', label: 'Members', icon: <Users className="w-4 h-4" />, locked: false },
    { value: 'files', label: 'Files', icon: <FileText className="w-4 h-4" />, locked: !canParticipate },
    { value: 'projects', label: 'Projects', icon: <Trophy className="w-4 h-4" />, locked: !canParticipate },
    { value: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" />, locked: !canParticipate },
    { value: 'finance', label: 'Finance', icon: <Landmark className="w-4 h-4" />, locked: !canParticipate },
    { value: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" />, locked: !canParticipate },
    { value: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" />, locked: !canParticipate },
  ];

  return (
    <div className="space-y-6">

      {/* Workspace header */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="h-36 md:h-44 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 relative">
          {team.coverUrl && <img src={team.coverUrl} className="w-full h-full object-cover" alt={`${team.name} cover`} />}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 left-4 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow"
            onClick={() => navigate('/features/liv-teams')}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Liv Teams
          </Button>
          <Badge className="absolute top-4 right-4 bg-black/40 text-white border-0 backdrop-blur capitalize">
            {team.visibility}
          </Badge>
        </div>

        <div className="p-4 md:p-6 pt-14 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="absolute left-4 md:left-6 -top-10 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-950 shadow-xl overflow-hidden">
            <TeamLogo name={team.name} logoUrl={team.logoUrl} size="xl" />
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold truncate">{team.name}</h1>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 capitalize">
                {team.category}
              </Badge>
              {isMember && <TeamRoleBadge role={currentMemberRole} />}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">
              {team.description || team.purpose || 'A collaborative learning workspace.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {team.members.length}{team.maxMembers ? `/${team.maxMembers}` : ''} members</span>
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {team.country || 'Global'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {isAdminOrOwner && (
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="rounded-lg">
                <UserPlus className="w-4 h-4 mr-1.5" /> Invite
              </Button>
            )}
            {isAdminOrOwner && (
              <Button variant="outline" size="sm" onClick={openEditDialog} className="rounded-lg">
                <Pencil className="w-4 h-4 mr-1.5" /> Edit
              </Button>
            )}
            {isMember && !isOwner && (
              <Button variant="outline" size="sm" onClick={handleLeaveTeam} className="rounded-lg text-red-500 hover:text-red-600">
                <LogOut className="w-4 h-4 mr-1.5" /> Leave
              </Button>
            )}
            {isOwner && (
              <Button variant="destructive" size="icon-sm" onClick={handleDeleteTeamWorkspace} aria-label="Delete team">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Guest join banner */}
      {!canParticipate && team.visibility === 'public' && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">You're viewing this public team as a guest</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Join to chat, access files, projects, savings and more.</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex-shrink-0"
              disabled={joining || isFull}
              onClick={handleJoin}
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : isFull ? 'Team Full' : <><LogIn className="w-4 h-4 mr-1.5" /> Join Team</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Workspace tabs */}
      <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto gap-1 bg-transparent p-0 h-auto scrollbar-none">
          {workspaceTabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.locked}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 border border-transparent data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md disabled:opacity-50"
            >
              {tab.locked ? <Lock className="w-3.5 h-3.5" /> : tab.icon} {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ============================ DASHBOARD ============================ */}
        <TabsContent value="dashboard" className="outline-none space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <LivStatCard icon={<Users className="w-5 h-5" />} label="Members" value={`${team.members.length}${team.maxMembers ? `/${team.maxMembers}` : ''}`} color="emerald" />
            <LivStatCard icon={<Trophy className="w-5 h-5" />} label="Active Projects" value={projectsCount} color="blue" />
            <LivStatCard icon={<CalendarDays className="w-5 h-5" />} label="Meetings" value={meetingsCount} color="purple" />
            <LivStatCard icon={<Wallet className="w-5 h-5" />} label="Savings Balance" value={formatUGX(team.savingsBalance || 0)} color="orange" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-500" /> Welcome & Purpose
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {team.welcomeMessage && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-sm italic text-slate-600 dark:text-slate-300">
                      "{team.welcomeMessage}"
                    </div>
                  )}
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team goal</h4>
                    <p className="text-sm">{team.purpose || 'No purpose stated yet.'}</p>
                  </div>
                  {team.rules && (
                    <div className="space-y-1 pt-3 border-t border-gray-100 dark:border-white/5">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace rules</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line">{team.rules}</p>
                    </div>
                  )}
                  {(team.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {team.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2">#{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" /> Recent Activity
                  </CardTitle>
                  <CardDescription className="text-xs">Latest workspace actions by members</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No activity recorded yet.</p>
                  ) : (
                    activities.map(act => (
                      <div key={act.id} className="flex gap-2.5 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="leading-snug">
                            <span className="font-semibold">{act.userName}</span>{' '}
                            <span className="text-slate-500 dark:text-slate-400">{act.action}</span>{' '}
                            {act.targetName && <span className="text-emerald-600 dark:text-emerald-400 font-medium">"{act.targetName}"</span>}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {act.createdAt ? new Date(act.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============================ CHAT ============================ */}
        <TabsContent value="chat" className="outline-none">
          {canParticipate && (
            <div className="h-[70vh] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
              <TeamWorkspaceChat teamId={team.id} teamName={team.name} teamRole={currentMemberRole} />
            </div>
          )}
        </TabsContent>

        {/* ============================ MEMBERS ============================ */}
        <TabsContent value="members" className="outline-none space-y-6">
          <LivSectionHeader
            title={`Members (${team.members.length})`}
            subtitle="Roles control what each member can do inside this workspace."
          >
            {isAdminOrOwner && (
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Invite Member
              </Button>
            )}
          </LivSectionHeader>

          <Card>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-white/5">
              {team.members.map(member => {
                const memberIsOwner = member.role === 'owner';
                const isSelf = member.userId === currentUser?.uid;
                return (
                  <div key={member.userId} className="flex items-center justify-between gap-3 p-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {member.fullName} {isSelf && <span className="text-slate-400 font-normal">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdminOrOwner && !memberIsOwner && !isSelf ? (
                        <Select value={member.role} onValueChange={(val) => handleChangeRole(member.userId, val as TeamRole)}>
                          <SelectTrigger className="h-8 w-40 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {teamRoleOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <TeamRoleBadge role={member.role} />
                      )}
                      {isAdminOrOwner && !memberIsOwner && !isSelf && (
                        <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={() => handleRemoveMember(member)} aria-label={`Remove ${member.fullName}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================ FILES ============================ */}
        <TabsContent value="files" className="outline-none">
          {canParticipate && <TeamWorkspaceResources teamId={team.id} teamRole={currentMemberRole} />}
        </TabsContent>

        {/* ============================ PROJECTS ============================ */}
        <TabsContent value="projects" className="outline-none">
          {canParticipate && <TeamWorkspaceProjects teamId={team.id} teamRole={currentMemberRole} members={team.members} />}
        </TabsContent>

        {/* ============================ CALENDAR ============================ */}
        <TabsContent value="calendar" className="outline-none">
          {canParticipate && <TeamWorkspaceCalendar teamId={team.id} teamRole={currentMemberRole} />}
        </TabsContent>

        {/* ============================ FINANCE ============================ */}
        <TabsContent value="finance" className="outline-none">
          {canParticipate && <TeamWorkspaceFinance teamId={team.id} teamName={team.name} teamRole={currentMemberRole} savingsBalance={team.savingsBalance || 0} />}
        </TabsContent>

        {/* ============================ ANNOUNCEMENTS & POLLS ============================ */}
        <TabsContent value="announcements" className="outline-none">
          {canParticipate && <TeamWorkspacePolls teamId={team.id} teamRole={currentMemberRole} />}
        </TabsContent>

        {/* ============================ ANALYTICS ============================ */}
        <TabsContent value="analytics" className="outline-none">
          {canParticipate && <TeamWorkspaceAnalytics teamId={team.id} />}
        </TabsContent>
      </Tabs>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite to {team.name}</DialogTitle>
            <DialogDescription>
              They will see the invitation in their Liv Teams hub and can join with one tap.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendInvite} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email address</Label>
              <Input id="inviteEmail" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="member@school.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Workspace role</Label>
              <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as TeamRole)}>
                <SelectTrigger id="inviteRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamRoleOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={sendingInvite} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit workspace dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Workspace Settings</DialogTitle>
            <DialogDescription>Update the profile, visibility and rules of {team.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSettings} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wsName">Team Name</Label>
              <Input id="wsName" value={editName} onChange={e => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsDesc">Description</Label>
              <Textarea id="wsDesc" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wsVisibility">Visibility</Label>
                <Select value={editVisibility} onValueChange={(val) => setEditVisibility(val as TeamVisibility)}>
                  <SelectTrigger id="wsVisibility">
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
                <Label htmlFor="wsMax">Max Members</Label>
                <Input type="number" min={team.members.length} id="wsMax" value={editMaxMembers} onChange={e => setEditMaxMembers(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsWelcome">Welcome Message</Label>
              <Input id="wsWelcome" value={editWelcome} onChange={e => setEditWelcome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsRules">Team Rules</Label>
              <Textarea id="wsRules" value={editRules} onChange={e => setEditRules(e.target.value)} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
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
