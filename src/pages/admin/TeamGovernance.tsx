import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield, AlertTriangle, Users, Gavel, Loader2, Search, Eye, CheckCircle,
  XCircle, Ban, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllTeams, suspendTeam, unsuspendTeam, respondToTeamAppeal,
  getTeamGovernanceStats, scanSuspiciousTeamContent, getTeamsWithAppeals,
  type SuspiciousMessage, type TeamGovernanceStats,
} from '@/services/livTeamsCoreService';
import type { Team } from '@/types/livTeams';

export default function TeamGovernance() {
  const [stats, setStats] = useState<TeamGovernanceStats | null>(null);
  const [suspicious, setSuspicious] = useState<SuspiciousMessage[]>([]);
  const [appealTeams, setAppealTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; team: Team | null }>({ open: false, team: null });
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [governanceStats, suspiciousMsgs, teamsWithAppeals, teams] = await Promise.all([
        getTeamGovernanceStats(),
        scanSuspiciousTeamContent(),
        getTeamsWithAppeals(),
        getAllTeams(),
      ]);
      setStats(governanceStats);
      setSuspicious(suspiciousMsgs);
      setAppealTeams(teamsWithAppeals);
      setAllTeams(teams);
    } catch (error) {
      console.error('Error loading governance data:', error);
      toast.error('Failed to load governance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSuspend = async () => {
    if (!suspendDialog.team || !suspendReason.trim()) return;
    setActionLoading(true);
    try {
      await suspendTeam(suspendDialog.team.id, suspendReason.trim());
      toast.success(`Team "${suspendDialog.team.name}" has been suspended.`);
      setSuspendDialog({ open: false, team: null });
      setSuspendReason('');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to suspend team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async (team: Team) => {
    try {
      await unsuspendTeam(team.id);
      toast.success(`Team "${team.name}" has been reinstated.`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reinstate team');
    }
  };

  const handleAppealDecision = async (team: Team, decision: 'under_review' | 'accepted' | 'rejected') => {
    try {
      await respondToTeamAppeal(team.id, decision, 'platform_admin');
      const labels = { under_review: 'marked as under review', accepted: 'accepted — team reinstated', rejected: 'rejected' };
      toast.success(`Appeal for "${team.name}" ${labels[decision]}.`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to respond to appeal');
    }
  };

  const filteredTeams = allTeams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-500" /> Team Governance
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
          Monitor teams, review suspicious content, and manage suspensions &amp; appeals.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Teams</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{stats?.totalTeams || 0}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Active</div>
            <div className="text-xl font-bold text-emerald-600">{stats?.activeTeams || 0}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Suspended</div>
            <div className="text-xl font-bold text-red-500">{stats?.suspendedTeams || 0}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Members</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{stats?.totalMembers || 0}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Join Requests</div>
            <div className="text-xl font-bold text-blue-500">{stats?.pendingJoinRequests || 0}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Appeals</div>
            <div className="text-xl font-bold text-amber-500">{stats?.pendingAppeals || 0}</div>
          </CardContent>
        </Card>
        <Card className="p-3 border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-0">
            <div className="text-[10px] text-amber-600 uppercase font-semibold">Suspicious</div>
            <div className="text-xl font-bold text-amber-600">{stats?.suspiciousTeams || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Content Review */}
      <Card className="border-amber-200 dark:border-amber-800/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Suspicious Content — Requires Investigation
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            These messages contain keywords that may indicate danger. Review the context carefully before deciding.
            Teams are <strong>not</strong> suspended automatically — you must investigate and decide.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {suspicious.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              No suspicious content detected in recent team messages.
            </div>
          ) : (
            suspicious.map((msg, i) => {
              const team = allTeams.find(t => t.id === msg.teamId);
              return (
                <div key={i} className="p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white">{msg.teamName}</span>
                      <Badge className="bg-amber-500/10 text-amber-600 text-[9px] border-0">
                        {msg.matchedKeywords.length} keyword{msg.matchedKeywords.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {team && (team.status || 'active') === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => { setSuspendDialog({ open: true, team }); setSuspendReason(`Suspicious content detected: ${msg.matchedKeywords.join(', ')}`); }}
                      >
                        <Ban className="w-3 h-3 mr-1" /> Suspend Team
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {msg.matchedKeywords.map(kw => (
                      <Badge key={kw} className="bg-red-500/10 text-red-600 text-[9px] border-0">{kw}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-white/5 rounded-lg p-2">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{msg.senderName}:</span>{' '}
                    {msg.content.slice(0, 300)}{msg.content.length > 300 ? '…' : ''}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Suspension Appeals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gavel className="w-4 h-4 text-amber-500" /> Suspension Appeals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appealTeams.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No pending appeals.
            </div>
          ) : (
            appealTeams.map(team => (
              <div key={team.id} className="p-3 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{team.name}</span>
                    <Badge className={`ml-2 text-[9px] border-0 ${
                      team.appealStatus === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                      team.appealStatus === 'under_review' ? 'bg-blue-500/10 text-blue-600' :
                      team.appealStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {team.appealStatus?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5">
                    {team.appealStatus === 'pending' && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleAppealDecision(team, 'under_review')}>
                        <Eye className="w-3 h-3 mr-1" /> Review
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleAppealDecision(team, 'accepted')}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleAppealDecision(team, 'rejected')}>
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Suspension reason:</span> {team.suspensionReason || 'N/A'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-medium">Owner's appeal:</span> {team.appealText || 'N/A'}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* All Teams with search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" /> All Teams ({filteredTeams.length})
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search teams..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredTeams.slice(0, 50).map(team => (
            <div key={team.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/10">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-white truncate">{team.name}</span>
                  {team.status === 'suspended' ? (
                    <Badge className="bg-red-500/10 text-red-600 text-[9px] border-0">Suspended</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] border-0">Active</Badge>
                  )}
                  {team.appealStatus && team.appealStatus !== 'none' && (
                    <Badge className="bg-amber-500/10 text-amber-600 text-[9px] border-0">Appeal: {team.appealStatus.replace('_', ' ')}</Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {team.members?.length || 0} members · {team.category} · Owner: {team.ownerName}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {team.status === 'suspended' ? (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleUnsuspend(team)}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Reinstate
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-500 border-red-200 hover:bg-red-50" onClick={() => { setSuspendDialog({ open: true, team }); setSuspendReason(''); }}>
                    <Ban className="w-3 h-3 mr-1" /> Suspend
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filteredTeams.length > 50 && (
            <p className="text-xs text-slate-400 text-center pt-2">Showing 50 of {filteredTeams.length} teams. Refine your search to see more.</p>
          )}
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, team: open ? suspendDialog.team : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend "{suspendDialog.team?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The team will be removed from discovery, members will lose workspace access, and the owner will be notified with the reason below. The owner can appeal this decision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Enter the reason for suspension..."
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || actionLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suspend Team'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
