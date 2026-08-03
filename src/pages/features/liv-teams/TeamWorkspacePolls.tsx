import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Bell, Vote, CheckSquare, Loader2, Megaphone } from 'lucide-react';
import {
  createTeamPoll,
  getTeamPolls,
  voteInTeamPoll,
  createTeamAnnouncement,
  getTeamAnnouncements
} from '@/services/livTeamsFinanceService';
import type { TeamPoll, TeamAnnouncement, TeamRole } from '@/types/livTeams';
import { LivEmptyState, LivSectionHeader } from './livTeamsUi';

interface PollsProps {
  teamId: string;
  teamRole: TeamRole;
}

export default function TeamWorkspacePolls({ teamId, teamRole }: PollsProps) {
  const { currentUser, userData } = useAuth();

  const [polls, setPolls] = useState<TeamPoll[]>([]);
  const [announcements, setAnnouncements] = useState<TeamAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Poll form
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadData = async () => {
    if (!teamId) return;
    try {
      const [allPolls, anns] = await Promise.all([getTeamPolls(teamId), getTeamAnnouncements(teamId)]);
      setPolls(allPolls);
      setAnnouncements(anns);
    } catch (error) {
      console.error('Error fetching polls/announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !annTitle.trim() || !annContent.trim()) return;
    setSaving(true);
    try {
      await createTeamAnnouncement(teamId, annTitle.trim(), annContent.trim(), currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Announcement posted');
      setAnnTitle('');
      setAnnContent('');
      loadData();
    } catch {
      toast.error('Failed to post announcement');
    } finally {
      setSaving(false);
    }
  };

  const setPollOption = (index: number, value: string) => {
    setPollOptions(prev => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) setPollOptions(prev => [...prev, '']);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!currentUser || !pollQuestion.trim() || options.length < 2) {
      toast.error('A poll needs a question and at least 2 options');
      return;
    }
    setSaving(true);
    try {
      await createTeamPoll(teamId, pollQuestion.trim(), options, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Poll launched');
      setPollQuestion('');
      setPollOptions(['', '']);
      loadData();
    } catch {
      toast.error('Failed to create poll');
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!currentUser) return;
    try {
      await voteInTeamPoll(teamId, pollId, optionId, currentUser.uid);
      loadData();
    } catch {
      toast.error('Failed to register vote');
    }
  };

  const canPostAnnouncement = ['owner', 'admin', 'moderator', 'teacher_mentor'].includes(teamRole);
  const isGuest = teamRole === 'guest';

  return (
    <div className="space-y-6">
      <LivSectionHeader title="Announcements & Polls" subtitle="Broadcast important updates and make team decisions together." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {canPostAnnouncement && !isGuest && (
            <Card>
              <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-500" /> Post Announcement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handlePostAnnouncement} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="annT">Title *</Label>
                    <Input id="annT" value={annTitle} onChange={e => setAnnTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="annC">Message *</Label>
                    <Textarea id="annC" value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="e.g. Revision room opens tonight at 7PM..." required />
                  </div>
                  <Button type="submit" disabled={saving} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post to Team'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {!isGuest && (
            <Card>
              <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Vote className="w-4 h-4 text-emerald-500" /> Create Poll
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleCreatePoll} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pollQ">Question *</Label>
                    <Input id="pollQ" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="e.g. Which chapter should we revise next?" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Options (2–6)</Label>
                    {pollOptions.map((opt, i) => (
                      <Input key={i} value={opt} onChange={e => setPollOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                    ))}
                    {pollOptions.length < 6 && (
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addPollOption}>
                        + Add option
                      </Button>
                    )}
                  </div>
                  <Button type="submit" disabled={saving} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Launch Poll'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Announcements list */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Announcements ({announcements.length})</h4>
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                No announcements posted yet.
              </p>
            ) : (
              announcements.map(ann => (
                <Card key={ann.id}>
                  <CardContent className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-1.5">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-emerald-500" /> {ann.title}
                      </span>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{ann.senderName}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{ann.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right column: polls */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Team Polls ({polls.length})</h4>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : polls.length === 0 ? (
            <LivEmptyState
              icon={<Vote className="w-6 h-6" />}
              title="No polls yet"
              description={isGuest ? 'Polls created by the team will appear here.' : 'Create a poll to make a team decision democratically.'}
            />
          ) : (
            polls.map(poll => {
              const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
              const myVoteOption = poll.options.find(o => o.votes?.includes(currentUser?.uid || ''));
              return (
                <Card key={poll.id}>
                  <CardContent className="p-4 space-y-3">
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {poll.question}
                    </p>

                    <div className="space-y-2">
                      {poll.options.map(opt => {
                        const votesCount = opt.votes?.length || 0;
                        const percent = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                        const isMyVote = opt.votes?.includes(currentUser?.uid || '');
                        return (
                          <button
                            key={opt.id}
                            onClick={() => !isGuest && handleVote(poll.id, opt.id)}
                            disabled={isGuest}
                            className={`w-full text-left p-3 rounded-xl border transition-colors ${
                              isMyVote
                                ? 'border-emerald-500 bg-emerald-500/5'
                                : 'border-gray-200 dark:border-white/10 hover:border-emerald-500/50'
                            } ${isGuest ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className="flex justify-between text-xs font-semibold mb-1.5">
                              <span className="flex items-center gap-1.5">
                                {opt.text}
                                {isMyVote && <Badge className="bg-emerald-500 text-white text-[9px] py-0 px-1 border-0">Your vote</Badge>}
                              </span>
                              <span className="text-slate-400">{votesCount} ({percent}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                              <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${percent}%` }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-gray-100 dark:border-white/5 pt-2">
                      <span>{totalVotes} vote{totalVotes === 1 ? '' : 's'}</span>
                      <span>{poll.isClosed ? 'Closed' : myVoteOption ? 'Voted — tap another option to change' : 'Tap an option to vote'}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
