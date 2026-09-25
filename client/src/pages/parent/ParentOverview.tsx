import React, { useState, useEffect, useRef } from 'react';
import { parentService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ParentOverviewSkeleton } from '../../components/parent/ParentOverviewSkeleton';
import { FavoriteModulesSection } from '../../components/common/FavoriteModulesSection';
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
  SlidersHorizontal,
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

type ChildrenViewMode = 'carousel' | 'grid' | 'compact' | 'list';

interface ParentOverviewProps {
  onNavigateTab: (tabId: string, childId?: string | number) => void;
}

export const ParentOverview: React.FC<ParentOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Learners View Switcher (Carousel / Grid / Compact / List)
  const [childrenViewMode, setChildrenViewMode] = useState<ChildrenViewMode>(() => {
    return (localStorage.getItem('parent_children_view_mode') as ChildrenViewMode) || 'carousel';
  });

  const handleSetChildrenViewMode = (mode: ChildrenViewMode) => {
    setChildrenViewMode(mode);
    localStorage.setItem('parent_children_view_mode', mode);
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



  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-12">

      {/* 1. REGISTERED LEARNERS (WITH CAROUSEL / GRID / COMPACT / LIST VIEWS) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EDF4F7] dark:bg-[#152535] text-[#13C8D9] flex items-center justify-center border border-slate-200/80 dark:border-[#1B2E3D]">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-[#1C252C] dark:text-white tracking-tight">
              My Registered Learners
            </h2>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[#EDF4F7] dark:bg-[#0A121A] rounded-2xl border border-slate-200/90 dark:border-[#1B2E3D]">
              <button
                type="button"
                onClick={() => handleSetChildrenViewMode('carousel')}
                className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  childrenViewMode === 'carousel'
                    ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Carousel View"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Carousel</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetChildrenViewMode('grid')}
                className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  childrenViewMode === 'grid'
                    ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetChildrenViewMode('compact')}
                className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  childrenViewMode === 'compact'
                    ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Compact Tiles"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Compact</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetChildrenViewMode('list')}
                className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  childrenViewMode === 'list'
                    ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Detailed List"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">List</span>
              </button>
            </div>

            {/* Carousel navigation controls (visible in carousel mode) */}
            {childrenViewMode === 'carousel' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollCarousel(-1)}
                  className="p-2 rounded-xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-[#13C8D9]/50 transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel(1)}
                  className="p-2 rounded-xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-[#13C8D9]/50 transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View Mode 1: HORIZONTAL SCROLLING CAROUSEL */}
        {childrenViewMode === 'carousel' && (
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
                        {child.attendance_rate ? `${child.attendance_rate}% Attendance` : 'No Records Yet'}
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
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Term Average</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{child.overall_average ? `${child.overall_average}%` : 'Pending Marks'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => onNavigateTab('attendance', child.id)}
                        className="px-2 py-1.5 rounded-lg bg-[#EDF4F7] dark:bg-[#0A121A] hover:bg-slate-200 dark:hover:bg-[#152535] text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/80 dark:border-[#1B2E3D] transition-colors text-center cursor-pointer"
                      >
                        Attendance
                      </button>
                      <button
                        onClick={() => onNavigateTab('reports', child.id)}
                        className="px-2 py-1.5 rounded-lg bg-[#1C252C] dark:bg-[#13C8D9] text-white dark:text-[#0A121A] font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm hover:opacity-90 cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-[#13C8D9] text-[#0A121A] text-xs font-bold shadow-md hover:bg-[#18E2EC] transition-colors cursor-pointer"
                >
                  Link Child
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: RESPONSIVE GRID VIEW */}
        {childrenViewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children && children.length > 0 ? (
              children.map((child, idx) => {
                const fullName = `${child.full_name || child.name || 'Learner'} ${child.surname || ''}`.trim();
                const pfp = getProfilePictureUrl(child.profile_picture_path || child.profile_picture);
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 p-4 transition-all shadow-sm flex flex-col justify-between group space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EDF4F7] dark:bg-[#142230] text-[#13C8D9] border border-slate-200/80 dark:border-[#1B2E3D]">
                        Grade {child.grade || 10} • {child.stream || 'General'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                        {child.attendance_rate ? `${child.attendance_rate}% Attendance` : 'No Records Yet'}
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
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Term Average</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{child.overall_average ? `${child.overall_average}%` : 'Pending Marks'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => onNavigateTab('attendance', child.id)}
                        className="px-2 py-1.5 rounded-lg bg-[#EDF4F7] dark:bg-[#0A121A] hover:bg-slate-200 dark:hover:bg-[#152535] text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/80 dark:border-[#1B2E3D] transition-colors text-center cursor-pointer"
                      >
                        Attendance
                      </button>
                      <button
                        onClick={() => onNavigateTab('reports', child.id)}
                        className="px-2 py-1.5 rounded-lg bg-[#1C252C] dark:bg-[#13C8D9] text-white dark:text-[#0A121A] font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm hover:opacity-90 cursor-pointer"
                      >
                        <span>Report Card</span>
                        <ArrowRight className="w-3 h-3 text-[#13C8D9] dark:text-[#0A121A]" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        )}

        {/* View Mode 3: COMPACT TILES */}
        {childrenViewMode === 'compact' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {children && children.map((child, idx) => {
              const fullName = `${child.full_name || child.name || 'Learner'} ${child.surname || ''}`.trim();
              const pfp = getProfilePictureUrl(child.profile_picture_path || child.profile_picture);
              return (
                <div
                  key={idx}
                  onClick={() => onNavigateTab('reports', child.id)}
                  className="rounded-xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 p-3 transition-all shadow-xs flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#13C8D9] to-cyan-400 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 text-sm">
                    {pfp ? <img src={pfp} alt={fullName} className="w-full h-full object-cover" /> : fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[#1C252C] dark:text-white truncate group-hover:text-[#13C8D9] transition-colors">
                      {fullName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Grade {child.grade || 10} • {child.overall_average ? `${child.overall_average}%` : 'Marks Pending'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode 4: DETAILED LIST */}
        {childrenViewMode === 'list' && (
          <div className="space-y-2">
            {children && children.map((child, idx) => {
              const fullName = `${child.full_name || child.name || 'Learner'} ${child.surname || ''}`.trim();
              const pfp = getProfilePictureUrl(child.profile_picture_path || child.profile_picture);
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-[#13C8D9]/50 p-3.5 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#13C8D9] to-cyan-400 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 text-sm">
                      {pfp ? <img src={pfp} alt={fullName} className="w-full h-full object-cover" /> : fullName.charAt(0)}
                    </div>
                    <div>
                      <h4
                        onClick={() => onNavigateTab('reports', child.id)}
                        className="text-sm font-bold text-[#1C252C] dark:text-white group-hover:text-[#13C8D9] transition-colors cursor-pointer"
                      >
                        {fullName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        <span>Grade {child.grade || 10}</span>
                        <span>•</span>
                        <span>{child.stream || 'General'}</span>
                        <span>•</span>
                        <span>#{child.learner_number || `2026-00${idx + 1}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Term Mark</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{child.overall_average ? `${child.overall_average}%` : 'Pending'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigateTab('attendance', child.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#EDF4F7] dark:bg-[#0A121A] hover:bg-slate-200 dark:hover:bg-[#152535] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-[#1B2E3D] transition-colors cursor-pointer"
                      >
                        Attendance
                      </button>
                      <button
                        onClick={() => onNavigateTab('reports', child.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#1C252C] dark:bg-[#13C8D9] text-white dark:text-[#0A121A] text-xs font-bold transition-colors shadow-xs hover:opacity-90 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Report</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#13C8D9] dark:text-[#0A121A]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. FAVORITE MODULES SECTION (QUICK ACCESS FOR PARENT) */}
      <FavoriteModulesSection role="parent" onNavigateTab={onNavigateTab} />

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
