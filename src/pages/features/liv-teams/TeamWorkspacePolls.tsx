import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Bell, Vote, CheckSquare, Plus, MessageSquare, CornerDownRight
} from 'lucide-react';
import {
  createTeamPoll,
  getTeamPolls,
  voteInTeamPoll,
  createTeamAnnouncement,
  getTeamAnnouncements
} from '@/services/livTeamsFinanceService';
import type { TeamPoll, TeamAnnouncement, TeamRole } from '@/types/livTeams';

interface PollsProps {
  teamId: string;
  teamRole: TeamRole;
}

export default function TeamWorkspacePolls({ teamId, teamRole }: PollsProps) {
  const { currentUser, userData } = useAuth();

  const [polls, setPolls] = useState<TeamPoll[]>([]);
  const [announcements, setAnnouncements] = useState<TeamAnnouncement[]>([]);

  // Create Announcements state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Create Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');

  useEffect(() => {
    loadPollsAndAnnouncements();
  }, [teamId]);

  const loadPollsAndAnnouncements = async () => {
    if (!teamId) return;
    try {
      const allPolls = await getTeamPolls(teamId);
      setPolls(allPolls);

      const anns = await getTeamAnnouncements(teamId);
      setAnnouncements(anns);
    } catch (error) {
      console.error('Error fetching polls/announcements:', error);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !annTitle.trim() || !annContent.trim()) return;

    try {
      await createTeamAnnouncement(teamId, annTitle.trim(), annContent.trim(), currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Announcement broadcasted successfully!');
      setAnnTitle('');
      setAnnContent('');
      loadPollsAndAnnouncements();
    } catch (error) {
      toast.error('Failed to post announcement');
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !pollQuestion.trim() || !opt1.trim() || !opt2.trim()) return;

    const options = [opt1.trim(), opt2.trim()];
    if (opt3.trim()) options.push(opt3.trim());

    try {
      await createTeamPoll(teamId, pollQuestion.trim(), options, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Poll launched!');
      setPollQuestion('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      loadPollsAndAnnouncements();
    } catch (error) {
      toast.error('Failed to create poll');
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!currentUser) return;
    try {
      await voteInTeamPoll(teamId, pollId, optionId, currentUser.uid);
      toast.success('Vote recorded!');
      loadPollsAndAnnouncements();
    } catch (error) {
      toast.error('Failed to register vote');
    }
  };

  const isModeratorOrAbove = ['owner', 'admin', 'moderator', 'teacher_mentor'].includes(teamRole);
  const isGuest = teamRole === 'guest';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">

      {/* Left Column: Announcements & Poll creation form (Admins only) */}
      <div className="space-y-6">

        {/* Post announcements */}
        {isModeratorOrAbove && !isGuest && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Bell className="w-4 h-4 text-emerald-500 animate-bounce" /> Post Classroom Announcement</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handlePostAnnouncement} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="annT">Title *</Label>
                  <Input id="annT" value={annTitle} onChange={e => setAnnTitle(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="annC">Details / Content *</Label>
                  <Input id="annC" value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Revision room opens tonight..." required />
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">Broadcast Announcement</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Create Interactive Poll */}
        {isModeratorOrAbove && !isGuest && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Vote className="w-4 h-4 text-emerald-500" /> Start Interactive Voting Poll</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleCreatePoll} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="pollQ">Question / Prompt *</Label>
                  <Input id="pollQ" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Which chapter are we studying?" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="opt1">Option A *</Label>
                    <Input id="opt1" value={opt1} onChange={e => setOpt1(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="opt2">Option B *</Label>
                    <Input id="opt2" value={opt2} onChange={e => setOpt2(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="opt3">Option C (Optional)</Label>
                    <Input id="opt3" value={opt3} onChange={e => setOpt3(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">Launch Poll</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Announcements List display */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classroom Bulletins ({announcements.length})</span>
          {announcements.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 border border-dashed rounded-xl">No bulletins broadcasted.</p>
          ) : (
            announcements.map(ann => (
              <Card key={ann.id} className="rounded-xl border shadow-sm p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{ann.title}</span>
                  <span className="text-[10px] text-slate-400">By {ann.senderName}</span>
                </div>
                <p className="text-slate-500">{ann.content}</p>
              </Card>
            ))
          )}
        </div>

      </div>

      {/* Right Column: Live Polls List */}
      <div className="space-y-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Interactive Polls ({polls.length})</span>
        {polls.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12 border border-dashed rounded-xl">No interactive voting surveys open.</p>
        ) : (
          polls.map(poll => {
            const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
            return (
              <Card key={poll.id} className="rounded-xl border shadow-sm p-4 space-y-3">
                <p className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-500" /> {poll.question}
                </p>

                <div className="space-y-2">
                  {poll.options.map(opt => {
                    const votesCount = opt.votes?.length || 0;
                    const percent = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                    const isMyVote = opt.votes?.includes(currentUser?.uid || '');

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleVote(poll.id, opt.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/10 ${
                          isMyVote ? 'border-emerald-500 bg-emerald-500/5' : ''
                        }`}
                      >
                        <div className="flex justify-between font-bold text-xs mb-1">
                          <span>{opt.text} {isMyVote && <Badge variant="secondary" className="bg-emerald-500 text-white ml-2 text-[8px] py-0 px-1">My Vote</Badge>}</span>
                          <span>{votesCount} votes ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 dark:bg-slate-800">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t pt-2">
                  <span>Total Participation: {totalVotes} votes</span>
                  <span>{poll.isClosed ? 'Closed' : 'Open'}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
}
