import React, { useState, useEffect, useRef, useMemo } from 'react';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LearnerOverviewSkeleton } from '../../components/learner/LearnerOverviewSkeleton';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';
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
  Swords,
  Settings,
  Search,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import { getSubjectMetadata } from '../../utils/subjectImages';

type SubjectViewMode = 'visual' | 'grid' | 'compact' | 'list';

interface LearnerOverviewProps {
  onNavigateTab: (tabId: string, subjectName?: string) => void;
}

// Resilient string helper to prevent crash if an API returns null or an object (e.g. joined row)
const safeString = (val: any, fallback = ''): string => {
  if (val == null) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return val.name || val.title || val.full_name || val.subject_name || val.text || fallback;
  }
  return String(val);
};

// Resilient number helper
const safeNumber = (val: any, fallback = 0): number => {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

export const LearnerOverview: React.FC<LearnerOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Subject Presentation Mode (Visual Cards with Pictures / Grid / Compact / List)
  const [subjectViewMode, setSubjectViewMode] = useState<SubjectViewMode>(() => {
    try {
      const saved = localStorage.getItem('learner_subject_view_mode');
      if (saved === 'visual' || saved === 'grid' || saved === 'compact' || saved === 'list') {
        return saved;
      }
    } catch {}
    return 'visual';
  });
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState<string>('all');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');

  const handleSetSubjectViewMode = (mode: SubjectViewMode) => {
    setSubjectViewMode(mode);
    try {
      localStorage.setItem('learner_subject_view_mode', mode);
    } catch {}
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
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
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
      setResourceList(Array.isArray(items) ? items : []);
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
          let subList: any[] = [];
          if (val && Array.isArray(val.subjects)) {
            subList = val.subjects;
          } else if (Array.isArray(val)) {
            subList = val;
          }
          const formatted = subList
            .filter((s: any) => s != null)
            .map((s: any) => {
              const rawName = typeof s === 'string' ? s : (s.name || s.subject_name || 'Subject');
              const name = safeString(rawName, 'Subject');
              const code = safeString(s.code, `${name.slice(0, 4).toUpperCase()}10`);
              const grade = safeNumber(s.grade, 10);
              const progress = safeNumber(s.curriculum_progress ?? s.progress, 75);
              const teacher = safeString(s.teacher || s.educator_name, 'Subject Teacher');
              const assignmentsDue = safeNumber(s.assignments_due, 0);
              return { name, code, grade, progress, teacher, assignmentsDue };
            });
          setSubjects(formatted);
        }

        if (annData.status === 'fulfilled') {
          const list = Array.isArray(annData.value) ? annData.value : annData.value?.announcements || [];
          setAnnouncements(Array.isArray(list) ? list.filter(Boolean) : []);
        }
        if (assignData.status === 'fulfilled') {
          const list = Array.isArray(assignData.value) ? assignData.value : assignData.value?.assignments || [];
          setAssignments(Array.isArray(list) ? list.filter(Boolean) : []);
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

  // User subjects from database or stream
  const userStream = profile?.stream || user?.academic?.stream || 'Science';
  const defaultStreamSubjects = userStream === 'Commerce' ? [
    { name: 'Accounting', code: 'ACC10', grade: profile?.grade || 10, progress: 80, teacher: 'Commerce Educator', assignmentsDue: 0 },
    { name: 'Business Studies', code: 'BUS10', grade: profile?.grade || 10, progress: 85, teacher: 'Business Educator', assignmentsDue: 0 },
    { name: 'Economics', code: 'ECON10', grade: profile?.grade || 10, progress: 78, teacher: 'Economics Educator', assignmentsDue: 0 },
    { name: 'Mathematics', code: 'MATH10', grade: profile?.grade || 10, progress: 82, teacher: 'Mathematics Educator', assignmentsDue: 0 },
    { name: 'English First Additional Language', code: 'EFAL10', grade: profile?.grade || 10, progress: 88, teacher: 'Languages Educator', assignmentsDue: 0 },
    { name: 'Life Orientation', code: 'LFOR10', grade: profile?.grade || 10, progress: 95, teacher: 'Life Orientation Educator', assignmentsDue: 0 }
  ] : [
    { name: 'Mathematics', code: 'MATH10', grade: profile?.grade || 10, progress: 82, teacher: 'Mathematics Educator', assignmentsDue: 0 },
    { name: 'Physical Sciences', code: 'PHYS10', grade: profile?.grade || 10, progress: 75, teacher: 'Physical Sciences Educator', assignmentsDue: 0 },
    { name: 'Life Sciences', code: 'LFSC10', grade: profile?.grade || 10, progress: 90, teacher: 'Life Sciences Educator', assignmentsDue: 0 },
    { name: 'English First Additional Language', code: 'EFAL10', grade: profile?.grade || 10, progress: 88, teacher: 'Languages Educator', assignmentsDue: 0 },
    { name: 'Geography', code: 'GEOG10', grade: profile?.grade || 10, progress: 70, teacher: 'Geography Educator', assignmentsDue: 0 },
    { name: 'Life Orientation', code: 'LFOR10', grade: profile?.grade || 10, progress: 95, teacher: 'Life Orientation Educator', assignmentsDue: 0 }
  ];

  const displaySubjects = subjects.length > 0 ? subjects : defaultStreamSubjects;

  const subjectCategories = [
    { id: 'all', label: 'All Subjects' },
    { id: 'sciences', label: 'Sciences & Math' },
    { id: 'languages', label: 'Languages' },
    { id: 'commerce', label: 'Commerce' },
    { id: 'humanities', label: 'Humanities & Arts' },
  ];

  const filteredSubjects = useMemo(() => {
    if (!Array.isArray(displaySubjects)) return [];
    const query = (subjectSearchQuery || '').trim().toLowerCase();

    return displaySubjects.filter((sub) => {
      if (!sub) return false;
      const subName = safeString(sub.name, 'Subject');
      const subCode = safeString(sub.code, '');
      const subTeacher = safeString(sub.teacher, '');
      const meta = getSubjectMetadata(subName);

      const matchesCategory =
        subjectCategoryFilter === 'all' ||
        meta.category === subjectCategoryFilter ||
        (subjectCategoryFilter === 'sciences' && meta.category === 'sciences') ||
        (subjectCategoryFilter === 'humanities' && (meta.category === 'humanities' || meta.category === 'services' || meta.category === 'general'));

      const matchesSearch =
        !query ||
        subName.toLowerCase().includes(query) ||
        subCode.toLowerCase().includes(query) ||
        subTeacher.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [displaySubjects, subjectCategoryFilter, subjectSearchQuery]);

  const unreadAnnouncements = Array.isArray(announcements)
    ? announcements.filter(a => a && a.id != null && !readIds.includes(a.id))
    : [];

  if (loading) {
    return <LearnerOverviewSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-20">
      
      {/* 1. ENROLLED SUBJECTS HUB - CUSTOMIZABLE PRESENTATION & PICTURES */}
      <section className="space-y-4">
        {/* Section Header with Title & View Mode Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold font-display text-white tracking-tight">
                  My Enrolled Subjects
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {filteredSubjects.length} of {displaySubjects.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                CAPS curriculum courses with dedicated past papers, AI revision, and study resources
              </p>
            </div>
          </div>

          {/* View Mode Switcher (Visual Hero Cards / Grid / Compact / List) */}
          <div className="flex items-center gap-1 p-1 bg-[#EDF4F7] dark:bg-[#0A121A] rounded-2xl border border-slate-200/90 dark:border-[#1B2E3D] shrink-0 self-start md:self-center">
            <button
              onClick={() => handleSetSubjectViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subjectViewMode === 'visual'
                  ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Visual Showcase with Subject Pictures"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visual Cards</span>
            </button>
            <button
              onClick={() => handleSetSubjectViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subjectViewMode === 'grid'
                  ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Responsive Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => handleSetSubjectViewMode('compact')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subjectViewMode === 'compact'
                  ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Compact Tiles"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tiles</span>
            </button>
            <button
              onClick={() => handleSetSubjectViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subjectViewMode === 'list'
                  ? 'bg-[#13C8D9] text-[#0A121A] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Detailed List"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {subjectCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSubjectCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  subjectCategoryFilter === cat.id
                    ? 'bg-[#13C8D9] text-[#0A121A] border-[#13C8D9] shadow-xs'
                    : 'bg-[#EDF4F7] dark:bg-[#121F2C] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 border-slate-200/60 dark:border-[#1B2E3D]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Subject Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={subjectSearchQuery}
              onChange={(e) => setSubjectSearchQuery(e.target.value)}
              placeholder="Find subject..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#EDF4F7] dark:bg-[#0A121A] border border-slate-200/90 dark:border-[#1B2E3D] text-xs text-[#1C252C] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#13C8D9] transition-all"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: VISUAL HERO CARDS WITH HIGH-RESOLUTION SUBJECT PICTURES     */}
        {/* ========================================================================= */}
        {(subjectViewMode === 'visual' || !['grid', 'compact', 'list'].includes(subjectViewMode)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSubjects.map((sub, idx) => {
              const name = safeString(sub.name, 'Subject');
              const code = safeString(sub.code, `${name.slice(0, 4).toUpperCase()}10`);
              const teacher = safeString(sub.teacher, 'Subject Educator');
              const progress = safeNumber(sub.progress, 75);
              const grade = safeNumber(sub.grade, 10);
              const assignmentsDue = safeNumber(sub.assignmentsDue, 0);
              const meta = getSubjectMetadata(name);

              return (
                <div
                  key={idx}
                  className="rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/50 transition-all shadow-xl overflow-hidden flex flex-col justify-between group card-interactive animated-border-card relative"
                >
                  {/* Subject Picture Hero Header */}
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={meta.imageUrl}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* Atmospheric Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/50 to-transparent" />

                    {/* Wave Cut Mask over Image Bottom */}
                    <div className="absolute -bottom-0.5 inset-x-0 pointer-events-none">
                      <svg viewBox="0 0 500 40" preserveAspectRatio="none" className="w-full h-6 text-surface-dark fill-current">
                        <path d="M0,15 C150,40 350,-10 500,20 L500,40 L0,40 Z" />
                      </svg>
                    </div>

                    {/* Category & Status Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${meta.accent?.badge || 'bg-brand-500/20 text-brand-300 border-brand-500/30'}`}>
                        {meta.categoryLabel || 'CAPS Subject'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md border border-white/10">
                          Grade {grade}
                        </span>
                        {assignmentsDue > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/80 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                            <FileText className="w-3 h-3" />
                            {assignmentsDue} Due
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subject Title Over Image */}
                    <div className="absolute bottom-2 inset-x-4">
                      <span className="text-[10px] font-mono text-cyan-300 tracking-wider">
                        {code}
                      </span>
                      <h3
                        onClick={() => onNavigateTab('subjects', name)}
                        className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer leading-snug drop-shadow-md line-clamp-1"
                        title={`Open ${name} Workspace`}
                      >
                        {name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body: Teacher Info & Curriculum Progress */}
                  <div className="p-4 pt-1 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <User className="w-3.5 h-3.5 text-brand-400" />
                          <span>{teacher}</span>
                        </span>
                        <span className="font-bold text-emerald-400">{progress}% Mastery</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Subject Quick Actions */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => openResourcesModal(name, grade)}
                          className="px-2 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold border border-white/5 transition-colors text-center cursor-pointer"
                          title="Textbooks & Notes"
                        >
                          Resources
                        </button>
                        <button
                          onClick={() => onNavigateTab('ai-tutor')}
                          className="px-2 py-1.5 rounded-xl bg-surface-darker hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 text-[11px] font-semibold border border-cyan-500/20 transition-colors text-center flex items-center justify-center gap-1 cursor-pointer"
                          title="Ask AI Tutor"
                        >
                          <Bot className="w-3 h-3 text-cyan-400" />
                          <span>AI Tutor</span>
                        </button>
                        <button
                          onClick={() => onNavigateTab('performance')}
                          className="px-2 py-1.5 rounded-xl bg-surface-darker hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-[11px] font-semibold border border-emerald-500/20 transition-colors text-center cursor-pointer"
                          title="View Marks"
                        >
                          Marks
                        </button>
                      </div>

                      <button
                        onClick={() => onNavigateTab('subjects', name)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-95 text-white ${
                          name.toLowerCase().includes('math') ? 'cta-math' :
                          (name.toLowerCase().includes('physic') || name.toLowerCase().includes('chem')) ? 'cta-physical' :
                          (name.toLowerCase().includes('life scien') || name.toLowerCase().includes('bio')) ? 'cta-life-sciences' :
                          (name.toLowerCase().includes('english') || name.toLowerCase().includes('sepedi') || name.toLowerCase().includes('afrikaans') || name.toLowerCase().includes('zulu')) ? 'cta-languages' :
                          name.toLowerCase().includes('geog') ? 'cta-geography' :
                          name.toLowerCase().includes('orient') ? 'cta-life-orientation' :
                          (name.toLowerCase().includes('account') || name.toLowerCase().includes('bus') || name.toLowerCase().includes('econ')) ? 'cta-commerce' :
                          'cta-math'
                        }`}
                      >
                        <span>Open {name} Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: RESPONSIVE GRID CARDS WITH COMPACT IMAGE THUMBNAIL          */}
        {/* ========================================================================= */}
        {subjectViewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((sub, idx) => {
              const name = safeString(sub.name, 'Subject');
              const code = safeString(sub.code, `${name.slice(0, 4).toUpperCase()}10`);
              const teacher = safeString(sub.teacher, 'Subject Educator');
              const progress = safeNumber(sub.progress, 75);
              const meta = getSubjectMetadata(name);

              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-surface-dark border border-white/10 hover:border-brand-500/50 p-4 transition-all shadow-md flex items-center gap-3.5 group card-interactive"
                >
                  <img
                    src={meta.imageUrl}
                    alt={name}
                    className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono text-cyan-400">{code}</span>
                      <span className="text-[10px] font-bold text-emerald-400">{progress}%</span>
                    </div>
                    <h3
                      onClick={() => onNavigateTab('subjects', name)}
                      className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer truncate"
                    >
                      {name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">{teacher}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onNavigateTab('ai-tutor')}
                        className="text-[10.5px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        AI Tutor
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => onNavigateTab('subjects', name)}
                        className="text-[10.5px] font-bold text-brand-400 hover:text-brand-300 cursor-pointer"
                      >
                        Open Workspace →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 3: COMPACT APP TILES                                           */}
        {/* ========================================================================= */}
        {subjectViewMode === 'compact' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredSubjects.map((sub, idx) => {
              const name = safeString(sub.name, 'Subject');
              const progress = safeNumber(sub.progress, 75);
              const meta = getSubjectMetadata(name);

              return (
                <div
                  key={idx}
                  onClick={() => onNavigateTab('subjects', name)}
                  className="p-3 rounded-2xl bg-surface-dark border border-white/10 hover:border-brand-500/50 hover:bg-surface-darker transition-all cursor-pointer flex flex-col items-center text-center gap-2.5 group card-interactive"
                >
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                    <img
                      src={meta.imageUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {name}
                    </p>
                    <span className="text-[10px] text-slate-400">{progress}% Mastery</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 4: DETAILED LIST VIEW                                          */}
        {/* ========================================================================= */}
        {subjectViewMode === 'list' && (
          <div className="space-y-2">
            {filteredSubjects.map((sub, idx) => {
              const name = safeString(sub.name, 'Subject');
              const code = safeString(sub.code, `${name.slice(0, 4).toUpperCase()}10`);
              const teacher = safeString(sub.teacher, 'Subject Educator');
              const progress = safeNumber(sub.progress, 75);
              const grade = safeNumber(sub.grade, 10);
              const meta = getSubjectMetadata(name);

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-surface-dark border border-white/10 hover:border-brand-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={meta.imageUrl}
                      alt={name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-cyan-400">{code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                          Grade {grade}
                        </span>
                      </div>
                      <h3
                        onClick={() => onNavigateTab('subjects', name)}
                        className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer truncate"
                      >
                        {name}
                      </h3>
                      <p className="text-[11px] text-slate-400">{teacher}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right hidden md:block">
                      <span className="text-xs font-bold text-emerald-400">{progress}%</span>
                      <p className="text-[10px] text-slate-500">Curriculum Progress</p>
                    </div>
                    <button
                      onClick={() => openResourcesModal(name, grade)}
                      className="px-2.5 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/5 cursor-pointer"
                    >
                      Resources
                    </button>
                    <button
                      onClick={() => onNavigateTab('subjects', name)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredSubjects.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2 rounded-2xl bg-surface-dark border border-white/5">
            <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
            <p>No subjects found matching &ldquo;{subjectSearchQuery}&rdquo;.</p>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* BOTTOM QUICK STATUS CARDS (Matching Reference Design)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigateTab('timetable')}
          className="p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 transition-all flex items-center justify-between cursor-pointer group shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Today&apos;s Classes
              </p>
              <p className="text-xs text-slate-400">View your active timetable and venues</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={() => onNavigateTab('ai-tutor')}
          className="p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-purple-500/40 transition-all flex items-center justify-between cursor-pointer group shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                Need Help?
              </p>
              <p className="text-xs text-slate-400">Ask our 24/7 AI Study Tutor</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* 2. MORE MODULES QUICK LAUNCH BANNER */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-surface-dark via-surface-darker to-surface-dark border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Looking for Marks, Report Cards, Bursaries, or Sports?
            </h3>
            <p className="text-xs text-slate-400">
              All 18 student life and administrative modules have moved to the dedicated &ldquo;More&rdquo; hub.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('more')}
          className="px-4 py-2 rounded-xl bg-[#13C8D9] hover:bg-[#18E2EC] text-[#0A121A] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span>Explore More Modules</span>
          <ArrowRight className="w-4 h-4 text-[#0A121A]" />
        </button>
      </div>


      {/* 3. TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Tasks & AI Topics */}
        <div className="space-y-4">
          
          {/* Pending Tasks */}
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3 animated-border-card">
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
                      <h4 className="text-xs font-bold text-white">
                        {safeString(task.title || task.assignment_title, 'Homework Assignment')}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {safeString(task.subject, 'Core Subject')} • Due {task.due_date ? (() => {
                          try {
                            const d = new Date(task.due_date);
                            return isNaN(d.getTime()) ? 'This Week' : d.toLocaleDateString();
                          } catch {
                            return 'This Week';
                          }
                        })() : 'This Week'}
                      </p>
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
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3 animated-border-card">
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
                <button className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-semibold transition-all cursor-pointer">
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
                <button className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-semibold transition-all cursor-pointer">
                  Start Quiz
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Performance & Announcements */}
        <div className="space-y-4">
          
          {/* Performance Summary */}
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3 animated-border-card">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Subject Performance Summary</span>
              </h3>
              <button
                onClick={() => onNavigateTab('performance')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                View Full Marks
              </button>
            </div>

            <div className="space-y-2.5">
              {displaySubjects.slice(0, 4).map((sub, idx) => {
                const subName = safeString(sub.name, 'Subject');
                const progress = Math.min(100, Math.max(0, safeNumber(sub.progress, 75)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">{subName}</span>
                      <span className="font-bold text-emerald-400">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent School Notices */}
          <div className="rounded-2xl bg-surface-dark border border-white/10 p-5 shadow-sm space-y-3 animated-border-card">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-violet-400" />
                <span>Recent Announcements</span>
              </h3>
              <button
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
              >
                Noticeboard
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                        {ann.priority === 'Urgent' ? 'Urgent Notice' : safeString(ann.category, 'School Broadcast')}
                      </span>
                      <button
                        onClick={(e) => dismissAnnouncement(e, ann.id)}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-white">
                      {safeString(ann.title, 'Important School Update')}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {safeString(ann.content || ann.message, 'Check notice board for details.')}
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
                    {safeString(selectedResourceSubject.name)} Resources
                  </h3>
                  <p className="text-xs text-slate-400">Grade {safeNumber(selectedResourceSubject.grade)} Textbooks & Study Guides</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResourceSubject(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                      <h4 className="text-xs font-bold text-white">{safeString(res.title || res.file_name, 'Study Material')}</h4>
                      <p className="text-[11px] text-slate-400">{safeString(res.category, 'Textbook / Notes')}</p>
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
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
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
