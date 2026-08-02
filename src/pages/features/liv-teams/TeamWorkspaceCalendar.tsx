import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Calendar, Video, Clock, Users, Plus, BookOpen, Link2,
  CheckCheck, ClipboardCheck, VideoOff, FileVideo, History, CalendarDays
} from 'lucide-react';
import { scheduleTeamMeeting, getTeamMeetings, joinTeamMeeting } from '@/services/livTeamsChatService';
import type { TeamMeeting, TeamRole } from '@/types/livTeams';

interface CalendarProps {
  teamId: string;
  teamRole: TeamRole;
}

export default function TeamWorkspaceCalendar({ teamId, teamRole }: CalendarProps) {
  const { currentUser, userData } = useAuth();

  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [meetingModalOpen, setMeetingOpen] = useState(false);

  // Form states
  const [meetTitle, setMeetTitle] = useState('');
  const [meetAgenda, setMeetAgenda] = useState('');
  const [meetScheduledAt, setMeetScheduledAt] = useState('');
  const [meetDuration, setMeetDuration] = useState(30);

  useEffect(() => {
    loadMeetings();
  }, [teamId]);

  const loadMeetings = async () => {
    if (!teamId) return;
    try {
      const allMeetings = await getTeamMeetings(teamId);
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Error fetching scheduled meetings:', error);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !meetTitle.trim() || !meetScheduledAt) return;

    try {
      await scheduleTeamMeeting(teamId, {
        title: meetTitle,
        agenda: meetAgenda,
        scheduledAt: meetScheduledAt,
        duration: meetDuration
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success('Meeting scheduled successfully!');
      setMeetingOpen(false);
      resetMeetingForm();
      loadMeetings();
    } catch (error) {
      toast.error('Failed to schedule meeting');
    }
  };

  const resetMeetingForm = () => {
    setMeetTitle('');
    setMeetAgenda('');
    setMeetScheduledAt('');
    setMeetDuration(30);
  };

  const handleJoinMeeting = async (meeting: TeamMeeting) => {
    if (!currentUser) return;
    try {
      await joinTeamMeeting(teamId, meeting.id, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Joined conference room & Attendance recorded!');
      window.open(meeting.joinUrl, '_blank');
      loadMeetings();
    } catch (error) {
      toast.error('Failed to log attendance');
    }
  };

  const isGuest = teamRole === 'guest';
  const isOrganizer = ['owner', 'admin', 'teacher_mentor'].includes(teamRole);

  return (
    <div className="space-y-6">

      {/* Calendar Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Team Calendar & Event Board</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure virtual conference lessons, group revision events, or milestone goals. Attendance is automatically captured.
          </p>
        </div>

        {!isGuest && isOrganizer && (
          <Button onClick={() => setMeetingOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs py-2 px-4 shadow-md">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Virtual Conference
          </Button>
        )}
      </div>

      {meetings.length === 0 ? (
        <Card className="rounded-2xl border border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <VideoOff className="w-10 h-10 text-emerald-500" />
            <p className="text-sm">No scheduled events or meetings found on your calendar board.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map(meet => (
            <Card key={meet.id} className="rounded-2xl border hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <Video className="w-3.5 h-3.5 mr-1" /> Conference Call
                  </Badge>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {meet.duration} Mins
                  </span>
                </div>
                <CardTitle className="text-sm font-extrabold truncate mt-2">{meet.title}</CardTitle>
                <CardDescription className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <CalendarDays className="w-3.5 h-3.5" /> {meet.scheduledAt}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 py-3 space-y-3 flex-1 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-[10px] text-slate-400 uppercase">Agenda</span>
                  <p className="text-slate-500">{meet.agenda || 'No agenda detailed.'}</p>
                </div>

                {meet.attendance && meet.attendance.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-[10px] text-slate-400 uppercase flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> Attendance logs ({meet.attendance.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {meet.attendance.slice(0, 5).map(att => (
                        <Badge key={att.userId} variant="outline" className="text-[8px] py-0">{att.userName}</Badge>
                      ))}
                      {meet.attendance.length > 5 && <span className="text-[8px] text-slate-400">+{meet.attendance.length - 5} more</span>}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-3 border-t bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleJoinMeeting(meet)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-1.5 h-9 font-bold"
                >
                  <Link2 className="w-4 h-4 mr-1.5" /> Start & Join Meeting
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Virtual Meeting Scheduler Dialog */}
      <Dialog open={meetingModalOpen} onOpenChange={setMeetingOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule virtual workspace event</DialogTitle>
            <DialogDescription>Define targets, scheduling timers, and outlines.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleMeeting} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="meetTitle" className="text-xs">Meeting Title *</Label>
              <Input id="meetTitle" value={meetTitle} onChange={e => setMeetTitle(e.target.value)} placeholder="e.g. Science Project Coordination" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meetAgenda" className="text-xs">Agenda details</Label>
              <Input id="meetAgenda" value={meetAgenda} onChange={e => setMeetAgenda(e.target.value)} placeholder="Prepare notebook guidelines..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="meetScheduled" className="text-xs">Scheduled Timings *</Label>
                <Input id="meetScheduled" type="datetime-local" value={meetScheduledAt} onChange={e => setMeetScheduledAt(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meetDur" className="text-xs">Duration (minutes)</Label>
                <Input type="number" id="meetDur" value={meetDuration} onChange={e => setMeetDuration(Number(e.target.value))} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMeetingOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Schedule Virtual Call</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
