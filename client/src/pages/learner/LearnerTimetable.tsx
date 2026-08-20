import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { Clock, MapPin, User, AlertCircle, Calendar } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const LearnerTimetable: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetableList, setTimetableList] = useState<any[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <LoadingSpinner text="Fetching timetable from database..." />;

  // Extract period slots for the selected day from timetable_data JSON
  const getPeriodsForDay = () => {
    if (activeSchedule && activeSchedule.timetable_data) {
      const tData = typeof activeSchedule.timetable_data === 'string'
        ? JSON.parse(activeSchedule.timetable_data)
        : activeSchedule.timetable_data;

      const slots: any[] = [];
      for (const className in tData) {
        const classDays = tData[className];
        if (classDays && classDays[selectedDay]) {
          const dayPeriods = classDays[selectedDay];
          for (const periodTime in dayPeriods) {
            const entry = dayPeriods[periodTime];
            if (entry && (entry.subject || entry.teacher)) {
              slots.push({
                period: periodTime,
                time: periodTime,
                class: className,
                subject: entry.subject || 'Class Session',
                teacher: entry.teacher || 'Assigned Educator',
                room: entry.room || `Class ${className}`,
              });
            }
          }
        }
      }
      if (slots.length > 0) return slots;
    }
    return [];
  };

  const daySlots = getPeriodsForDay();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-cyan-400" />
            Weekly Class Timetable
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            School Hours: <span className="font-mono text-cyan-400 font-bold">07:15 - 14:00</span> (45-Min Break: 10:15 - 11:00)
          </p>
        </div>

        {activeSchedule && (
          <Badge variant="cyan" size="md">
            {activeSchedule.name || 'Published Master Schedule'}
          </Badge>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto">
        {DAYS.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Periods Grid */}
      {daySlots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daySlots.map((slot, idx) => (
            <div
              key={idx}
              className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl hover:border-brand-500/30 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-400">
                  {slot.class}
                </span>
                <Badge variant="cyan" size="sm">
                  {slot.period} (1 Hour)
                </Badge>
              </div>

              <h4 className="text-base font-bold font-display text-white">
                {slot.subject}
              </h4>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{slot.room}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-400" />
                  <span>{slot.teacher}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-12 text-center text-slate-400 text-xs space-y-2">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-slate-300">
            {activeSchedule ? `No periods scheduled for ${selectedDay}.` : 'No active timetable published in database.'}
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Once the school administration publishes the 1-hour weekly schedule (07:15 - 14:00), it will appear here in real time.
          </p>
        </div>
      )}
    </div>
  );
};
