import React, { useState, useEffect, useRef } from 'react';
import { teacherService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Briefcase,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  Sparkles,
  BookOpen,
  ArrowRight,
  Clock,
  MessageSquare,
  Trophy,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Bot,
  Layers,
  FileText,
  Calendar,
  Settings,
  Megaphone,
  LayoutGrid,
  Grid3X3,
  List,
  HardDrive,
  Award,
  Compass,
  CheckCircle2,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type GridViewMode = 'grid' | 'compact' | 'list';

interface TeacherOverviewProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

export const TeacherOverview: React.FC<TeacherOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [workload, setWorkload] = useState<any>(null);
  const [subjectsOverview, setSubjectsOverview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Optional Grid View Switcher
  const [modulesViewMode, setModulesViewMode] = useState<GridViewMode>(() => {
    return (localStorage.getItem('teacher_modules_view_mode') as GridViewMode) || 'grid';
  });

  const handleSetViewMode = (mode: GridViewMode) => {
    setModulesViewMode(mode);
    localStorage.setItem('teacher_modules_view_mode', mode);
  };

  const scrollCarousel = (direction: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    Promise.allSettled([
      teacherService.getOverview(),
      teacherService.getWorkload(),
      teacherService.getMySubjectsOverview().catch(() => [])
    ])
      .then(([overRes, workRes, subRes]) => {
        if (overRes.status === 'fulfilled') setStats(overRes.value);
        if (workRes.status === 'fulfilled') setWorkload(workRes.value);
        if (subRes.status === 'fulfilled') {
          const list = Array.isArray(subRes.value) ? subRes.value : subRes.value?.subjects || [];
          setSubjectsOverview(list);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading educator workspace..." />;

  const teacherName = stats?.teacher_name || user?.full_name || 'Educator';
  const subjectsList = workload?.subjects && workload.subjects.length > 0 ? workload.subjects : (user?.subjects || ['Mathematics']);
  const classesList = workload?.classes_taught && workload.classes_taught.length > 0 ? workload.classes_taught : ['Grade 10A', 'Grade 11B'];

  // TEACHER MODULES (ICON + NAME ONLY)
  const teacherModules = [
    { id: 'subjects', label: 'My Classes & Workload', icon: BookOpen, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'attendance', label: 'Class Attendance Register', icon: CalendarCheck, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'assessments', label: 'Marks & Assessment SBA', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'assignments', label: 'Homework & Submissions', icon: FileText, color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' },
    { id: 'ai-tools', label: 'AI Lesson & Test Builder', icon: Bot, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'resources', label: 'Learning Resources Studio', icon: Layers, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
    { id: 'timetable', label: 'Educator Timetable', icon: Clock, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar, color: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
    { id: 'ptc', label: 'Parent-Teacher Conferences', icon: Users, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'conduct', label: 'Merit & Conduct Book', icon: ClipboardList, color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
    { id: 'my-leave', label: 'Leave & Relief Duty', icon: Briefcase, color: 'text-green-400 bg-green-500/15 border-green-500/30' },
    { id: 'exam-seating', label: 'Exam Seating Allocations', icon: Award, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'textbooks', label: 'Textbook Inventory', icon: HardDrive, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'sports', label: 'Sports & Extracurriculars', icon: Trophy, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'announcements', label: 'School Notices', icon: Megaphone, color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30' },
    { id: 'messages', label: 'Communication Hub', icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'settings', label: 'Technical Settings', icon: Settings, color: 'text-slate-300 bg-slate-700/30 border-slate-600/30' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">

      {/* 1. HORIZONTAL CAROUSEL OF ASSIGNED CLASSES & SUBJECTS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              My Assigned Teaching Classes
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
          {classesList.map((clsName: string, idx: number) => {
            const assignedSub = subjectsList[idx % subjectsList.length] || 'Curriculum Subject';
            return (
              <div
                key={idx}
                className="min-w-[290px] max-w-[320px] shrink-0 snap-start rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 p-4 transition-all shadow-md flex flex-col justify-between group space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                    {clsName}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    32 Enrolled
                  </span>
                </div>

                <div>
                  <h3
                    onClick={() => onNavigateTab('assessments', { subject: assignedSub, class: clsName })}
                    className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer leading-snug"
                    title={`Open ${clsName} Marksheet`}
                  >
                    {assignedSub}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Period 3 • Room 14</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => onNavigateTab('attendance', { class: clsName })}
                    className="px-2 py-1.5 rounded-lg bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-medium border border-white/5 transition-colors text-center"
                  >
                    Take Register
                  </button>
                  <button
                    onClick={() => onNavigateTab('assessments', { subject: assignedSub, class: clsName })}
                    className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>Enter Marks</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. TEACHER MODULES & QUICK TOOLS (ICON + NAME ONLY WITH OPTIONAL GRID VIEWS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              Educator Functions & Tools
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
            {teacherModules.map((func) => {
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
            {teacherModules.map((func) => {
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
            {teacherModules.map((func) => {
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

      {/* 3. TWO-COLUMN EDUCATOR LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: AI Builder & Grading Alerts */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>AI Lesson Plan & Test Paper Studio</span>
              </h3>
              <button
                onClick={() => onNavigateTab('ai-tools')}
                className="text-xs text-pink-400 hover:text-pink-300 font-semibold"
              >
                Launch Builder
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Instantly generate CAPS-aligned lesson plans, worksheets, marking rubrics, and diagnostic test papers.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onNavigateTab('ai-tools', { tool: 'lesson-plan' })}
                className="px-3 py-1.5 rounded-xl bg-pink-600/20 text-pink-300 hover:bg-pink-600 hover:text-white border border-pink-500/30 text-xs font-bold transition-all"
              >
                Lesson Plan
              </button>
              <button
                onClick={() => onNavigateTab('ai-tools', { tool: 'test-paper' })}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all"
              >
                CAPS Test Paper
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>SBA Assessment Workload</span>
              </h3>
              <button
                onClick={() => onNavigateTab('assessments')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                View Marksheets
              </button>
            </div>
            <p className="text-xs text-slate-400">
              All term marks and moderation entries are stored in PostgreSQL with instant CAPS weighted averages.
            </p>
          </div>
        </div>

        {/* Right Column: Next Class Alert & Notices */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Next Class Schedule</span>
              </h3>
              <button
                onClick={() => onNavigateTab('timetable')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                View Timetable
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-darker border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Upcoming Period</span>
              <h4 className="text-sm font-bold text-white">Mathematics • Grade 10A</h4>
              <p className="text-xs text-slate-400">10:30 - 11:15 • Main Academic Hall Room 14</p>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                <span>Staff & School Broadcasts</span>
              </h3>
              <button
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                View All
              </button>
            </div>
            <div className="p-3 rounded-xl bg-surface-darker border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-cyan-400">Staff Notice</span>
              <h4 className="text-xs font-bold text-white">Term 2 Moderation Submission Deadlines</h4>
              <p className="text-xs text-slate-400">All SBA test scores must be recorded before Friday 15:00.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
