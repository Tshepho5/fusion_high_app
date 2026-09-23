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
  ChevronRight,
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
    },
    {
      id: 'reports',
      title: 'CAPS Term Report Cards',
      category: 'academics',
      icon: FileText,
      badge: 'Official',
    },
    {
      id: 'assignments',
      title: 'Homework & Digital Assignments Hub',
      category: 'academics',
      icon: FileText,
      badge: 'Tasks',
    },
    {
      id: 'exam-seating',
      title: 'Exam Seating & Candidate Slips',
      category: 'academics',
      icon: Award,
      badge: 'Exams',
    },
    {
      id: 'subjects',
      title: 'My Enrolled Subjects Workspace',
      category: 'academics',
      icon: BookOpen,
      badge: 'CAPS',
    },

    // 2. Study Tools & AI
    {
      id: 'discover',
      title: 'Discover Learning Innovation & AI Studios',
      category: 'study-ai',
      icon: Compass,
      badge: 'Discover',
    },
    {
      id: 'ai-tutor',
      title: 'CAPS AI Study Tutor & Exam Studios',
      category: 'study-ai',
      icon: Bot,
      badge: 'AI Marker',
    },
    {
      id: 'career-advisor',
      title: 'Matric APS & University Career Advisor',
      category: 'study-ai',
      icon: User,
      badge: 'Matric',
    },
    {
      id: 'arcade',
      title: 'Fusion Arcade (CAPS Study Games)',
      category: 'study-ai',
      icon: Gamepad2,
      badge: 'Games',
    },
    {
      id: 'textbooks',
      title: 'My Issued Textbooks & Assets',
      category: 'study-ai',
      icon: BookMarked,
      badge: 'Books',
    },

    // 3. Campus Life & Activities
    {
      id: 'sports',
      title: 'Sports & Extracurricular Clubs',
      category: 'activities',
      icon: Trophy,
      badge: 'Clubs',
    },
    {
      id: 'inter-school',
      title: 'Inter-School Derbies & Olympiads',
      category: 'activities',
      icon: Swords,
      badge: 'Derbies',
    },
    {
      id: 'timetable',
      title: 'Weekly Class Timetable',
      category: 'activities',
      icon: Clock,
      badge: 'Periods',
    },
    {
      id: 'announcements',
      title: 'School Notices & Broadcasts',
      category: 'activities',
      icon: Megaphone,
      badge: 'Notices',
    },

    // 4. Finance & Bursaries
    {
      id: 'bursaries',
      title: 'NSFAS & Tertiary Bursary Finder',
      category: 'finance',
      icon: GraduationCap,
      badge: 'Funding',
    },
    {
      id: 'finance',
      title: 'School Fee Statements & Receipts',
      category: 'finance',
      icon: CreditCard,
      badge: 'Accounts',
    },

    // 5. System & Profile
    {
      id: 'profile',
      title: 'My Profile & Digital Student ID Card',
      category: 'system',
      icon: User,
      badge: 'Identity',
    },
    {
      id: 'settings',
      title: 'App & Technical Settings',
      category: 'system',
      icon: Settings,
      badge: 'Config',
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
      {/* Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] shadow-sm relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDF4F7] dark:bg-[#152535] border border-slate-200/80 dark:border-[#1B2E3D] text-[#13C8D9] text-xs font-bold">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Learner Portal Modules Hub</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-[#1C252C] dark:text-white tracking-tight">
              More Modules &{' '}
              <span className="text-[#13C8D9]">
                Quick Functions
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Access your academic marks, homework submissions, bursary engines, exam candidate cards, and campus life tools.
            </p>
          </div>

          {/* Search & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#EDF4F7] dark:bg-[#0A121A] border border-slate-200/90 dark:border-[#1B2E3D] text-xs text-[#1C252C] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#13C8D9] transition-all"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#EDF4F7] dark:bg-[#0A121A] rounded-xl border border-slate-200/90 dark:border-[#1B2E3D] shrink-0">
              <button
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('compact')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Compact View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto custom-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                selectedCategory === c.id
                  ? 'bg-[#13C8D9] text-[#0A121A] border-[#13C8D9] shadow-xs'
                  : 'bg-[#EDF4F7] dark:bg-[#121F2C] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 border-slate-200/60 dark:border-[#1B2E3D]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Cyan Progress / Active Indicator Underline */}
        <div className="w-full h-1 bg-slate-200/70 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
          <div className="h-full w-28 bg-[#13C8D9] rounded-full transition-all duration-300" />
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
                className="p-4 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 dark:hover:border-[#13C8D9]/50 hover:shadow-md dark:hover:bg-[#132230] transition-all cursor-pointer shadow-sm group flex items-center justify-between gap-3 card-interactive"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#E1ECF0] dark:bg-[#152535] border border-slate-200/60 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                    <IconComp className="w-6 h-6 text-[#232B32] dark:text-[#18E2EC]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors leading-snug truncate">
                      {m.title}
                    </p>
                    {m.badge && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9.5px] font-semibold bg-[#EDF4F7] dark:bg-[#142230] border border-slate-200/60 dark:border-[#1B2E3D] text-[#13C8D9] uppercase tracking-wider">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] group-hover:translate-x-0.5 transition-all shrink-0" />
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
                className="p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 dark:hover:border-[#13C8D9]/50 hover:shadow-md dark:hover:bg-[#132230] transition-all cursor-pointer flex flex-col items-center text-center gap-2 group card-interactive relative"
                title={m.title}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E1ECF0] dark:bg-[#152535] border border-slate-200/60 dark:border-[#1B2E3D] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <IconComp className="w-6 h-6 text-[#232B32] dark:text-[#18E2EC]" />
                </div>
                <span className="text-[11px] font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors line-clamp-2 leading-tight">
                  {m.title}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 hidden dark:block pointer-events-none opacity-60 group-hover:opacity-100 group-hover:text-[#13C8D9]" />
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
                className="p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 dark:hover:border-[#13C8D9]/50 hover:shadow-md dark:hover:bg-[#132230] transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E1ECF0] dark:bg-[#152535] border border-slate-200/60 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 shadow-xs">
                    <IconComp className="w-5 h-5 text-[#232B32] dark:text-[#18E2EC]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors">
                      {m.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.badge && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EDF4F7] dark:bg-[#142230] text-[#13C8D9] border border-slate-200/60 dark:border-[#1B2E3D]">
                      {m.badge}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] group-hover:translate-x-0.5 transition-all" />
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

