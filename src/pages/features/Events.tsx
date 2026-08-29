import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { SEO } from '@/components/SEO';
import {
  deleteEvent,
  subscribeToEvents,
  type AppEvent,
  type EventCategory,
} from '@/services/eventService';

const CATEGORY_STYLES: Record<EventCategory, { label: string; chip: string; dot: string }> = {
  class: { label: 'Class', chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', dot: 'bg-blue-500' },
  exam: { label: 'Exam', chip: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', dot: 'bg-red-500' },
  meeting: { label: 'Meeting', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', dot: 'bg-violet-500' },
  workshop: { label: 'Workshop', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500' },
  social: { label: 'Social', chip: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300', dot: 'bg-pink-500' },
  sports: { label: 'Sports', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
  holiday: { label: 'Holiday', chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300', dot: 'bg-cyan-500' },
  other: { label: 'Other', chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
};

const FILTERS: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'class', label: 'Class' },
  { value: 'exam', label: 'Exam' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social' },
  { value: 'sports', label: 'Sports' },
];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Events - blue "My Events" mobile-app screen: month header with
 * notification bell, week day strip, category chips and event cards.
 */
export default function Events() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventCategory | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(new Date()));

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = subscribeToEvents(
      currentUser.uid,
      (userData as { schoolId?: string } | null)?.schoolId ?? null,
      (list) => {
        setEvents(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [currentUser?.uid, userData]);

  // Week strip: 3 days back, today, 10 days ahead
  const days = useMemo(() => {
    const out: { key: string; weekday: string; dayNum: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = -3; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push({
        key: dateKey(d),
        weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return out;
  }, []);

  const filtered = useMemo(() => {
    let list = events;
    if (filter !== 'all') list = list.filter((e) => e.category === filter);
    return list;
  }, [events, filter]);

  const eventsForSelectedDay = filtered.filter((e) => e.date === selectedDate);
  const upcoming = filtered.filter((e) => e.date >= dateKey(new Date()) && e.date !== selectedDate);

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const handleDelete = async (event: AppEvent) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    try {
      await deleteEvent(event.id);
      toast.success('Event deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  const renderEventCard = (event: AppEvent) => {
    const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.other;
    const dateObj = event.date ? new Date(`${event.date}T00:00:00`) : null;
    return (
      <div
        key={event.id}
        className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm"
      >
        {/* Date column */}
        <div className="w-14 flex-shrink-0 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex flex-col items-center justify-center py-2">
          <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 leading-none">
            {dateObj ? dateObj.getDate() : '--'}
          </span>
          <span className="text-[10px] font-bold uppercase text-blue-400 mt-1">
            {dateObj ? dateObj.toLocaleDateString(undefined, { month: 'short' }) : ''}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{event.title}</h3>
            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
          </div>
          {event.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{event.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            {event.time && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" /> {event.time}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <MapPin className="w-3.5 h-3.5" /> {event.location}
              </span>
            )}
            <Badge className={`text-[10px] px-2 py-0 border-0 ${style.chip}`}>{style.label}</Badge>
          </div>
        </div>

        {/* Owner actions */}
        {event.createdBy === currentUser?.uid && (
          <button
            onClick={() => handleDelete(event)}
            className="self-start p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Delete event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <AuthenticatedLayout>
      <SEO title="Events" description="School events, classes, exams and meetups on Liverton Learning" />
      <div className="max-w-2xl mx-auto pb-24">
        {/* Blue hero header */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/10 text-white p-5 sm:p-7 shadow-glass backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-12 w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">{monthLabel}</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 text-white">My Events</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/announcements')}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 backdrop-blur flex items-center justify-center transition-colors border border-white/5"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-emerald-400" />
              </button>
              <button
                onClick={() => navigate('/events/create')}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-colors border-0"
                title="Create event"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Week strip */}
          <div className="flex gap-2 mt-5 overflow-x-auto pb-1 -mx-1 px-1 relative z-10 scrollbar-thin">
            {days.map((d) => {
              const active = d.key === selectedDate;
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedDate(d.key)}
                  className={`flex flex-col items-center justify-center min-w-[52px] h-[68px] rounded-2xl transition-all ${
                    active
                      ? 'bg-emerald-500 text-white shadow-lg scale-105'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide">{d.weekday}</span>
                  <span className="text-lg font-extrabold leading-none mt-1">{d.dayNum}</span>
                  {d.isToday && !active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mt-5 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Event lists */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="space-y-6 mt-5">
            <section>
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {selectedDate === dateKey(new Date()) ? 'Today' : new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
              <div className="space-y-3">
                {eventsForSelectedDay.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/5">
                    <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No events on this day</p>
                    <button
                      onClick={() => navigate('/events/create')}
                      className="mt-3 text-sm font-bold text-emerald-500 dark:text-emerald-400 hover:underline"
                    >
                      + Create one
                    </button>
                  </div>
                ) : (
                  eventsForSelectedDay.map(renderEventCard)
                )}
              </div>
            </section>

            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Upcoming
                </h2>
                <div className="space-y-3">{upcoming.slice(0, 20).map(renderEventCard)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
