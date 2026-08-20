import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Bot, Loader2, Send, Sparkles, WalletCards } from 'lucide-react';
import { streamHannaReply } from '@/lib/hannaGemini';
import { getTeamAICreditBalance } from '@/services/livTeamsGovernanceService';
import type { Team, TeamActivityFeedItem } from '@/types/livTeams';

interface TeamWorkspaceHannaProps {
  team: Team;
  activities: TeamActivityFeedItem[];
}

export default function TeamWorkspaceHanna({ team, activities }: TeamWorkspaceHannaProps) {
  const { currentUser, userData, userRole } = useAuth();
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const context = useMemo(() => {
    const member = team.members.find(candidate => candidate.userId === currentUser?.uid);
    const recentActivity = activities.slice(0, 8).map(item => `${item.userName} ${item.action}${item.targetName ? `: ${item.targetName}` : ''}`).join('\n');
    return [
      `Team: ${team.name}`,
      `Purpose: ${team.purpose || team.description || 'Not provided'}`,
      `Category: ${team.category || 'Not provided'}`,
      `Current user role in team: ${member?.role || 'guest'}`,
      `Team member count: ${team.members.length}`,
      `Recent authorized activity:\n${recentActivity || 'No activity recorded yet.'}`,
    ].join('\n');
  }, [activities, currentUser?.uid, team]);

  const loadCredits = async () => {
    if (!currentUser) return;
    try {
      setCredits(await getTeamAICreditBalance(team.id, currentUser.uid));
    } catch {
      setCredits(null);
    }
  };

  const askHanna = async (prompt = question) => {
    if (!currentUser || !prompt.trim()) return;
    setLoading(true);
    setReply('');
    try {
      const message = `You are assisting inside a Liverton team workspace. Use only the authorized context below. Do not invent project, financial, member, or activity facts. If the context is insufficient, say what is missing.\n\nAUTHORIZED TEAM CONTEXT:\n${context}\n\nUSER REQUEST:\n${prompt.trim()}`;
      await streamHannaReply(
        [],
        message,
        [],
        setReply,
        undefined,
        { userName: userData?.fullName || currentUser.displayName || undefined, userRole: userRole || undefined },
      );
      setQuestion('');
      void loadCredits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hanna could not respond');
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Summarize the team activity and identify the next useful actions.',
    'Help us turn our team purpose into a practical project plan with milestones.',
    'What information is missing before this team can start a project safely?',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
      <Card className="min-h-[520px]">
        <CardHeader className="border-b border-gray-100 dark:border-white/5">
          <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-500" /> Hanna in {team.name}</CardTitle>
          <CardDescription>Hanna uses the current team, role, and authorized activity context. It does not receive unrelated workspace data.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map(prompt => <Button key={prompt} variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => { setQuestion(prompt); void askHanna(prompt); }} disabled={loading}><Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />{prompt}</Button>)}
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 min-h-[270px] p-4 whitespace-pre-wrap text-sm leading-6">
            {loading ? <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Hanna is reviewing the authorized team context…</div> : reply || <span className="text-slate-400">Ask Hanna what remains to be done, which activity needs attention, or how to structure the team’s next project.</span>}
          </div>
          <div className="flex gap-2 items-end">
            <Textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void askHanna(); } }} placeholder="Ask Hanna about this team…" className="min-h-20 rounded-xl" />
            <Button onClick={() => void askHanna()} disabled={loading || !question.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10"><Send className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><WalletCards className="w-4 h-4 text-emerald-500" /> AI credit wallet</CardTitle><CardDescription>Usage is tracked separately from team money.</CardDescription></CardHeader>
          <CardContent className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Available credits</span><Badge variant="outline">{credits === null ? 'Load balance' : credits}</Badge></div><Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => void loadCredits()}>Refresh balance</Button></CardContent>
        </Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Context boundary</CardTitle></CardHeader><CardContent className="text-xs text-slate-500 dark:text-slate-400 leading-5">Hanna is grounded in this team’s purpose, your team role, member count, and recent authorized activity. Treasury and private member information are not included for ordinary members.</CardContent></Card>
      </div>
    </div>
  );
}
