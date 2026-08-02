import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  TrendingUp, MessageSquare, ListTodo, Wallet, FileText,
  Users, ClipboardCheck, BarChart3
} from 'lucide-react';
import { getTeamMessages, getTeamMeetings } from '@/services/livTeamsChatService';
import { getTeamTasks, getTeamProjects, getTeamFiles } from '@/services/livTeamsProjectService';
import { getSavingsTransactions } from '@/services/livTeamsFinanceService';
import type { TeamMessage, TeamTask, TeamProject, TeamFolderFile, SavingsTransaction, TeamMeeting } from '@/types/livTeams';
import { LivEmptyState, LivSectionHeader, LivStatCard } from './livTeamsUi';
import { formatUGX } from './livTeamsUtils';

interface AnalyticsProps {
  teamId: string;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function TeamWorkspaceAnalytics({ teamId }: AnalyticsProps) {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [files, setFiles] = useState<TeamFolderFile[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [msgs, tks, projs, fls, txs, mts] = await Promise.all([
          getTeamMessages(teamId),
          getTeamTasks(teamId),
          getTeamProjects(teamId),
          getTeamFiles(teamId),
          getSavingsTransactions(teamId),
          getTeamMeetings(teamId)
        ]);
        setMessages(msgs);
        setTasks(tks);
        setProjects(projs);
        setFiles(fls);
        setTransactions(txs);
        setMeetings(mts);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId]);

  /* ------------------------------ Computed metrics ------------------------------ */

  const last7Days = useMemo(() => {
    const days: { name: string; messages: number }[] = [];
    const counts: Record<string, number> = {};
    messages.forEach(m => {
      if (!m.createdAt) return;
      const d = m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
      if (isNaN(d.getTime())) return;
      const key = dayKey(d);
      counts[key] = (counts[key] || 0) + 1;
    });
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      days.push({
        name: d.toLocaleDateString([], { weekday: 'short' }),
        messages: counts[key] || 0
      });
    }
    return days;
  }, [messages]);

  const taskStats = useMemo(() => {
    const completed = tasks.filter(t => t.isCompleted).length;
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { total: tasks.length, completed, rate };
  }, [tasks]);

  const savingsSeries = useMemo(() => {
    const approved = transactions
      .filter(t => t.status === 'approved')
      .map(t => ({
        ...t,
        date: t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt ? new Date(t.createdAt) : null)
      }))
      .filter(t => t.date && !isNaN(t.date.getTime()))
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());

    let running = 0;
    return approved.map(t => {
      running += t.type === 'contribution' ? t.amount : -t.amount;
      return {
        date: t.date!.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        balance: Math.max(0, running)
      };
    });
  }, [transactions]);

  const savingsBalance = savingsSeries.length > 0 ? savingsSeries[savingsSeries.length - 1].balance : 0;

  const projectsByStatus = useMemo(() => {
    const order = ['Idea', 'Planning', 'Active', 'Testing', 'Review', 'Completed', 'Archived'];
    const counts: Record<string, number> = {};
    projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return order
      .filter(s => counts[s])
      .map(s => ({ name: s, count: counts[s] }));
  }, [projects]);

  const topMembers = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach(m => {
      counts[m.senderName] = (counts[m.senderName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [messages]);

  const attendanceTotal = useMemo(
    () => meetings.reduce((sum, m) => sum + (m.attendance?.length || 0), 0),
    [meetings]
  );

  const hasAnyData = messages.length > 0 || tasks.length > 0 || transactions.length > 0 || files.length > 0 || projects.length > 0;

  /* ------------------------------ Render ------------------------------ */

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-12">Computing analytics...</p>;
  }

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <LivSectionHeader title="Team Analytics" subtitle="Live metrics from your workspace activity." />
        <LivEmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="Not enough activity yet"
          description="Charts and insights appear here once your team starts chatting, creating tasks, uploading files and saving together."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LivSectionHeader title="Team Analytics" subtitle="Live metrics computed from real workspace activity." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LivStatCard icon={<MessageSquare className="w-5 h-5" />} label="Messages" value={messages.length} color="emerald" hint={`${last7Days.reduce((s, d) => s + d.messages, 0)} this week`} />
        <LivStatCard icon={<ListTodo className="w-5 h-5" />} label="Tasks Completed" value={`${taskStats.completed}/${taskStats.total}`} color="blue" hint={`${taskStats.rate}% completion rate`} />
        <LivStatCard icon={<Wallet className="w-5 h-5" />} label="Approved Savings" value={formatUGX(savingsBalance)} color="orange" />
        <LivStatCard icon={<FileText className="w-5 h-5" />} label="Files Shared" value={files.length} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Messages activity */}
        <Card>
          <CardHeader className="p-4 border-b border-gray-100 dark:border-white/5">
            <CardTitle className="text-sm font-semibold">Chat Activity</CardTitle>
            <CardDescription className="text-xs">Messages sent over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTeamChat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="messages" name="Messages" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTeamChat)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projects by status */}
        <Card>
          <CardHeader className="p-4 border-b border-gray-100 dark:border-white/5">
            <CardTitle className="text-sm font-semibold">Projects by Status</CardTitle>
            <CardDescription className="text-xs">Where each project currently stands</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-64">
            {projectsByStatus.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-16">No projects created yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Projects" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Savings growth */}
        <Card>
          <CardHeader className="p-4 border-b border-gray-100 dark:border-white/5">
            <CardTitle className="text-sm font-semibold">Savings Growth</CardTitle>
            <CardDescription className="text-xs">Approved wallet balance over time (UGX)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-64">
            {savingsSeries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-16">No approved savings transactions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={savingsSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="balance" name="Balance (UGX)" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Engagement summary */}
        <Card>
          <CardHeader className="p-4 border-b border-gray-100 dark:border-white/5">
            <CardTitle className="text-sm font-semibold">Engagement Summary</CardTitle>
            <CardDescription className="text-xs">Participation across the workspace</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Most active members
              </p>
              {topMembers.length === 0 ? (
                <p className="text-xs text-slate-400">No chat activity yet.</p>
              ) : (
                topMembers.map(member => {
                  const max = topMembers[0].count || 1;
                  return (
                    <div key={member.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="truncate">{member.name}</span>
                        <span className="text-slate-400">{member.count} msgs</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.round((member.count / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-white/5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center">
                <p className="text-lg font-bold">{meetings.length}</p>
                <p className="text-[11px] text-slate-400">Events scheduled</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center">
                <p className="text-lg font-bold flex items-center justify-center gap-1">
                  <ClipboardCheck className="w-4 h-4 text-emerald-500" /> {attendanceTotal}
                </p>
                <p className="text-[11px] text-slate-400">Attendance records</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Metrics update automatically as your team works.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
