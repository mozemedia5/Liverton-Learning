import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, MessageSquare, BookOpen, Users, Trophy } from 'lucide-react';
import type { TeamRole } from '@/types/livTeams';

interface AnalyticsProps {
  teamId: string;
  teamRole: TeamRole;
}

// Simulated beautiful educational metrics
const memberActivityData = [
  { name: 'Mon', chatVolume: 12, taskProgress: 2, savingsContrib: 5 },
  { name: 'Tue', chatVolume: 24, taskProgress: 4, savingsContrib: 5 },
  { name: 'Wed', chatVolume: 18, taskProgress: 3, savingsContrib: 15 },
  { name: 'Thu', chatVolume: 42, taskProgress: 8, savingsContrib: 10 },
  { name: 'Fri', chatVolume: 35, taskProgress: 12, savingsContrib: 5 },
  { name: 'Sat', chatVolume: 15, taskProgress: 6, savingsContrib: 25 },
  { name: 'Sun', chatVolume: 28, taskProgress: 9, savingsContrib: 30 },
];

const savingsGrowthData = [
  { month: 'Jan', balance: 50000 },
  { month: 'Feb', balance: 120000 },
  { month: 'Mar', balance: 180000 },
  { month: 'Apr', balance: 290000 },
  { month: 'May', balance: 410000 },
  { month: 'Jun', balance: 550000 },
];

const projectMilestonesData = [
  { name: 'Concept Stage', count: 5 },
  { name: 'Planning Board', count: 12 },
  { name: 'Coding/Active', count: 18 },
  { name: 'Review/Test', count: 9 },
  { name: 'Finished', count: 15 },
];

export default function TeamWorkspaceAnalytics({ teamId, teamRole }: AnalyticsProps) {

  return (
    <div className="space-y-6 text-xs">

      <div className="space-y-1 border-b pb-2">
        <h3 className="text-lg font-bold flex items-center gap-1.5"><TrendingUp className="w-5 h-5 text-emerald-500 animate-pulse" /> Team Workspace Analytics & Charts</h3>
        <p className="text-slate-500 dark:text-slate-400">Review real-time member chats volumes, task completion curves, and student savings wallet growth trajectories.</p>
      </div>

      {/* Overview Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Weekly Chats Volume</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">174 Messages</p>
              <p className="text-[10px] text-emerald-500 font-bold">+12% vs last week</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Milestones Progress</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">84% Efficiency</p>
              <p className="text-[10px] text-emerald-500 font-bold">+4% tasks completed</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Wallet Growth Rate</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">UGX 550,000</p>
              <p className="text-[10px] text-emerald-500 font-bold">Steadily increasing</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Active Participation</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">92% Members</p>
              <p className="text-[10px] text-emerald-500 font-bold">Highly Collaborative</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center"><Users className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Main visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart A: Weekly collaboration levels */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-xs font-bold uppercase text-slate-400">Weekly Interaction Metrics</CardTitle>
            <CardDescription className="text-xs">Chats volume and milestone task actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memberActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorChat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconSize={10} fontSize={10} />
                <Area type="monotone" dataKey="chatVolume" name="Messages Volume" stroke="#10b981" fillOpacity={1} fill="url(#colorChat)" />
                <Area type="monotone" dataKey="taskProgress" name="Tasks Milestones" stroke="#6366f1" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart B: Savings wallet trend */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-xs font-bold uppercase text-slate-400">Savings Account Balance Projection</CardTitle>
            <CardDescription className="text-xs">Monthly accumulated contributions trend in UGX.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savingsGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconSize={10} />
                <Line type="monotone" dataKey="balance" name="Savings Balance (UGX)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart C: Projects Status spread */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-xs font-bold uppercase text-slate-400">Subscribed Projects Milestones Spread</CardTitle>
            <CardDescription className="text-xs">Count of team projects across workflow boards.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectMilestonesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Projects Count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
