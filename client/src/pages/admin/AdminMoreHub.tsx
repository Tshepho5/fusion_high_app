import React, { useState, useMemo } from 'react';
import {
  Users,
  Briefcase,
  MessageSquare,
  BookOpen,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Clock,
  Award,
  HardDrive,
  Trophy,
  Calendar,
  CreditCard,
  Building2,
  Settings,
  Search,
  ArrowRight,
  LayoutGrid,
  Grid3X3,
  List,
  ChevronRight,
  GraduationCap,
  Star,
  Swords,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type MoreViewMode = 'grid' | 'compact' | 'list';

interface AdminMoreHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface ModuleItem {
  id: string;
  title: string;
  category: 'governance' | 'academics' | 'operations' | 'finance';
  icon: React.ElementType;
  badge?: string;
}

export const AdminMoreHub: React.FC<AdminMoreHubProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const isSuperAdmin = !!user?.is_superadmin;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<MoreViewMode>(() => {
    return (localStorage.getItem('admin_more_view_mode') as MoreViewMode) || 'grid';
  });

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('geleza_favorites_admin');
      return saved ? JSON.parse(saved) : ['messages', 'users', 'marks', 'timetable'];
    } catch (_) {
      return ['messages', 'users', 'marks', 'timetable'];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = favoriteIds.includes(id)
      ? favoriteIds.filter(f => f !== id)
      : [...favoriteIds, id];
    setFavoriteIds(updated);
    try {
      localStorage.setItem('geleza_favorites_admin', JSON.stringify(updated));
      window.dispatchEvent(new Event('geleza_favorites_updated'));
    } catch (_) {}
  };

  const handleSetViewMode = (mode: MoreViewMode) => {
    setViewMode(mode);
    localStorage.setItem('admin_more_view_mode', mode);
  };

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'governance', label: 'Governance & Staff' },
    { id: 'academics', label: 'Curriculum & Marks' },
    { id: 'operations', label: 'Operations & Assets' },
    { id: 'finance', label: 'Finance & Systems' },
  ];

  // Pure Icon + Title ONLY
  const allModules: ModuleItem[] = [
    // 1. Governance & Staff
    {
      id: 'command-center',
      title: 'Multi-School Command',
      category: 'governance',
      icon: Building2,
      badge: 'SuperAdmin',
    },
    {
      id: 'users',
      title: 'User Directory & Roles',
      category: 'governance',
      icon: Users,
      badge: 'Staff & Learners',
    },
    {
      id: 'leave-relief',
      title: 'Staff Leave & Relief Duty',
      category: 'governance',
      icon: Briefcase,
      badge: 'Staff Leave',
    },
    {
      id: 'consultations',
      title: 'Parent-Educator Consultations',
      category: 'governance',
      icon: Users,
      badge: 'Meetings',
    },
    {
      id: 'messages',
      title: 'Communication Hub',
      category: 'governance',
      icon: MessageSquare,
      badge: 'Direct Chat',
    },
    {
      id: 'announcements',
      title: 'Official Broadcasts',
      category: 'governance',
      icon: Megaphone,
      badge: 'Broadcasts',
    },

    // 2. Curriculum & Academics
    {
      id: 'subjects',
      title: 'School Curriculum & Subjects',
      category: 'academics',
      icon: BookOpen,
      badge: 'Grades 8-12',
    },
    {
      id: 'marks',
      title: 'CAPS Mark Audits & Report Cards',
      category: 'academics',
      icon: FileSpreadsheet,
      badge: 'Mark Audits',
    },
    {
      id: 'reports',
      title: 'CAPS Report Card Studio',
      category: 'academics',
      icon: FileText,
      badge: 'Term Reports',
    },
    {
      id: 'matric-projector',
      title: 'Matric Pass Rate Projector',
      category: 'academics',
      icon: TrendingUp,
      badge: 'Grade 12 NSC',
    },
    {
      id: 'timetable',
      title: 'Timetable Allocations',
      category: 'academics',
      icon: Clock,
      badge: 'Schedule',
    },
    {
      id: 'inter-school',
      title: 'Inter-School Derbies & League',
      category: 'academics',
      icon: Swords,
      badge: 'Competitions',
    },

    // 3. Operations & Logistics
    {
      id: 'exam-seating',
      title: 'Exam Seating Master',
      category: 'operations',
      icon: Award,
      badge: 'Seating Plan',
    },
    {
      id: 'textbooks',
      title: 'Textbook Inventory',
      category: 'operations',
      icon: HardDrive,
      badge: 'Assets',
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      category: 'operations',
      icon: Trophy,
      badge: 'Athletics & Teams',
    },
    {
      id: 'calendar',
      title: 'School Calendar',
      category: 'operations',
      icon: Calendar,
      badge: 'DBE Schedule',
    },

    // 4. Finance & Systems
    {
      id: 'finance',
      title: 'School Fees & Invoicing',
      category: 'finance',
      icon: CreditCard,
      badge: 'Finances',
    },
    {
      id: 'bursaries',
      title: 'Tertiary Bursary Engine',
      category: 'finance',
      icon: GraduationCap,
      badge: 'Bursaries',
    },
    {
      id: 'settings',
      title: 'Technical Settings',
      category: 'finance',
      icon: Settings,
      badge: 'System',
    },
  ];

  const filteredModules = useMemo(() => {
    return allModules.filter((m) => {
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.badge && m.badge.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allModules, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-20">
      {/* Control Header Strip */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-[#0F1A24]/90 backdrop-blur-xl border border-slate-200/90 dark:border-[#1B2E3D] shadow-sm relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                Main Navigation Menu
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-[#18E2EC] border border-cyan-500/20 uppercase tracking-wider">
                Executive Portal
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              Manage school governance, curriculum audits, educator relief, exam allocations, and technical settings.
            </p>
          </div>

          {/* Search & View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search administrative tools..."
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

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto custom-scrollbar">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121F2C] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-200/80 dark:border-[#1B2E3D]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Cyan Underline Bar */}
        <div className="w-full h-1 bg-slate-200/70 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
          <div className="h-full w-28 bg-[#13C8D9] rounded-full transition-all duration-300" />
        </div>
      </div>

      {/* Modules Rendering Container based on viewMode */}
      {filteredModules.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F1A24] border border-slate-200 dark:border-[#1B2E3D] text-slate-500 text-xs">
          No modules found matching "{searchQuery}"
        </div>
      ) : viewMode === 'grid' ? (
        /* Large Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            const isFav = favoriteIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-4 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all flex items-center justify-between text-left group cursor-pointer card-interactive shadow-sm relative"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152535] border border-slate-200/70 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                    <IconComp className="w-6 h-6 text-slate-800 dark:text-[#18E2EC]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors leading-snug truncate">
                      {m.title}
                    </h3>
                    {m.badge && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 dark:bg-[#142230] border border-slate-200/80 dark:border-[#1B2E3D] text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
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
      ) : viewMode === 'compact' ? (
        /* Compact Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            const isFav = favoriteIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer card-interactive relative shadow-sm"
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
                <h3 className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors line-clamp-2 leading-tight">
                  {m.title}
                </h3>
                <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 hidden dark:block pointer-events-none opacity-60 group-hover:opacity-100 group-hover:text-cyan-400" />
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            const isFav = favoriteIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all flex items-center justify-between text-left group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#152535] border border-slate-200/70 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 shadow-xs">
                    <IconComp className="w-5 h-5 text-slate-800 dark:text-[#18E2EC]" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors truncate">
                    {m.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.badge && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-[#142230] text-cyan-600 dark:text-cyan-400 border border-slate-200/80 dark:border-[#1B2E3D] hidden sm:inline">
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
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
