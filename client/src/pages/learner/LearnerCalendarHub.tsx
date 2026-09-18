import React, { useState } from 'react';
import { LearnerTimetable } from './LearnerTimetable';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { Calendar, Clock } from 'lucide-react';

interface LearnerCalendarHubProps {
  initialSubTab?: 'timetable' | 'calendar';
}

export const LearnerCalendarHub: React.FC<LearnerCalendarHubProps> = ({
  initialSubTab = 'timetable',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'timetable' | 'calendar'>(initialSubTab);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-20">
      {/* Top Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Learner Schedule & Calendar Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
            Timetable & Academic Calendar
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            View your daily 7-period South African CAPS timetable, teacher venues, and term dates.
          </p>
        </div>

        {/* Toggle Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-darker rounded-2xl border border-white/10 shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveSubTab('timetable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'timetable'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Weekly Class Timetable</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>School Term Calendar</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeSubTab === 'timetable' && <LearnerTimetable />}
        {activeSubTab === 'calendar' && <SchoolCalendar />}
      </div>
    </div>
  );
};
