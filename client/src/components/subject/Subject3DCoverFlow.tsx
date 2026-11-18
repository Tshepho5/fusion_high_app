import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  MoreHorizontal,
  Heart,
  Sparkles,
  BookOpen,
  FileText,
  Clock,
  Users,
  Compass,
  GraduationCap,
  Award,
  Layers,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { getSubjectMetadata } from '../../utils/subjectImages';
import { useTheme } from '../../context/ThemeContext';

export interface CoverFlowSubjectItem {
  id?: string | number;
  name: string;
  code?: string;
  grade?: number | string;
  stream?: string;
  category?: string;
  teacher?: string;
  teacher_name?: string;
  learner_count?: number;
  classmates_count?: number;
  average_mark?: number | null;
  pass_rate?: number | null;
  mark?: number | null;
  term_mark?: number | null;
  percentage?: number | null;
  progress?: number;
  assignments_due?: number;
  resources_count?: number;
  description?: string;
  image?: string;
  raw?: any;
}

interface Subject3DCoverFlowProps {
  subjects: any[];
  role?: 'learner' | 'principal' | 'teacher';
  onOpenSubject: (subject: any) => void;
  onAction?: (action: 'ai-tutor' | 'past-papers' | 'resources' | 'focus-timer' | 'marks' | 'reports', subject: any) => void;
  className?: string;
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export const Subject3DCoverFlow: React.FC<Subject3DCoverFlowProps> = ({
  subjects,
  role = 'learner',
  onOpenSubject,
  onAction,
  className = '',
  initialIndex = 0,
  title,
  subtitle,
}) => {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  // Normalize subjects into consistent items
  const normalizedSubjects = useMemo<CoverFlowSubjectItem[]>(() => {
    if (!Array.isArray(subjects) || subjects.length === 0) return [];

    return subjects.map((sub, idx) => {
      const name = typeof sub === 'string' ? sub : (sub.name || sub.subject || sub.subject_name || `Subject ${idx + 1}`);
      const meta = getSubjectMetadata(name);
      const grade = sub.grade || sub.standard || (role === 'learner' ? 10 : 11);
      const code = sub.code || (name.substring(0, 4) + grade).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const teacher = sub.teacher || sub.teacher_name || (role === 'principal' ? 'Department Head' : 'Subject Specialist');
      const stream = sub.stream || meta.categoryLabel || 'General CAPS';
      const markVal = sub.average_mark ?? sub.term_mark ?? sub.mark ?? sub.percentage ?? null;
      const passRate = sub.pass_rate ?? (markVal !== null ? (markVal >= 40 ? 82 : 45) : null);
      const learnerCount = sub.learner_count ?? sub.classmates_count ?? 28;
      const resourcesCount = sub.resources_count ?? 12;
      const assignmentsDue = sub.assignments_due ?? 0;
      const progress = sub.progress ?? (markVal !== null ? markVal : 65);

      // Description generator if none provided
      const desc = sub.description || (
        meta.category === 'sciences'
          ? `Comprehensive CAPS syllabus exploring scientific inquiry, empirical investigation, and core principles for Grade ${grade}.`
          : meta.category === 'commerce'
          ? `Strategic financial, management, and economic principles aligned with Department of Basic Education CAPS curriculum.`
          : meta.category === 'languages'
          ? `Literary analysis, formal writing, comprehension, and language structures compliant with national standards.`
          : `Core Grade ${grade} academic curriculum designed for mastery, exam readiness, and continuous assessment.`
      );

      return {
        id: sub.id ?? `sub-${idx}-${name}`,
        name,
        code,
        grade,
        stream,
        category: meta.category,
        teacher,
        teacher_name: teacher,
        learner_count: learnerCount,
        classmates_count: learnerCount,
        average_mark: markVal,
        pass_rate: passRate,
        mark: markVal,
        term_mark: markVal,
        percentage: markVal,
        progress,
        assignments_due: assignmentsDue,
        resources_count: resourcesCount,
        description: desc,
        image: sub.image || sub.cover_image || meta.imageUrl,
        raw: sub,
      };
    });
  }, [subjects, role]);

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (initialIndex >= 0 && initialIndex < normalizedSubjects.length) return initialIndex;
    return Math.floor(normalizedSubjects.length / 2);
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [activeQuickTab, setActiveQuickTab] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);
  const autoPlayTimer = useRef<any>(null);

