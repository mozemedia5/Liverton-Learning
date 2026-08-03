import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Video, Clock, Plus, Link2, ClipboardCheck, VideoOff, CalendarDays,
  Flag, BookOpen, Star, CalendarRange, Loader2
} from 'lucide-react';
import { scheduleTeamMeeting, getTeamMeetings, joinTeamMeeting } from '@/services/livTeamsChatService';
import type { TeamMeeting, TeamRole, TeamEventType } from '@/types/livTeams';
import { LivEmptyState, LivSectionHeader } from './livTeamsUi';

interface CalendarProps {
  teamId: string;
  teamRole: TeamRole;
}

const eventTypeConfig: Record<TeamEventType, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  meeting: { label: 'Meeting', icon: <Video className="w-3.5 h-3.5" />, badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0' },
  deadline: { label: 'Deadline', icon: <Flag className="w-3.5 h-3.5" />, badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-0' },
  milestone: { label: 'Milestone', icon: <Star className="w-3.5 h-3.5" />, badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0' },
  revision: { label: 'Revision Session', icon: <BookOpen className="w-3.5 h-3.5" />, badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0' },
  event: { label: 'Team Event', icon: <CalendarRange className="w-3.5 h-3.5" />, badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-0' },
};

function formatSchedule(iso: string): string {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TeamWorkspaceCalendar({ teamId, teamRole }: CalendarProps) {
  const { currentUser, userData } = useAuth();

  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingModalOpen, setMeetingOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [meetTitle, setMeetTitle] = useState('');
  const [meetAgenda, setMeetAgenda] = useState('');
  const [meetScheduledAt, setMeetScheduledAt] = useState('');
  const [meetDuration, setMeetDuration] = useState(30);
  const [meetType, setMeetType] = useState<TeamEventType>('meeting');

  useEffect(() => {
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadMeetings = async () => {
    if (!teamId) return;
    try {
      const allMeetings = await getTeamMeetings(teamId);
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !meetTitle.trim() || !meetScheduledAt) return;
    setSaving(true);
    try {
      await scheduleTeamMeeting(teamId, {
        title: meetTitle.trim(),
        agenda: meetAgenda.trim(),
        scheduledAt: meetScheduledAt,
        duration: meetDuration || 30,
        type: meetType
      }, currentUser.uid, userData?.fullName || 'Anonymous');

      toast.success(`${eventTypeConfig[meetType].label} scheduled`);
      setMeetingOpen(false);
      setMeetTitle('');
      setMeetAgenda('');
      setMeetScheduledAt('');
      setMeetDuration(30);
      setMeetType('meeting');
      loadMeetings();
    } catch {
      toast.error('Failed to schedule event');
    } finally {
      setSaving(false);
    }
  };

  const handleJoinMeeting = async (meeting: TeamMeeting) => {
    if (!currentUser) return;
    try {
      await joinTeamMeeting(teamId, meeting.id, currentUser.uid, userData?.fullName || 'Anonymous');
      toast.success('Attendance recorded');
      if (meeting.joinUrl) window.open(meeting.joinUrl, '_blank', 'noopener,noreferrer');
      loadMeetings();
    } catch {
      toast.error('Failed to record attendance');
    }
  };

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [meetings]);

  const isGuest = teamRole === 'guest';
  const isOrganizer = ['owner', 'admin', 'teacher_mentor', 'secretary'].includes(teamRole);

  return (
    <div className="space-y-6">
      <LivSectionHeader
        title="Calendar & Meetings"
        subtitle="Schedule meetings, deadlines, milestones and revision sessions. Attendance is captured when members join."
      >
        {!isGuest && isOrganizer && (
          <Button size="sm" onClick={() => setMeetingOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Event
          </Button>
        )}
      </LivSectionHeader>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-12">Loading calendar...</p>
      ) : sortedMeetings.length === 0 ? (
        <LivEmptyState
          icon={<VideoOff className="w-6 h-6" />}
          title="Nothing scheduled"
          description={isOrganizer ? 'Schedule your first meeting, deadline or revision session for the team.' : 'Scheduled meetings and events will appear here.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMeetings.map(meet => {
            const typeCfg = eventTypeConfig[meet.type || 'meeting'];
            const attendeeCount = meet.attendance?.length || 0;
            return (
              <Card key={meet.id} className="flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={`text-[10px] flex items-center gap-1 ${typeCfg.badgeClass}`}>
                      {typeCfg.icon} {typeCfg.label}
                    </Badge>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {meet.duration} min
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold truncate mt-1.5">{meet.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                    <CalendarDays className="w-3.5 h-3.5" /> {formatSchedule(meet.scheduledAt)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 py-3 space-y-3 flex-1">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Agenda</span>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{meet.agenda || 'No agenda provided.'}</p>
                  </div>

                  {attendeeCount > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                        <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> Attendance ({attendeeCount})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {meet.attendance.slice(0, 5).map(att => (
                          <Badge key={att.userId} variant="secondary" className="text-[10px] py-0 px-1.5">{att.userName}</Badge>
                        ))}
                        {attendeeCount > 5 && <span className="text-[10px] text-slate-400">+{attendeeCount - 5} more</span>}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-3 border-t border-gray-100 dark:border-white/5">
                  {!isGuest ? (
                    <Button
                      size="sm"
                      onClick={() => handleJoinMeeting(meet)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                    >
                      <Link2 className="w-4 h-4 mr-1.5" />
                      {(meet.type || 'meeting') === 'meeting' ? 'Join Meeting' : 'Mark Attendance'}
                    </Button>
                  ) : (
                    <p className="text-xs text-slate-400 text-center w-full py-1.5">Guests can view events only</p>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule dialog */}
      <Dialog open={meetingModalOpen} onOpenChange={setMeetingOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Team Event</DialogTitle>
            <DialogDescription>Meetings include a join link and automatic attendance tracking.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleMeeting} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="meetType">Event Type</Label>
              <Select value={meetType} onValueChange={(val) => setMeetType(val as TeamEventType)}>
                <SelectTrigger id="meetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeConfig).map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetTitle">Title *</Label>
              <Input id="meetTitle" value={meetTitle} onChange={e => setMeetTitle(e.target.value)} placeholder="e.g. Project coordination call" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetAgenda">Agenda</Label>
              <Textarea id="meetAgenda" value={meetAgenda} onChange={e => setMeetAgenda(e.target.value)} placeholder="Topics to cover..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meetScheduled">Date & Time *</Label>
                <Input id="meetScheduled" type="datetime-local" value={meetScheduledAt} onChange={e => setMeetScheduledAt(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetDur">Duration (min)</Label>
                <Input type="number" min={5} id="meetDur" value={meetDuration} onChange={e => setMeetDuration(Number(e.target.value))} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMeetingOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
