import React, { useState } from 'react';
import { TeacherResources } from './TeacherResources';
import { TeacherAITools } from './TeacherAITools';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import {
  Sparkles,
  Layers,
  Trophy,
  Compass,
} from 'lucide-react';

interface TeacherDiscoverHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
  initialSubTab?: 'resources' | 'ai-tools' | 'inter-school';
}

export const TeacherDiscoverHub: React.FC<TeacherDiscoverHubProps> = ({
  onNavigateTab,
  initialSubTab = 'resources',
}) => {
  const [subTab, setSubTab] = useState<'resources' | 'ai-tools' | 'inter-school'>(initialSubTab);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-16">
      {/* Discover Header with Integrated Sub-Tab Switcher */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Curriculum & Discovery Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Discover Teaching Innovation
          </h1>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-surface-darker rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setSubTab('resources')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'resources'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Past Papers & Vault</span>
          </button>

          <button
            onClick={() => setSubTab('ai-tools')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'ai-tools'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Studio</span>
          </button>

          <button
            onClick={() => setSubTab('inter-school')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'inter-school'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Olympiads & Derbies</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Content Rendering */}
      <div>
        {subTab === 'resources' && <TeacherResources onNavigateTab={onNavigateTab} />}
        {subTab === 'ai-tools' && <TeacherAITools />}
        {subTab === 'inter-school' && <InterSchoolCompetitions />}
      </div>
    </div>
  );
};
