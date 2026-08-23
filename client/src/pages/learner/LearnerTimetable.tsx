import React, { useState, useEffect, useMemo } from 'react';
import { learnerService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import {
  Clock,
  MapPin,
  User,
  AlertCircle,
  Calendar,
  LayoutGrid,
  List,
  Columns,
  Search,
  Printer,
  Sparkles,
  BookOpen,
  Filter,
  Layers,
  ChevronRight
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const STANDARD_PERIODS = [
  '07:15 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 10:45',
  '10:45 - 11:45',
  '11:45 - 12:45',
  '12:45 - 13:15',
  '13:15 - 14:15',
];

type TimetableViewMode = 'matrix' | 'cards' | 'list';

export const LearnerTimetable: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const dayIndex = new Date().getDay();
    // Monday = 1, Friday = 5
    if (dayIndex >= 1 && dayIndex <= 5) {
      return DAYS[dayIndex - 1];
    }
    return 'Monday';
  });

  const [viewMode, setViewMode] = useState<TimetableViewMode>(() => {
    const saved = localStorage.getItem('fusion_learner_timetable_view');
    return (saved as TimetableViewMode) || 'matrix';
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [timetableList, setTimetableList] = useState<any[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('fusion_learner_timetable_view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    learnerService.getTimetable()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.timetables || [];
        setTimetableList(list);
        if (list.length > 0) {
          const active = list.find((t: any) => t.is_active) || list[0];
          setActiveSchedule(active);
        }
      })
      .catch((err) => {
        console.error('Failed to load timetables from database:', err);
        setError('Failed to load timetable from server.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Parse Master Timetable JSON structure
  const parsedTimetableData = useMemo(() => {
    if (!activeSchedule || !activeSchedule.timetable_data) return {};
    return typeof activeSchedule.timetable_data === 'string'
      ? JSON.parse(activeSchedule.timetable_data)
      : activeSchedule.timetable_data;
  }, [activeSchedule]);

  // Extract all slots across all 5 days for the matrix
  const allWeekSlots = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    DAYS.forEach(day => { map[day] = {}; });

    for (const className in parsedTimetableData) {
      const classDays = parsedTimetableData[className];
      if (classDays) {
        for (const day in classDays) {
          if (map[day]) {
            const periods = classDays[day];
            for (const time in periods) {
              const entry = periods[time];
              if (entry && (entry.subject || entry.teacher)) {
                map[day][time] = {
                  period: time,
                  time,
                  class: className,
                  subject: entry.subject || 'Class Session',
                  teacher: entry.teacher || 'Assigned Educator',
                  room: entry.room || `Class ${className}`,
                };
              }
            }
          }
        }
      }
    }
    return map;
  }, [parsedTimetableData]);

  // Extract period slots for the selected single day
  const daySlots = useMemo(() => {
    const slotsObj = allWeekSlots[selectedDay] || {};
    const list = Object.values(slotsObj);
    if (!searchFilter.trim()) return list;

    const q = searchFilter.toLowerCase();
    return list.filter(
      (s: any) =>
        s.subject?.toLowerCase().includes(q) ||
        s.teacher?.toLowerCase().includes(q) ||
        s.room?.toLowerCase().includes(q) ||
        s.period?.toLowerCase().includes(q)
    );
  }, [allWeekSlots, selectedDay, searchFilter]);

  // Extract unique periods present across the week
  const allPeriodsList = useMemo(() => {
    const set = new Set<string>();
    STANDARD_PERIODS.forEach(p => set.add(p));
    DAYS.forEach(d => {
      Object.keys(allWeekSlots[d] || {}).forEach(p => set.add(p));
    });
    return Array.from(set).sort();
  }, [allWeekSlots]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingSpinner text="Fetching timetable from database..." />;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-glow-indigo">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight">
              Class Timetable & Schedule
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            CAPS Curriculum Schedule • Grade {user?.grade || user?.academic?.grade || '10'} • Customized Grid Views
          </p>
        </div>

        {/* View Switcher & Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 3 Configurable Grid View Buttons */}
          <div className="flex items-center p-1 rounded-2xl bg-surface-dark border border-white/10 shadow-sm">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Full Weekly Master Matrix (Monday to Friday table)"
            >
              <Columns className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Weekly Matrix</span>
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Day Cards Grid (Interactive Day tabs + period cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Day Cards</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Compact Daily Agenda List"
            >
              <List className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Agenda List</span>
            </button>
          </div>

          {/* Quick Print Button */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-surface-dark hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Print Weekly Timetable"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Draft Notification if Pending Educator Verification */}
      {activeSchedule?.status === 'draft_teachers' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3 animate-fade-in">
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold">Educator Review in Progress</p>
            <p className="text-[11px] text-amber-400/80 mt-0.5">
              Your subject educators are currently verifying teaching slots and room allocations for this grade. The finalized schedule will be released here once fully approved.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter / Search Bar (For Subject & Teacher search) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-surface-dark border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by subject (e.g. Mathematics), educator, or room venue..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none focus:border-cyan-500 ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                : 'bg-surface-darker border-white/10 text-white placeholder-slate-500'
            }`}
          />
        </div>

        {/* View Mode Indicator Pill */}
        <div className="flex items-center gap-2 text-xs text-slate-400 px-2 shrink-0">
          <span className="text-[11px] uppercase font-bold tracking-wider text-cyan-400">
            {viewMode === 'matrix' ? 'Weekly Master Matrix' : viewMode === 'cards' ? 'Daily Cards Grid' : 'Compact Agenda List'}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 1: FULL 5-DAY WEEKLY MASTER MATRIX TABLE
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'matrix' && (
        <div
          className={`p-4 sm:p-6 rounded-3xl border shadow-xl overflow-hidden space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-surface-dark border-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
              <Columns className="w-4 h-4 text-cyan-400" />
              <span>Full Weekly Master Grid (Monday – Friday)</span>
            </h3>
            <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
              5-Day Overview
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 w-32 bg-surface-darker/60 rounded-l-xl">Period / Time</th>
                  {DAYS.map((day) => (
                    <th key={day} className="py-3 px-3 text-center bg-surface-darker/40">
                      <span className={day === selectedDay ? 'text-cyan-400 font-black' : 'text-slate-300'}>
                        {day}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {allPeriodsList.map((periodTime) => {
                  const isBreak = periodTime.includes('10:00') || periodTime.includes('12:45') || periodTime.toLowerCase().includes('break');

                  return (
                    <tr
                      key={periodTime}
                      className={`hover:bg-white/5 transition-colors ${
                        isBreak ? 'bg-indigo-950/20 font-mono text-[10px]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-cyan-300 bg-surface-darker/30 whitespace-nowrap">
                        {periodTime}
                      </td>

                      {DAYS.map((day) => {
                        const slot = allWeekSlots[day]?.[periodTime];
                        const matchesFilter =
                          !searchFilter.trim() ||
                          slot?.subject?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          slot?.teacher?.toLowerCase().includes(searchFilter.toLowerCase());

                        if (isBreak) {
                          return (
                            <td key={day} className="py-2.5 px-2 text-center text-slate-500 italic text-[10px]">
                              Break & Nutrition
                            </td>
                          );
                        }

                        if (!slot) {
                          return (
                            <td key={day} className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                              —
                            </td>
                          );
                        }

                        return (
                          <td key={day} className="py-2.5 px-2">
                            <div
                              className={`p-2.5 rounded-2xl border transition-all space-y-1 ${
                                matchesFilter
                                  ? 'bg-surface-darker border-white/10 hover:border-cyan-400/50 hover:shadow-glow-cyan'
                                  : 'opacity-40 bg-surface-darker/50 border-white/5'
                              }`}
                            >
                              <p className="font-bold text-white text-xs truncate leading-snug">
                                {slot.subject}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                                <span className="text-cyan-300 truncate max-w-[90px]">{slot.room}</span>
                                <span className="truncate max-w-[80px]">{slot.teacher}</span>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 2: INTERACTIVE DAY CARDS GRID VIEW
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {/* Day Selector Tabs */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto scrollbar-none">
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              const slotCount = Object.keys(allWeekSlots[day] || {}).length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-glow-indigo'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{day}</span>
                  <span className={`text-[9px] font-mono font-normal ${isSelected ? 'text-cyan-200' : 'text-slate-500'}`}>
                    {slotCount} periods
                  </span>
                </button>
              );
            })}
          </div>

          {/* Period Cards Grid */}
          {daySlots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {daySlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl hover:border-brand-500/40 hover:shadow-glow-indigo transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-400">
                      {slot.class}
                    </span>
                    <Badge variant="cyan" size="sm">
                      {slot.period}
                    </Badge>
                  </div>

                  <h4 className="text-base font-bold font-display text-white group-hover:text-cyan-300 transition-colors">
                    {slot.subject}
                  </h4>

                  <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-mono">{slot.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-brand-400" />
                      <span className="font-medium truncate max-w-[130px]">{slot.teacher}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-surface-dark border border-white/10 p-12 text-center text-slate-400 text-xs space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-300">
                {activeSchedule ? `No periods found for ${selectedDay}.` : 'No active timetable published in database.'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Try clearing your search filter or select another day of the week.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 3: COMPACT DAILY AGENDA LIST VIEW
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Day Selector Tabs */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto scrollbar-none">
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 min-w-[90px] py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-3xl border shadow-xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-surface-dark border-white/10'
            }`}
          >
            <div className="space-y-2">
              {daySlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-4 rounded-2xl bg-surface-darker border border-white/5 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 sm:w-20 text-[11px] font-mono font-bold text-cyan-300">
                      {slot.period}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                        {slot.subject}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Educator: <span className="text-slate-300 font-medium">{slot.teacher}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="px-2.5 py-1 rounded-xl bg-surface-dark border border-white/10 text-[11px] font-mono text-cyan-400">
                      {slot.room}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 text-[10px] font-bold uppercase">
                      {slot.class}
                    </span>
                  </div>
                </div>
              ))}

              {daySlots.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No classes scheduled for {selectedDay}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
