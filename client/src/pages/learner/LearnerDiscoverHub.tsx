import React, { useState } from 'react';
import { LearnerAITutor } from './LearnerAITutor';
import { LearnerCareerAdvisor } from '../../components/learner/LearnerCareerAdvisor';
import { FusionArcadeHub } from '../../components/learner/FusionArcadeHub';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import {
  Compass,
  Bot,
  Gamepad2,
  Swords,
  GraduationCap,
} from 'lucide-react';

interface LearnerDiscoverHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
  initialSubTab?: 'ai-tutor' | 'career-advisor' | 'arcade' | 'inter-school';
  tutorContext?: {
    subject: string;
    topicId?: string;
    topicName?: string;
  };
}

export const LearnerDiscoverHub: React.FC<LearnerDiscoverHubProps> = ({
  onNavigateTab,
  initialSubTab = 'ai-tutor',
  tutorContext,
}) => {
  const [subTab, setSubTab] = useState<'ai-tutor' | 'career-advisor' | 'arcade' | 'inter-school'>(initialSubTab);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-20">
      {/* Discover Top Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Learning Discovery & Innovation Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
            Discover Learning Tools
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Explore 24/7 DBE syllabus AI tutoring, Grade 12 Life Sciences Exam Studio, APS matric career matching, and Fusion arcade study games.
          </p>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-darker rounded-2xl border border-white/10 shrink-0 self-start md:self-center overflow-x-auto max-w-full">
          <button
            onClick={() => setSubTab('ai-tutor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'ai-tutor'
                ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>CAPS AI Tutor</span>
          </button>

          <button
            onClick={() => setSubTab('career-advisor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'career-advisor'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Career Advisor</span>
          </button>

          <button
            onClick={() => setSubTab('arcade')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'arcade'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Fusion Arcade</span>
          </button>

          <button
            onClick={() => setSubTab('inter-school')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'inter-school'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Derbies & Olympiads</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Content */}
      <div>
        {subTab === 'ai-tutor' && (
          <LearnerAITutor
            initialSubject={tutorContext?.subject}
            initialTopicId={tutorContext?.topicId}
            initialTopicName={tutorContext?.topicName}
          />
        )}
        {subTab === 'career-advisor' && <LearnerCareerAdvisor />}
        {subTab === 'arcade' && <FusionArcadeHub />}
        {subTab === 'inter-school' && <InterSchoolCompetitions />}
      </div>
    </div>
  );
};
