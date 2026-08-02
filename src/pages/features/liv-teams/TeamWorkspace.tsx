import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/DashboardShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Users, Calendar, FileText, Landmark, MessageSquare,
  Settings, TrendingUp, AlertCircle, ArrowLeft, Trophy,
  FileCheck, CalendarDays, Wallet, Activity, RefreshCw, Plus, Trash2, Shield
} from 'lucide-react';

import {
  getTeamById,
  updateTeam,
  deleteTeam,
  removeMemberFromTeam,
  updateMemberRole,
  getTeamActivityFeed,
  sendTeamInvitation
} from '@/services/livTeamsCoreService';
import { getTeamProjects } from '@/services/livTeamsProjectService';
import { getTeamMeetings } from '@/services/livTeamsChatService';
import type { Team, TeamMember, TeamRole, TeamProject, TeamMeeting } from '@/types/livTeams';

// Tabs Views Import
import TeamWorkspaceChat from './TeamWorkspaceChat';
import TeamWorkspaceResources from './TeamWorkspaceResources';
import TeamWorkspaceProjects from './TeamWorkspaceProjects';
import TeamWorkspaceCalendar from './TeamWorkspaceCalendar';
import TeamWorkspaceFinance from './TeamWorkspaceFinance';
import TeamWorkspacePolls from './TeamWorkspacePolls';
import TeamWorkspaceAnalytics from './TeamWorkspaceAnalytics';

