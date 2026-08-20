import React, { useState, useEffect } from 'react';
import { eventService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  BookOpen,
  Trophy,
  Sun
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_TYPES = [
  { label: 'All Categories', value: 'all' },
  { label: 'Exams & Tests', value: 'Exam', badge: 'rose' },
  { label: 'Academic & Due Dates', value: 'Academic', badge: 'indigo' },
  { label: 'Sports & Culture', value: 'Sports', badge: 'emerald' },
  { label: 'Holidays & Breaks', value: 'Holiday', badge: 'amber' },
  { label: 'Meetings & General', value: 'General', badge: 'cyan' },
];

const formatLocalDate = (d: Date): string => {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

const normalizeDateStr = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  if (dateVal instanceof Date) {
    return formatLocalDate(dateVal);
  }
  return String(dateVal);
};

export const SchoolCalendar: React.FC = () => {
  const { role, user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Event Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: formatLocalDate(new Date()),
    start_time: '08:00',
    end_time: '14:00',
    location: 'Fusion High School Campus',
    event_type: 'General',
    audience: 'all',
    grade_target: '',
    stream_target: 'General'
  });

  const fetchEvents = () => {
    setLoading(true);
    eventService.getEvents()
      .then(res => {
        setEvents(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error('Failed to load events:', err);
        setError('Could not load calendar events.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleOpenCreateModal = (targetDate?: Date) => {
    const dateToUse = targetDate || selectedDay || new Date();
    setFormData(prev => ({
      ...prev,
      event_date: formatLocalDate(dateToUse)
    }));
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date) return;

    setSubmitting(true);
    setError(null);
    try {
      await eventService.createEvent({
        ...formData,
        grade_target: formData.grade_target ? parseInt(formData.grade_target, 10) : null
      });
      setStatusMessage('Event published to school calendar successfully!');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        event_date: formatLocalDate(selectedDay),
        start_time: '08:00',
        end_time: '14:00',
        location: 'Fusion High School Campus',
        event_type: 'General',
        audience: 'all',
        grade_target: '',
        stream_target: 'General'
      });
      fetchEvents();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this event from the calendar?')) return;
    try {
      await eventService.deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      setStatusMessage('Event deleted successfully.');
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const canCreate = role === 'admin' || role === 'teacher';

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const todayMonth = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today);
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    return e.event_type === filterType;
  });

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(e => normalizeDateStr(e.event_date) === dateStr);
  };

  const selectedDateStr = formatLocalDate(selectedDay);
  const selectedDayEvents = filteredEvents.filter(e => normalizeDateStr(e.event_date) === selectedDateStr);

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'Exam': return 'rose';
      case 'Academic': return 'indigo';
      case 'Sports': return 'emerald';
      case 'Holiday': return 'amber';
      case 'Meeting': return 'cyan';
      default: return 'cyan';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-brand-400" />
            School Academic & Events Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse term dates, exam schedules, class tests, sports days, and school-wide events.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Calendar Event</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto">
        {EVENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilterType(type.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === type.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Main Calendar Grid & Day Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Matrix */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display text-white">
              {MONTH_NAMES[month]} {year}
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={todayMonth}
                className="px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank padding days for start of month */}
            {Array.from({ length: startingDayIndex }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[75px] rounded-2xl bg-surface-darker/30 border border-transparent" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = selectedDay.getDate() === dayNum && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
              const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;
              const dayEvents = getEventsForDay(dayNum);

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    const clickedDate = new Date(year, month, dayNum);
                    setSelectedDay(clickedDate);
                    setFormData(prev => ({ ...prev, event_date: formatLocalDate(clickedDate) }));
                  }}
                  className={`min-h-[85px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-brand-600/20 border-brand-500 shadow-glow-indigo'
                      : isToday
                      ? 'bg-surface-darker border-cyan-500/50'
                      : 'bg-surface-darker border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-bold ${isSelected ? 'text-cyan-300' : isToday ? 'text-cyan-400 font-extrabold' : 'text-slate-300'}`}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>

                  {/* Event Dots/Badges */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev: any) => (
                      <div
                        key={ev.id}
                        className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium ${
                          ev.event_type === 'Exam'
                            ? 'bg-rose-500/20 text-rose-300'
                            : ev.event_type === 'Sports'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ev.event_type === 'Holiday'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-brand-600/30 text-brand-200'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[8px] text-slate-400 font-bold">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Selected Day Event Details */}
        <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4 flex flex-col">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Events on {selectedDay.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {selectedDayEvents.length} scheduled item{selectedDayEvents.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2 relative group hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white leading-snug">{ev.title}</h4>
                    <Badge variant={getEventTypeBadge(ev.event_type)} size="sm">
                      {ev.event_type}
                    </Badge>
                  </div>

                  {ev.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {ev.description}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                    {ev.start_time && (
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{ev.start_time.slice(0, 5)} {ev.end_time ? `- ${ev.end_time.slice(0, 5)}` : ''}</span>
                      </p>
                    )}
                    {ev.location && (
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{ev.location}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-slate-500">
                      <Users className="w-3 h-3" />
                      <span>Audience: {ev.grade_target ? `Grade ${ev.grade_target}` : ev.audience}</span>
                    </p>
                  </div>

                  {(role === 'admin' || ev.created_by === user?.id) && (
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Event"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No events scheduled for this day.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
              Publish Calendar Event
            </h4>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Grade 10 Physical Sciences Term Test"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    required
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Category</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="General">General School Event</option>
                    <option value="Exam">Exam / Test Assessment</option>
                    <option value="Academic">Academic Due Date</option>
                    <option value="Sports">Sports & Cultural</option>
                    <option value="Holiday">Holiday / School Closure</option>
                    <option value="Meeting">Meeting / Workshop</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Audience</label>
                  <select
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">Whole School (All Portals)</option>
                    <option value="learners">Learners Only</option>
                    <option value="parents">Parents Only</option>
                    <option value="teachers">Teachers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Grade (Optional)</label>
                  <select
                    value={formData.grade_target}
                    onChange={(e) => setFormData({ ...formData, grade_target: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Whole School</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Venue / Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Science Lab 2 / Main School Hall"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide instructions, requirements, or event details..."
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-darker text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Publish Event</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
