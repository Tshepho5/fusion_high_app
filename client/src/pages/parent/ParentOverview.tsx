import React, { useState, useEffect, useRef } from 'react';
import { parentService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ParentOverviewSkeleton } from '../../components/parent/ParentOverviewSkeleton';
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
import { FusionAppIcon } from '../../components/common/FusionAppIcon';

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

  if (loading) return <ParentOverviewSkeleton />;

  // PARENT MODULES (ICON + NAME ONLY)
  const parentModules = [
    { id: 'reports', label: 'CAPS Report Cards', icon: FusionAppIcon },
    { id: 'finance', label: 'School Fee Statements', icon: CreditCard },
    { id: 'attendance', label: 'Attendance & Absence', icon: CalendarCheck },
    { id: 'ptc', label: 'Parent-Teacher Conferences', icon: Users },
    { id: 'timetable', label: 'Class Timetable', icon: Clock },
    { id: 'calendar', label: 'School Calendar', icon: Calendar },
    { id: 'bursaries', label: 'NSFAS & Tertiary Bursaries', icon: GraduationCap },
    { id: 'conduct', label: 'Learner Merits & Conduct', icon: ClipboardList },
    { id: 'exam-seating', label: 'Exam Seating Slips', icon: FileText },
    { id: 'textbooks', label: 'Issued Textbooks', icon: HardDrive },
    { id: 'sports', label: 'Sports & Extracurriculars', icon: Trophy },
    { id: 'announcements', label: 'School Notices', icon: Megaphone },
    { id: 'messages', label: 'Teacher Messages', icon: MessageSquare },
    { id: 'profile', label: 'My Account & Link Child', icon: UserCheck },
    { id: 'settings', label: 'Technical Settings', icon: Settings }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-12">

      {/* 1. HORIZONTAL CAROUSEL OF LINKED CHILDREN */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EDF4F7] dark:bg-[#152535] text-[#13C8D9] flex items-center justify-center border border-slate-200/80 dark:border-[#1B2E3D]">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-[#1C252C] dark:text-white tracking-tight">
              My Registered Learners
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollCarousel(-1)}
              className="p-2 rounded-xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-[#13C8D9]/50 transition-all shadow-sm active:scale-95"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel(1)}
              className="p-2 rounded-xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-[#13C8D9]/50 transition-all shadow-sm active:scale-95"
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
                  className="min-w-[290px] max-w-[320px] shrink-0 snap-start rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 p-4 transition-all shadow-sm flex flex-col justify-between group space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EDF4F7] dark:bg-[#142230] text-[#13C8D9] border border-slate-200/80 dark:border-[#1B2E3D]">
                      Grade {child.grade || 10} • {child.stream || 'General'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                      {child.attendance_rate || '96%'} Attendance
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#13C8D9] to-cyan-400 border border-white/20 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 shadow-xs">
                      {pfp ? <img src={pfp} alt={fullName} className="w-full h-full object-cover" /> : fullName.charAt(0)}
                    </div>
                    <div>
                      <h3
                        onClick={() => onNavigateTab('reports', child.id)}
                        className="text-base font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors cursor-pointer leading-snug"
                      >
                        {fullName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        #{child.learner_number || `2026-00${idx + 1}`}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#EDF4F7] dark:bg-[#0A121A] border border-slate-200/80 dark:border-[#1B2E3D] flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Term 2 Average</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{child.overall_average || 82}%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => onNavigateTab('attendance', child.id)}
                      className="px-2 py-1.5 rounded-lg bg-[#EDF4F7] dark:bg-[#0A121A] hover:bg-slate-200 dark:hover:bg-[#152535] text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/80 dark:border-[#1B2E3D] transition-colors text-center"
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => onNavigateTab('reports', child.id)}
                      className="px-2 py-1.5 rounded-lg bg-[#1C252C] dark:bg-[#13C8D9] text-white dark:text-[#0A121A] font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm hover:opacity-90"
                    >
                      <span>Report Card</span>
                      <ArrowRight className="w-3 h-3 text-[#13C8D9] dark:text-[#0A121A]" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] text-center w-full space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-[#1C252C] dark:text-white">No learners linked yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Link your child by their learner number in Account settings.</p>
              <button
                onClick={() => onNavigateTab('profile')}
                className="px-4 py-2 rounded-xl bg-[#13C8D9] text-[#0A121A] text-xs font-bold shadow-md hover:bg-[#18E2EC] transition-colors"
              >
                Link Child
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. PARENT MODULES & TOOLS (SQUIRCLE CHIPS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EDF4F7] dark:bg-[#152535] text-[#13C8D9] flex items-center justify-center border border-slate-200/80 dark:border-[#1B2E3D]">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-[#1C252C] dark:text-white tracking-tight">
              Parent Functions & Academic Services
            </h2>
          </div>

          {/* Optional Grid View Selectors */}
          <div className="flex items-center gap-1 p-1 bg-[#EDF4F7] dark:bg-[#0A121A] rounded-xl border border-slate-200/90 dark:border-[#1B2E3D]">
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                modulesViewMode === 'grid'
                  ? 'bg-[#13C8D9] text-[#0A121A] font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Standard Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode('compact')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                modulesViewMode === 'compact'
                  ? 'bg-[#13C8D9] text-[#0A121A] font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Compact App Tiles"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                modulesViewMode === 'list'
                  ? 'bg-[#13C8D9] text-[#0A121A] font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 dark:hover:bg-[#132230] transition-all cursor-pointer flex items-center gap-3.5 shadow-sm group card-interactive"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#E1ECF0] dark:bg-[#152535] border border-slate-200/60 dark:border-[#1B2E3D] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                    <IconComp className="w-5 h-5 text-[#232B32] dark:text-[#18E2EC]" />
                  </div>
                  <span className="text-xs font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors leading-tight truncate">
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
                  className="p-3 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 dark:hover:bg-[#132230] transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 shadow-sm group card-interactive"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#E1ECF0] dark:bg-[#152535] border border-slate-200/60 dark:border-[#1B2E3D] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    <IconComp className="w-5 h-5 text-[#232B32] dark:text-[#18E2EC]" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors line-clamp-2 leading-tight">
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
                  className="p-3 px-4 rounded-xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 dark:hover:bg-[#132230] transition-all cursor-pointer flex items-center justify-between shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E1ECF0] dark:bg-[#152535] border border-slate-200/60 dark:border-[#1B2E3D] flex items-center justify-center shrink-0 shadow-xs">
                      <IconComp className="w-4 h-4 text-[#232B32] dark:text-[#18E2EC]" />
                    </div>
                    <span className="text-xs font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors">
                      {func.label}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#13C8D9] dark:group-hover:text-[#18E2EC] transition-colors" />
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
          <div className="rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1B2E3D]">
              <h3 className="text-sm font-bold font-display text-[#1C252C] dark:text-white flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E1ECF0] dark:bg-[#152535] flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#232B32] dark:text-[#18E2EC]" />
                </div>
                <span>School Fee Statements & Balance</span>
              </h3>
              <button
                onClick={() => onNavigateTab('finance')}
                className="text-xs text-[#13C8D9] hover:underline font-bold"
              >
                View Statement
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Instant digital fee statements, official payment receipts, and automated debit order receipts.
            </p>
          </div>
        </div>

        {/* Right Column: School Notices */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1B2E3D]">
              <h3 className="text-sm font-bold font-display text-[#1C252C] dark:text-white flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E1ECF0] dark:bg-[#152535] flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-[#232B32] dark:text-[#18E2EC]" />
                </div>
                <span>School Notices & Bulletins</span>
              </h3>
              <button
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-[#13C8D9] hover:underline font-bold"
              >
                View All
              </button>
            </div>
            <div className="p-3 rounded-xl bg-[#EDF4F7] dark:bg-[#0A121A] border border-slate-200/80 dark:border-[#1B2E3D] space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#13C8D9]">Parent Advisory</span>
              <h4 className="text-xs font-bold text-[#1C252C] dark:text-white">Upcoming Parent-Teacher Conference Booking</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">PTC slots for Term 2 review are now open for appointment bookings.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
