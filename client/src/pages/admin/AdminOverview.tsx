import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  GraduationCap,
  Briefcase,
  CalendarCheck,
  Award,
  Clock,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  FileSpreadsheet,
  Megaphone,
  CreditCard,
  Calendar,
  Settings,
  LayoutGrid,
  Grid3X3,
  List,
  HardDrive,
  Trophy,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  CheckCircle2,
  Check,
  Building2,
  Swords,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

type GridViewMode = 'grid' | 'compact' | 'list';

interface AdminOverviewProps {
  onNavigateTab: (tabId: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Optional Grid View Switcher
  const [modulesViewMode, setModulesViewMode] = useState<GridViewMode>(() => {
    return (localStorage.getItem('admin_modules_view_mode') as GridViewMode) || 'grid';
  });

  const handleSetViewMode = (mode: GridViewMode) => {
    setModulesViewMode(mode);
    localStorage.setItem('admin_modules_view_mode', mode);
  };

  const scrollCarousel = (direction: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setLoading(true);
    adminService.getOverviewStats()
      .then((res) => setStats(res))
      .catch((err) => {
        console.error('Failed to load admin stats:', err);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [currentSchool?.id]);

  if (loading) return <LoadingSpinner text="Loading administrative control center..." />;

  const totalLearners = stats?.enrolled_learners !== undefined 
    ? Number(stats.enrolled_learners) 
    : (stats?.total_learners !== undefined ? Number(stats.total_learners) : (stats?.totalLearners !== undefined ? Number(stats.totalLearners) : 0));
  const totalTeachers = stats?.teacher !== undefined 
    ? Number(stats.teacher) 
    : (stats?.role_counts?.teacher !== undefined ? Number(stats.role_counts.teacher) : (stats?.totalTeachers !== undefined ? Number(stats.totalTeachers) : 0));
  const totalClasses = stats?.total_classes !== undefined 
    ? Number(stats.total_classes) 
    : (stats?.classes !== undefined ? Number(stats.classes) : 0);
  const overallAttendance = stats?.overall_attendance !== undefined && stats.overall_attendance !== null 
    ? `${stats.overall_attendance}%` 
    : (stats?.attendance_rate !== undefined && stats.attendance_rate !== null ? `${stats.attendance_rate}%` : '0%');

  const metricCards = [
    { title: 'Enrolled Learners', value: totalLearners, sub: 'Active CAPS Students', icon: GraduationCap, color: 'text-indigo-400', tab: 'users' },
    { title: 'Teaching Staff', value: totalTeachers, sub: 'Subject Specialists', icon: Briefcase, color: 'text-cyan-400', tab: 'users' },
    { title: 'Class Units', value: totalClasses, sub: 'Grade 8-12 Rooms', icon: BookOpen, color: 'text-emerald-400', tab: 'timetable' },
    { title: 'School Attendance', value: overallAttendance, sub: 'Daily Average', icon: CalendarCheck, color: 'text-amber-400', tab: 'marks' },
  ];

  // ADMIN MODULES (ICON + NAME ONLY)
  const isSuperAdmin = !!user?.is_superadmin;

  const adminModules = [
    ...(isSuperAdmin
      ? [{ id: 'command-center', label: 'Multi-School Command', icon: Building2, color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' }]
      : []),
    { id: 'inter-school', label: 'Inter-School Derbies & League', icon: Swords, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'consultations', label: 'Parent-Educator Consultations', icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'users', label: 'User Directory & Roles', icon: Users, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'finance', label: 'School Fees & Invoicing', icon: CreditCard, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'marks', label: 'CAPS Mark Audits & SBA', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'timetable', label: 'Timetable Allocations', icon: Clock, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
    { id: 'matric-projector', label: 'Matric Pass Rate Projector', icon: TrendingUp, color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' },
    { id: 'leave-relief', label: 'Staff Leave & Relief Duty', icon: Briefcase, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'exam-seating', label: 'Exam Seating Master', icon: Award, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'bursaries', label: 'Tertiary Bursary Engine', icon: GraduationCap, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
    { id: 'textbooks', label: 'Textbook Inventory', icon: HardDrive, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'sports', label: 'Sports & Extracurriculars', icon: Trophy, color: 'text-green-400 bg-green-500/15 border-green-500/30' },
    { id: 'calendar', label: 'School Calendar', icon: Calendar, color: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
    { id: 'announcements', label: 'Official Broadcasts', icon: Megaphone, color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30' },
    { id: 'messages', label: 'Communication Hub', icon: ShieldCheck, color: 'text-brand-400 bg-brand-500/15 border-brand-500/30' },
    { id: 'settings', label: 'Technical Settings', icon: Settings, color: 'text-slate-300 bg-slate-700/30 border-slate-600/30' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">

      {/* 1. HORIZONTAL CAROUSEL OF SCHOOL METRIC CARDS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              School Performance Metrics
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
          {metricCards.map((m, idx) => {
            const IconComp = m.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigateTab(m.tab)}
                className="min-w-[270px] max-w-[300px] shrink-0 snap-start rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 p-4 transition-all shadow-md flex flex-col justify-between group space-y-3 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">{m.title}</span>
                  <div className={`p-2 rounded-xl bg-white/5 ${m.color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <p className="text-3xl font-extrabold text-white">{m.value}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{m.sub}</p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-indigo-400 group-hover:text-indigo-300">
                  <span>Manage in {m.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. ADMIN MODULES & TOOLS (ICON + NAME ONLY WITH OPTIONAL GRID VIEWS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              Administrative Control Services
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
            {adminModules.map((func) => {
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
            {adminModules.map((func) => {
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
            {adminModules.map((func) => {
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

      {/* 3. TWO-COLUMN ADMIN LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Timetables & Staff Leave */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Automated Timetable Generation</span>
              </h3>
              <button
                onClick={() => onNavigateTab('timetable')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Launch Builder
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Generate conflict-free weekly schedules across Grade 8-12 with automated teacher subject and room assignment.
            </p>
          </div>
        </div>

        {/* Right Column: Fees & Moderation */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-400" />
                <span>School Financials & Fee Invoicing</span>
              </h3>
              <button
                onClick={() => onNavigateTab('finance')}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
              >
                Fee Overview
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Issue automated term tuition invoices, reconcile bank receipts, and send automated parent reminders.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
