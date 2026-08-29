import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Tag,
  Trash2,
  Edit3,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Users,
  Video,
  PartyPopper,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  category: EventCategory;
  location: string;
  reminder: ReminderOption;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

type EventCategory =
  | 'personal'
  | 'class'
  | 'exam'
  | 'meeting'
  | 'assignment'
  | 'holiday'
  | 'event'
  | 'other';

type ReminderOption = 'none' | '5min' | '15min' | '30min' | '1hour' | '1day';

type ViewMode = 'month' | 'week' | 'day';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; color: string; bgColor: string; darkBgColor: string; icon: React.ElementType }
> = {
  personal: {
    label: 'Personal',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    darkBgColor: 'dark:bg-blue-900/40',
    icon: CalendarDays,
  },
  class: {
    label: 'Class',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    darkBgColor: 'dark:bg-green-900/40',
    icon: BookOpen,
  },
  exam: {
    label: 'Exam',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    darkBgColor: 'dark:bg-red-900/40',
    icon: AlertCircle,
  },
  meeting: {
    label: 'Meeting',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    darkBgColor: 'dark:bg-purple-900/40',
    icon: Users,
  },
  assignment: {
    label: 'Assignment',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    darkBgColor: 'dark:bg-orange-900/40',
    icon: GraduationCap,
  },
  holiday: {
    label: 'Holiday',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    darkBgColor: 'dark:bg-pink-900/40',
    icon: PartyPopper,
  },
  event: {
    label: 'Event',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    darkBgColor: 'dark:bg-teal-900/40',
    icon: Video,
  },
  other: {
    label: 'Other',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    darkBgColor: 'dark:bg-gray-800',
    icon: Briefcase,
  },
};

