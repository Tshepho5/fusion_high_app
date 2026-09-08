import React, { useState, useEffect, useRef } from 'react';
import { teacherService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { TeacherQRScannerModal } from '../../components/teacher/TeacherQRScannerModal';
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
  Check,
  Search,
  AlertCircle,
  Eye,
  QrCode,
  Key,
  RefreshCw,
  ExternalLink,
  Plus
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

  // Subject Attendance Register Modal State
  const [attendanceModal, setAttendanceModal] = useState<any | null>(null);
  const [attendanceLearners, setAttendanceLearners] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [showSelfCheckInCode, setShowSelfCheckInCode] = useState(false);

  // Subject QR Scanner State
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [activeQRSubject, setActiveQRSubject] = useState<any | null>(null);
  const [qrLearners, setQrLearners] = useState<any[]>([]);
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  // Subject Command Center ("View All" Modal) State
  const [viewAllSubject, setViewAllSubject] = useState<any | null>(null);

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

  const loadAttendanceRoster = async (card: any, targetDate: string) => {
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const roster = await teacherService.getAttendanceRoster({
        grade: card.grade,
        class: card.class_name,
        subject: card.subject_name,
        date: targetDate
      });
      const list = Array.isArray(roster) ? roster : [];
      setAttendanceLearners(
        list.map((l: any) => ({
          id: l.id || l.child_id,
          full_name: l.full_name || l.name || 'Learner',
          surname: l.surname || '',
          learner_number: l.learner_number || (l.id ? `2026-FHS-${String(l.id).padStart(3, '0')}` : '2026-001'),
          grade: l.grade || card.grade,
          stream: l.stream || card.stream || 'General',
          class_name: l.class_name || card.class_name,
          status: (l.status || 'present').toLowerCase() as 'present' | 'late' | 'absent'
        }))
      );
    } catch (err: any) {
      console.error('Error fetching subject attendance roster:', err);
      setAttendanceError('Could not load enrolled learners for this subject.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleOpenSubjectAttendance = (card: any) => {
    setAttendanceModal(card);
    setAttendanceSuccess(null);
    setAttendanceError(null);
    setShowSelfCheckInCode(false);
    loadAttendanceRoster(card, attendanceDate);
  };

  const handleOpenSubjectQR = async (card: any) => {
    setActiveQRSubject(card);
    setQrLoading(true);
    setAttendanceError(null);
    try {
      const roster = await teacherService.getAttendanceRoster({
        grade: card.grade,
        class: card.class_name,
        subject: card.subject_name,
        date: attendanceDate
      });
      const list = Array.isArray(roster) ? roster : [];
      const mapped = list.map((l: any) => ({
        id: l.id || l.child_id,
        full_name: l.full_name || l.name || 'Learner',
        surname: l.surname || '',
        learner_number: l.learner_number || (l.id ? `2026-FHS-${String(l.id).padStart(3, '0')}` : '2026-001'),
        grade: l.grade || card.grade,
        stream: l.stream || card.stream,
        status: (l.status || 'present').toLowerCase() as 'present' | 'late' | 'absent'
      }));
      setQrLearners(mapped);
      setIsQRModalOpen(true);
    } catch (err: any) {
      console.error('Error fetching enrolled roster for QR roll-call:', err);
      setAttendanceError('Could not load enrolled roster for QR roll-call.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleApplyQRAttendance = async (updated: any[]) => {
    if (!activeQRSubject) return;
    try {
      await teacherService.saveAttendance({
        class: activeQRSubject.class_name,
        class_id: activeQRSubject.class_name,
        date: attendanceDate,
        subject: activeQRSubject.subject_name,
        subject_name: activeQRSubject.subject_name,
        grade: activeQRSubject.grade,
        records: updated.map((l: any) => ({
          id: l.id,
          child_id: l.id,
          learner_id: l.id,
          learner_number: l.learner_number,
          status: l.status || 'present'
        }))
      });

      const presentCount = updated.filter((x: any) => x.status === 'present').length;
      setAttendanceSuccess(`✓ QR Attendance recorded for ${activeQRSubject.subject_name} (${presentCount} present).`);
      setTimeout(() => setAttendanceSuccess(null), 5000);

      // Synchronize with open attendance modal if open for this subject
      if (attendanceModal && attendanceModal.subject_name === activeQRSubject.subject_name) {
        setAttendanceLearners(updated);
      }
    } catch (err: any) {
      console.error('Error saving QR attendance:', err);
      setAttendanceError(err?.response?.data?.error || 'Failed to save QR roll-call attendance.');
    }
  };

  const handleToggleAttendanceStatus = (learnerId: number, status: 'present' | 'late' | 'absent') => {
    setAttendanceLearners(prev =>
      prev.map(l => (l.id === learnerId ? { ...l, status } : l))
    );
  };

  const handleMarkAllAttendance = (status: 'present' | 'late' | 'absent') => {
    setAttendanceLearners(prev => prev.map(l => ({ ...l, status })));
  };

  const handleSaveAttendance = async () => {
    if (!attendanceModal || attendanceLearners.length === 0) return;
    setSavingAttendance(true);
    setAttendanceSuccess(null);
    setAttendanceError(null);
    try {
      await teacherService.saveAttendance({
        class: attendanceModal.class_name,
        class_id: attendanceModal.class_name,
        subject: attendanceModal.subject_name,
        subject_name: attendanceModal.subject_name,
        date: attendanceDate,
        records: attendanceLearners.map(l => ({
          id: l.id,
          child_id: l.id,
          learner_id: l.id,
          learner_number: l.learner_number,
          status: l.status
        }))
      });
      setAttendanceSuccess(`Subject register saved for ${attendanceLearners.length} learners at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
      setTimeout(() => setAttendanceSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error saving subject attendance:', err);
      setAttendanceError(err?.response?.data?.error || 'Failed to save subject attendance.');
    } finally {
      setSavingAttendance(false);
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
  const subjectsList = workload?.subjects && workload.subjects.length > 0 ? workload.subjects : (user?.subjects || ['Physical Sciences', 'Mathematics']);
  const classesList = workload?.classes_taught && workload.classes_taught.length > 0 ? workload.classes_taught : ['10A', '11A', '12A'];

  // Normalized display cards binding dynamic database metrics
  const displayCards = subjectsOverview.length > 0
    ? subjectsOverview
    : classesList.map((clsName: string, idx: number) => {
        const assignedSub = subjectsList[idx % subjectsList.length] || 'Physical Sciences';
        const gradeNum = parseInt(clsName.replace(/[^0-9]/g, ''), 10) || 10;
        let stream = 'General';
        const subLow = assignedSub.toLowerCase();
        if (subLow.includes('physic') || subLow.includes('science') || subLow.includes('chemistry')) stream = 'Science';
        else if (subLow.includes('account') || subLow.includes('business') || subLow.includes('econom')) stream = 'Commerce';
        else if (subLow.includes('tourism')) stream = 'Tourism';

        const roomName = stream === 'Science' ? (idx === 0 ? 'Science Lab 1' : (idx === 1 ? 'Science Lab 2' : 'Science Lab 3')) : `Room ${clsName}`;
        const periodNum = ((idx * 2) % 7) + 1;

        return {
          id: `${assignedSub}-${clsName}-${idx}`,
          subject_name: assignedSub,
          grade: gradeNum,
          class_name: clsName,
          stream,
          learner_count: gradeNum === 10 ? 41 : (gradeNum === 11 ? 42 : 41),
          enrolled_count: gradeNum === 10 ? 41 : (gradeNum === 11 ? 42 : 41),
          period: periodNum,
          room: roomName,
          period_room: `Period ${periodNum} • ${roomName}`,
          recent_class_avg: 74
        };
      });

  // TEACHER MODULES (ICON + NAME ONLY)
  const teacherModules = [
    { id: 'subjects', label: 'My Classes & Workload', icon: BookOpen, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
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
            <div>
              <h2 className="text-base md:text-lg font-bold font-display text-white tracking-tight">
                My Assigned Teaching Classes
              </h2>
              <p className="text-[11px] text-slate-400">
                Live subject rosters, real-time registers, and subject-scoped educator functions
              </p>
            </div>
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
          {displayCards.map((card: any, idx: number) => {
            const enrolledCount = card.learner_count ?? card.enrolled_count ?? 0;
            const periodRoomText = card.period_room || (card.period ? `Period ${card.period} • ${card.room || 'Room ' + card.class_name}` : `Room ${card.room || card.class_name} • Scheduled`);

            return (
              <div
                key={card.id || idx}
                className="min-w-[310px] max-w-[340px] shrink-0 snap-start rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/50 p-4 transition-all shadow-md flex flex-col justify-between group space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {card.class_name || `${card.grade}A`}
                    </span>
                    {card.stream && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20 uppercase tracking-wider">
                        {card.stream}
                      </span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" />
                    {enrolledCount} Enrolled
                  </span>
                </div>

                <div>
                  <h3
                    onClick={() => onNavigateTab('assessments', { subject: card.subject_name, grade: card.grade, class: card.class_name })}
                    className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer leading-snug"
                    title={`Open ${card.subject_name} Marksheet`}
                  >
                    {card.subject_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{periodRoomText}</span>
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleOpenSubjectAttendance(card)}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/25 to-teal-600/25 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/30 transition-all text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    title={`Class Attendance Register & QR Roll-Call for ${card.subject_name}`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Register</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab('assessments', { subject: card.subject_name, grade: card.grade, class: card.class_name })}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    title={`Enter SBA Marks for ${card.subject_name}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Marks</span>
                  </button>
                </div>

                {/* Subject-Specific Module Icons & "View All" */}
                <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNavigateTab('assignments', { subject: card.subject_name, grade: card.grade, class: card.class_name })}
                      className="px-2 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/30 text-pink-300 border border-pink-500/25 transition-all hover:scale-105 flex items-center gap-1 text-[11px] font-bold shadow-sm"
                      title={`Homework & Submissions for ${card.subject_name}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Homework</span>
                    </button>
                    <button
                      onClick={() => onNavigateTab('ai-tools', { subject: card.subject_name, grade: card.grade, tool: 'lesson-plan' })}
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/20 transition-all hover:scale-105"
                      title="AI Lesson & Test Builder for this Subject"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onNavigateTab('resources', { subject: card.subject_name, grade: card.grade })}
                      className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 transition-all hover:scale-105"
                      title="Past Papers & Learning Resources for this Subject"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setViewAllSubject(card)}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline pl-1 shrink-0 transition-colors"
                    title="View all modules & tools for this subject"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View All</span>
                    <ChevronRight className="w-3 h-3" />
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Upcoming Class Period</span>
              <h4 className="text-sm font-bold text-white">
                {displayCards[0]?.subject_name || 'Physical Sciences'} • Grade {displayCards[0]?.class_name || '10A'}
              </h4>
              <p className="text-xs text-slate-400">
                {displayCards[0]?.period_room || (displayCards[0]?.period ? `Period ${displayCards[0].period} • ${displayCards[0].room}` : 'Scheduled via Timetable')}
              </p>
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

      {/* 4. SUBJECT ATTENDANCE REGISTER MODAL */}
      {attendanceModal && (
        <Modal
          isOpen={!!attendanceModal}
          onClose={() => setAttendanceModal(null)}
          title={`Subject Attendance Register: ${attendanceModal.subject_name}`}
          maxWidth="4xl"
          alignTop={true}
        >
          <div className="p-5 sm:p-6 space-y-5 text-slate-200">
            {/* Subject Context Header */}
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="indigo" size="sm">
                    Class {attendanceModal.class_name || `${attendanceModal.grade}A`}
                  </Badge>
                  {attendanceModal.stream && (
                    <Badge variant="amber" size="sm">
                      {attendanceModal.stream} Stream
                    </Badge>
                  )}
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    Grade {attendanceModal.grade}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white font-display">
                  {attendanceModal.subject_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{attendanceModal.period_room || `Period ${attendanceModal.period || 1} • ${attendanceModal.room || 'Classroom'}`}</span>
                </p>
              </div>

              {/* Date & Self Check-in Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Session Date</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => {
                      setAttendanceDate(e.target.value);
                      loadAttendanceRoster(attendanceModal, e.target.value);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-dark border border-white/15 text-xs text-white focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Learner Check-In PIN</span>
                  <button
                    type="button"
                    onClick={() => setShowSelfCheckInCode(!showSelfCheckInCode)}
                    className="w-full px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="Click to view/hide learner self check-in verification PIN"
                  >
                    <Key className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">PIN: {attendanceModal.grade}{attendanceModal.class_name?.slice(-1) || 'A'}-{(attendanceModal.subject_name || 'SUB').substring(0, 3).toUpperCase()}</span>
                  </button>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Camera Scanner</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQRSubject(attendanceModal);
                      setQrLearners(attendanceLearners);
                      setIsQRModalOpen(true);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title={`Launch QR Camera Scanner for ${attendanceModal.subject_name}`}
                  >
                    <QrCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Scan Subject QR</span>
                  </button>
                </div>
              </div>
            </div>

            {showSelfCheckInCode && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5 animate-fade-in">
                <QrCode className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white text-xs">
                    Real-Time Learner Self-Registration Activated for Period {attendanceModal.period || 1}
                  </p>
                  <p className="text-[11px] text-emerald-200/90 mt-0.5">
                    Learners enrolled in <strong>{attendanceModal.subject_name} ({attendanceModal.class_name})</strong> can enter PIN <strong className="text-white font-mono">{attendanceModal.grade}{attendanceModal.class_name?.slice(-1) || 'A'}-{(attendanceModal.subject_name || 'SUB').substring(0, 3).toUpperCase()}</strong> on their learner dashboard during this period to self-verify attendance.
                  </p>
                </div>
              </div>
            )}

            {/* Error & Success Feedback */}
            {attendanceError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{attendanceError}</span>
              </div>
            )}

            {attendanceSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{attendanceSuccess}</span>
              </div>
            )}

            {/* Roster Controls: Search & Bulk Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  placeholder="Search enrolled learner..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Status Counters & Quick Toggles */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    P: {attendanceLearners.filter(l => l.status === 'present').length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    L: {attendanceLearners.filter(l => l.status === 'late').length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    A: {attendanceLearners.filter(l => l.status === 'absent').length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarkAllAttendance('present')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors"
                >
                  All Present
                </button>
              </div>
            </div>

            {/* Learners Roster List */}
            {loadingAttendance ? (
              <LoadingSpinner size="md" text="Detecting enrolled learners for this subject..." />
            ) : attendanceLearners.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-surface-darker border border-white/5 space-y-2">
                <Users className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-white">No Enrolled Learners Found</p>
                <p className="text-xs text-slate-400">No learners registered in Grade {attendanceModal.grade} taking {attendanceModal.subject_name}.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                {attendanceLearners
                  .filter(l => {
                    const q = attendanceSearch.toLowerCase();
                    return (
                      l.full_name.toLowerCase().includes(q) ||
                      l.surname.toLowerCase().includes(q) ||
                      l.learner_number.toLowerCase().includes(q)
                    );
                  })
                  .map((learner, idx) => {
                    return (
                      <div
                        key={learner.id || idx}
                        className="p-2.5 sm:p-3 rounded-xl bg-surface-darker border border-white/5 hover:border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center text-[10px] font-mono text-slate-500 font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-brand-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                            {learner.full_name[0] || 'L'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">
                              {learner.full_name} {learner.surname}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {learner.learner_number}
                              </span>
                              {learner.stream && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-medium border border-white/10">
                                  {learner.stream}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Present / Late / Absent Toggle Buttons */}
                        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center shrink-0 pt-1 sm:pt-0 border-t border-white/5 sm:border-0">
                          <button
                            type="button"
                            onClick={() => handleToggleAttendanceStatus(learner.id, 'present')}
                            className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold text-center transition-all ${
                              learner.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-glow-emerald'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAttendanceStatus(learner.id, 'late')}
                            className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold text-center transition-all ${
                              learner.status === 'late'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAttendanceStatus(learner.id, 'absent')}
                            className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold text-center transition-all ${
                              learner.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-glow-rose'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span className="text-xs text-slate-400 font-mono text-center sm:text-left">
                Total Enrolled: <strong className="text-white">{attendanceLearners.length} Learners</strong>
              </span>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setAttendanceModal(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance || attendanceLearners.length === 0}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingAttendance ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{savingAttendance ? 'Saving...' : 'Commit Register'}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. "VIEW ALL" SUBJECT COMMAND CENTER MODAL */}
      {viewAllSubject && (
        <Modal
          isOpen={!!viewAllSubject}
          onClose={() => setViewAllSubject(null)}
          title={`Subject Command Center: ${viewAllSubject.subject_name}`}
          maxWidth="4xl"
          alignTop={true}
        >
          <div className="p-5 sm:p-6 space-y-6 text-slate-200">
            {/* Subject Overview Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-brand-950/60 via-surface-darker to-surface-dark border border-brand-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="indigo" size="sm">
                    Class {viewAllSubject.class_name || `${viewAllSubject.grade}A`}
                  </Badge>
                  {viewAllSubject.stream && (
                    <Badge variant="amber" size="sm">
                      {viewAllSubject.stream} Stream
                    </Badge>
                  )}
                  <Badge variant="cyan" size="sm">
                    CAPS DBE Limpopo & Gauteng
                  </Badge>
                </div>
                <h3 className="text-xl font-extrabold text-white font-display">
                  {viewAllSubject.subject_name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{viewAllSubject.period_room || `Period ${viewAllSubject.period || 1} • ${viewAllSubject.room || 'Room 10A'}`}</span>
                </p>
              </div>

              {/* Live Subject KPI Counters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-surface-dark border border-white/5 text-center min-w-[80px]">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Enrolled</p>
                  <p className="text-sm font-bold font-mono text-cyan-400 mt-0.5">{viewAllSubject.learner_count ?? viewAllSubject.enrolled_count ?? 0}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-dark border border-white/5 text-center min-w-[80px]">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Class Avg</p>
                  <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{viewAllSubject.recent_class_avg || 75}%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-dark border border-white/5 text-center min-w-[80px]">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Attendance</p>
                  <p className="text-sm font-bold font-mono text-indigo-300 mt-0.5">{viewAllSubject.attendance_rate || 98}%</p>
                </div>
              </div>
            </div>

            {/* Dedicated Homework & Submissions Space for This Subject */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-surface-darker to-surface-dark border border-pink-500/25 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">
                        Homework & Submissions Space
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono font-medium">
                        {viewAllSubject.subject_name} • Grade {viewAllSubject.grade}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const target = viewAllSubject;
                      setViewAllSubject(null);
                      onNavigateTab('assignments', { subject: target.subject_name, grade: target.grade, class: target.class_name, create: 'true' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-glow-pink flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Publish Homework</span>
                  </button>
                  <button
                    onClick={() => {
                      const target = viewAllSubject;
                      setViewAllSubject(null);
                      onNavigateTab('assignments', { subject: target.subject_name, grade: target.grade, class: target.class_name });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 border border-pink-500/30 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>Open Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Status Bar for this subject */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                <div className="p-2.5 rounded-xl bg-surface-dark/80 border border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Target Class</span>
                  <span className="text-xs font-mono font-bold text-cyan-300">Grade {viewAllSubject.grade}{viewAllSubject.class_name ? ` (${viewAllSubject.class_name})` : ''}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-dark/80 border border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Curriculum</span>
                  <span className="text-xs font-mono font-bold text-amber-300">CAPS Term 3</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-dark/80 border border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">AI Evaluator</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">Instant Marking</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-dark/80 border border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">SBA Sync</span>
                  <span className="text-xs font-mono font-bold text-indigo-300">Auto-recorded</span>
                </div>
              </div>
            </div>

            {/* Subject Modules Selection Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                <span>Subject Modules</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 1. Register */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    handleOpenSubjectAttendance(target);
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                    Register
                  </span>
                </button>

                {/* 2. Marks & Assessments */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('assessments', { subject: target.subject_name, grade: target.grade, class: target.class_name });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                    Marks & Assessments
                  </span>
                </button>

                {/* 3. Homework & Submissions */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('assignments', { subject: target.subject_name, grade: target.grade, class: target.class_name });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-2">
                    Homework & Submissions
                  </span>
                </button>

                {/* 4. AI Lesson Planner */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('ai-tools', { subject: target.subject_name, grade: target.grade, tool: 'lesson-plan' });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    AI Lesson Planner
                  </span>
                </button>

                {/* 5. AI Test Paper Studio */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('ai-tools', { subject: target.subject_name, grade: target.grade, tool: 'test-paper' });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    AI Test Paper Studio
                  </span>
                </button>

                {/* 6. Past Exam Papers */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('resources', { subject: target.subject_name, grade: target.grade });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                    Past Exam Papers
                  </span>
                </button>

                {/* 7. Textbook Inventory */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('textbooks', { subject: target.subject_name, grade: target.grade });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2">
                    Textbook Inventory
                  </span>
                </button>

                {/* 8. Timetable & Periods */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('timetable', { subject: target.subject_name, grade: target.grade });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2">
                    Timetable & Periods
                  </span>
                </button>

                {/* 9. Merit & Conduct Log */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('conduct', { grade: target.grade, class: target.class_name });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors line-clamp-2">
                    Merit & Conduct Log
                  </span>
                </button>

                {/* 10. Subject Notices */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('announcements', { subject: target.subject_name, grade: target.grade });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                    Subject Notices
                  </span>
                </button>

                {/* 11. Parent Consultations */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('ptc', { subject: target.subject_name, grade: target.grade });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-2">
                    Parent Consultations
                  </span>
                </button>

                {/* 12. Academic Olympiads */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewAllSubject;
                    setViewAllSubject(null);
                    onNavigateTab('inter-school', { subject: target.subject_name });
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200 cursor-pointer group shadow-sm flex items-center gap-3 text-left active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    Academic Olympiads
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setViewAllSubject(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                Close Hub
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Subject Camera QR Scanner Modal with Strict Subject Enrollment Enforcement */}
      <TeacherQRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        learners={qrLearners}
        selectedClass={activeQRSubject?.class_name || `${activeQRSubject?.grade || 10}A`}
        subjectName={activeQRSubject?.subject_name || 'Subject'}
        onApplyAttendance={handleApplyQRAttendance}
      />

    </div>
  );
};
