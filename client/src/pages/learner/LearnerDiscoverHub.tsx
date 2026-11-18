import React from 'react';
import { Bot, Gamepad2, Swords, GraduationCap } from 'lucide-react';

interface LearnerDiscoverHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
  tutorContext?: {
    subject: string;
    topicId?: string;
    topicName?: string;
  };
}

const discoverModules = [
  { id: 'ai-tutor', title: 'CAPS AI Tutor', icon: Bot },
  { id: 'career-advisor', title: 'Career Advisor', icon: GraduationCap },
  { id: 'arcade', title: 'Study Games', icon: Gamepad2 },
  { id: 'inter-school', title: 'Olympiads & Derbies', icon: Swords },
];

export const LearnerDiscoverHub: React.FC<LearnerDiscoverHubProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-4 animate-fade-in text-slate-900 dark:text-slate-100 pb-16">
      <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
        Discover
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {discoverModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onNavigateTab(mod.id)}
              className="group p-4 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/60 hover:bg-cyan-500/5 dark:hover:bg-[#132230] transition-all cursor-pointer flex items-center gap-3 text-left shadow-sm hover:-translate-y-0.5"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 text-cyan-700 dark:text-[#18E2EC]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-[#18E2EC] transition-colors leading-snug">
                {mod.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
