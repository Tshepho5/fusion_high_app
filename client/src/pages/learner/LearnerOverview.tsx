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

type SubjectViewMode = 'grid' | 'list';

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

  // Subject Presentation Mode (Grid / List matching reference image)
  const [subjectViewMode, setSubjectViewMode] = useState<SubjectViewMode>(() => {
    try {
      const saved = localStorage.getItem('learner_subject_view_mode');
      if (saved === 'grid' || saved === 'list') {
        return saved;
      }
    } catch {}
    return 'grid';
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
      
      {/* 1. ENROLLED SUBJECTS HUB - MATCHING REFERENCE DESIGN */}
      <section className="space-y-4">
        {/* Section Header with Title & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold tracking-wider text-sky-600 dark:text-sky-400 uppercase flex items-center gap-1.5 mb-1">
              WELCOME BACK, LEARNER!
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              My Enrolled Subjects
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Access your subjects, resources and stay on track with your learning journey.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            {/* Quick Search Pill */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={subjectSearchQuery}
                onChange={(e) => setSubjectSearchQuery(e.target.value)}
                placeholder="Search subject..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all"
              />
            </div>

            {/* View Mode Switcher (Grid & List) */}
            <div className="flex items-center p-1 bg-white dark:bg-surface-dark rounded-full border border-slate-200/90 dark:border-white/10 shadow-sm">
              <button
                onClick={() => handleSetSubjectViewMode('grid')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  subjectViewMode === 'grid'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => handleSetSubjectViewMode('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  subjectViewMode === 'list'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {subjectCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSubjectCategoryFilter(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                subjectCategoryFilter === cat.id
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-white/10'
              }`}
            >
              {cat.id === 'all' && <LayoutGrid className="w-3.5 h-3.5" />}
              {cat.id === 'sciences' && <Sparkles className="w-3.5 h-3.5" />}
              {cat.id === 'languages' && <BookOpen className="w-3.5 h-3.5" />}
              {cat.id === 'commerce' && <TrendingUp className="w-3.5 h-3.5" />}
              {cat.id === 'humanities' && <Compass className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE: GRID (3 Columns x 2 Rows with Wave Cut and Rich Hero)         */}
        {/* ========================================================================= */}
        {subjectViewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((sub, idx) => {
              const name = safeString(sub.name, 'Subject');
              const code = safeString(sub.code, `${name.slice(0, 4).toUpperCase()}12`);
              const teacher = safeString(sub.teacher, 'To Be Assigned');
              const progress = safeNumber(sub.progress, 10);
              const grade = safeNumber(sub.grade, 12);
              const meta = getSubjectMetadata(name);
              const shortName = name.toLowerCase().includes('english') ? 'English' : name;

              return (
                <div
                  key={idx}
                  className="rounded-[22px] bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-sky-500/40 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-xl overflow-hidden flex flex-col justify-between group relative text-slate-900 dark:text-white"
                >
                  {/* Subject Picture Hero Header */}
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={meta.imageUrl}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* Top gradient for tag readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-transparent" />

                    {/* Organic Wave Cut Mask over Image Bottom */}
                    <div className="absolute -bottom-0.5 inset-x-0 pointer-events-none z-10">
                      <svg viewBox="0 0 500 36" preserveAspectRatio="none" className="w-full h-6 text-white dark:text-surface-dark fill-current">
                        <path d="M0,12 C150,34 350,-6 500,16 L500,36 L0,36 Z" />
                      </svg>
                    </div>

                    {/* Category & Status Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-20">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/55 text-white backdrop-blur-md border border-white/20 shadow-sm">
                        {meta.categoryLabel || 'CAPS Subject'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                        Grade {grade}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Code, Title, Educator & Progress */}
                  <div className="p-5 pt-2 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold font-mono text-sky-600 dark:text-sky-400 tracking-wider">
                        {code}
                      </div>
                      <h3
                        onClick={() => onNavigateTab('subjects', name)}
                        className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors cursor-pointer leading-tight line-clamp-1 mt-0.5"
                        title={`Open ${name} Workspace`}
                      >
                        {name}
                      </h3>

                      <div className="flex items-center justify-between text-xs mt-3">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                          <User className="w-3.5 h-3.5 text-sky-500" />
                          <span>{teacher}</span>
                        </span>
                        <span className="font-extrabold text-sky-600 dark:text-sky-400">{progress}% Mastery</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Action Pills Row */}
                    <div className="space-y-2.5 pt-2">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => openResourcesModal(name, grade)}
                          className="px-2 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200/80 dark:border-white/10 transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
                          title="Resources"
                        >
                          <BookMarked className="w-3 h-3 text-sky-500" />
                          <span>Resources</span>
                        </button>
                        <button
                          onClick={() => onNavigateTab('ai-tutor')}
                          className="px-2 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200/80 dark:border-white/10 transition-colors text-center flex items-center justify-center gap-1 cursor-pointer"
                          title="Ask AI Tutor"
                        >
                          <Bot className="w-3 h-3 text-sky-500" />
                          <span>AI Tutor</span>
                        </button>
                        <button
                          onClick={() => onNavigateTab('performance')}
                          className="px-2 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200/80 dark:border-white/10 transition-colors text-center flex items-center justify-center gap-1 cursor-pointer"
                          title="View Marks"
                        >
                          <Award className="w-3 h-3 text-sky-500" />
                          <span>Marks</span>
                        </button>
                      </div>

                      {/* Full-width Workspace CTA button with subject-specific gradient */}
                      <button
                        onClick={() => onNavigateTab('subjects', name)}
                        className={`w-full py-2.5 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-95 text-white ${
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
                        <span>Open {shortName} Workspace</span>
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
        {/* VIEW MODE: LIST                                                           */}
        {/* ========================================================================= */}
        {subjectViewMode === 'list' && (
          <div className="space-y-3">
            {filteredSubjects.map((sub, idx) => {
              const name = safeString(sub.name, 'Subject');
              const code = safeString(sub.code, `${name.slice(0, 4).toUpperCase()}12`);
              const teacher = safeString(sub.teacher, 'To Be Assigned');
              const progress = safeNumber(sub.progress, 10);
              const grade = safeNumber(sub.grade, 12);
              const meta = getSubjectMetadata(name);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-sky-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={meta.imageUrl}
                      alt={name}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200/80 dark:border-white/10 shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-extrabold text-sky-600 dark:text-sky-400">{code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-semibold">
                          Grade {grade}
                        </span>
                      </div>
                      <h3
                        onClick={() => onNavigateTab('subjects', name)}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-sky-600 cursor-pointer truncate mt-0.5"
                      >
                        {name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{teacher}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right hidden md:block">
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{progress}% Mastery</span>
                      <p className="text-[10px] text-slate-400">Curriculum Progress</p>
                    </div>
                    <button
                      onClick={() => openResourcesModal(name, grade)}
                      className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Resources
                    </button>
                    <button
                      onClick={() => onNavigateTab('subjects', name)}
                      className="px-4 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/80 dark:border-white/5">
            <BookOpen className="w-8 h-8 mx-auto text-slate-400" />
            <p>No subjects found matching &ldquo;{subjectSearchQuery}&rdquo;.</p>
          </div>
        )}

        {/* Bottom Quick Status Cards (Matching Reference Design) */}
        <div className="flex justify-end items-center gap-4 mt-6 flex-wrap">
          <div
            onClick={() => onNavigateTab('timetable')}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-sky-500/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="w-9 h-9 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-base shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Today&apos;s Classes
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">You have 3 classes today</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sky-500 ml-1" />
          </div>

          <div
            onClick={() => onNavigateTab('ai-tutor')}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 hover:border-purple-500/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Need Help?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Ask our AI Tutor</p>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-500 ml-1" />
          </div>
        </div>
      </section>

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
