import React, { useState } from 'react';
import { Compass, CheckCircle2, Award, Zap, Trophy, BookOpen, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuestStage {
  grade: string;
  stageName: string;
  title: string;
  badge: string;
  color: string;
  accentBorder: string;
  bgGlow: string;
  description: string;
  skills: string[];
  rewards: string;
  stats: string;
}

const QUEST_STAGES: QuestStage[] = [
  {
    grade: 'Grade 8 - 9',
    stageName: 'STAGE 1: FOUNDATION EXPEDITION',
    title: 'Junior Academic Trailblazer',
    badge: 'Novice to Intermediate',
    color: 'text-cyan-400',
    accentBorder: 'border-cyan-500/40',
    bgGlow: 'from-cyan-500/10 to-teal-500/5',
    description: 'Master core General Education and Training (GET) disciplines, build digital fluency with the Fusion AI study companion, and discover your natural academic aptitudes.',
    skills: ['Natural Sciences Foundation', 'Creative Arts & Tech', 'Mathematics Fluency', 'Languages & Creative Writing'],
    rewards: 'Access to Grade 8-9 AI Homework Assistant & Study Clubs',
    stats: '100% Foundation Coverage',
  },
  {
    grade: 'Grade 10',
    stageName: 'STAGE 2: FET PATHWAY SELECTION',
    title: 'Specialized Subject Architect',
    badge: 'Subject Mastery',
    color: 'text-indigo-400',
    accentBorder: 'border-indigo-500/40',
    bgGlow: 'from-indigo-500/10 to-blue-500/5',
    description: 'Transition into the Further Education and Training (FET) phase. Choose your specialized stream (STEM, Commercial, or Humanities) with intelligent APS forecasting.',
    skills: ['Pure Mathematics / Math Lit', 'Physical & Life Sciences', 'Accounting & Economics', 'Information Technology'],
    rewards: 'Personalized APS Career Pathway Matrix & Subject Past Papers',
    stats: '3 Specialized Academic Streams',
  },
  {
    grade: 'Grade 11',
    stageName: 'STAGE 3: PRE-MATRIC OLYMPIAD',
    title: 'Academic Contender & Leader',
    badge: 'Leadership & Competitions',
    color: 'text-amber-400',
    accentBorder: 'border-amber-500/40',
    bgGlow: 'from-amber-500/10 to-orange-500/5',
    description: 'Elevate your internal marks, participate in inter-school Olympiads, and secure early provisional university entrance and competitive scholarship benchmarks.',
    skills: ['Advanced Calculus & Mechanics', 'Inter-School Quizzes & Debates', 'Scientific SACNASP Projects', 'Leadership & Prefect Guild'],
    rewards: 'Provisional University Qualification & Bursary Shortlisting',
    stats: 'Top 5% Inter-School Ranking',
  },
  {
    grade: 'Grade 12',
    stageName: 'STAGE 4: MATRIC DISTINCTION SUMMIT',
    title: 'Matric Champion & Bursary Laureate',
    badge: 'National Distinction',
    color: 'text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    bgGlow: 'from-emerald-500/10 to-green-500/5',
    description: 'Conquer the DBE NSC Final Examinations with distinction. Match with full-ride corporate bursaries and step confidently into premier university programs.',
    skills: ['Past Papers Exam Drill Engine', 'AI Mock Exam Simulations', 'Matric Study Camps', 'Full-Ride Bursary Placement'],
    rewards: 'NSC Bachelor Degree Pass + Top Corporate Bursary (R150,000+/yr)',
    stats: '98.4% Historic Matric Pass',
  },
];

export const AcademicQuestMap: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(3); // Default to Grade 12 Matric distinction

  return (
    <section className="relative w-full max-w-5xl mx-auto my-16 px-4 sm:px-6">
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-bold text-indigo-300 shadow-sm">
          <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span>SOUTH AFRICAN CURRICULUM EXPEDITION MAP</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
          Your 5-Year Journey to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Matric Distinctions & Top Bursaries
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          From your first day in Grade 8 to standing on the Matric distinction podium with a full university scholarship — Fusion High guides every single milestone.
        </p>
      </div>

      {/* Stage Navigation Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {QUEST_STAGES.map((stage, index) => {
          const isSelected = activeStage === index;
          return (
            <button
              key={index}
              onClick={() => setActiveStage(index)}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                isSelected
                  ? `bg-surface-darker/90 ${stage.accentBorder} shadow-lg shadow-indigo-500/10 ring-1 ring-white/20`
                  : 'bg-surface-dark/60 hover:bg-surface-dark/90 border-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                  Step 0{index + 1}
                </span>
                {isSelected ? (
                  <Zap className={`w-4 h-4 ${stage.color} animate-bounce`} />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                )}
              </div>
              <div className="font-extrabold font-display text-sm sm:text-base text-white">
                {stage.grade}
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {stage.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Detailed Showcase Card */}
      {(() => {
        const stage = QUEST_STAGES[activeStage];
        return (
          <div className="relative rounded-3xl bg-surface-dark/95 border border-white/15 p-6 sm:p-10 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${stage.bgGlow} rounded-full blur-3xl pointer-events-none`} />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Stage Info */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full border text-xs font-mono font-bold ${stage.accentBorder} ${stage.color} bg-white/5`}>
                    {stage.stageName}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{stage.badge}</span>
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                  {stage.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {stage.description}
                </p>

                {/* Key Skills & Curriculum Modules */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    Core Academic Curriculum & Skills:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stage.skills.map((skill, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200"
                      >
                        <Star className={`w-3.5 h-3.5 ${stage.color} shrink-0`} />
                        <span className="font-medium truncate">{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Rewards & Milestone Achievements */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-surface-darker/90 border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                        Milestone Reward
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-white">
                        {stage.rewards}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                        Target Metric
                      </span>
                      <span className="text-sm font-mono font-bold text-cyan-400">
                        {stage.stats}
                      </span>
                    </div>

                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all active:scale-95"
                    >
                      <span>Start Quest</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
};
