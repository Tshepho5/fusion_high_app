import React, { useState, useEffect, useRef } from 'react';
import { parentService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  MessageSquare,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Clock,
  Calendar,
  Settings,
  Megaphone,
  LayoutGrid,
  Grid3X3,
  List,
  HardDrive,
  Trophy,
  ClipboardList,
  UserCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';

type GridViewMode = 'grid' | 'compact' | 'list';

interface ParentOverviewProps {
  onNavigateTab: (tabId: string, childId?: string | number) => void;
}

export const ParentOverview: React.FC<ParentOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Optional Grid View Switcher
  const [modulesViewMode, setModulesViewMode] = useState<GridViewMode>(() => {
    return (localStorage.getItem('parent_modules_view_mode') as GridViewMode) || 'grid';
  });

  const handleSetViewMode = (mode: GridViewMode) => {
    setModulesViewMode(mode);
    localStorage.setItem('parent_modules_view_mode', mode);
  };

  const scrollCarousel = (direction: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setLoading(true);
    parentService.getChildrenDetailed()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.children || [];
        setChildren(list);
      })
      .catch(() => {
        parentService.getChildren()
          .then((res) => {
            const list = Array.isArray(res) ? res : res.children || [];
            setChildren(list);
          })
          .catch((err) => {
            console.error('Failed to load parent children from database:', err);
          });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Fetching linked learner records..." />;

  // PARENT MODULES (ICON + NAME ONLY)
  const parentModules = [
    { id: 'reports', label: 'CAPS Report Cards', icon: Award, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'finance', label: 'School Fee Statements', icon: CreditCard, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'attendance', label: 'Attendance & Absence', icon: CalendarCheck, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'ptc', label: 'Parent-Teacher Conferences', icon: Users, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'timetable', label: 'Class Timetable', icon: Clock, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
    { id: 'calendar', label: 'School Calendar', icon: Calendar, color: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
    { id: 'bursaries', label: 'NSFAS & Tertiary Bursaries', icon: GraduationCap, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'conduct', label: 'Learner Merits & Conduct', icon: ClipboardList, color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
    { id: 'exam-seating', label: 'Exam Seating Slips', icon: FileText, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'textbooks', label: 'Issued Textbooks', icon: HardDrive, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'sports', label: 'Sports & Extracurriculars', icon: Trophy, color: 'text-green-400 bg-green-500/15 border-green-500/30' },
    { id: 'announcements', label: 'School Notices', icon: Megaphone, color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30' },
    { id: 'messages', label: 'Teacher Messages', icon: MessageSquare, color: 'text-brand-400 bg-brand-500/15 border-brand-500/30' },
    { id: 'profile', label: 'My Account & Link Child', icon: UserCheck, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'settings', label: 'Technical Settings', icon: Settings, color: 'text-slate-300 bg-slate-700/30 border-slate-600/30' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">

      {/* 1. HORIZONTAL CAROUSEL OF LINKED CHILDREN */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              My Registered Learners
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollCarousel(-1)}
              className="p-2 rounded-xl bg-surface-dark border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/50 hover:bg-white/5 transition-all shadow-sm active:scale-95"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel(1)}
              className="p-2 rounded-xl bg-surface-dark border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/50 hover:bg-white/5 transition-all shadow-sm active:scale-95"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin custom-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {children && children.length > 0 ? (
            children.map((child, idx) => {
              const fullName = `${child.full_name || child.name || 'Learner'} ${child.surname || ''}`.trim();
              const pfp = getProfilePictureUrl(child.profile_picture_path || child.profile_picture);
              return (
                <div
                  key={idx}
                  className="min-w-[290px] max-w-[320px] shrink-0 snap-start rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 p-4 transition-all shadow-md flex flex-col justify-between group space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      Grade {child.grade || 10} • {child.stream || 'General'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {child.attendance_rate || '96%'} Attendance
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 border border-white/10 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                      {pfp ? <img src={pfp} alt={fullName} className="w-full h-full object-cover" /> : fullName.charAt(0)}
                    </div>
                    <div>
                      <h3
                        onClick={() => onNavigateTab('reports', child.id)}
                        className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer leading-snug"
                      >
                        {fullName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        #{child.learner_number || `2026-00${idx + 1}`}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-darker border border-white/5 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold">Term 2 Average</span>
                    <span className="text-emerald-400 font-black text-sm">{child.overall_average || 82}%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => onNavigateTab('attendance', child.id)}
                      className="px-2 py-1.5 rounded-lg bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-medium border border-white/5 transition-colors text-center"
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => onNavigateTab('reports', child.id)}
                      className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>Report Card</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 rounded-2xl bg-surface-dark border border-white/10 text-center w-full space-y-2">
              <Users className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No learners linked yet</p>
              <p className="text-xs text-slate-400">Link your child by their learner number in Account settings.</p>
              <button
                onClick={() => onNavigateTab('profile')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md"
              >
                Link Child
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. PARENT MODULES & TOOLS (ICON + NAME ONLY WITH OPTIONAL GRID VIEWS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              Parent Functions & Academic Services
            </h2>
          </div>

          {/* Optional Grid View Selectors */}
          <div className="flex items-center gap-1 p-1 bg-surface-dark rounded-xl border border-white/10">
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                modulesViewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Standard Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode('compact')}
              className={`p-1.5 rounded-lg transition-colors ${
                modulesViewMode === 'compact'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Compact App Tiles"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                modulesViewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Mode 1: Standard Grid (Icon + Name) */}
        {modulesViewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {parentModules.map((func) => {
              const IconComp = func.icon;
              return (
                <div
                  key={func.id}
                  onClick={() => onNavigateTab(func.id)}
                  className="p-3.5 rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 hover:bg-surface-darker transition-all cursor-pointer flex items-center gap-3 shadow-sm group"
                >
                  <div className={`w-10 h-10 rounded-xl ${func.color} border flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors leading-tight">
                    {func.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode 2: Compact App Tiles */}
        {modulesViewMode === 'compact' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {parentModules.map((func) => {
              const IconComp = func.icon;
              return (
                <div
                  key={func.id}
                  onClick={() => onNavigateTab(func.id)}
                  className="p-3 rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 hover:bg-surface-darker transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 shadow-sm group"
                >
                  <div className={`w-11 h-11 rounded-2xl ${func.color} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight">
                    {func.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode 3: List View */}
        {modulesViewMode === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {parentModules.map((func) => {
              const IconComp = func.icon;
              return (
                <div
                  key={func.id}
                  onClick={() => onNavigateTab(func.id)}
                  className="p-3 px-4 rounded-xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 hover:bg-surface-darker transition-all cursor-pointer flex items-center justify-between shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${func.color} border flex items-center justify-center shrink-0`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {func.label}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. TWO-COLUMN PARENT LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Fees & Statements */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-400" />
                <span>School Fee Statements & Balance</span>
              </h3>
              <button
                onClick={() => onNavigateTab('finance')}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
              >
                View Statement
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Instant digital fee statements, official payment receipts, and automated debit order receipts.
            </p>
          </div>
        </div>

        {/* Right Column: School Notices */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                <span>School Notices & Bulletins</span>
              </h3>
              <button
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                View All
              </button>
            </div>
            <div className="p-3 rounded-xl bg-surface-darker border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-cyan-400">Parent Advisory</span>
              <h4 className="text-xs font-bold text-white">Upcoming Parent-Teacher Conference Booking</h4>
              <p className="text-xs text-slate-400">PTC slots for Term 2 review are now open for appointment bookings.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
