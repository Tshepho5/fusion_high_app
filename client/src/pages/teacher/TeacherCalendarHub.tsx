import React, { useState } from 'react';
import { TeacherTimetable } from './TeacherTimetable';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { Calendar, Clock } from 'lucide-react';

interface TeacherCalendarHubProps {
  initialSubTab?: 'calendar' | 'timetable';
}

export const TeacherCalendarHub: React.FC<TeacherCalendarHubProps> = ({
  initialSubTab = 'timetable',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'timetable'>(initialSubTab);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-16">
      {/* Top Header & Switcher */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Master Schedule & Calendar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
            Educator Timetable & School Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            View your scheduled teaching periods, classroom rooming, term events, and official exam dates.
          </p>
        </div>

        {/* Timetable / Calendar Toggle Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-darker rounded-2xl border border-white/10 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveSubTab('timetable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'timetable'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Teaching Timetable</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Events Calendar</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeSubTab === 'timetable' && <TeacherTimetable />}
        {activeSubTab === 'calendar' && <SchoolCalendar />}
      </div>
    </div>
  );
};
