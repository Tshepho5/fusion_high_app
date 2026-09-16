import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  CalendarCheck,
  Award,
  Briefcase,
  Trophy,
  BookOpen,
  Sparkles,
  Calendar,
  Clock,
  Megaphone,
  Settings,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  Layers,
  HelpCircle,
  LayoutGrid,
  Grid3X3,
  List,
} from 'lucide-react';

type MoreViewMode = 'grid' | 'compact' | 'list';

interface TeacherMoreHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface ModuleItem {
  id: string;
  title: string;
  category: 'assessments' | 'classroom' | 'admin' | 'curriculum' | 'system';
  icon: React.ElementType;
  badge?: string;
  color: string;
  iconBg: string;
}

export const TeacherMoreHub: React.FC<TeacherMoreHubProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<MoreViewMode>(() => {
    return (localStorage.getItem('teacher_more_view_mode') as MoreViewMode) || 'grid';
  });

  const handleSetViewMode = (mode: MoreViewMode) => {
    setViewMode(mode);
    localStorage.setItem('teacher_more_view_mode', mode);
  };

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'assessments', label: 'Grading & Exams' },
    { id: 'classroom', label: 'Classroom' },
    { id: 'admin', label: 'Admin & Duties' },
    { id: 'curriculum', label: 'Curriculum & AI' },
    { id: 'system', label: 'School System' },
  ];

  // Pure Icon + Title ONLY (No long descriptions or subtitles)
  const allModules: ModuleItem[] = [
    // 1. Grading & Exams
    {
      id: 'assessments',
      title: 'SBA Marksheets & Grading',
      category: 'assessments',
      icon: FileSpreadsheet,
      badge: 'CAPS Core',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    },
    {
      id: 'assignments',
      title: 'Homework & Assignment Hub',
      category: 'assessments',
      icon: FileText,
      badge: 'Tasks',
      color: 'text-pink-400',
      iconBg: 'bg-pink-500/15 border-pink-500/30',
    },
    {
      id: 'exam-seating',
      title: 'Exam Seating Planner',
      category: 'assessments',
      icon: Award,
      badge: 'Exams',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    },

    // 2. Classroom & Learner Management
    {
      id: 'attendance',
      title: 'Class Attendance Register',
      category: 'classroom',
      icon: CalendarCheck,
      badge: 'Daily Register',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15 border-teal-500/30',
    },
    {
      id: 'conduct',
      title: 'Merit & Disciplinary Conduct',
      category: 'classroom',
      icon: ShieldCheck,
      badge: 'Conduct',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
    },
    {
      id: 'textbooks',
      title: 'Textbook & Asset Inventory',
      category: 'classroom',
      icon: BookOpen,
      badge: 'Assets',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    },

    // 3. Admin & Duties
    {
      id: 'my-leave',
      title: 'Educator Leave & Relief Duty',
      category: 'admin',
      icon: Briefcase,
      badge: 'Staff Duty',
      color: 'text-rose-400',
      iconBg: 'bg-rose-500/15 border-rose-500/30',
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      category: 'admin',
      icon: Trophy,
      badge: 'Coaching',
      color: 'text-yellow-400',
      iconBg: 'bg-yellow-500/15 border-yellow-500/30',
    },
    {
      id: 'ptc',
      title: 'Parent-Teacher Consultations',
      category: 'admin',
      icon: Users,
      badge: 'Meetings',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30',
    },

    // 4. Curriculum & AI
    {
      id: 'ai-tools',
      title: 'AI Lesson & Test Paper Studio',
      category: 'curriculum',
      icon: Sparkles,
      badge: 'AI Powered',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30',
    },
    {
      id: 'resources',
      title: 'Past Papers & Learning Vault',
      category: 'curriculum',
      icon: Layers,
      badge: 'CAPS Vault',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15 border-violet-500/30',
    },
    {
      id: 'inter-school',
      title: 'Inter-School Derbies & Olympiads',
      category: 'curriculum',
      icon: Trophy,
      badge: 'Olympiad',
      color: 'text-orange-400',
      iconBg: 'bg-orange-500/15 border-orange-500/30',
    },

    // 5. System & Settings
    {
      id: 'timetable',
      title: 'Educator Timetable & Rooms',
      category: 'system',
      icon: Clock,
      badge: 'Schedule',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30',
    },
    {
      id: 'calendar',
      title: 'Academic & Events Calendar',
      category: 'system',
      icon: Calendar,
      badge: 'Official',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30',
    },
    {
      id: 'announcements',
      title: 'Staff Notices & Broadcasts',
      category: 'system',
      icon: Megaphone,
      badge: 'Notices',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    },
    {
      id: 'settings',
      title: 'App & Technical Settings',
      category: 'system',
      icon: Settings,
      badge: 'System',
      color: 'text-slate-400',
      iconBg: 'bg-slate-500/15 border-slate-500/30',
    },
  ];

  const filteredModules = useMemo(() => {
    return allModules.filter((m) => {
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        m.title.toLowerCase().includes(query) ||
        (m.badge && m.badge.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [allModules, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-20">
      {/* Header Banner with View Mode Switcher & Search */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
              More Modules
            </h1>
          </div>

          {/* Search Input & Grid View Switcher */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            {/* View Mode Switcher Buttons */}
            <div className="flex items-center gap-1 p-1 bg-surface-darker rounded-xl border border-white/10 shrink-0">
              <button
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Standard Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('compact')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Compact App Tiles"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
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
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-surface-darker/60 text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: Standard Grid (Icon + Title Only, No Descriptions)          */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredModules.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className="card-interactive p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/50 hover:bg-surface-darker transition-all duration-300 cursor-pointer flex items-center gap-3.5 shadow-sm group hover:-translate-y-0.5"
              >
                <div className={`w-11 h-11 rounded-2xl ${item.iconBg} border flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0`}>
                  <IconComp className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                    {item.title}
                  </h3>
                  {item.badge && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-white/5 border border-white/10 text-slate-400 uppercase tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: Compact App Tiles (Icon + Title Centered, Launchpad Style)   */}
      {/* ========================================================================= */}
      {viewMode === 'compact' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filteredModules.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className="card-interactive p-3.5 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/50 hover:bg-surface-darker transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center gap-2.5 shadow-sm group hover:-translate-y-1"
                title={item.title}
              >
                <div className={`w-12 h-12 rounded-2xl ${item.iconBg} border flex items-center justify-center group-hover:scale-115 transition-transform shadow-sm`}>
                  <IconComp className={`w-6 h-6 ${item.color}`} />
                </div>
                <span className="text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-tight">
                  {item.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: List View (Icon + Title + Arrow, Clean Rows)                */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredModules.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className="card-interactive p-3 px-4 rounded-xl bg-surface-dark border border-white/10 hover:border-cyan-500/50 hover:bg-surface-darker transition-all duration-300 cursor-pointer flex items-center justify-between shadow-sm group hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${item.iconBg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <IconComp className={`w-4.5 h-4.5 ${item.color}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            );
          })}
        </div>
      )}

      {filteredModules.length === 0 && (
        <div className="text-center py-12 p-6 rounded-2xl bg-surface-dark border border-white/10 space-y-2">
          <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No modules match your search</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 hover:bg-cyan-500/30 transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
