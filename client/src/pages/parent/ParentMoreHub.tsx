import React, { useState, useMemo } from 'react';
import {
  Users,
  CreditCard,
  GraduationCap,
  Award,
  CalendarCheck,
  Trophy,
  Clock,
  Calendar,
  Megaphone,
  MessageSquare,
  User,
  Settings,
  Search,
  ArrowRight,
  LayoutGrid,
  Grid3X3,
  List,
  Sparkles,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Star,
} from 'lucide-react';

type MoreViewMode = 'grid' | 'compact' | 'list';

interface ParentMoreHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface ModuleItem {
  id: string;
  title: string;
  category: 'children' | 'finance' | 'campus' | 'chat' | 'account';
  icon: React.ElementType;
  badge?: string;
  description: string;
}

export const ParentMoreHub: React.FC<ParentMoreHubProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<MoreViewMode>(() => {
    return (localStorage.getItem('parent_more_view_mode') as MoreViewMode) || 'grid';
  });

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('geleza_favorites_parent');
      return saved ? JSON.parse(saved) : ['messages', 'children', 'reports', 'attendance'];
    } catch (_) {
      return ['messages', 'children', 'reports', 'attendance'];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = favoriteIds.includes(id)
      ? favoriteIds.filter(f => f !== id)
      : [...favoriteIds, id];
    setFavoriteIds(updated);
    try {
      localStorage.setItem('geleza_favorites_parent', JSON.stringify(updated));
      window.dispatchEvent(new Event('geleza_favorites_updated'));
    } catch (_) {}
  };

  const handleSetViewMode = (mode: MoreViewMode) => {
    setViewMode(mode);
    localStorage.setItem('parent_more_view_mode', mode);
  };

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'children', label: 'Children & Academics' },
    { id: 'finance', label: 'Fees & Bursaries' },
    { id: 'campus', label: 'School & Activities' },
    { id: 'chat', label: 'Communications' },
    { id: 'account', label: 'Account & Settings' },
  ];

  const allModules: ModuleItem[] = [
    // 1. Children & Academics
    {
      id: 'children',
      title: 'My Children & Marks',
      category: 'children',
      icon: Users,
      badge: 'Academic',
      description: 'Term marks, grades breakdown & academic progress tracking',
    },
    {
      id: 'reports',
      title: 'CAPS Report Cards',
      category: 'children',
      icon: Award,
      badge: 'Official',
      description: 'Download signed term report cards and grade certificates',
    },
    {
      id: 'timetable',
      title: 'Student Timetable',
      category: 'children',
      icon: Clock,
      badge: 'Schedule',
      description: 'Weekly period schedules, educator assignments and rooms',
    },
    {
      id: 'attendance',
      title: 'Attendance Records',
      category: 'children',
      icon: CalendarCheck,
      badge: 'Live',
      description: 'Real-time morning check-ins and absence justifications',
    },

    // 2. Finance & Bursaries
    {
      id: 'finance',
      title: 'School Fees & Statements',
      category: 'finance',
      icon: CreditCard,
      badge: 'Statements',
      description: 'Account balance, payment history, invoices & tax receipts',
    },
    {
      id: 'bursaries',
      title: 'NSFAS & Bursary Hub',
      category: 'finance',
      icon: GraduationCap,
      badge: 'Funding',
      description: 'Tertiary scholarship opportunities and funding applications',
    },

    // 3. School & Activities
    {
      id: 'ptc',
      title: 'Parent-Teacher Consultations',
      category: 'campus',
      icon: Calendar,
      badge: 'Bookings',
      description: 'Schedule 1-on-1 progress meetings with educators',
    },
    {
      id: 'calendar',
      title: 'School Calendar',
      category: 'campus',
      icon: Calendar,
      badge: 'Events',
      description: 'Academic terms, examination dates and school holidays',
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      category: 'campus',
      icon: Trophy,
      badge: 'Clubs',
      description: 'House athletics, competitive leagues and student clubs',
    },
    {
      id: 'inter-school',
      title: 'Inter-School Competitions',
      category: 'campus',
      icon: Award,
      badge: 'Tournaments',
      description: 'Debating, science expos and inter-provincial tournaments',
    },

    // 4. Communications
    {
      id: 'announcements',
      title: 'School News & Bulletins',
      category: 'chat',
      icon: Megaphone,
      badge: 'Notices',
      description: 'Official executive announcements and circular newsletters',
    },
    {
      id: 'messages',
      title: 'Message Hub & Teacher Chat',
      category: 'chat',
      icon: MessageSquare,
      badge: 'Chat',
      description: 'Direct messaging channel with class educators and mentors',
    },

    // 5. Account & Settings
    {
      id: 'profile',
      title: 'Parent Profile',
      category: 'account',
      icon: User,
      badge: 'Identity',
      description: 'Contact details, emergency info and learner guardian links',
    },
    {
      id: 'settings',
      title: 'Portal Settings',
      category: 'account',
      icon: Settings,
      badge: 'System',
      description: 'Appearance themes, notification alerts and security',
    },
  ];

  const filteredModules = useMemo(() => {
    let result = allModules;
    if (selectedCategory !== 'all') {
      result = result.filter((m) => m.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allModules, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-20 animate-fade-in">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-white/80 dark:bg-[#0F1A24]/90 backdrop-blur-xl border border-slate-200/90 dark:border-[#1B2E3D] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#0A121A] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-600 dark:text-[#18E2EC]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                  Main Navigation Menu
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-[#18E2EC] border border-cyan-500/20 uppercase tracking-wider">
                  Parent Portal
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Quick access to all guardian tools, student performance records, and school services
              </p>
            </div>
          </div>

          {/* Search Bar & View Mode Toggle */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-[#0A121A] border border-slate-200/90 dark:border-[#1B2E3D] text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0A121A] rounded-xl border border-slate-200/90 dark:border-[#1B2E3D] shrink-0">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
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
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
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
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto custom-scrollbar">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121F2C] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-200/80 dark:border-[#1A2C3D]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: Detailed Cards */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredModules.map((item) => {
            const IconComp = item.icon;
            const isFav = favoriteIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className="card-interactive p-4 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 shadow-sm group hover:-translate-y-0.5 relative"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152535] border border-slate-200/70 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                    <IconComp className="w-6 h-6 text-slate-800 dark:text-[#18E2EC]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors leading-snug truncate">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 dark:bg-[#142230] border border-slate-200/80 dark:border-[#1B2E3D] text-cyan-600 dark:text-cyan-400 uppercase tracking-wider hidden sm:inline">
                      {item.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, item.id)}
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

      {/* VIEW MODE 2: Compact App Tiles */}
      {viewMode === 'compact' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {filteredModules.map((item) => {
            const IconComp = item.icon;
            const isFav = favoriteIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className="card-interactive p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all duration-300 cursor-pointer flex flex-col items-center text-center gap-2 group shadow-sm hover:-translate-y-1 relative"
                title={item.title}
              >
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(e, item.id)}
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
                  {item.title}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 hidden dark:block pointer-events-none opacity-60 group-hover:opacity-100 group-hover:text-cyan-400" />
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 3: List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredModules.map((item) => {
            const IconComp = item.icon;
            const isFav = favoriteIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className="card-interactive p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-slate-50/50 dark:hover:bg-[#132230] transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#152535] border border-slate-200/70 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 shadow-xs">
                    <IconComp className="w-5 h-5 text-slate-800 dark:text-[#18E2EC]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#18E2EC] transition-colors truncate block">
                      {item.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-[#142230] text-cyan-600 dark:text-cyan-400 border border-slate-200/80 dark:border-[#1B2E3D]">
                      {item.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, item.id)}
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
        <div className="text-center py-16 p-6 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200 dark:border-[#1B2E3D] space-y-2">
          <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-900 dark:text-slate-300">No modules match your search</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
