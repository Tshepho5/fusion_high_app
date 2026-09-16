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
} from 'lucide-react';

interface TeacherMoreHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface ModuleItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'assessments' | 'classroom' | 'admin' | 'curriculum' | 'system';
  icon: React.ElementType;
  badge?: string;
  color: string;
  iconBg: string;
}

export const TeacherMoreHub: React.FC<TeacherMoreHubProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'assessments', label: 'Grading & Exams' },
    { id: 'classroom', label: 'Classroom' },
    { id: 'admin', label: 'Admin & Duties' },
    { id: 'curriculum', label: 'Curriculum & AI' },
    { id: 'system', label: 'School System' },
  ];

  const allModules: ModuleItem[] = [
    // 1. Grading & Exams
    {
      id: 'assessments',
      title: 'SBA Marksheets & Grading',
      subtitle: 'CAPS term weighting, mark capture, and automated moderation sheets',
      category: 'assessments',
      icon: FileSpreadsheet,
      badge: 'CAPS Core',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    },
    {
      id: 'assignments',
      title: 'Homework & Assignment Hub',
      subtitle: 'Create digital tasks, track learner submissions, and enter feedback',
      category: 'assessments',
      icon: FileText,
      badge: 'Interactive',
      color: 'text-pink-400',
      iconBg: 'bg-pink-500/15 border-pink-500/30',
    },
    {
      id: 'exam-seating',
      title: 'Exam Seating Planner',
      subtitle: 'Examination hall layout, desk allocations, and invigilation rosters',
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
      subtitle: 'Daily roll-call, QR code check-ins, and absent learner alerts',
      category: 'classroom',
      icon: CalendarCheck,
      badge: 'Daily Register',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15 border-teal-500/30',
    },
    {
      id: 'conduct',
      title: 'Merit & Disciplinary Conduct',
      subtitle: 'Award academic merits, record minor/major infractions, and detention logs',
      category: 'classroom',
      icon: ShieldCheck,
      badge: 'Conduct',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
    },
    {
      id: 'textbooks',
      title: 'Textbook & Asset Inventory',
      subtitle: 'Track prescribed textbooks, barcoded asset returns, and damage fees',
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
      subtitle: 'Apply for leave, log substitute cover, and view emergency relief allocations',
      category: 'admin',
      icon: Briefcase,
      badge: 'Staff Duty',
      color: 'text-rose-400',
      iconBg: 'bg-rose-500/15 border-rose-500/30',
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      subtitle: 'Team management, coaching schedules, derby fixtures, and player rosters',
      category: 'admin',
      icon: Trophy,
      badge: 'Coaching',
      color: 'text-yellow-400',
      iconBg: 'bg-yellow-500/15 border-yellow-500/30',
    },
    {
      id: 'ptc',
      title: 'Parent-Teacher Consultations',
      subtitle: 'Schedule one-on-one conference slots, video meetings, and parent notes',
      category: 'admin',
      icon: Users,
      badge: 'Conferences',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30',
    },

    // 4. Curriculum & AI
    {
      id: 'ai-tools',
      title: 'AI Lesson & Test Paper Studio',
      subtitle: 'Generate CAPS lesson plans, worksheets, test papers, and rubrics in seconds',
      category: 'curriculum',
      icon: Sparkles,
      badge: 'AI Powered',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30',
    },
    {
      id: 'resources',
      title: 'Past Papers & Learning Vault',
      subtitle: 'Departmental past exam papers, memorandums, and teacher guides',
      category: 'curriculum',
      icon: Layers,
      badge: 'CAPS Vault',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15 border-violet-500/30',
    },
    {
      id: 'inter-school',
      title: 'Inter-School Derbies & Olympiads',
      subtitle: 'Academic derbies, math olympiads, science expos, and regional trophies',
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
      subtitle: 'View weekly periods, classroom allocations, and period swap requests',
      category: 'system',
      icon: Clock,
      badge: 'Schedule',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30',
    },
    {
      id: 'calendar',
      title: 'Academic & Events Calendar',
      subtitle: 'Official school calendar, term dates, public holidays, and exam blocks',
      category: 'system',
      icon: Calendar,
      badge: 'Official',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30',
    },
    {
      id: 'announcements',
      title: 'Staff Notices & Broadcasts',
      subtitle: 'Official department announcements, staff circulars, and emergency alerts',
      category: 'system',
      icon: Megaphone,
      badge: 'Notices',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    },
    {
      id: 'settings',
      title: 'App & Technical Settings',
      subtitle: 'Theme customization, notification alerts, password & security',
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
        m.subtitle.toLowerCase().includes(query) ||
        (m.badge && m.badge.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [allModules, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-16">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Complete Educator Directory</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
              More Modules & Educator Functions
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              All institutional management tools, grading registers, administrative workflows, and curriculum resources neatly organized in one central hub.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 pt-5 overflow-x-auto custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((item) => {
          const IconComp = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => onNavigateTab(item.id)}
              className="card-interactive p-4 sm:p-5 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 hover:bg-surface-darker transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 shadow-sm group hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-11 h-11 rounded-2xl ${item.iconBg} border flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0`}>
                    <IconComp className={`w-5 h-5 ${item.color}`} />
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400 font-semibold group-hover:text-cyan-400 transition-colors">
                <span>Open Module</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12 p-6 rounded-2xl bg-surface-dark border border-white/10 space-y-2">
          <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No modules match your search</p>
          <p className="text-xs text-slate-500">Try searching for a different keyword or reset the category filter.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
