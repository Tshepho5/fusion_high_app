import React, { useState } from 'react';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { AdminTimetable } from './AdminTimetable';
import { Calendar, Clock } from 'lucide-react';

interface AdminCalendarHubProps {
  initialSubTab?: 'calendar' | 'timetable';
}

export const AdminCalendarHub: React.FC<AdminCalendarHubProps> = ({
  initialSubTab = 'calendar',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'timetable'>(initialSubTab);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Header & Switcher */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Institutional Schedule & Calendar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Master School Calendar & Timetable
          </h1>
        </div>

        {/* Timetable / Calendar Toggle Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-surface-darker rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Events & Calendar</span>
          </button>

          <button
            onClick={() => setActiveSubTab('timetable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'timetable'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Master Timetable</span>
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      <div>
        {activeSubTab === 'calendar' && <SchoolCalendar />}
        {activeSubTab === 'timetable' && <AdminTimetable />}
      </div>
    </div>
  );
};
