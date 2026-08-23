import React, { useState, useEffect } from 'react';
import { eventService, learnerService, parentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit3,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  Flag,
  BookOpen,
  Info
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_TYPES = [
  { label: 'All Entries', value: 'all' },
  { label: 'Attendance Records', value: 'attendance', badge: 'emerald' },
  { label: 'Exams & Tests', value: 'Exam', badge: 'rose' },
  { label: 'Academic & Terms', value: 'Academic', badge: 'indigo' },
  { label: 'Sports & Culture', value: 'Sports', badge: 'emerald' },
  { label: '🇿🇦 Holidays & Breaks', value: 'Holiday', badge: 'amber' },
  { label: 'Meetings & General', value: 'General', badge: 'cyan' },
];

/**
 * Generates official Department of Basic Education (DBE) 4-Term Calendar metadata for any given year.
 */
const getDBETermsForYear = (year: number) => {
  const currentYear = new Date().getFullYear();
  if (year === 2026) {
    return [
      { term: 'Term 1', start: '14 Jan', end: '27 Mar', desc: 'Orientation & Term 1 CAPS', active: year === currentYear },
      { term: 'Term 2', start: '08 Apr', end: '26 Jun', desc: 'Mid-Year Examinations', active: false },
      { term: 'Term 3', start: '21 Jul', end: '02 Oct', desc: 'Preparatory / Trial Exams', active: false },
      { term: 'Term 4', start: '13 Oct', end: '09 Dec', desc: 'Grade 12 NSC Final Exams', active: false },
    ];
  } else if (year === 2025) {
    return [
      { term: 'Term 1', start: '15 Jan', end: '28 Mar', desc: 'Term 1 CAPS Curriculum', active: false },
      { term: 'Term 2', start: '08 Apr', end: '27 Jun', desc: 'Mid-Year Assessments', active: false },
      { term: 'Term 3', start: '22 Jul', end: '03 Oct', desc: 'Preparatory Trial Exams', active: false },
      { term: 'Term 4', start: '14 Oct', end: '10 Dec', desc: 'NSC Final Examinations', active: false },
    ];
  }
  return [
    { term: 'Term 1', start: '13 Jan', end: '26 Mar', desc: `Term 1 ${year} CAPS Curriculum`, active: year === currentYear },
    { term: 'Term 2', start: '07 Apr', end: '25 Jun', desc: 'Mid-Year Assessments', active: false },
    { term: 'Term 3', start: '20 Jul', end: '01 Oct', desc: 'Trial Preparatory Exams', active: false },
    { term: 'Term 4', start: '12 Oct', end: '08 Dec', desc: 'Grade 12 NSC Final Exams', active: false },
  ];
};

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
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [syncingDBE, setSyncingDBE] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Attendance Records
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

  // Create Event Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: formatLocalDate(new Date()),
    start_time: '08:00',
    end_time: '14:00',
    location: 'Fusion High Campus',
    event_type: 'Academic',
    audience: 'all',
    grade_target: '',
    stream_target: ''
  });

  // Edit Event Form State
  const [editFormData, setEditFormData] = useState({
    id: null as number | string | null,
    title: '',
    description: '',
    event_date: '',
    start_time: '08:00',
    end_time: '14:00',
    location: '',
    event_type: 'General',
    audience: 'all',
    grade_target: '',
    stream_target: ''
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = async (yearParam?: number) => {
    const yr = yearParam || year;
    try {
      setLoading(true);
      const data = await eventService.getEvents(yr);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setError(err?.response?.data?.error || 'Failed to load school calendar events.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      if (role === 'learner') {
        const att = await learnerService.getAttendance();
        setAttendanceData(att || null);
      } else if (role === 'parent') {
        const overview = await parentService.getOverview();
        const children = overview?.children || [];
        setAvailableChildren(children);

        const targetChildId = selectedChildId || children[0]?.id;
        if (targetChildId) {
          setSelectedChildId(targetChildId);
          const childAtt = await parentService.getChildAttendance(targetChildId);
          setAttendanceData(childAtt || null);
        }
      }
    } catch (err) {
      console.warn('Attendance records could not be fetched:', err);
    }
  };

  useEffect(() => {
    fetchEvents(year);
    if (role === 'learner' || role === 'parent') {
      fetchAttendance();
    }
  }, [role, selectedChildId, year]);

  const handleSyncOfficialDBE = async () => {
    setSyncingDBE(true);
    setError(null);
    try {
      const res = await eventService.syncOfficialCalendar(year);
      setStatusMessage(res?.message || `Official South African public holidays & DBE terms for ${year} synchronized.`);
      fetchEvents(year);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to synchronize official DBE calendar.');
    } finally {
      setSyncingDBE(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await eventService.createEvent(formData);
      setStatusMessage('Event successfully added to the school calendar.');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        event_date: formatLocalDate(new Date()),
        start_time: '08:00',
        end_time: '14:00',
        location: 'Fusion High Campus',
        event_type: 'Academic',
        audience: 'all',
        grade_target: '',
        stream_target: ''
      });
      fetchEvents(year);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to publish event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (ev: any) => {
    setEditFormData({
      id: ev.id,
      title: ev.title || '',
      description: ev.description || '',
      event_date: normalizeDateStr(ev.event_date),
      start_time: ev.start_time ? ev.start_time.slice(0, 5) : '08:00',
      end_time: ev.end_time ? ev.end_time.slice(0, 5) : '14:00',
      location: ev.location || 'Fusion High Campus',
      event_type: ev.event_type || 'General',
      audience: ev.audience || 'all',
      grade_target: ev.grade_target ? String(ev.grade_target) : '',
      stream_target: ev.stream_target || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;
    setSubmitting(true);
    setError(null);
    try {
      await eventService.updateEvent(editFormData.id, editFormData);
      setStatusMessage('Calendar event updated successfully.');
      setIsEditModalOpen(false);
      fetchEvents(year);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to remove this event from the calendar?')) return;
    try {
      await eventService.deleteEvent(id);
      setEvents(events.filter(e => e.id !== id));
      setStatusMessage('Event removed successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete event.');
    }
  };

  // Calendar Date Math
  const prevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today);
  };

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getAttendanceForDate = (dateStr: string) => {
    if (!attendanceData) return [];
    const list =
      attendanceData.daily_records ||
      attendanceData.records ||
      attendanceData.calendar_logs ||
      attendanceData.recent_attendance_records ||
      [];
    return list.filter((r: any) => normalizeDateStr(r.date || r.attendance_date) === dateStr);
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => {
      const evDate = normalizeDateStr(e.event_date);
      const matchesDate = evDate === dateStr;
      if (!matchesDate) return false;
      if (filterType === 'all') return true;
      if (filterType === 'attendance') return false;
      return e.event_type === filterType;
    });
  };

  const selectedDateStr = formatLocalDate(selectedDay);
  const selectedDayAttendance = getAttendanceForDate(selectedDateStr);
  const selectedDayEvents = getEventsForDate(selectedDateStr);

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'Exam': return 'rose';
      case 'Academic': return 'indigo';
      case 'Sports': return 'emerald';
      case 'Holiday': return 'amber';
      default: return 'cyan';
    }
  };

  const isSouthAfricanPublicHoliday = (title: string) => {
    const t = (title || '').toLowerCase();
    return (
      t.includes('human rights') ||
      t.includes('freedom day') ||
      t.includes('youth day') ||
      t.includes("women's day") ||
      t.includes('heritage day') ||
      t.includes('reconciliation') ||
      t.includes('good friday') ||
      t.includes('family day') ||
      t.includes("new year's") ||
      t.includes('workers') ||
      t.includes('christmas')
    );
  };

  const canEditOrAdd = role === 'admin' || role === 'teacher';
  const currentDBETerms = getDBETermsForYear(year);

  return (
    <div className="space-y-6">
      {/* 🇿🇦 South African DBE 4-Term Academic Calendar Ribbon */}
      <div
        className={`p-4 rounded-3xl border shadow-lg ${
          isLight ? 'bg-white border-slate-200' : 'bg-surface-dark border-white/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🇿🇦</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold font-display text-white">
                  Official South African DBE & Higher Education Calendar
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                  {year} Academic Year
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Self-updating statutory national public holidays, DBE 4-term schedules, and NSC final examinations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role === 'admin' && (
              <button
                onClick={handleSyncOfficialDBE}
                disabled={syncingDBE}
                className="px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                title={`Sync official ${year} DBE Calendar & SA Holidays`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${syncingDBE ? 'animate-spin' : ''}`} />
                <span>{syncingDBE ? 'Syncing...' : 'Sync DBE Calendar'}</span>
              </button>
            )}

            {canEditOrAdd && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs shadow-glow-indigo transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Event / Due Date</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Terms Grid for Current Selected Year */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-3">
          {currentDBETerms.map((term, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition-all ${
                term.active
                  ? 'bg-gradient-to-br from-brand-900/40 to-cyan-950/40 border-cyan-500/40 shadow-glow-cyan'
                  : 'bg-surface-darker/70 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white">{term.term}</span>
                {term.active && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-bold uppercase animate-pulse">
                    CURRENT
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono font-bold text-cyan-300 mt-1">
                {term.start} – {term.end}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{term.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Monthly Calendar Grid */}
        <div
          className={`lg:col-span-2 p-6 rounded-3xl border shadow-xl space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-surface-dark border-white/10'
          }`}
        >
          {/* Calendar Header Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black font-display text-white">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  filterType === t.value
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-surface-darker text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-white/5">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[72px] p-2 rounded-2xl bg-surface-darker/30 border border-transparent" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const dateStr = formatLocalDate(dateObj);
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === formatLocalDate(new Date());

              const dayEvents = getEventsForDate(dateStr);
              const dayAttendance = getAttendanceForDate(dateStr);

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDay(dateObj)}
                  className={`min-h-[75px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-indigo-950/80 to-surface-darker border-indigo-500 shadow-glow-indigo'
                      : isToday
                      ? 'bg-surface-darker border-cyan-500/60'
                      : 'bg-surface-darker border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-bold ${isSelected ? 'text-cyan-300 font-black' : isToday ? 'text-cyan-400 font-extrabold' : 'text-slate-300'}`}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>

                  {/* Badges on Day */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {/* Attendance Pill */}
                    {dayAttendance.map((att: any) => (
                      <div
                        key={`att-badge-${att.id}`}
                        className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase truncate flex items-center gap-1 ${
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

                    {/* School & SA Holiday Event Pills */}
                    {filterType !== 'attendance' && dayEvents.slice(0, 2).map((ev: any) => (
                      <div
                        key={ev.id}
                        className={`text-[8.5px] px-1.5 py-0.5 rounded truncate font-bold flex items-center gap-1 ${
                          isSouthAfricanPublicHoliday(ev.title)
                            ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                            : ev.event_type === 'Exam'
                            ? 'bg-rose-500/20 text-rose-300'
                            : ev.event_type === 'Sports'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ev.event_type === 'Holiday'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-brand-600/30 text-brand-200'
                        }`}
                      >
                        {isSouthAfricanPublicHoliday(ev.title) && <span>🇿🇦</span>}
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[8px] text-cyan-400 font-bold">
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
        <div
          className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col ${
            isLight ? 'bg-white border-slate-200' : 'bg-surface-dark border-white/10'
          }`}
        >
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Details for {selectedDay.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedDayAttendance.length} attendance • {selectedDayEvents.length} scheduled event{selectedDayEvents.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            
            {/* Attendance Record Card */}
            {selectedDayAttendance.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Verification</p>
                {selectedDayAttendance.map((att: any) => (
                  <div
                    key={`detail-att-${att.id}`}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Events & Holidays</p>
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2.5 relative group hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isSouthAfricanPublicHoliday(ev.title) && <span className="text-sm">🇿🇦</span>}
                          <h4 className="text-xs font-bold text-white leading-snug">{ev.title}</h4>
                        </div>
                        {isSouthAfricanPublicHoliday(ev.title) && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold uppercase border border-amber-500/30">
                            National Statutory Holiday
                          </span>
                        )}
                      </div>
                      <Badge variant={getEventTypeBadge(ev.event_type)} size="sm">
                        {ev.event_type}
                      </Badge>
                    </div>

                    {ev.description && (
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-surface-dark/60 p-2 rounded-xl border border-white/5">
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

                    {/* Teacher & Admin Action Buttons: Edit Purpose / Delete */}
                    {canEditOrAdd && (
                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Edit Event Details & Purpose"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Purpose</span>
                        </button>

                        {(role === 'admin' || ev.created_by === user?.id) && (
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Remove Event"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedDayAttendance.length === 0 && selectedDayEvents.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No attendance records or events scheduled for this date.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CREATE EVENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
              Publish School / Classroom Event
            </h4>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Grade 10 Physical Sciences SBA Term Test"
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
                    <option value="Exam">Exam / Test Assessment</option>
                    <option value="Academic">Academic & Term Milestone</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Grade</label>
                  <select
                    value={formData.grade_target}
                    onChange={(e) => setFormData({ ...formData, grade_target: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                  >
                    <option value="">All Grades (8–12)</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Science Lab 2B"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Purpose & Description Notes</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain the purpose, required materials, or instructions for learners and parents..."
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

      {/* EDIT EVENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface-dark border border-cyan-500/30 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              Edit Event Details & Purpose
            </h4>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={editFormData.event_type}
                    onChange={(e) => setEditFormData({ ...editFormData, event_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="Exam">Exam / Test Assessment</option>
                    <option value="Academic">Academic & Term Milestone</option>
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
                    value={editFormData.event_date}
                    onChange={(e) => setEditFormData({ ...editFormData, event_date: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Grade</label>
                  <select
                    value={editFormData.grade_target}
                    onChange={(e) => setEditFormData({ ...editFormData, grade_target: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="">All Grades (8–12)</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Purpose & Classroom Details</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Update event purpose, instructions, or scope..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-darker border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 font-bold transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold transition-all text-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save & Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
