import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  FileText,
  BookOpen,
  Bot,
  Compass,
  Gamepad2,
  BookMarked,
  Trophy,
  Swords,
  Megaphone,
  GraduationCap,
  CreditCard,
  Clock,
  Calendar,
  User,
  Settings,
  Search,
  ArrowRight,
  LayoutGrid,
  Grid3X3,
  List,
  Sparkles,
} from 'lucide-react';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';

type MoreViewMode = 'grid' | 'compact' | 'list';

interface LearnerMoreHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface ModuleItem {
  id: string;
  title: string;
  category: 'academics' | 'study-ai' | 'activities' | 'finance' | 'system';
  icon: React.ElementType;
  badge?: string;
  lightTileBg: string;
  darkTileBg: string;
}

export const LearnerMoreHub: React.FC<LearnerMoreHubProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<MoreViewMode>(() => {
    return (localStorage.getItem('learner_more_view_mode') as MoreViewMode) || 'grid';
  });

  const handleSetViewMode = (mode: MoreViewMode) => {
    setViewMode(mode);
    localStorage.setItem('learner_more_view_mode', mode);
  };

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'academics', label: 'Academics & Marks' },
    { id: 'study-ai', label: 'Study Tools & AI' },
    { id: 'activities', label: 'Campus Life & Sports' },
    { id: 'finance', label: 'Finance & Bursaries' },
    { id: 'system', label: 'Profile & Settings' },
  ];

  const allModules: ModuleItem[] = [
    // 1. Academics & Marks
    {
      id: 'performance',
      title: 'Academic Performance & Marks',
      category: 'academics',
      icon: TrendingUp,
      badge: 'Marks',
      lightTileBg: 'bg-[#0d9488] text-white',
      darkTileBg: 'dark:bg-[#083344] dark:text-[#22d3ee] dark:border dark:border-cyan-500/30',
    },
    {
      id: 'reports',
      title: 'CAPS Term Report Cards',
      category: 'academics',
      icon: FileText,
      badge: 'Official',
      lightTileBg: 'bg-[#0284c7] text-white',
      darkTileBg: 'dark:bg-[#0c2d48] dark:text-[#38bdf8] dark:border dark:border-sky-500/30',
    },
    {
      id: 'assignments',
      title: 'Homework & Digital Assignments Hub',
      category: 'academics',
      icon: FileText,
      badge: 'Tasks',
      lightTileBg: 'bg-[#8b5cf6] text-white',
      darkTileBg: 'dark:bg-[#1e1b4b] dark:text-[#818cf8] dark:border dark:border-indigo-500/30',
    },
    {
      id: 'exam-seating',
      title: 'Exam Seating & Candidate Slips',
      category: 'academics',
      icon: Award,
      badge: 'Exams',
      lightTileBg: 'bg-[#3b82f6] text-white',
      darkTileBg: 'dark:bg-[#0f2338] dark:text-[#38bdf8] dark:border dark:border-blue-500/30',
    },
    {
      id: 'subjects',
      title: 'My Enrolled Subjects Workspace',
      category: 'academics',
      icon: BookOpen,
      badge: 'CAPS',
      lightTileBg: 'bg-[#0ea5e9] text-white',
      darkTileBg: 'dark:bg-[#083344] dark:text-[#22d3ee] dark:border dark:border-cyan-500/30',
    },

    // 2. Study Tools & AI
    {
      id: 'discover',
      title: 'Discover Learning Innovation & AI Studios',
      category: 'study-ai',
      icon: Compass,
      badge: 'Discover',
      lightTileBg: 'bg-[#8b5cf6] text-white',
      darkTileBg: 'dark:bg-[#2e1065] dark:text-[#c084fc] dark:border dark:border-purple-500/30',
    },
    {
      id: 'ai-tutor',
      title: 'CAPS AI Study Tutor & Exam Studios',
      category: 'study-ai',
      icon: Bot,
      badge: 'AI Marker',
      lightTileBg: 'bg-[#ec4899] text-white',
      darkTileBg: 'dark:bg-[#3b0764] dark:text-[#e879f9] dark:border dark:border-fuchsia-500/30',
    },
    {
      id: 'career-advisor',
      title: 'Matric APS & University Career Advisor',
      category: 'study-ai',
      icon: User,
      badge: 'Matric',
      lightTileBg: 'bg-[#2563eb] text-white',
      darkTileBg: 'dark:bg-[#0f2238] dark:text-[#38bdf8] dark:border dark:border-blue-500/30',
    },
    {
      id: 'arcade',
      title: 'Fusion Arcade (CAPS Study Games)',
      category: 'study-ai',
      icon: Gamepad2,
      badge: 'Games',
      lightTileBg: 'bg-[#10b981] text-white',
      darkTileBg: 'dark:bg-[#052e16] dark:text-[#34d399] dark:border dark:border-emerald-500/30',
    },
    {
      id: 'textbooks',
      title: 'My Issued Textbooks & Assets',
      category: 'study-ai',
      icon: BookMarked,
      badge: 'Books',
      lightTileBg: 'bg-[#06b6d4] text-white',
      darkTileBg: 'dark:bg-[#083344] dark:text-[#22d3ee] dark:border dark:border-cyan-500/30',
    },

    // 3. Campus Life & Activities
    {
      id: 'sports',
      title: 'Sports & Extracurricular Clubs',
      category: 'activities',
      icon: Trophy,
      badge: 'Clubs',
      lightTileBg: 'bg-[#f59e0b] text-white',
      darkTileBg: 'dark:bg-[#064e3b] dark:text-[#4ade80] dark:border dark:border-green-500/30',
    },
    {
      id: 'inter-school',
      title: 'Inter-School Derbies & Olympiads',
      category: 'activities',
      icon: Swords,
      badge: 'Derbies',
      lightTileBg: 'bg-[#f43f5e] text-white',
      darkTileBg: 'dark:bg-[#4c0519] dark:text-[#fb7185] dark:border dark:border-rose-500/30',
    },
    {
      id: 'timetable',
      title: 'Weekly Class Timetable',
      category: 'activities',
      icon: Clock,
      badge: 'Periods',
      lightTileBg: 'bg-[#3b82f6] text-white',
      darkTileBg: 'dark:bg-[#0f2338] dark:text-[#38bdf8] dark:border dark:border-blue-500/30',
    },
    {
      id: 'announcements',
      title: 'School Notices & Broadcasts',
      category: 'activities',
      icon: Megaphone,
      badge: 'Notices',
      lightTileBg: 'bg-[#6366f1] text-white',
      darkTileBg: 'dark:bg-[#1e1b4b] dark:text-[#a78bfa] dark:border dark:border-indigo-500/30',
    },

    // 4. Finance & Bursaries
    {
      id: 'bursaries',
      title: 'NSFAS & Tertiary Bursary Finder',
      category: 'finance',
      icon: GraduationCap,
      badge: 'Funding',
      lightTileBg: 'bg-[#8b5cf6] text-white',
      darkTileBg: 'dark:bg-[#2e1065] dark:text-[#c084fc] dark:border dark:border-purple-500/30',
    },
    {
      id: 'finance',
      title: 'School Fee Statements & Receipts',
      category: 'finance',
      icon: CreditCard,
      badge: 'Accounts',
      lightTileBg: 'bg-[#0d9488] text-white',
      darkTileBg: 'dark:bg-[#083344] dark:text-[#22d3ee] dark:border dark:border-teal-500/30',
    },

    // 5. System & Profile
    {
      id: 'profile',
      title: 'My Profile & Digital Student ID Card',
      category: 'system',
      icon: User,
      badge: 'Identity',
      lightTileBg: 'bg-[#0284c7] text-white',
      darkTileBg: 'dark:bg-[#0f2238] dark:text-[#38bdf8] dark:border dark:border-cyan-500/30',
    },
    {
      id: 'settings',
      title: 'App & Technical Settings',
      category: 'system',
      icon: Settings,
      badge: 'Config',
      lightTileBg: 'bg-[#475569] text-white',
      darkTileBg: 'dark:bg-[#1e293b] dark:text-[#94a3b8] dark:border dark:border-slate-600/30',
    },
  ];

  // Filter modules
  const filteredModules = useMemo(() => {
    return allModules.filter((m) => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.badge && m.badge.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [allModules, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-20">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#071933] dark:via-[#051124] dark:to-[#040C1A] border border-slate-200/90 dark:border-[#163355] shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-cyan-500/15 border border-sky-200 dark:border-cyan-500/30 text-sky-600 dark:text-cyan-300 text-xs font-semibold">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Learner Portal Modules Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            More Modules &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-500 dark:from-cyan-400 dark:to-sky-400">
              Quick Functions
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Access your academic marks, homework submissions, bursary engines, exam candidate cards, and campus life tools.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#061224] rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-center">
          <button
            onClick={() => handleSetViewMode('grid')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-[#0284c7] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/5'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSetViewMode('compact')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-[#0284c7] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/5'
            }`}
            title="Compact View"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#0284c7] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/5'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learner modules (e.g. marks, reports, bursaries, AI tutor, sports, exams)..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#061224] border border-slate-200 dark:border-[#172A45] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                selectedCategory === c.id
                  ? 'bg-[#0080FF] dark:bg-[#F43F5E] text-white border-blue-600 dark:border-rose-500 shadow-sm'
                  : 'bg-white dark:bg-[#071529] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-[#152A47]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Output based on View Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-4 rounded-2xl bg-white dark:bg-[#07152A] border border-slate-200/90 dark:border-[#142944] hover:border-blue-400 dark:hover:border-cyan-500/40 hover:shadow-md dark:hover:bg-[#091b33] transition-all cursor-pointer shadow-sm group flex items-center justify-between gap-3 card-interactive"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl ${m.lightTileBg} ${m.darkTileBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors truncate">
                      {m.title}
                    </p>
                    {m.badge && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 dark:bg-[#0A1E36] text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-[#143254]">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'compact' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-3 rounded-2xl bg-white dark:bg-[#07152A] border border-slate-200/90 dark:border-[#142944] hover:border-blue-400 dark:hover:border-cyan-500/40 hover:shadow-md dark:hover:bg-[#091b33] transition-all cursor-pointer flex flex-col items-center text-center gap-2 group card-interactive"
              >
                <div className={`w-10 h-10 rounded-xl ${m.lightTileBg} ${m.darkTileBg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-2 leading-tight">
                  {m.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#07152A] border border-slate-200/90 dark:border-[#142944] hover:border-blue-400 dark:hover:border-cyan-500/40 hover:shadow-md dark:hover:bg-[#091b33] transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${m.lightTileBg} ${m.darkTileBg} flex items-center justify-center shrink-0 shadow-xs`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                      {m.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.badge && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 dark:bg-[#0A1E36] text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-[#143254]">
                      {m.badge}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredModules.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-xs space-y-2">
          <LayoutGrid className="w-8 h-8 mx-auto text-slate-400" />
          <p>No modules found matching &ldquo;{searchQuery}&rdquo;.</p>
        </div>
      )}
    </div>
  );
};

