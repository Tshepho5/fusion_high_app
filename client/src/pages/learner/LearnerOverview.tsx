import React, { useState, useEffect, useRef } from 'react';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Megaphone,
  Award,
  ArrowRight,
  Bot,
  FileText,
  MessageSquare,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  UserCheck,
  TrendingUp,
  FileCode,
  Sparkles,
  Layers,
  X,
  ExternalLink,
  BookMarked,
  Compass,
  CreditCard,
  Grid,
  Trophy,
  Calendar,
  LayoutGrid,
  List,
  Grid3X3,
  Gamepad2,
  Swords
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';

type GridViewMode = 'grid' | 'compact' | 'list';

interface LearnerOverviewProps {
  onNavigateTab: (tabId: string, subjectName?: string) => void;
}

export const LearnerOverview: React.FC<LearnerOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Optional Grid View Mode (Grid / Compact Tiles / List)
  const [modulesViewMode, setModulesViewMode] = useState<GridViewMode>(() => {
    return (localStorage.getItem('learner_modules_view_mode') as GridViewMode) || 'grid';
  });

  const handleSetViewMode = (mode: GridViewMode) => {
    setModulesViewMode(mode);
    localStorage.setItem('learner_modules_view_mode', mode);
  };

  // Resource Modal state
  const [selectedResourceSubject, setSelectedResourceSubject] = useState<{ name: string; grade: number } | null>(null);
  const [resourceList, setResourceList] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Read state persistence in localStorage
  const readStorageKey = `fusion_read_announcements_${user?.id || 'guest'}`;
  const [readIds, setReadIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(readStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dismissAnnouncement = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const updated = [...readIds, id];
    setReadIds(updated);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save read state', err);
    }
  };

  const scrollCarousel = (direction: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }
  };

  const openResourcesModal = async (subjectName: string, subjectGrade: number) => {
    setSelectedResourceSubject({ name: subjectName, grade: subjectGrade });
    setLoadingResources(true);
    try {
      const res = await learnerService.getSubjectResources(subjectName, subjectGrade);
      const items = Array.isArray(res) ? res : (res?.resources || []);
      setResourceList(items);
    } catch (err) {
      console.error('Failed to load subject resources', err);
      setResourceList([]);
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profData, subjData, annData, assignData, gradesData] = await Promise.allSettled([
          learnerService.getProfile(),
          learnerService.getMySubjectsOverview().catch(() => learnerService.getSubjects()),
          learnerService.getAnnouncements(),
          learnerService.getAssignments(),
          learnerService.getGradesOverview().catch(() => learnerService.getProgress())
        ]);

        if (profData.status === 'fulfilled') setProfile(profData.value);
        
        if (subjData.status === 'fulfilled') {
          const val = subjData.value;
          let subList = [];
          if (val && Array.isArray(val.subjects)) {
            subList = val.subjects;
          } else if (Array.isArray(val)) {
            subList = val;
          }
          const formatted = subList.map((s: any) => {
            const name = typeof s === 'string' ? s : (s.name || s.subject_name || 'Subject');
            const code = s.code || `${name.substring(0, 4).toUpperCase()}10`;
            const grade = s.grade || 10;
            const progress = s.curriculum_progress || s.progress || 75;
            const teacher = s.teacher || s.educator_name || 'Subject Teacher';
            const assignmentsDue = s.assignments_due || 0;
            return { name, code, grade, progress, teacher, assignmentsDue };
          });
          setSubjects(formatted);
        }

        if (annData.status === 'fulfilled') {
          const list = Array.isArray(annData.value) ? annData.value : annData.value?.announcements || [];
          setAnnouncements(list);
        }
        if (assignData.status === 'fulfilled') {
          const list = Array.isArray(assignData.value) ? assignData.value : assignData.value?.assignments || [];
          setAssignments(list);
        }
        if (gradesData.status === 'fulfilled') setPerformance(gradesData.value);

      } catch (err) {
        console.error('Failed to load learner overview data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading your learner portal..." />;
  }

  const unreadAnnouncements = announcements.filter(a => !readIds.includes(a.id));

  // Fallback demo subjects if none loaded
  const displaySubjects = subjects.length > 0 ? subjects : [
    { name: 'Mathematics', code: 'MATH10', grade: 10, progress: 82, teacher: 'Dr. Sithole', assignmentsDue: 1 },
    { name: 'Physical Sciences', code: 'PHYS10', grade: 10, progress: 75, teacher: 'Mrs. Van Der Merwe', assignmentsDue: 0 },
    { name: 'Life Sciences', code: 'LFSC10', grade: 10, progress: 90, teacher: 'Mr. Khumalo', assignmentsDue: 2 },
    { name: 'English First Additional Language', code: 'EFAL10', grade: 10, progress: 88, teacher: 'Ms. Pillay', assignmentsDue: 0 },
    { name: 'Geography', code: 'GEOG10', grade: 10, progress: 70, teacher: 'Mr. Baloyi', assignmentsDue: 1 },
    { name: 'Life Orientation', code: 'LFOR10', grade: 10, progress: 95, teacher: 'Mrs. Mokoena', assignmentsDue: 0 }
  ];

  // ALL FUNCTIONS FROM MAIN MENU (ICON + NAME ONLY)
  const mainPortalFunctions = [
    { id: 'subjects', label: 'My Subjects', icon: BookOpen, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'arcade', label: 'Fusion Arcade (Games)', icon: Gamepad2, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'assignments', label: 'Homework & Tasks', icon: FileText, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'ai-tutor', label: 'AI Study Tutor', icon: Bot, color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' },
    { id: 'performance', label: 'Subject Performance', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'career-advisor', label: 'Matric APS & Careers', icon: Compass, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
    { id: 'bursaries', label: 'NSFAS & Bursaries', icon: GraduationCap, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'reports', label: 'CAPS Report Cards', icon: Award, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'finance', label: 'Fee Statements', icon: CreditCard, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'timetable', label: 'Weekly Timetable', icon: Clock, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
    { id: 'calendar', label: 'School Calendar', icon: Calendar, color: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
    { id: 'exam-seating', label: 'Exam Seating & Card', icon: Grid, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'textbooks', label: 'My Textbooks', icon: BookMarked, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'sports', label: 'Sports & Clubs', icon: Trophy, color: 'text-green-400 bg-green-500/15 border-green-500/30' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30' },
    { id: 'messages', label: 'Teacher Messages', icon: MessageSquare, color: 'text-brand-400 bg-brand-500/15 border-brand-500/30' },
    { id: 'settings', label: 'Technical Settings', icon: UserCheck, color: 'text-slate-300 bg-slate-700/30 border-slate-600/30' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* 1. SIDEWAYS-SCROLLABLE SUBJECTS CAROUSEL */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              My Enrolled Subjects
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
          {displaySubjects.map((sub, idx) => (
            <div
              key={idx}
              className="min-w-[290px] max-w-[320px] shrink-0 snap-start rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 p-4 transition-all shadow-md flex flex-col justify-between group space-y-3"
            >
              {/* Card Header: Grade Badge + Due Alerts */}
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  Grade {sub.grade} • {sub.code}
                </span>
                {sub.assignmentsDue > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {sub.assignmentsDue} Due
                  </span>
                )}
              </div>

              {/* Subject Title & Teacher Meta (Click opens specific subject workspace directly!) */}
              <div>
                <h3
                  onClick={() => onNavigateTab('subjects', sub.name)}
                  className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer leading-snug"
                  title={`Open ${sub.name} Workspace`}
                >
                  {sub.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{sub.teacher}</span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="p-2.5 rounded-xl bg-surface-darker border border-white/5 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Curriculum Pace</span>
                  <span className="text-indigo-400">{sub.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${sub.progress}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => openResourcesModal(sub.name, sub.grade)}
                  className="px-2 py-1.5 rounded-lg bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-medium border border-white/5 transition-colors text-center"
                  title="View Textbooks & Resources"
                >
                  Resources
                </button>
                <button
                  onClick={() => onNavigateTab('ai-tutor')}
                  className="px-2 py-1.5 rounded-lg bg-surface-darker hover:bg-white/10 text-cyan-300 hover:text-cyan-200 text-[11px] font-medium border border-white/5 transition-colors text-center flex items-center justify-center gap-1"
                  title="Ask AI Tutor"
                >
                  <Bot className="w-3 h-3 text-cyan-400" />
                  AI Tutor
                </button>
                <button
                  onClick={() => onNavigateTab('performance')}
                  className="px-2 py-1.5 rounded-lg bg-surface-darker hover:bg-white/10 text-emerald-300 hover:text-emerald-200 text-[11px] font-medium border border-white/5 transition-colors text-center"
                  title="Subject Performance"
                >
                  Marks
                </button>
                <button
                  onClick={() => onNavigateTab('subjects', sub.name)}
                  className="col-span-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Open {sub.name} Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. MAIN MODULES (ICON + NAME ONLY WITH OPTIONAL GRID VIEWS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
              Portal Modules & Quick Functions
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

        {/* View Mode 1: Standard Clean Grid (Icon + Name) */}
        {modulesViewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mainPortalFunctions.map((func) => {
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

        {/* View Mode 2: Compact App Icon Tiles */}
        {modulesViewMode === 'compact' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {mainPortalFunctions.map((func) => {
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

        {/* View Mode 3: Sleek List View */}
        {modulesViewMode === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mainPortalFunctions.map((func) => {
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

      {/* 3. TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Tasks & AI Topics */}
        <div className="space-y-4">
          
          {/* Pending Tasks */}
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Pending Tasks & Homework</span>
              </h3>
              <button
                onClick={() => onNavigateTab('assignments')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                View All
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
              {assignments && assignments.length > 0 ? (
                assignments.slice(0, 3).map((task, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigateTab('assignments')}
                    className="p-3 rounded-xl bg-surface-darker border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{task.title || task.assignment_title || 'Homework Assignment'}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{task.subject || 'Core Subject'} • Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'This Week'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Pending
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">No overdue tasks assigned.</p>
              )}
            </div>
          </div>

          {/* AI Model Recommended Study Topics */}
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>AI Recommended Revision Topics</span>
              </h3>
              <span className="text-[11px] text-pink-400 font-medium">Fusion AI Coach</span>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => onNavigateTab('ai-tutor')}
                className="p-3 rounded-xl bg-surface-darker border border-white/5 hover:border-pink-500/30 transition-all flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                    Euclidean Geometry & Circle Theorems
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Mathematics • Grade 10 Exam Practice</p>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-semibold transition-all">
                  Start Quiz
                </button>
              </div>

              <div
                onClick={() => onNavigateTab('ai-tutor')}
                className="p-3 rounded-xl bg-surface-darker border border-white/5 hover:border-pink-500/30 transition-all flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                    Stoichiometry & Chemical Equations
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Physical Sciences • Grade 10 Step-by-Step</p>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-semibold transition-all">
                  Start Quiz
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Performance & Announcements */}
        <div className="space-y-4">
          
          {/* Performance Summary */}
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Subject Performance Summary</span>
              </h3>
              <button
                onClick={() => onNavigateTab('performance')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                View Full Marks
              </button>
            </div>

            <div className="space-y-2.5">
              {displaySubjects.slice(0, 4).map((sub, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">{sub.name}</span>
                    <span className="font-bold text-emerald-400">{sub.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${sub.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent School Notices */}
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span>Recent Announcements</span>
              </h3>
              <button
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                View All
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
              {unreadAnnouncements.length > 0 ? (
                unreadAnnouncements.slice(0, 3).map((ann, idx) => (
                  <div
                    key={ann.id || idx}
                    className="p-3 rounded-xl bg-surface-darker border border-white/5 hover:border-white/15 transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {ann.priority === 'Urgent' ? 'Urgent Notice' : (ann.category || 'School Broadcast')}
                      </span>
                      <button
                        onClick={(e) => dismissAnnouncement(e, ann.id)}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-white">
                      {ann.title || 'Important School Update'}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {ann.content || ann.message || 'Check notice board for details.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  All announcements caught up.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. STUDY RESOURCES MODAL */}
      {selectedResourceSubject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedResourceSubject(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-surface-dark border border-white/15 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedResourceSubject.name} Resources
                  </h3>
                  <p className="text-xs text-slate-400">Grade {selectedResourceSubject.grade} Textbooks & Study Guides</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResourceSubject(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {loadingResources ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <LoadingSpinner text="Fetching study materials..." />
                </div>
              ) : resourceList && resourceList.length > 0 ? (
                resourceList.map((res, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-surface-darker border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white">{res.title || res.file_name || 'Study Material'}</h4>
                      <p className="text-[11px] text-slate-400">{res.category || 'Textbook / Notes'}</p>
                    </div>
                    {res.file_path && (
                      <a
                        href={res.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold">No uploaded PDF resources found for this subject yet.</p>
                  <p className="text-slate-500">Your educator will attach textbook chapters and past papers here soon.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedResourceSubject(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
