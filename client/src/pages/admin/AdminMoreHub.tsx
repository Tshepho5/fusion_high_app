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
  color: string;
  iconBg: string;
}

export const AdminMoreHub: React.FC<AdminMoreHubProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const isSuperAdmin = !!user?.is_superadmin;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<MoreViewMode>(() => {
    return (localStorage.getItem('admin_more_view_mode') as MoreViewMode) || 'grid';
  });

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

  // Pure Icon + Title ONLY (No long descriptions or subtitles)
  const allModules: ModuleItem[] = [
    // 1. Governance & Staff
    {
      id: 'users',
      title: 'User Directory & Roles',
      category: 'governance',
      icon: Users,
      badge: 'Staff & Learners',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    },
    {
      id: 'leave-relief',
      title: 'Educator Leave & Relief Duty',
      category: 'governance',
      icon: Briefcase,
      badge: 'Staff Leave',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
    },
    {
      id: 'consultations',
      title: 'Parent-Educator Consultations',
      category: 'governance',
      icon: MessageSquare,
      badge: 'Meetings',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    },

    // 2. Curriculum & Academics
    {
      id: 'subjects',
      title: 'Curriculum & Subject Registers',
      category: 'academics',
      icon: BookOpen,
      badge: 'Grades 8-12',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30',
    },
    {
      id: 'reports',
      title: 'CAPS Report Card Studio',
      category: 'academics',
      icon: FileText,
      badge: 'Term Reports',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    },
    {
      id: 'marks',
      title: 'SBA & Academic Mark Audits',
      category: 'academics',
      icon: FileSpreadsheet,
      badge: 'Assessment Audit',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15 border-teal-500/30',
    },
    {
      id: 'matric-projector',
      title: 'Matric Pass Rate Projector',
      category: 'academics',
      icon: TrendingUp,
      badge: 'Grade 12 NSC',
      color: 'text-pink-400',
      iconBg: 'bg-pink-500/15 border-pink-500/30',
    },
    {
      id: 'timetable',
      title: 'Master Timetable Allocations',
      category: 'academics',
      icon: Clock,
      badge: 'Schedule',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30',
    },

    // 3. Operations & Logistics
    {
      id: 'exam-seating',
      title: 'Exam Seating Master Planner',
      category: 'operations',
      icon: Award,
      badge: 'Seating Plan',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30',
    },
    {
      id: 'textbooks',
      title: 'Textbook & Asset Inventory',
      category: 'operations',
      icon: HardDrive,
      badge: 'Assets',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      category: 'operations',
      icon: Trophy,
      badge: 'Athletics & Teams',
      color: 'text-green-400',
      iconBg: 'bg-green-500/15 border-green-500/30',
    },
    {
      id: 'calendar',
      title: 'Academic Events & School Calendar',
      category: 'operations',
      icon: Calendar,
      badge: 'DBE Schedule',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
    },

    // 4. Finance & Systems
    {
      id: 'finance',
      title: 'School Fees & Invoicing',
      category: 'finance',
      icon: CreditCard,
      badge: 'Finances',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    },
    ...(isSuperAdmin
      ? [
          {
            id: 'command-center',
            title: 'Multi-School Command Center',
            category: 'finance' as const,
            icon: Building2,
            badge: 'SuperAdmin',
            color: 'text-purple-400',
            iconBg: 'bg-purple-500/15 border-purple-500/30',
          },
        ]
      : []),
    {
      id: 'settings',
      title: 'Technical & School Settings',
      category: 'finance',
      icon: Settings,
      badge: 'System',
      color: 'text-slate-300',
      iconBg: 'bg-slate-700/30 border-slate-600/30',
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
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-semibold mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Administrative Control Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Institutional Modules & Tools
          </h1>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-surface-darker rounded-2xl border border-slate-200 dark:border-white/10 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => handleSetViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Grid View (Large Cards)"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetViewMode('compact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Compact View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compact</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 hover:border-purple-500/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Real-Time Module Search Input */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search administrative tools..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors shadow-xs"
          />
        </div>
      </div>

      {/* Modules Rendering Container based on viewMode */}
      {filteredModules.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-500 text-xs">
          No modules found matching "{searchQuery}"
        </div>
      ) : viewMode === 'grid' ? (
        /* Large Cards Grid (3 Columns) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-5 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-purple-500/50 hover:shadow-lg dark:hover:shadow-glow-indigo transition-all flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${m.iconBg} ${m.color} group-hover:scale-105 transition-transform shadow-xs`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors truncate">
                      {m.title}
                    </h3>
                    {m.badge && (
                      <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-darker text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-surface-darker text-slate-400 group-hover:text-white group-hover:bg-purple-600 transition-all shrink-0 ml-2">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      ) : viewMode === 'compact' ? (
        /* Compact Grid (4 Columns) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-purple-500/50 hover:shadow-md transition-all flex flex-col justify-between text-left group cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${m.iconBg} ${m.color} group-hover:scale-105 transition-transform shadow-xs`}>
                    <IconComp className="w-4.5 h-4.5" />
                  </div>
                  {m.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-darker text-slate-500 dark:text-slate-400">
                      {m.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-2">
                  {m.title}
                </h3>
              </button>
            );
          })}
        </div>
      ) : (
        /* List View (Horizontal Rows) */
        <div className="space-y-2">
          {filteredModules.map((m) => {
            const IconComp = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-purple-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${m.iconBg} ${m.color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors truncate">
                    {m.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {m.badge && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-darker text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hidden sm:inline">
                      {m.badge}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
