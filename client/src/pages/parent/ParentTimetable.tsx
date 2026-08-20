import React, { useState, useEffect } from 'react';
import { parentService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Users,
  GraduationCap,
  AlertCircle
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ParentTimetable: React.FC = () => {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [timetableData, setTimetableData] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    parentService.getChildren()
      .then(res => {
        const list = Array.isArray(res) ? res : res.children || [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChild(list[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load children for timetable:', err);
        setError('Could not load linked learners.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    setLoadingSchedule(true);
    parentService.getChildTimetable(selectedChild.id)
      .then(res => {
        setTimetableData(res);
      })
      .catch(err => {
        console.error('Error fetching child timetable:', err);
        setTimetableData(null);
      })
      .finally(() => setLoadingSchedule(false));
  }, [selectedChild]);

  if (loading) return <LoadingSpinner text="Loading linked children..." />;

  const parsedData = timetableData
    ? (typeof timetableData.timetable_data === 'string' ? JSON.parse(timetableData.timetable_data) : timetableData.timetable_data)
    : null;

  // Locate the class matching the child or default to first class
  let classKey = parsedData ? Object.keys(parsedData).find(k => k.includes(`${selectedChild?.grade}A`) || k.includes(`${selectedChild?.grade}`)) || Object.keys(parsedData)[0] : null;
  const rawDaySchedule = parsedData && classKey && parsedData[classKey]?.[selectedDay]
    ? parsedData[classKey][selectedDay]
    : null;

  // Convert rawDaySchedule to array of slots from live database
  const effectiveSlots: Array<{ period: string; time: string; subject: string; teacher: string; room: string; duration?: string }> =
    rawDaySchedule && Object.keys(rawDaySchedule).length > 0
      ? Object.entries(rawDaySchedule).map(([periodTime, entry]: [string, any], idx) => ({
          period: `Period ${idx + 1}`,
          time: periodTime,
          subject: entry.subject || 'Class Session',
          teacher: entry.teacher || 'Subject Educator',
          room: entry.room || `Room ${selectedChild?.grade || 10}A`,
          duration: entry.duration || '1 Hour'
        }))
      : [];

  const isPublished = timetableData && (timetableData.is_published !== false && (effectiveSlots.length > 0 || (parsedData && Object.keys(parsedData).length > 0)));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-amber-400" />
          Child Weekly Class Timetable
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Live 1-hour class periods, educator allocations, and room venues for your enrolled children.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Child Selector Tabs */}
      {children.length > 1 && (
        <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto">
          {children.map((child) => {
            const isSelected = selectedChild?.id === child.id;
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-600 to-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {`${child.full_name || ''} ${child.surname || ''}`.trim()}
              </button>
            );
          })}
        </div>
      )}

      {selectedChild && (
        <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                {(selectedChild.full_name || 'C').charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-white">
                  {`${selectedChild.full_name || ''} ${selectedChild.surname || ''}`.trim()}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Grade {selectedChild.grade || 10} • Stream: {selectedChild.stream || 'General'} • Learner No: {selectedChild.learner_number || (selectedChild.id ? `ID-${selectedChild.id}` : (selectedChild.child_id ? `ID-${selectedChild.child_id}` : '2026-001'))}
                </p>
              </div>
            </div>
            {isPublished ? (
              <Badge variant="emerald" size="sm">Live Master Timetable</Badge>
            ) : (
              <Badge variant="amber" size="sm">Awaiting Principal Publication</Badge>
            )}
          </div>

          {/* Day Selector Tabs */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-darker border border-white/5 overflow-x-auto">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedDay === day
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Schedule Periods Grid */}
          {loadingSchedule ? (
            <LoadingSpinner text="Fetching weekly timetable..." />
          ) : isPublished && effectiveSlots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {effectiveSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2.5 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-1.5 border-b border-white/5">
                    <span className="font-bold text-amber-400">{slot.period} (1 Hour)</span>
                    <span>{slot.time}</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-white text-xs leading-snug">{slot.subject}</p>
                    <p className="text-[11px] text-amber-300 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{slot.teacher}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <MapPin className="w-2.5 h-2.5 text-slate-500" />
                      <span>{slot.room}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs rounded-2xl bg-surface-darker border border-white/5 space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-400">No timetable published for Grade {selectedChild.grade} yet.</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Once the Principal generates and publishes the clash-free 1-hour schedule, it will be automatically reflected here in real time.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