export default function TeamWorkspace() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData, userRole } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('student_member');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  // Workspace summary metrics
  const [projectsCount, setProjectsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);

  useEffect(() => {
    loadTeamData();
  }, [teamId, currentUser]);

  const loadTeamData = async () => {
    if (!teamId || !currentUser) return;
    setLoading(true);
    try {
      const teamObj = await getTeamById(teamId);
      if (!teamObj) {
        toast.error('Team not found');
        navigate('/features/liv-teams');
        return;
      }

      // Verify role and permissions
      const isMember = teamObj.members.some(m => m.userId === currentUser.uid);
      if (teamObj.visibility !== 'public' && !isMember && userRole !== 'platform_admin') {
        toast.error('You do not have permission to view this private workspace');
        navigate('/features/liv-teams');
        return;
      }

      setTeam(teamObj);

      // Fetch activity logs
      const logs = await getTeamActivityFeed(teamId);
      setActivities(logs.slice(0, 10));

      // Fetch summary statistics
      const projects = await getTeamProjects(teamId);
      setProjectsCount(projects.length);

      const meetings = await getTeamMeetings(teamId);
      setMeetingsCount(meetings.length);

    } catch (error) {
      console.error('Error fetching team workspace data:', error);
      toast.error('Failed to load team workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !currentUser) return;
    if (!inviteEmail.trim()) return;

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
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteOpen(false);
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!team || !currentUser) return;
    try {
      await removeMemberFromTeam(team.id, member, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Member removed');
      loadTeamData();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handlePromoteMember = async (memberUserId: string, nextRole: TeamRole) => {
    if (!team || !currentUser) return;
    try {
      await updateMemberRole(team.id, memberUserId, nextRole, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Role updated');
      loadTeamData();
    } catch (error) {
      toast.error('Failed to promote member');
    }
  };

  const handleDeleteTeamWorkspace = async () => {
    if (!team) return;
    const ok = window.confirm('Are you absolutely sure you want to delete this Team Workspace? This will permanently delete chats, projects, and transactions.');
    if (!ok) return;

    try {
      await deleteTeam(team.id);
      toast.success('Team Workspace deleted successfully');
      navigate('/features/liv-teams');
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">Loading Team Workspace...</div>
    );
  }

  if (!team) return null;

  const currentMemberRole = team.members.find(m => m.userId === currentUser?.uid)?.role || 'guest';
  const isOwner = currentMemberRole === 'owner' || userRole === 'platform_admin';
  const isAdminOrOwner = isOwner || currentMemberRole === 'admin';

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Workspace Cover and Banner */}
      <div className="relative rounded-2xl overflow-hidden border shadow-glass bg-white dark:bg-slate-900">
        <div className="h-44 bg-gradient-to-r from-teal-500 to-indigo-600 relative">
          {team.coverUrl && <img src={team.coverUrl} className="w-full h-full object-cover" alt="Cover" />}
          <Button
            className="absolute top-4 left-4 bg-white/80 hover:bg-white text-slate-900 font-bold text-xs rounded-xl"
            onClick={() => navigate('/features/liv-teams')}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Teams Hub
          </Button>
        </div>

        <div className="p-6 pt-16 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          {/* Logo Container overlap */}
          <div className="absolute left-6 -top-12 w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-950 p-1 overflow-hidden shadow-2xl flex-shrink-0">
            {team.logoUrl ? (
              <img src={team.logoUrl} className="w-full h-full object-cover rounded-xl" alt="Logo" />
            ) : (
              <div className="w-full h-full rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-3xl">
                {team.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-black truncate">{team.name}</h2>
              <Badge variant="outline" className="capitalize bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {team.category}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                My Role: {currentMemberRole.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 max-w-2xl">{team.description}</p>
          </div>

          {isAdminOrOwner && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="rounded-xl font-bold">
                <Plus className="w-4 h-4 mr-1.5" /> Invite Member
              </Button>
              {isOwner && (
                <Button variant="destructive" size="sm" onClick={handleDeleteTeamWorkspace} className="rounded-xl font-bold">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workspace View Tabs */}
      <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1.5 bg-transparent h-auto p-0">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Shared Files
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> Projects & Tasks
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="finance" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5" /> Savings & Fund
          </TabsTrigger>
          <TabsTrigger value="polls" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs flex items-center gap-1">
            Polls
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl py-2 px-3 border text-xs flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* Sub-tab A: Dashboard Overview */}
        <TabsContent value="dashboard" className="outline-none space-y-6">

          {/* Quick Summary Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-xl border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3 justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Subscribed Members</p>
                  <p className="text-xl font-extrabold">{team.members.length} / {team.maxMembers}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3 justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Active Projects</p>
                  <p className="text-xl font-extrabold">{projectsCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500">
                  <FileCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3 justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Upcoming Meetings</p>
                  <p className="text-xl font-extrabold">{meetingsCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3 justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Savings Wallet Balance</p>
                  <p className="text-xl font-extrabold">UGX {(team.savingsBalance || 0).toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <Wallet className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Rules & Purpose */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-1.5">
                    <Shield className="w-5 h-5 text-emerald-500" /> Team Welcome & Purpose
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm italic">
                    "{team.welcomeMessage}"
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase text-slate-400">Team Goal</h4>
                    <p className="text-sm">{team.purpose || 'No educational purpose stated.'}</p>
                  </div>
                  {team.rules && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="font-bold text-xs uppercase text-slate-400">Workspace Rules</h4>
                      <p className="text-xs text-slate-500 whitespace-pre-line">{team.rules}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscribed Members Directory */}
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-500" /> Members Directory ({team.members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {team.members.map(member => {
                    const isOwnerRole = member.role === 'owner';
                    return (
                      <div key={member.userId} className="flex items-center justify-between p-4 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-sm flex items-center justify-center">
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-tight">{member.fullName}</p>
                            <p className="text-xs text-slate-400">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {member.role.replace('_', ' ')}
                          </Badge>

                          {isAdminOrOwner && member.userId !== currentUser?.uid && !isOwnerRole && (
                            <div className="flex gap-1">
                              <Button size="xs" variant="outline" className="text-xs py-0.5 px-2 h-7" onClick={() => handlePromoteMember(member.userId, 'admin')}>Make Admin</Button>
                              <Button size="xs" variant="ghost" className="text-red-500 text-xs p-1 h-7" onClick={() => handleRemoveMember(member)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Recent Activity Feed */}
            <div className="space-y-6">
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-1.5">
                    <Activity className="w-5 h-5 text-teal-500 animate-pulse" /> Activity Feed
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={loadTeamData}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {activities.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No workspace activities logged yet.</p>
                  ) : (
                    activities.map(act => (
                      <div key={act.id} className="flex gap-2.5 text-xs">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">
                            <span className="text-slate-900 dark:text-white font-bold">{act.userName}</span>{' '}
                            <span className="text-slate-500">{act.action}</span>{' '}
                            {act.targetName && <span className="text-emerald-500">"{act.targetName}"</span>}
                          </p>
                          <span className="text-[10px] text-slate-400">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

          </div>

        </TabsContent>

        {/* Sub-tab B: Rich WhatsApp-like Team Chat */}
        <TabsContent value="chat" className="outline-none h-[70vh] border rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
          <TeamWorkspaceChat teamId={team.id} teamName={team.name} teamRole={currentMemberRole} />
        </TabsContent>

        {/* Sub-tab C: Shared Library Folder Resource */}
        <TabsContent value="resources" className="outline-none">
          <TeamWorkspaceResources teamId={team.id} teamRole={currentMemberRole} />
        </TabsContent>

        {/* Sub-tab D: Projects & Milestones Task manager */}
        <TabsContent value="projects" className="outline-none">
          <TeamWorkspaceProjects teamId={team.id} teamRole={currentMemberRole} />
        </TabsContent>

        {/* Sub-tab E: Team Calendar & Meetings */}
        <TabsContent value="calendar" className="outline-none">
          <TeamWorkspaceCalendar teamId={team.id} teamRole={currentMemberRole} />
        </TabsContent>

        {/* Sub-tab F: Savings, Contributions Wallet, Crowdfunding & Marketplace publications */}
        <TabsContent value="finance" className="outline-none">
          <TeamWorkspaceFinance teamId={team.id} teamName={team.name} teamRole={currentMemberRole} />
        </TabsContent>

        {/* Sub-tab G: Polls & Interactive Voting */}
        <TabsContent value="polls" className="outline-none">
          <TeamWorkspacePolls teamId={team.id} teamRole={currentMemberRole} />
        </TabsContent>

        {/* Sub-tab H: Visual Analytics (charts) */}
        <TabsContent value="analytics" className="outline-none">
          <TeamWorkspaceAnalytics teamId={team.id} teamRole={currentMemberRole} />
        </TabsContent>

      </Tabs>
    </div>

    {/* Invitations Setup Dialog */}
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite Member to {team.name}</DialogTitle>
          <DialogDescription>
            Provide their email. They can immediately join from their notifications or invitations tab.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inviteEmail">User Email</Label>
            <Input id="inviteEmail" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="e.g. peer@school.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inviteRole">Workspace Role Assignment</Label>
            <select
              id="inviteRole"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as TeamRole)}
              className="w-full border rounded-xl p-2.5 text-sm dark:bg-slate-900"
            >
              <option value="student_member">Student Member</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="project_manager">Project Manager</option>
              <option value="treasurer">Treasurer</option>
              <option value="secretary">Secretary</option>
              <option value="teacher_mentor">Teacher Mentor</option>
              <option value="guest">Guest (Read Only)</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">Send invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
