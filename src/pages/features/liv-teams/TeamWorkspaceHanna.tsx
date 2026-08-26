import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Send, Sparkles, Bookmark } from 'lucide-react';
import { streamHannaReply } from '@/lib/hannaGemini';
import { AskHannaIcon } from '@/components/AskHannaIcon';
import type { Team, TeamActivityFeedItem } from '@/types/livTeams';

interface TeamWorkspaceHannaProps {
  team: Team;
  activities: TeamActivityFeedItem[];
}

const PROMPT_STORE = [
  { id: 'activity-plan', title: 'Activity to action plan', prompt: 'Summarize the team activity and identify the next useful actions.', category: 'Planning' },
  { id: 'project-plan', title: 'Project milestones', prompt: 'Help us turn our team purpose into a practical project plan with milestones.', category: 'Planning' },
  { id: 'readiness-check', title: 'Readiness check', prompt: 'What information is missing before this team can start a project safely?', category: 'Review' },
  { id: 'meeting-agenda', title: 'Meeting agenda', prompt: 'Create a focused meeting agenda for our next team session using only the authorized team context.', category: 'Collaboration' },
  { id: 'learning-sprint', title: 'Learning sprint', prompt: 'Design a one-week learning sprint for this team with clear daily outcomes.', category: 'Learning' },
] as const;

export default function TeamWorkspaceHanna({ team, activities }: TeamWorkspaceHannaProps) {
  const { currentUser, userData, userRole } = useAuth();
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const stored = window.localStorage.getItem(`hanna-prompt-store:${currentUser.uid}`);
      setSavedPrompts(stored ? JSON.parse(stored) : []);
    } catch { setSavedPrompts([]); }
  }, [currentUser?.uid]);

  const toggleSavedPrompt = (promptId: string) => {
    if (!currentUser?.uid) return;
    setSavedPrompts(previous => {
      const next = previous.includes(promptId) ? previous.filter(id => id !== promptId) : [...previous, promptId];
      window.localStorage.setItem(`hanna-prompt-store:${currentUser.uid}`, JSON.stringify(next));
      return next;
    });
  };

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hanna could not respond');
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = PROMPT_STORE.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
      <Card className="min-h-[520px]">
        <CardHeader className="border-b border-gray-100 dark:border-white/5">
          <CardTitle className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-950"><AskHannaIcon size={22} showText={false} /></span> Hanna in {team.name}</CardTitle>
          <CardDescription>Hanna uses the current team, role, and authorized activity context. It does not receive unrelated workspace data.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map(prompt => <Button key={prompt.id} variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => { setQuestion(prompt.prompt); void askHanna(prompt.prompt); }} disabled={loading}><Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />{prompt.title}</Button>)}
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
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Hanna is scoped to this team</CardTitle></CardHeader><CardContent className="text-xs text-slate-500 dark:text-slate-400 leading-5">Hanna is grounded in this team’s purpose, your team role, member count, and recent authorized activity. Treasury and private member information are not included for ordinary members.</CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Bookmark className="w-4 h-4 text-emerald-500" /> Prompt Store</CardTitle><CardDescription className="text-xs">Save useful Hanna prompts for this device and run them when needed.</CardDescription></CardHeader><CardContent className="space-y-2">{PROMPT_STORE.map(item => <div key={item.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-2.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold truncate">{item.title}</p><p className="text-[10px] text-slate-400">{item.category}</p></div><button type="button" onClick={() => toggleSavedPrompt(item.id)} aria-label={`${savedPrompts.includes(item.id) ? 'Remove' : 'Save'} ${item.title}`} className={savedPrompts.includes(item.id) ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}><Bookmark className="w-3.5 h-3.5" fill={savedPrompts.includes(item.id) ? 'currentColor' : 'none'} /></button></div><Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-0 text-[11px] text-emerald-600" onClick={() => { setQuestion(item.prompt); void askHanna(item.prompt); }} disabled={loading}>Use prompt</Button></div>)}</CardContent></Card>
      </div>
    </div>
  );
}
