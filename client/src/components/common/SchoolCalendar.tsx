import React, { useState, useEffect } from 'react';
import { eventService, learnerService, parentService } from '../../services/api';
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
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Award,
  Layers
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_TYPES = [
  { label: 'All Entries', value: 'all' },
  { label: 'Attendance Records', value: 'attendance', badge: 'emerald' },
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
  if (dateVal instanceof Date) {
    return formatLocalDate(dateVal);
  }
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0].substring(0, 10);
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatLocalDate(parsed);
  }
  return str;
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

  // Parent & Learner Attendance State (ZERO DUMMY DATA)
  const [attendanceData, setAttendanceData] = useState<{
    total_recorded?: number;
    present_count?: number;
    absent_count?: number;
    late_count?: number;
    attendance_rate?: number;
    daily_records?: any[];
    records?: any[];
    recent_attendance_records?: any[];
    calendar_logs?: any[];
    children?: any[];
    child?: any;
    child_id?: number;
    learner_name?: string;
  } | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | number | null>(null);
  const [availableChildren, setAvailableChildren] = useState<any[]>([]);

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

  const isLearnerOrParent = role === 'learner' || role === 'parent';

  const fetchAttendance = async (childIdToUse?: string | number | null) => {
    if (!isLearnerOrParent) return;

    try {
      if (role === 'learner') {
        const attRes = await learnerService.getAttendance();
        setAttendanceData(attRes);
      } else if (role === 'parent') {
        const attRes = await parentService.getChildAttendance(childIdToUse || '');
        setAttendanceData(attRes);
        if (attRes.children && attRes.children.length > 0) {
          setAvailableChildren(attRes.children);
          if (!selectedChildId && attRes.child) {
            setSelectedChildId(attRes.child.id);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch attendance calendar layer:', err);
    }
  };

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
    fetchAttendance(selectedChildId);
  }, [role, selectedChildId]);

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
    if (filterType === 'attendance') return false; // Handled separately
    return e.event_type === filterType;
  });

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(e => normalizeDateStr(e.event_date) === dateStr);
  };

  const getAttendanceForDay = (day: number) => {
    const list: any[] = attendanceData?.daily_records || attendanceData?.records || attendanceData?.recent_attendance_records || attendanceData?.calendar_logs || [];
    if (!list || list.length === 0) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return list.filter((r: any) => normalizeDateStr(r.date || r.attendance_date) === dateStr);
  };

  const selectedDateStr = formatLocalDate(selectedDay);
  const selectedDayEvents = filteredEvents.filter(e => normalizeDateStr(e.event_date) === selectedDateStr);
  const attendanceList: any[] = attendanceData?.daily_records || attendanceData?.records || attendanceData?.recent_attendance_records || attendanceData?.calendar_logs || [];
  const selectedDayAttendance = attendanceList.length > 0
    ? attendanceList.filter((r: any) => normalizeDateStr(r.date || r.attendance_date) === selectedDateStr)
    : [];

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
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-brand-400" />
            <span>School Calendar & Live Attendance Tracker</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track daily attendance records, term schedules, tests, and school-wide events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Parent Child Selector */}
          {role === 'parent' && availableChildren.length > 1 && (
            <div className="flex items-center gap-2 bg-surface-dark border border-white/10 px-3 py-1.5 rounded-xl">
              <Users className="w-4 h-4 text-cyan-400" />
              <select
                value={selectedChildId || ''}
                onChange={(e) => {
                  setSelectedChildId(e.target.value);
                  fetchAttendance(e.target.value);
                }}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {availableChildren.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.full_name} {c.surname} (Grade {c.grade})
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* Live Attendance KPI Ribbon for Learners & Parents */}
      {isLearnerOrParent && attendanceData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg">
          <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Rate</p>
              <p className="text-base font-extrabold text-white">{attendanceData.attendance_rate}%</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Present</p>
              <p className="text-base font-extrabold text-emerald-400">{attendanceData.present_count} Days</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Late</p>
              <p className="text-base font-extrabold text-amber-400">{attendanceData.late_count} Days</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Absent</p>
              <p className="text-base font-extrabold text-rose-400">{attendanceData.absent_count} Days</p>
            </div>
          </div>
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
              <div key={`pad-${i}`} className="min-h-[85px] rounded-2xl bg-surface-darker/30 border border-transparent" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = selectedDay.getDate() === dayNum && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
              const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;
              const dayEvents = getEventsForDay(dayNum);
              const dayAttendance = getAttendanceForDay(dayNum);

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    const clickedDate = new Date(year, month, dayNum);
                    setSelectedDay(clickedDate);
                    setFormData(prev => ({ ...prev, event_date: formatLocalDate(clickedDate) }));
                  }}
                  className={`min-h-[90px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
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

                  {/* Day Badges: Attendance Status & Events */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {/* Attendance Pill */}
                    {dayAttendance.map((att: any) => (
                      <div
                        key={`att-badge-${att.id}`}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase truncate flex items-center gap-1 ${
                          att.status === 'present'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : att.status === 'late'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          att.status === 'present' ? 'bg-emerald-400' : att.status === 'late' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        <span>{att.status}</span>
                      </div>
                    ))}

                    {/* School Event Pills */}
                    {filterType !== 'attendance' && dayEvents.slice(0, 2).map((ev: any) => (
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

        {/* Right Col: Selected Day Event & Attendance Details */}
        <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4 flex flex-col">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Details for {selectedDay.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {selectedDayAttendance.length} attendance record{selectedDayAttendance.length === 1 ? '' : 's'} • {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Attendance Record Card for this date */}
            {selectedDayAttendance.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Verification</p>
                {selectedDayAttendance.map((att: any) => (
                  <div
                    key={`detail-att-${att.id}`}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      att.status === 'present'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : att.status === 'late'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className={`w-4 h-4 ${att.status === 'present' ? 'text-emerald-400' : att.status === 'late' ? 'text-amber-400' : 'text-rose-400'}`} />
                        <span>{att.subject || 'Class Register'}</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                        att.status === 'present'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : att.status === 'late'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {att.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-mono space-y-0.5 pt-1 border-t border-white/5">
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Time Scanned:</span>
                        <span className="font-bold text-white">{att.time || '08:00 AM'}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Educator:</span>
                        <span className="text-cyan-300">{att.recorded_by || 'Subject Teacher'}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* School Events on this date */}
            {selectedDayEvents.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Events</p>
                {selectedDayEvents.map((ev) => (
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
                ))}
              </div>
            )}

            {selectedDayAttendance.length === 0 && selectedDayEvents.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No attendance records or events logged for this date.</p>
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                  >
                    <option value="Exam">Exam / Test</option>
                    <option value="Academic">Academic & Due Date</option>
                    <option value="Sports">Sports & Extracurricular</option>
                    <option value="Holiday">School Holiday / Break</option>
                    <option value="General">General School Event</option>
                    <option value="Meeting">Parent/Staff Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location / Venue</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Main Hall, Room 10A, Sports Field"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description / Notes</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details for learners and parents..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 font-bold transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold transition-all text-xs disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
