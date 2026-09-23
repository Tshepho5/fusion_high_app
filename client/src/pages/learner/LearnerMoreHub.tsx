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
  MessageSquare,
  Star,
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

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('geleza_favorites_learner');
      return saved ? JSON.parse(saved) : ['messages', 'performance', 'assignments', 'timetable'];
    } catch (_) {
      return ['messages', 'performance', 'assignments', 'timetable'];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = favoriteIds.includes(id)
      ? favoriteIds.filter(f => f !== id)
      : [...favoriteIds, id];
    setFavoriteIds(updated);
    try {
      localStorage.setItem('geleza_favorites_learner', JSON.stringify(updated));
      window.dispatchEvent(new Event('geleza_favorites_updated'));
    } catch (_) {}
  };

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
      id: 'messages',
      title: 'Message Hub & Peer Chat',
      category: 'activities',
      icon: MessageSquare,
      badge: 'Chat',
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
      <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-[#0F1A24]/90 backdrop-blur-xl border border-slate-200/90 dark:border-[#1B2E3D] shadow-sm relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                Main Navigation Menu
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-[#18E2EC] border border-cyan-500/20 uppercase tracking-wider">
                Learner Portal
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              Access your academic marks, homework submissions, bursary engines, exam candidate cards, and campus life tools.
            </p>
          </div>

          {/* Search & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-[#0A121A] border border-slate-200/90 dark:border-[#1B2E3D] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0A121A] rounded-xl border border-slate-200/90 dark:border-[#1B2E3D] shrink-0">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Detailed Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('compact')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Compact App Tiles"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
              type="button"
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121F2C] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-200/80 dark:border-[#1B2E3D]'
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
            const isFav = favoriteIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-4 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 dark:hover:border-[#13C8D9]/50 hover:shadow-md dark:hover:bg-[#132230] transition-all cursor-pointer shadow-sm group flex items-center justify-between gap-3 card-interactive relative"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152535] border border-slate-200/70 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                    <IconComp className="w-6 h-6 text-slate-800 dark:text-[#18E2EC]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors leading-snug truncate">
                      {m.title}
                    </p>
                    {m.badge && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 dark:bg-[#142230] border border-slate-200/80 dark:border-[#1B2E3D] text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, m.id)}
                    title={isFav ? 'Remove from Home Favorites' : 'Add to Home Favorites'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isFav
                        ? 'text-amber-400 hover:text-amber-500'
                        : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'compact' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            const isFav = favoriteIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all cursor-pointer flex flex-col items-center text-center gap-2 group card-interactive relative shadow-sm"
                title={m.title}
              >
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(e, m.id)}
                  title={isFav ? 'Remove from Home Favorites' : 'Add to Home Favorites'}
                  className={`absolute top-1.5 right-1.5 p-1 rounded-lg transition-colors cursor-pointer ${
                    isFav ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                  }`}
                >
                  <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400' : ''}`} />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152535] border border-slate-200/70 dark:border-[#1B2E3D] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <IconComp className="w-6 h-6 text-slate-800 dark:text-[#18E2EC]" />
                </div>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors line-clamp-2 leading-tight">
                  {m.title}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 hidden dark:block pointer-events-none opacity-60 group-hover:opacity-100 group-hover:text-cyan-400" />
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            const isFav = favoriteIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#152535] border border-slate-200/70 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 shadow-xs">
                    <IconComp className="w-5 h-5 text-slate-800 dark:text-[#18E2EC]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors">
                      {m.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.badge && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-[#142230] text-cyan-600 dark:text-cyan-400 border border-slate-200/80 dark:border-[#1B2E3D]">
                      {m.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, m.id)}
                    title={isFav ? 'Remove from Home Favorites' : 'Add to Home Favorites'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isFav
                        ? 'text-amber-400 hover:text-amber-500'
                        : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] group-hover:translate-x-0.5 transition-all" />
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

