import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Award,
  BookOpen,
  CheckCircle2,
  Database,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  GraduationCap,
  Layers,
  ChevronRight
} from 'lucide-react';
import { LearnerAIQuizModal } from './LearnerAIQuizModal';

interface GelezaAIStudyHubModuleProps {
  initialSubject?: string;
}

const CAPS_SUBJECT_TOPICS: Record<string, string[]> = {
  'Mathematics': [
    'Quadratic Equations & Trinomials',
    'Arithmetic & Geometric Sequences',
    'Euclidean Circle Geometry',
    'Trigonometry Reduction Identities',
    'Calculus Derivatives & Tangents'
  ],
  'Physical Sciences': [
    'Newton’s Laws of Motion & Net Force',
    'Work, Energy and Power Calculations',
    'Doppler Effect Calculations',
    'Organic Chemistry IUPAC Naming',
    'Chemical Equilibrium & Le Chatelier'
  ],
  'Life Sciences': [
    'DNA Replication & Transcription',
    'Meiosis & Genetic Crosses',
    'Human Endocrine Glands & Hormones',
    'Human Eye & Ear Defect Corrections',
    'Evolution Evidence & Speciation'
  ],
  'Accounting': [
    'Balance Sheet & Notes Analysis',
    'Debtors & Creditors Reconciliations',
    'Bank Reconciliation Statements',
    'Cost Accounting & Break-even Point'
  ],
  'Geography': [
    'Mid-Latitude Cyclones & Tropical Storms',
    'Geomorphology & Fluvial Processes',
    'Settlement Geography & Urban Issues',
    'Economic Geography of South Africa'
  ],
  'English First Additional Language': [
    'Comprehension & Summary Skills',
    'Language Structures & Conventions',
    'Literature Essay Writing & Themes',
    'Visual Literacy & Advertising Analysis'
  ]
};

export const GelezaAIStudyHubModule: React.FC<GelezaAIStudyHubModuleProps> = ({
  initialSubject = 'Mathematics'
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);

  const availableTopics = CAPS_SUBJECT_TOPICS[selectedSubject] || [
    'Core CAPS Concepts & Principles',
    'Exam Diagnostic Assessment',
    'Past Paper Problem Solving'
  ];

  const handleLaunchWithTopic = (topicName: string) => {
    setSelectedTopic(topicName);
    setIsQuizModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Live Data Retrieval Source Indicator */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-[#0E1722]/90 border border-slate-200/90 dark:border-white/10 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
            Geleza AI Question Bank & Marking Rubric retrieved live from PostgreSQL Database • Verified CAPS Curriculum
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider shrink-0 hidden sm:inline">
          PostgreSQL Synced
        </span>
      </div>

      {/* Hero Module Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-[#18E2EC] flex items-center justify-center shrink-0 shadow-sm">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white">
                Geleza AI Study Hub
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-mono text-cyan-700 dark:text-cyan-300 font-bold">
                CAPS Socratic Practice
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Generate syllabus-accurate CAPS practice quizzes, receive step-by-step Socratic hints when stuck, and review comprehensive instant explanations for every mistake.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedTopic(availableTopics[0] || 'Core Concepts');
            setIsQuizModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-[#13C8D9] hover:bg-[#0891B2] text-[#0A121A] font-extrabold text-xs sm:text-sm shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 self-start lg:self-center"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch Practice Quiz</span>
        </button>
      </div>

      {/* Grade & Subject Selector */}
      <div className="p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-500" />
            <span>Select CAPS Subject & Grade Level</span>
          </h3>

          {/* Grade Selector */}
          <div className="flex items-center gap-1.5">
            {[10, 11, 12].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGrade === g
                    ? 'bg-cyan-600 dark:bg-[#13C8D9] text-white dark:text-[#0A121A]'
                    : 'bg-slate-100 dark:bg-surface-darker text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Grade {g}
              </button>
            ))}
          </div>
        </div>

        {/* Subjects horizontal pill scroller */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Object.keys(CAPS_SUBJECT_TOPICS).map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-cyan-600 dark:bg-[#13C8D9] text-white dark:text-[#0A121A] shadow-xs'
                  : 'bg-slate-100 dark:bg-surface-darker text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Available CAPS Modules & Topics for Selected Subject */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>Recommended CAPS Practice Modules for {selectedSubject}</span>
          </h3>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold">
            Grade {selectedGrade} Syllabus
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableTopics.map((top, idx) => (
            <div
              key={idx}
              onClick={() => handleLaunchWithTopic(top)}
              className="p-5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-cyan-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-xs"
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  Topic {idx + 1}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors leading-snug">
                  {top}
                </h4>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Instant AI Marking</span>
                <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>Start Quiz</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-[#18E2EC]">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Socratic Hints</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Get intelligent guidance without having the answer given away, promoting deep conceptual mastery.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-[#18E2EC]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">CAPS Exam Marking</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Questions strictly adhere to Department of Basic Education Curriculum and Assessment Policy Statements.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-[#18E2EC]">
            <Database className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">PostgreSQL Data Sync</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Results and study sessions are synchronized with your academic profile and school records.
          </p>
        </div>
      </div>

      {/* Quiz Modal */}
      <LearnerAIQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        initialSubject={selectedSubject}
        initialGrade={selectedGrade}
      />
    </div>
  );
};
