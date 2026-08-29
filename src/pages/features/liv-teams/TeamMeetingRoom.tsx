import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ExternalLink, Loader2, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getTeamMeetings, joinTeamMeeting } from '@/services/livTeamsChatService';
import type { TeamMeeting } from '@/types/livTeams';

export default function TeamMeetingRoom() {
  const { teamId, meetingId } = useParams<{ teamId: string; meetingId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [meeting, setMeeting] = useState<TeamMeeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !meetingId) return;
    getTeamMeetings(teamId)
      .then((meetings) => setMeeting(meetings.find((item) => item.id === meetingId) || null))
      .catch((error) => {
        console.error('Unable to load Liv Teams meeting:', error);
        toast.error('This meeting could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [teamId, meetingId]);

  const handleJoin = async () => {
    if (!meeting || !teamId || !meetingId || !currentUser) return;
    try {
      await joinTeamMeeting(teamId, meetingId, currentUser.uid, userData?.fullName || currentUser.displayName || 'Liverton member');
      const destination = meeting.joinUrl || `/liv-teams/meeting/${teamId}/${meetingId}`;
      if (/^https?:\/\//i.test(destination)) window.open(destination, '_blank', 'noopener,noreferrer');
      else navigate(destination);
    } catch (error) {
      console.error('Unable to join Liv Teams meeting:', error);
      toast.error('We could not open this meeting yet.');
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  if (!meeting) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"><Video className="h-10 w-10 text-slate-300" /><p className="font-semibold">Meeting not found</p><Button variant="outline" onClick={() => navigate(-1)}>Go back</Button></div>;

  const scheduled = new Date(meeting.scheduledAt);
  return <main className="min-h-screen bg-[#f8faf9] px-4 py-6 text-slate-900 dark:bg-black dark:text-white lg:px-8"><div className="mx-auto max-w-3xl space-y-6"><Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft /></Button><Card className="overflow-hidden dark:border-white/10 dark:bg-zinc-950"><div className="bg-slate-900 p-8 text-white"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><Video className="h-4 w-4" /> Liv Teams live room</div><h1 className="mt-3 text-3xl font-bold">{meeting.title}</h1><p className="mt-2 text-slate-300">{meeting.agenda || 'Join your scheduled learning meeting.'}</p></div><CardContent className="space-y-6 p-6"><div className="grid gap-3 text-sm sm:grid-cols-3"><span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-500" />{scheduled.toLocaleDateString()}</span><span className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-500" />{scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-500" />{meeting.attendance?.length || 0} attended</span></div><Badge className="bg-emerald-500 text-white">Enrolled team meeting</Badge><Button onClick={handleJoin} className="w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"><ExternalLink className="mr-2 h-4 w-4" />{meeting.joinUrl?.startsWith('http') ? 'Join Zoom meeting' : 'Enter Liv Teams room'}</Button><p className="text-xs text-slate-500">Your attendance is recorded when you join. Zoom credentials and external meeting URLs stay server-side or in the team meeting record.</p></CardContent></Card></div></main>;
}
