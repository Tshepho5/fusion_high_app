import React, { useState } from 'react';
import { MultiSchoolCommandCenter } from '../../components/admin/MultiSchoolCommandCenter';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import { BursaryScholarshipHub } from '../../components/learner/BursaryScholarshipHub';
import {
  Compass,
  Building2,
  Swords,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminDiscoverHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
  initialSubTab?: 'command-center' | 'inter-school' | 'bursaries';
}

export const AdminDiscoverHub: React.FC<AdminDiscoverHubProps> = ({
  onNavigateTab,
  initialSubTab = 'command-center',
}) => {
  const { user } = useAuth();
  const isSuperAdmin = !!user?.is_superadmin;

  const [subTab, setSubTab] = useState<'command-center' | 'inter-school' | 'bursaries'>(
    !isSuperAdmin && initialSubTab === 'command-center' ? 'inter-school' : initialSubTab
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-16">
      {/* Header with Sub-Tab Switcher */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Administrative Discovery Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Inter-School & Provincial Leadership
          </h1>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-surface-darker rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start sm:self-center">
          {isSuperAdmin && (
            <button
              onClick={() => setSubTab('command-center')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTab === 'command-center'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Multi-School Command</span>
            </button>
          )}

          <button
            onClick={() => setSubTab('inter-school')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'inter-school'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Olympiads & Derbies</span>
          </button>

          <button
            onClick={() => setSubTab('bursaries')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'bursaries'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Tertiary Bursaries</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Content Rendering */}
      <div>
        {subTab === 'command-center' && isSuperAdmin && <MultiSchoolCommandCenter />}
        {subTab === 'inter-school' && <InterSchoolCompetitions />}
        {subTab === 'bursaries' && <BursaryScholarshipHub />}
      </div>
    </div>
  );
};