  // Keep active index in bounds
  useEffect(() => {
    if (activeIndex >= normalizedSubjects.length && normalizedSubjects.length > 0) {
      setActiveIndex(normalizedSubjects.length - 1);
    }
  }, [normalizedSubjects.length, activeIndex]);

  const activeSubject = normalizedSubjects[activeIndex] || normalizedSubjects[0];

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % (normalizedSubjects.length || 1));
  }, [normalizedSubjects.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + normalizedSubjects.length) % (normalizedSubjects.length || 1));
  }, [normalizedSubjects.length]);

  // Autoplay cycle
  useEffect(() => {
    if (!isPlaying || normalizedSubjects.length <= 1) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      return;
    }

    autoPlayTimer.current = setInterval(() => {
      handleNext();
    }, 3800);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPlaying, handleNext, normalizedSubjects.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid stealing input while typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === ' ' && e.target === containerRef.current) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'Enter' && e.target === containerRef.current) {
        e.preventDefault();
        if (activeSubject) onOpenSubject(activeSubject.raw || activeSubject);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, activeSubject, onOpenSubject]);

  // Touch and Mouse drag gesture handling
  const handlePointerDown = (clientX: number) => {
    dragStartX.current = clientX;
    isDragging.current = true;
  };

  const handlePointerUp = (clientX: number) => {
    if (!isDragging.current || dragStartX.current === null) return;
    const diff = clientX - dragStartX.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) handlePrev();
      else handleNext();
    }
    dragStartX.current = null;
    isDragging.current = false;
  };

  const toggleFavorite = (subjectName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteMap((prev) => ({
      ...prev,
      [subjectName]: !prev[subjectName],
    }));
  };

  if (normalizedSubjects.length === 0) {
    return (
      <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-surface-dark border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
        <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
        <p className="font-semibold text-sm">No subjects available for 3D Perspective View.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`relative w-full rounded-3xl overflow-hidden focus:outline-none transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-[#0b0f14] via-[#090d12] to-[#0d131a] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] text-white'
          : 'bg-gradient-to-b from-slate-100/95 via-slate-50 to-slate-100/95 border border-slate-300/80 shadow-[0_15px_40px_-10px_rgba(15,23,42,0.12)] text-slate-900'
      } ${className}`}
      style={{
        backgroundImage: isDark
          ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.12), transparent), radial-gradient(ellipse 60% 40% at 50% 120%, rgba(168, 85, 247, 0.08), transparent)'
          : 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 165, 233, 0.10), transparent), radial-gradient(ellipse 60% 40% at 50% 120%, rgba(99, 102, 241, 0.06), transparent)',
      }}
    >
      {/* Subtle Polished Stage Background Grids */}
      <div className={`absolute inset-0 [background-size:24px_24px] pointer-events-none ${isDark ? 'bg-[radial-gradient(#ffffff08_1px,transparent_1px)] opacity-40' : 'bg-[radial-gradient(#00000008_1px,transparent_1px)] opacity-60'}`} />

      {/* Header Bar if Title is Provided */}
      {(title || subtitle) && (
        <div className="relative z-20 px-6 sm:px-8 pt-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/5">
          <div>
            {title && (
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <span>{title}</span>
              </h2>
            )}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 font-mono text-[11px] text-slate-800 dark:text-cyan-300 font-bold">
              {activeIndex + 1} of {normalizedSubjects.length}
            </span>
          </div>
        </div>
      )}

      {/* Main 3D Perspective Stage */}
      <div
        className="relative w-full h-[520px] sm:h-[580px] md:h-[620px] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 48%',
        }}
        onMouseDown={(e) => handlePointerDown(e.clientX)}
        onMouseUp={(e) => handlePointerUp(e.clientX)}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchEnd={(e) => handlePointerUp(e.changedTouches[0].clientX)}
      >
        {/* Left Vertical Floating Action Pill Dock (matching reference screenshot) */}
        <div
          className="absolute left-3 sm:left-6 z-40 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 p-2 rounded-full bg-white/95 dark:bg-[#141b22]/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl transition-transform hover:scale-105"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Notes & Past Papers Action */}
          <button
            type="button"
            onClick={() => onAction ? onAction('resources', activeSubject.raw || activeSubject) : onOpenSubject(activeSubject.raw || activeSubject)}
            className="p-2.5 rounded-full text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group relative cursor-pointer"
            title="Notes, Textbooks & Curriculum Files"
          >
            <FileText className="w-4 h-4" />
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-white/10 z-50">
              Study Files & Notes
            </span>
          </button>

          {/* Favorite / Priority Goal Action */}
          <button
            type="button"
            onClick={(e) => toggleFavorite(activeSubject.name, e)}
            className={`p-2.5 rounded-full transition-all group relative cursor-pointer ${
              favoriteMap[activeSubject.name]
                ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/15'
                : 'text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Mark as Target Subject"
          >
            <Heart className={`w-4 h-4 ${favoriteMap[activeSubject.name] ? 'fill-rose-500 text-rose-500' : ''}`} />
            {favoriteMap[activeSubject.name] && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-white/10 z-50">
              {favoriteMap[activeSubject.name] ? 'Starred Subject' : 'Add to Favorites'}
            </span>
          </button>

          {/* Educator / Learners Profile */}
          <button
            type="button"
            onClick={() => onAction ? onAction('marks', activeSubject.raw || activeSubject) : onOpenSubject(activeSubject.raw || activeSubject)}
            className="p-2.5 rounded-full text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group relative cursor-pointer"
            title="Educator & Classmates Roster"
          >
            <Users className="w-4 h-4" />
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-white/10 z-50">
              {activeSubject.teacher} • {activeSubject.learner_count} Learners
            </span>
          </button>

          {/* Focus Timer / Sound */}
          <button
            type="button"
            onClick={() => onAction ? onAction('focus-timer', activeSubject.raw || activeSubject) : onOpenSubject(activeSubject.raw || activeSubject)}
            className="p-2.5 rounded-full text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group relative cursor-pointer"
            title="Focus Study Timer"
          >
            <Clock className="w-4 h-4" />
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-white/10 z-50">
              Pomodoro Focus Timer
            </span>
          </button>

          {/* Ask AI Tutor */}
          <button
            type="button"
            onClick={() => onAction ? onAction('ai-tutor', activeSubject.raw || activeSubject) : onOpenSubject(activeSubject.raw || activeSubject)}
            className="p-2.5 rounded-full text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all group relative cursor-pointer"
            title="Ask AI Tutor"
          >
            <Sparkles className="w-4 h-4" />
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-white/10 z-50">
              Ask AI Tutor with CAPS
            </span>
          </button>
        </div>

        {/* 3D Cards Perspective Track */}
        <div
          className="relative w-full h-full flex items-center justify-center pointer-events-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {normalizedSubjects.map((sub, index) => {
            const offset = index - activeIndex;
            const absOffset = Math.abs(offset);

            // Hide cards that are far away for clean performance
            if (absOffset > 4) return null;

            const isCenter = offset === 0;

            // Perspective Calculations (matching reference screenshot curvature & depth)
            // Desktop horizontal stride: 175px, Mobile: 110px
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
            const stride = isMobile ? 100 : 175;
            
            let translateX = 0;
            let translateZ = 0;
            let rotateY = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 30;

            if (isCenter) {
              translateX = 0;
              translateZ = 90;
              rotateY = 0;
              scale = 1.05;
              opacity = 1;
              zIndex = 40;
            } else if (offset < 0) {
              // Left side cards: angled inwards with positive rotateY
              translateX = offset * stride - (isMobile ? 25 : 55);
              translateZ = -absOffset * 105;
              rotateY = Math.min(38, 26 + absOffset * 3);
              scale = Math.max(0.72, 1 - absOffset * 0.1);
              opacity = Math.max(0.18, 1 - absOffset * 0.22);
              zIndex = 30 - absOffset;
            } else {
              // Right side cards: angled inwards with negative rotateY
              translateX = offset * stride + (isMobile ? 25 : 55);
              translateZ = -absOffset * 105;
              rotateY = -Math.min(38, 26 + absOffset * 3);
              scale = Math.max(0.72, 1 - absOffset * 0.1);
              opacity = Math.max(0.18, 1 - absOffset * 0.22);
              zIndex = 30 - absOffset;
            }

            return (
              <div
                key={sub.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCenter) {
                    onOpenSubject(sub.raw || sub);
                  } else {
                    setActiveIndex(index);
                  }
                }}
                className={`absolute w-[270px] sm:w-[310px] md:w-[330px] h-[410px] sm:h-[460px] md:h-[490px] rounded-[28px] overflow-hidden pointer-events-auto cursor-pointer transition-all duration-500 ease-out flex flex-col justify-between group ${
                  isCenter
                    ? 'ring-1 ring-cyan-400/40 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(56,189,248,0.2)]'
                    : 'hover:brightness-110 shadow-2xl'
                }`}
                style={{
                  transform: `translate3d(${translateX}px, 0px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  background: '#0d131a',
                }}
              >
                {/* Background Poster Image */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <img
                    src={sub.image}
                    alt={sub.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Subtle Gradient Overlays for Cinematic Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30" />
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40" />
                </div>

                {/* Top Floating Chips (Expand & More Options) */}
                <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
                  {/* Expand / Open Subject Pill */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSubject(sub.raw || sub);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-xl border transition-all cursor-pointer ${
                      isCenter
                        ? 'bg-white/20 hover:bg-white/30 text-white border-white/25 shadow-lg'
                        : 'bg-black/50 text-slate-300 border-white/10'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-display">Expand</span>
                  </button>

                  {/* Options / Action Dots */}
                  <div className="flex items-center gap-1.5">
                    {sub.assignments_due && sub.assignments_due > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/80 text-white border border-rose-400/40 backdrop-blur-md animate-pulse">
                        {sub.assignments_due} Due
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(sub.name, e);
                      }}
                      className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white border border-white/10 backdrop-blur-xl transition-all cursor-pointer"
                      title="Quick Action"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom Card Content: Title, Index, Description, Metadata */}
                <div className="relative z-10 p-4 sm:p-6 space-y-2.5">
                  {/* Title & Index Counter (e.g. "Physical Sciences    3 / 7") */}
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight drop-shadow-md truncate">
                      {sub.name}
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-300 shrink-0">
                      {index + 1} / {normalizedSubjects.length}
                    </span>
                  </div>

                  {/* Syllabus / Subject Description Snippet */}
                  <p className="text-xs text-slate-300/90 line-clamp-2 leading-relaxed drop-shadow">
                    {sub.description}
                  </p>

                  {/* Location & Stream Pill Metadata (matching reference's coordinates/location look) */}
                  <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold truncate">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{sub.stream} • Grade {sub.grade}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span className="truncate">
                        👤 {sub.teacher}
                      </span>
                      {sub.average_mark !== null && sub.average_mark !== undefined ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                          {sub.average_mark}% Avg
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/10 shrink-0">
                          CAPS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Floating Control Dock (Directly matching reference screenshot) */}
        <div
          className="absolute bottom-4 sm:bottom-6 z-40 inset-x-0 flex items-center justify-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-full bg-white/95 dark:bg-[#141b22]/90 backdrop-blur-2xl border border-slate-300/90 dark:border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.8)] text-slate-900 dark:text-white">
            {/* Previous Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 sm:p-2.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
              title="Previous Subject"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Auto-Flow / Play Toggle */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 sm:p-2.5 rounded-full transition-all active:scale-95 cursor-pointer ${
                isPlaying
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan'
                  : 'hover:bg-slate-200/70 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isPlaying ? 'Pause Auto-Flow' : 'Play Auto-Flow'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              )}
            </button>

            {/* Active Subject Pill Preview (Thumbnail + Name + Rating / Grade + Subtitle) */}
            <div
              onClick={() => onOpenSubject(activeSubject.raw || activeSubject)}
              className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300/80 dark:border-white/10 transition-all cursor-pointer max-w-[200px] sm:max-w-[320px]"
              title={`Open ${activeSubject.name}`}
            >
              <img
                src={activeSubject.image}
                alt={activeSubject.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-cyan-500/50 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeSubject.name}
                  </h4>
                  {activeSubject.average_mark !== null && (
                    <span className="text-[10px] sm:text-xs font-black text-amber-500 dark:text-amber-400 shrink-0">
                      {activeSubject.average_mark}% ★
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Grade {activeSubject.grade} • {activeSubject.stream}
                </p>
              </div>
            </div>

            {/* Favorite Heart Button */}
            <button
              type="button"
              onClick={(e) => toggleFavorite(activeSubject.name, e)}
              className="p-2 sm:p-2.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-all active:scale-95 cursor-pointer"
              title="Add to Favorites"
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  favoriteMap[activeSubject.name] ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              className="p-2 sm:p-2.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
              title="Next Subject"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