const REMINDER_OPTIONS: { value: ReminderOption; label: string }[] = [
  { value: 'none', label: 'No reminder' },
  { value: '5min', label: '5 minutes before' },
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hour', label: '1 hour before' },
  { value: '1day', label: '1 day before' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStorageKey(userId: string) {
  return `liverton_calendar_events_${userId}`;
}

function loadEvents(userId: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(userId: string, events: CalendarEvent[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(events));
}

function generateId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeDisplay(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

// ─── Default form state ──────────────────────────────────────────────────────

const DEFAULT_FORM: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
  title: '',
  description: '',
  date: formatDate(new Date()),
  startTime: '09:00',
  endTime: '10:00',
  category: 'personal',
  location: '',
  reminder: 'none',
  isAllDay: false,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'anonymous';

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all');
  const [form, setForm] = useState(DEFAULT_FORM);

  // Load events on mount
  useEffect(() => {
    setEvents(loadEvents(userId));
  }, [userId]);

  // Derived data
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filterCategory !== 'all') {
      filtered = filtered.filter((e) => e.category === filterCategory);
    }
    return filtered;
  }, [events, filterCategory]);

  const eventsForDate = useMemo(() => {
    return filteredEvents
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [filteredEvents, selectedDate]);

  const eventCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEvents.forEach((e) => {
      map[e.date] = (map[e.date] || 0) + 1;
    });
    return map;
  }, [filteredEvents]);

  const upcomingEvents = useMemo(() => {
    const today = formatDate(new Date());
    return filteredEvents
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [filteredEvents]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  function navigateMonth(delta: number) {
    setCurrentDate(new Date(currentYear, currentMonth + delta, 1));
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(formatDate(today));
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  function openCreateDialog(date?: string) {
    setEditingEvent(null);
    setForm({ ...DEFAULT_FORM, date: date || selectedDate });
    setShowEventDialog(true);
  }

  function openEditDialog(event: CalendarEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      category: event.category,
      location: event.location,
      reminder: event.reminder,
      isAllDay: event.isAllDay,
    });
    setShowEventDialog(true);
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (!form.date) {
      toast.error('Please select a date');
      return;
    }
    if (!form.isAllDay && form.startTime >= form.endTime) {
      toast.error('End time must be after start time');
      return;
    }

    const now = new Date().toISOString();
    let updated: CalendarEvent[];

    if (editingEvent) {
      updated = events.map((e) =>
        e.id === editingEvent.id
          ? { ...e, ...form, updatedAt: now }
          : e
      );
      toast.success('Event updated successfully');
    } else {
      const newEvent: CalendarEvent = {
        ...form,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        userId,
      };
      updated = [...events, newEvent];
      toast.success('Event created successfully');
    }

    setEvents(updated);
    saveEvents(userId, updated);
    setShowEventDialog(false);
    setEditingEvent(null);
    setForm(DEFAULT_FORM);
  }

  function confirmDelete(eventId: string) {
    setDeletingEventId(eventId);
    setShowDeleteConfirm(true);
  }

  function handleDelete() {
    if (!deletingEventId) return;
    const updated = events.filter((e) => e.id !== deletingEventId);
    setEvents(updated);
    saveEvents(userId, updated);
    setShowDeleteConfirm(false);
    setDeletingEventId(null);
    toast.success('Event deleted');
  }

  // ─── Calendar Grid ───────────────────────────────────────────────────────

  function renderMonthGrid() {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
    const todayStr = formatDate(new Date());

    const cells: React.ReactNode[] = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const dateStr = formatDate(new Date(currentYear, currentMonth - 1, day));
      cells.push(
        <button
          key={`prev-${day}`}
          onClick={() => setSelectedDate(dateStr)}
          className="relative p-1 sm:p-2 h-16 sm:h-24 text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors text-left"
        >
          <span className="text-xs sm:text-sm">{day}</span>
        </button>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(currentYear, currentMonth, day));
      const isSelected = dateStr === selectedDate;
      const isTodayDate = dateStr === todayStr;
      const eventCount = eventCountByDate[dateStr] || 0;

      // Get up to 2 events to show as dots
      const dayEvents = filteredEvents.filter((e) => e.date === dateStr).slice(0, 3);

      cells.push(
        <button
          key={`cur-${day}`}
          onClick={() => setSelectedDate(dateStr)}
          className={`relative p-1 sm:p-2 h-16 sm:h-24 rounded-lg transition-all duration-200 text-left group
            ${isSelected
              ? 'bg-black dark:bg-white text-white dark:text-black ring-2 ring-black dark:ring-white'
              : isTodayDate
                ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
        >
          <span
            className={`text-xs sm:text-sm font-medium ${
              isSelected
                ? 'text-white dark:text-black'
                : isTodayDate
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : ''
            }`}
          >
            {day}
          </span>

          {/* Event indicators */}
          {eventCount > 0 && (
            <div className="mt-0.5 sm:mt-1 space-y-0.5">
              {dayEvents.map((evt) => {
                const cat = CATEGORY_CONFIG[evt.category];
                return (
                  <div
                    key={evt.id}
                    className={`hidden sm:block text-[10px] leading-tight truncate px-1 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                        : `${cat.bgColor} ${cat.darkBgColor} ${cat.color}`
                    }`}
                  >
                    {evt.title}
                  </div>
                );
              })}
              {/* Mobile dots */}
              <div className="flex gap-0.5 sm:hidden justify-center mt-1">
                {dayEvents.map((evt) => {
                  const cat = CATEGORY_CONFIG[evt.category];
                  return (
                    <div
                      key={evt.id}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white dark:bg-black' : cat.bgColor
                      }`}
                    />
                  );
                })}
                {eventCount > 3 && (
                  <span className={`text-[8px] ${isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-400'}`}>
                    +{eventCount - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Hover add button */}
          <div
            className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity ${
              isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-400'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              openCreateDialog(dateStr);
            }}
          >
            <Plus className="w-3 h-3" />
          </div>
        </button>
      );
    }

    // Next month leading days
    const totalCells = cells.length;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remaining; day++) {
      const dateStr = formatDate(new Date(currentYear, currentMonth + 1, day));
      cells.push(
        <button
          key={`next-${day}`}
          onClick={() => setSelectedDate(dateStr)}
          className="relative p-1 sm:p-2 h-16 sm:h-24 text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors text-left"
        >
          <span className="text-xs sm:text-sm">{day}</span>
        </button>
      );
    }

    return cells;
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const selectedDateDisplay = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AuthenticatedLayout>
      <div className="p-4 lg:p-6 space-y-6 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-7 h-7" />
              Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your schedule, events, and reminders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button
              onClick={() => openCreateDialog()}
              className="bg-black dark:bg-white text-white dark:text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* View Mode & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* View mode tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <Select
            value={filterCategory}
            onValueChange={(val) => setFilterCategory(val as EventCategory | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <Tag className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                    {config.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {MONTHS[currentMonth]} {currentYear}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-0.5">{renderMonthGrid()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{selectedDateDisplay}</span>
                  {isToday(selectedDate) && (
                    <Badge variant="default" className="ml-2 shrink-0">
                      Today
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsForDate.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      No events for this day
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCreateDialog(selectedDate)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventsForDate.map((event) => {
                      const cat = CATEGORY_CONFIG[event.category];
                      const CatIcon = cat.icon;
                      return (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer group ${cat.bgColor} ${cat.darkBgColor} bg-opacity-30`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className={`mt-0.5 ${cat.color}`}>
                                <CatIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">
                                  {event.title}
                                </h4>
                                {!event.isAllDay && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {formatTimeDisplay(event.startTime)} –{' '}
                                    {formatTimeDisplay(event.endTime)}
                                  </p>
                                )}
                                {event.isAllDay && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    All day
                                  </p>
                                )}
                                {event.location && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </p>
                                )}
                                {event.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => openEditDialog(event)}
                                className="p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                              </button>
                              <button
                                onClick={() => confirmDelete(event.id)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${cat.color}`}
                            >
                              {cat.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => openCreateDialog(selectedDate)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Another Event
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => {
                      const cat = CATEGORY_CONFIG[event.category];
                      const CatIcon = cat.icon;
                      const eventDate = new Date(event.date + 'T00:00:00');
                      return (
                        <button
                          key={event.id}
                          onClick={() => {
                            setSelectedDate(event.date);
                            setCurrentDate(eventDate);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.bgColor} ${cat.darkBgColor}`}
                          >
                            <CatIcon className={`w-4 h-4 ${cat.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {eventDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                              {!event.isAllDay && ` • ${formatTimeDisplay(event.startTime)}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-2xl font-bold">
                      {
                        events.filter(
                          (e) =>
                            new Date(e.date + 'T00:00:00').getMonth() === currentMonth &&
                            new Date(e.date + 'T00:00:00').getFullYear() === currentYear
                        ).length
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Events</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-2xl font-bold">
                      {eventsForDate.length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Selected Day</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── Create / Edit Event Dialog ──────────────────────────────────── */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Update the details of your event.'
                : 'Fill in the details to create a new event.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Math Class, Team Meeting..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={form.isAllDay}
                onChange={(e) => setForm({ ...form, isAllDay: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="allDay" className="text-sm cursor-pointer">
                All-day event
              </Label>
            </div>

            {/* Time */}
            {!form.isAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm({ ...form, category: val as EventCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Room 101, Online, Library..."
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            {/* Reminder */}
            <div className="space-y-2">
              <Label>Reminder</Label>
              <Select
                value={form.reminder}
                onValueChange={(val) =>
                  setForm({ ...form, reminder: val as ReminderOption })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add notes or details about this event..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-black dark:bg-white text-white dark:text-black"
            >
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
}