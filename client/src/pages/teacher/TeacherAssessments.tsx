import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacherService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertCircle,
  Award,
  TrendingUp,
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
  Users,
  Check,
  Filter,
  BarChart3,
  History,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';

export interface AssessmentScore {
  name: string;
  type: string;
  score: number;
  max_score: number;
  percentage: number;
  weight: number;
}

interface LearnerMarkRecord {
  id: number;
  full_name: string;
  surname: string;
  learner_number: string;
  grade: number;
  class_name: string;
  // Specific assessment components
  test1?: AssessmentScore | null;
  test2?: AssessmentScore | null;
  assignment?: AssessmentScore | null;
  project?: AssessmentScore | null;
  exam?: AssessmentScore | null;
  sba_mark?: number | null;
  exam_mark?: number | null;
  final_calculated_mark?: number | null;
  calculation_method?: string;
  assessments_count?: number;
  // Performance categories
  formal_mark: number; // Teacher entered formal test/exam mark (0-100)
  formal_task_name: string;
  term1_mark: number;
  term2_mark: number;
  term3_mark: number;
  ai_activities_mark: number; // In-app AI activities & quizzes average (0-100)
  ai_completed_count: number;
  // Mark entry state
  inputMark: number | '';
}

export const ASSESSMENT_COMPONENTS = [
  {
    key: 'test1' as const,
    label: 'Controlled Test 1',
    shortLabel: 'Test 1',
    nature: 'Formal SBA Test',
    defaultName: (t: string) => `${t} Controlled Test 1`,
    defaultTotal: 50,
    defaultWeight: 50,
    isFormal: true,
  },
  {
    key: 'test2' as const,
    label: 'Controlled Test 2',
    shortLabel: 'Test 2',
    nature: 'Formal SBA Test',
    defaultName: (t: string) => `${t} Controlled Test 2`,
    defaultTotal: 50,
    defaultWeight: 50,
    isFormal: true,
  },
  {
    key: 'assignment' as const,
    label: 'Term Assignment',
    shortLabel: 'Assignment',
    nature: 'Term Assignment',
    defaultName: (t: string) => `${t} Assignment`,
    defaultTotal: 50,
    defaultWeight: 30,
    isFormal: true,
  },
  {
    key: 'project' as const,
    label: 'Project / Investigation',
    shortLabel: 'Project',
    nature: 'Practical Project',
    defaultName: (t: string) => `${t} Practical Project`,
    defaultTotal: 50,
    defaultWeight: 40,
    isFormal: true,
  },
  {
    key: 'exam' as const,
    label: 'Controlled Examination',
    shortLabel: 'Exam',
    nature: 'Controlled Examination',
    defaultName: (t: string) => `${t} Controlled Examination`,
    defaultTotal: 100,
    defaultWeight: 100,
    isFormal: true,
  },
  {
    key: 'quiz' as const,
    label: 'Informal Practice Drill',
    shortLabel: 'Quiz',
    nature: 'Class Quiz',
    defaultName: (t: string) => `${t} Class Quiz`,
    defaultTotal: 30,
    defaultWeight: 0,
    isFormal: false,
  }
];

export const TeacherAssessments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const querySubject = searchParams.get('subject');
  const queryClass = searchParams.get('class');

  const [subjects, setSubjects] = useState<string[]>(querySubject ? [querySubject] : []);
  const [classes, setClasses] = useState<string[]>(queryClass ? [queryClass] : []);
  const [selectedSubject, setSelectedSubject] = useState<string>(querySubject || '');
  const [selectedClass, setSelectedClass] = useState<string>(queryClass || '');

  // Active Category View: 'formal' | 'term' | 'ai' | 'entry' | 'history'
  const [activeCategory, setActiveCategory] = useState<'formal' | 'term' | 'ai' | 'entry' | 'history'>('formal');

  // Mark Entry Form State
  const [term, setTerm] = useState('Term 3');
  const [selectedComponent, setSelectedComponent] = useState<'test1' | 'test2' | 'assignment' | 'project' | 'exam' | 'quiz'>('test1');
  const [assessmentName, setAssessmentName] = useState('Term 3 Controlled Test 1');
  const [isFormal, setIsFormal] = useState<boolean>(true);
  const [assessmentType, setAssessmentType] = useState<string>('Formal SBA Test');
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [weight, setWeight] = useState<number>(50);

  const [learners, setLearners] = useState<LearnerMarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History Marks State
  const [historyMarks, setHistoryMarks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState<number | null>(0);

  // Helper for CAPS level calculation
  const getCapsLevel = (percentage: number) => {
    if (percentage >= 80) return { level: 7, label: 'Outstanding (80-100%)', variant: 'emerald' as const };
    if (percentage >= 70) return { level: 6, label: 'Meritorious (70-79%)', variant: 'indigo' as const };
    if (percentage >= 60) return { level: 5, label: 'Substantial (60-69%)', variant: 'cyan' as const };
    if (percentage >= 50) return { level: 4, label: 'Adequate (50-59%)', variant: 'amber' as const };
    if (percentage >= 40) return { level: 3, label: 'Moderate (40-49%)', variant: 'amber' as const };
    if (percentage >= 30) return { level: 2, label: 'Elementary (30-39%)', variant: 'rose' as const };
    return { level: 1, label: 'Not Achieved (0-29%)', variant: 'rose' as const };
  };

  // 1. Load teacher assigned workload (strictly deduplicated and matching assigned subjects/grades)
  useEffect(() => {
    teacherService.getMySubjectsOverview()
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        if (list.length > 0) {
          const subNames = Array.from(new Set(list.map((c: any) => c.subject_name).filter(Boolean))) as string[];
          const classNames = Array.from(new Set(list.map((c: any) => c.class_name || `${c.grade}A`).filter(Boolean))) as string[];
          if (subNames.length > 0) {
            setSubjects(subNames);
            if (!querySubject || !subNames.includes(querySubject)) {
              setSelectedSubject(subNames[0]);
            }
          }
          if (classNames.length > 0) {
            setClasses(classNames);
            if (!queryClass || !classNames.includes(queryClass)) {
              setSelectedClass(classNames[0]);
            }
          }
          return;
        }
        return teacherService.getClasses();
      })
      .then((res: any) => {
        if (!res) return;
        const list = Array.isArray(res) ? res : [];
        if (list.length > 0) {
          const subNames = Array.from(new Set(list.map((c: any) => c.subject_name).filter(Boolean))) as string[];
          const classNames = Array.from(new Set(list.map((c: any) => c.name || c.class_name).filter(Boolean))) as string[];
          if (subNames.length > 0) {
            setSubjects(subNames);
            if (!selectedSubject) setSelectedSubject(subNames[0]);
          }
          if (classNames.length > 0) {
            setClasses(classNames);
            if (!selectedClass) setSelectedClass(classNames[0]);
          }
        }
      })
      .catch(() => {
        // Keeps empty if unassigned
      });
  }, [searchParams]);

  // 2. Load learners roster for selected class, subject, and term
  const fetchRoster = () => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);

    teacherService.getClassRoster({ class: selectedClass, subject: selectedSubject, term })
      .then((res: any) => {
        const roster = Array.isArray(res) ? res : res.roster || res.learners || [];
        setLearners(roster.map((s: any) => {
          const baseMark = s.final_calculated_mark !== null && s.final_calculated_mark !== undefined 
            ? Math.round(parseFloat(s.final_calculated_mark)) 
            : (s.current_mark !== null && s.current_mark !== undefined ? Math.round(parseFloat(s.current_mark)) : 0);

          const t1 = s.term1_mark !== undefined && s.term1_mark !== null ? Math.round(parseFloat(s.term1_mark)) : baseMark;
          const t2 = s.term2_mark !== undefined && s.term2_mark !== null ? Math.round(parseFloat(s.term2_mark)) : baseMark;
          const t3 = s.term3_mark !== undefined && s.term3_mark !== null ? Math.round(parseFloat(s.term3_mark)) : baseMark;
          const aiScore = s.ai_score !== undefined && s.ai_score !== null ? Math.round(parseFloat(s.ai_score)) : (baseMark > 0 ? baseMark : 0);

          // Find current input mark based on selected component
          let currentCompMark: number | '' = '';
          if (selectedComponent === 'test1' && s.test1?.score !== undefined) currentCompMark = s.test1.score;
          else if (selectedComponent === 'test2' && s.test2?.score !== undefined) currentCompMark = s.test2.score;
          else if (selectedComponent === 'assignment' && s.assignment?.score !== undefined) currentCompMark = s.assignment.score;
          else if (selectedComponent === 'project' && s.project?.score !== undefined) currentCompMark = s.project.score;
          else if (selectedComponent === 'exam' && s.exam?.score !== undefined) currentCompMark = s.exam.score;

          return {
            id: s.id || s.child_id,
            full_name: s.full_name || s.learner_name || s.name || 'Learner',
            surname: s.surname || s.learner_surname || '',
            learner_number: s.learner_number || `2026${String(s.id).padStart(3, '0')}`,
            grade: s.grade || parseInt(selectedClass.replace(/[^0-9]/g, ''), 10) || 10,
            class_name: s.class_name || selectedClass,
            test1: s.test1 || null,
            test2: s.test2 || null,
            assignment: s.assignment || null,
            project: s.project || null,
            exam: s.exam || null,
            sba_mark: s.sba_mark ?? null,
            exam_mark: s.exam_mark ?? null,
            final_calculated_mark: s.final_calculated_mark ?? null,
            calculation_method: s.calculation_method || 'Pending Teacher Submissions',
            assessments_count: s.assessments_count || 0,
            formal_mark: baseMark,
            formal_task_name: assessmentName,
            term1_mark: t1,
            term2_mark: t2,
            term3_mark: t3,
            ai_activities_mark: aiScore,
            ai_completed_count: s.ai_completed_count || 0,
            inputMark: currentCompMark,
          };
        }));
      })
      .catch((err) => {
        console.error('Error fetching class roster for assessments:', err);
        setError('Could not load class roster from database.');
        setLearners([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoster();
  }, [selectedClass, selectedSubject, term]);

  const handleSelectComponent = (compKey: 'test1' | 'test2' | 'assignment' | 'project' | 'exam' | 'quiz') => {
    setSelectedComponent(compKey);
    const comp = ASSESSMENT_COMPONENTS.find(c => c.key === compKey);
    if (!comp) return;

    setAssessmentType(comp.nature);
    setAssessmentName(comp.defaultName(term));
    setTotalMarks(comp.defaultTotal);
    setWeight(comp.defaultWeight);
    setIsFormal(comp.isFormal);

    // Update inputMarks for all learners based on selected component
    setLearners(prev => prev.map(l => {
      let mark: number | '' = '';
      if (compKey === 'test1' && l.test1?.score !== undefined) mark = l.test1.score;
      else if (compKey === 'test2' && l.test2?.score !== undefined) mark = l.test2.score;
      else if (compKey === 'assignment' && l.assignment?.score !== undefined) mark = l.assignment.score;
      else if (compKey === 'project' && l.project?.score !== undefined) mark = l.project.score;
      else if (compKey === 'exam' && l.exam?.score !== undefined) mark = l.exam.score;
      return { ...l, inputMark: mark };
    }));
  };

  const handleSelectTerm = (newTerm: string) => {
    setTerm(newTerm);
    const comp = ASSESSMENT_COMPONENTS.find(c => c.key === selectedComponent);
    if (comp) {
      setAssessmentName(comp.defaultName(newTerm));
    }
  };

  const fetchHistory = () => {
    setLoadingHistory(true);
    teacherService.getClassMarksHistory({ class: selectedClass, subject: selectedSubject, term })
      .then((res: any) => {
        setHistoryMarks(res?.history || []);
      })
      .catch((err: any) => {
        console.error('Failed to load marks history:', err);
      })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedClass, selectedSubject, term]);

  const handleInputChange = (id: number, val: string) => {
    const num = val === '' ? '' : Math.min(totalMarks, Math.max(0, parseInt(val) || 0));
    setLearners(prev =>
      prev.map(m => (m.id === id ? { ...m, inputMark: num } : m))
    );
  };

  const handleSaveMarks = async () => {
    if (!assessmentName.trim() || learners.length === 0) return;
    setSaving(true);
    setSavedSuccess(false);
    setError(null);

    try {
      await teacherService.saveClassMarks({
        assessment_name: assessmentName.trim(),
        assessment_type: assessmentType,
        is_formal: isFormal,
        weight: weight,
        customWeight: weight,
        subject: selectedSubject,
        class: selectedClass,
        term,
        total_mark: totalMarks,
        marks: learners.map(l => ({
          child_id: l.id,
          grade: l.inputMark === '' ? 0 : Math.round(((l.inputMark as number) / totalMarks) * 100),
          mark_obtained: l.inputMark === '' ? 0 : l.inputMark,
        }))
      });

      // Refresh class roster to recalculate SBA and Final marks dynamically
      fetchRoster();
      fetchHistory();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
      setActiveCategory('formal');
    } catch (e: any) {
      console.error('Error saving marks:', e);
      setError(e.response?.data?.error || 'Failed to save marks to database.');
    } finally {
      setSaving(false);
    }
  };

  // Dynamic Real-time Class Averages Calculations
  const formalAvg = useMemo(() => {
    if (learners.length === 0) return 0;
    const scores = learners.map(l => {
      if (l.final_calculated_mark !== null && l.final_calculated_mark !== undefined) {
        return l.final_calculated_mark;
      }
      return l.formal_mark;
    }).filter(m => m > 0);
    return scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length) : 0;
  }, [learners]);

  const termAvg = useMemo(() => {
    if (learners.length === 0) return 0;
    return Math.round(learners.reduce((acc, l) => acc + ((l.term1_mark + l.term2_mark + l.term3_mark) / 3), 0) / learners.length);
  }, [learners]);

  const aiAvg = useMemo(() => {
    if (learners.length === 0) return 0;
    return Math.round(learners.reduce((acc, l) => acc + l.ai_activities_mark, 0) / learners.length);
  }, [learners]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-brand-400" />
            <span>Learner Assessment & Performance Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Display class marks and student performance grouped into Formal Assessments, Term Reports, and In-App AI Activities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveCategory('entry')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-glow-indigo transition-all transform hover:scale-[1.02]"
          >
            <Save className="w-4 h-4" />
            <span>Capture New Marks</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Marks successfully committed to official DBE CAPS assessment records and updated in Formal Assessments!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
        </div>
      )}

      {/* Class & Subject Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-[10px]">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {classes.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono font-medium">
          {learners.length} Enrolled Learners in {selectedClass}
        </div>
      </div>

      {/* Class Averages Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Formal Assessments Average */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-dark to-surface-darker border border-indigo-500/20 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Formal Assessments Average
            </span>
            <Badge variant={getCapsLevel(formalAvg).variant} size="sm">
              Level {getCapsLevel(formalAvg).level}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{formalAvg}%</span>
            <span className="text-xs text-slate-400 font-medium">Class Tests & Tasks</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Recorded from formal SBA tests, controlled exams, and teacher mark schedules.
          </p>
        </div>

        {/* Card 2: Term Marks Cumulative Average */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-dark to-surface-darker border border-cyan-500/20 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Term Marks Average
            </span>
            <Badge variant={getCapsLevel(termAvg).variant} size="sm">
              Level {getCapsLevel(termAvg).level}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{termAvg}%</span>
            <span className="text-xs text-slate-400 font-medium">Cumulative Terms 1–3</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Weighted composite grade across Term 1, Term 2, and Term 3 report cycles.
          </p>
        </div>

        {/* Card 3: AI Activities Average */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-dark to-surface-darker border border-purple-500/20 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Activities Average
            </span>
            <Badge variant={getCapsLevel(aiAvg).variant} size="sm">
              Level {getCapsLevel(aiAvg).level}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{aiAvg}%</span>
            <span className="text-xs text-slate-400 font-medium">In-App Practice</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Interactive quizzes, smart tutor modules, and AI practice task completions.
          </p>
        </div>
      </div>

      {/* Category Performance Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('formal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'formal'
              ? 'bg-indigo-600 text-white shadow-glow-indigo'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Formal Assessments</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">{formalAvg}% Avg</span>
        </button>

        <button
          onClick={() => setActiveCategory('term')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'term'
              ? 'bg-cyan-600 text-white shadow-glow-cyan'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Term Marks Breakdown</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">{termAvg}% Avg</span>
        </button>

        <button
          onClick={() => setActiveCategory('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'ai'
              ? 'bg-purple-600 text-white shadow-glow-purple'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI In-App Activities</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">{aiAvg}% Avg</span>
        </button>

        <button
          onClick={() => setActiveCategory('entry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'entry'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Capture Marks Form</span>
        </button>

        <button
          onClick={() => setActiveCategory('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'history'
              ? 'bg-amber-600 text-white shadow-glow-amber'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>History Marks</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">{historyMarks.length} Records</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CATEGORY 1: FORMAL ASSESSMENTS & FINAL MARK CALCULATION SCHEDULE          */}
      {/* ========================================================================= */}
      {activeCategory === 'formal' && (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-5 animate-fade-in">
          {/* Header & Term Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>CAPS Formal Assessment Schedule — {selectedSubject} ({selectedClass})</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                      {term}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Continuous School-Based Assessment (SBA) tasks, tests, assignments, projects, and controlled examinations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Term Pills */}
              <div className="flex items-center bg-surface-darker rounded-2xl p-1 border border-white/10">
                {['Term 1', 'Term 2', 'Term 3', 'Term 4'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSelectTerm(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      term === t
                        ? 'bg-indigo-600 text-white shadow-glow-indigo'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <Badge variant="indigo" size="md">Class Average: {formalAvg}%</Badge>
            </div>
          </div>

          {/* CAPS Assessment Weighting & Calculation Formula Explainer */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>CAPS Formula: Final Mark = SBA (40%) + Exam (60%) [or 100% SBA if no examination is scheduled]</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
              <span className="text-slate-400">SBA Tasks:</span>
              <span className="text-white">Controlled Test 1 • Controlled Test 2 • Assignment • Project</span>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching formal assessment records..." />
          ) : learners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-white/[0.02]">
                    <th className="py-3 px-2">#</th>
                    <th className="py-3 px-2">Learner ID</th>
                    <th className="py-3 px-3">Full Name</th>
                    <th className="py-3 px-2 text-center text-indigo-300">Test 1</th>
                    <th className="py-3 px-2 text-center text-indigo-300">Test 2</th>
                    <th className="py-3 px-2 text-center text-cyan-300">Assignment</th>
                    <th className="py-3 px-2 text-center text-purple-300">Project</th>
                    <th className="py-3 px-2 text-center text-amber-300">Exam</th>
                    <th className="py-3 px-2 text-center text-blue-300 font-bold">SBA (%)</th>
                    <th className="py-3 px-2 text-center text-emerald-400 font-extrabold bg-emerald-500/10">Final Mark</th>
                    <th className="py-3 px-2 text-center">CAPS Level</th>
                    <th className="py-3 px-2">Calculation Breakdown</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {learners.map((learner, idx) => {
                    const finalMark = learner.final_calculated_mark !== null && learner.final_calculated_mark !== undefined
                      ? learner.final_calculated_mark
                      : (learner.formal_mark > 0 ? learner.formal_mark : null);
                    const caps = finalMark !== null ? getCapsLevel(finalMark) : { level: '-', label: 'Pending', variant: 'rose' as const };
                    const displayName = `${learner.full_name} ${learner.surname}`.trim();

                    return (
                      <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-2 font-mono font-bold text-cyan-400 text-[11px]">{learner.learner_number}</td>
                        <td className="py-3 px-3 font-bold text-white text-xs whitespace-nowrap">{displayName}</td>

                        {/* Controlled Test 1 */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.test1 ? (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px]" title={`Score: ${learner.test1.score}/${learner.test1.max_score} (Weight: ${learner.test1.weight})`}>
                              {learner.test1.score}/{learner.test1.max_score} <span className="text-[9.5px]">({learner.test1.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Controlled Test 2 */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.test2 ? (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px]" title={`Score: ${learner.test2.score}/${learner.test2.max_score} (Weight: ${learner.test2.weight})`}>
                              {learner.test2.score}/{learner.test2.max_score} <span className="text-[9.5px]">({learner.test2.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Assignment */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.assignment ? (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[11px]" title={`Score: ${learner.assignment.score}/${learner.assignment.max_score}`}>
                              {learner.assignment.score}/{learner.assignment.max_score} <span className="text-[9.5px]">({learner.assignment.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Project / Investigation */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.project ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[11px]" title={`Score: ${learner.project.score}/${learner.project.max_score}`}>
                              {learner.project.score}/{learner.project.max_score} <span className="text-[9.5px]">({learner.project.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Controlled Examination */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.exam ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]" title={`Score: ${learner.exam.score}/${learner.exam.max_score}`}>
                              {learner.exam.score}/{learner.exam.max_score} <span className="text-[9.5px]">({learner.exam.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Calculated SBA Mark */}
                        <td className="py-3 px-2 text-center font-mono font-bold text-blue-300 text-xs">
                          {learner.sba_mark !== null && learner.sba_mark !== undefined ? `${learner.sba_mark}%` : '—'}
                        </td>

                        {/* Calculated Final Mark */}
                        <td className="py-3 px-2 text-center font-mono font-black text-sm bg-emerald-500/10 text-emerald-400">
                          {finalMark !== null ? `${finalMark}%` : <span className="text-[10px] text-amber-400/80 font-bold">Pending</span>}
                        </td>

                        {/* CAPS Level Badge */}
                        <td className="py-3 px-2 text-center">
                          {finalMark !== null ? (
                            <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Calculation Breakdown Explanation */}
                        <td className="py-3 px-2 text-[10px] text-slate-300 font-mono">
                          <span className="truncate block max-w-xs" title={learner.calculation_method}>
                            {learner.calculation_method || 'Awaiting marks'}
                          </span>
                        </td>

                        {/* Action: Quick Allocate */}
                        <td className="py-3 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCategory('entry');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-surface-darker hover:bg-white/10 text-brand-300 hover:text-white border border-white/10 text-[10px] font-bold transition-all"
                          >
                            Allocate Marks
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">No learners found for class {selectedClass}.</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 2: TERM MARKS BREAKDOWN                                         */}
      {/* ========================================================================= */}
      {activeCategory === 'term' && (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span>Term Cumulative Marks — {selectedSubject} ({selectedClass})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Displays quarterly term performance across Term 1, Term 2, and Term 3 with weighted average.
              </p>
            </div>
            <Badge variant="cyan" size="md">Term Average: {termAvg}%</Badge>
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching term marks breakdown..." />
          ) : learners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                    <th className="pb-3 px-3">#</th>
                    <th className="pb-3 px-3">Learner ID</th>
                    <th className="pb-3 px-3">Full Name</th>
                    <th className="pb-3 px-3 text-center">Term 1</th>
                    <th className="pb-3 px-3 text-center">Term 2</th>
                    <th className="pb-3 px-3 text-center">Term 3</th>
                    <th className="pb-3 px-3 text-center font-bold text-cyan-400">Cumulative Avg</th>
                    <th className="pb-3 px-3 text-right">CAPS Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {learners.map((learner, idx) => {
                    const avg = Math.round((learner.term1_mark + learner.term2_mark + learner.term3_mark) / 3);
                    const caps = getCapsLevel(avg);
                    const displayName = `${learner.full_name} ${learner.surname}`.trim();
                    return (
                      <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">{learner.learner_number}</td>
                        <td className="py-3.5 px-3 font-bold text-white text-sm">{displayName}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">{learner.term1_mark}%</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">{learner.term2_mark}%</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">{learner.term3_mark}%</td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-sm text-cyan-300">{avg}%</td>
                        <td className="py-3.5 px-3 text-right">
                          <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">No learners found for class {selectedClass}.</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 3: AI IN-APP ACTIVITIES                                         */}
      {/* ========================================================================= */}
      {activeCategory === 'ai' && (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span>AI In-App Activities & Quizzes — {selectedSubject} ({selectedClass})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Displays practice quizzes, AI tutor diagnostic exercises, and study builder tasks completed by learners in-app.
              </p>
            </div>
            <Badge variant="indigo" size="md">AI Activity Average: {aiAvg}%</Badge>
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching AI activity analytics..." />
          ) : learners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                    <th className="pb-3 px-3">#</th>
                    <th className="pb-3 px-3">Learner ID</th>
                    <th className="pb-3 px-3">Full Name</th>
                    <th className="pb-3 px-3 text-center">Modules Completed</th>
                    <th className="pb-3 px-3 text-center">AI Practice Score</th>
                    <th className="pb-3 px-3 text-center">Mastery Level</th>
                    <th className="pb-3 px-3 text-right">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {learners.map((learner, idx) => {
                    const caps = getCapsLevel(learner.ai_activities_mark);
                    const displayName = `${learner.full_name} ${learner.surname}`.trim();
                    return (
                      <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">{learner.learner_number}</td>
                        <td className="py-3.5 px-3 font-bold text-white text-sm">{displayName}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-purple-300 font-bold">
                          {learner.ai_completed_count} Quizzes
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-sm text-white">
                          {learner.ai_activities_mark}%
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="text-xs font-semibold text-emerald-400">Active</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">No learners found for class {selectedClass}.</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 4: CAPTURE & ENTER NEW FORMAL MARKS                              */}
      {/* ========================================================================= */}
      {activeCategory === 'entry' && (
        <div className="space-y-6 animate-fade-in">
          {/* Assessment Component & Term Selector Strip */}
          <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block mb-1">
                  Step 1: Select Academic Term & Assessment Task Component
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span>Allocate Marks: {ASSESSMENT_COMPONENTS.find(c => c.key === selectedComponent)?.label || 'Assessment'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    {term}
                  </span>
                </h3>
              </div>

              {/* Term Selector Pills */}
              <div className="flex items-center gap-1.5 bg-surface-darker p-1 rounded-2xl border border-white/10 shrink-0">
                {['Term 1', 'Term 2', 'Term 3', 'Term 4'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTerm(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      term === t
                        ? 'bg-brand-600 text-white shadow-glow-brand'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Assessment Component Selection Buttons */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                Select Assessment Task (System calculates final mark based on selected component):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {ASSESSMENT_COMPONENTS.map((comp) => {
                  const isSelected = selectedComponent === comp.key;
                  return (
                    <button
                      key={comp.key}
                      type="button"
                      onClick={() => handleSelectComponent(comp.key)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-brand-600/30 to-indigo-600/20 border-brand-500 shadow-glow-brand'
                          : 'bg-surface-darker border-white/10 hover:border-white/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          comp.isFormal ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {comp.isFormal ? 'Formal SBA' : 'Practice'}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-400" />}
                      </div>
                      <p className="text-xs font-bold text-white truncate">{comp.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Max: {comp.defaultTotal} pts • W: {comp.defaultWeight}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assessment Config Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-3 border-t border-white/5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assessment Title</label>
                <input
                  type="text"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  placeholder="e.g. Term 3 Controlled Test 1"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <select
                  value={isFormal ? 'formal' : 'informal'}
                  onChange={(e) => setIsFormal(e.target.value === 'formal')}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="formal">Formal Assessment (Report Card)</option>
                  <option value="informal">Informal (Practice / Quiz)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assessment Nature</label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Formal SBA Test">Formal SBA Test</option>
                  <option value="Term Assignment">Term Assignment</option>
                  <option value="Practical Project">Practical Investigation / Project</option>
                  <option value="Controlled Examination">Controlled Examination</option>
                  <option value="Class Quiz">Class Quiz / Drill</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(1, parseInt(e.target.value) || 50))}
                  min={1}
                  max={300}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Weight (Contribution)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Math.max(1, parseInt(e.target.value) || totalMarks))}
                  min={1}
                  max={500}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  title="Weights control non-uniform contribution to the final report mark (e.g. Exam: 100, Test: 50, Assignment: 30)"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSaveMarks}
                  disabled={saving || learners.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save {isFormal ? 'Formal' : 'Practice'} Marks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mark Input Table */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Enter Scores: {assessmentName} — {selectedClass}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Subject: {selectedSubject} • Total: {totalMarks} Marks • {term}
                </p>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner text="Loading class roster..." />
            ) : learners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                      <th className="pb-3 px-3">#</th>
                      <th className="pb-3 px-3">Learner ID</th>
                      <th className="pb-3 px-3">Full Name</th>
                      <th className="pb-3 px-3 w-40">Score (Out of {totalMarks})</th>
                      <th className="pb-3 px-3 text-center">Converted %</th>
                      <th className="pb-3 px-3 text-right">CAPS Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {learners.map((learner, idx) => {
                      const currentScore = learner.inputMark === '' ? 0 : learner.inputMark;
                      const percentage = Math.round(((currentScore as number) / totalMarks) * 100);
                      const caps = getCapsLevel(percentage);
                      const displayName = `${learner.full_name} ${learner.surname}`.trim();

                      return (
                        <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">{learner.learner_number}</td>
                          <td className="py-3.5 px-3 font-bold text-white text-sm">{displayName}</td>
                          <td className="py-3.5 px-3">
                            <input
                              type="number"
                              value={learner.inputMark}
                              onChange={(e) => handleInputChange(learner.id, e.target.value)}
                              min={0}
                              max={totalMarks}
                              className="w-28 rounded-xl bg-surface-darker border border-white/10 px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                            {percentage}%
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">No learners found for class {selectedClass}.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 5: HISTORY MARKS ARCHIVE                                         */}
      {/* ========================================================================= */}
      {activeCategory === 'history' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-dark border border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Recorded Assessment History — {selectedSubject} ({selectedClass})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Archived and published formal marks previously recorded for {selectedSubject}.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-darker text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {loadingHistory ? (
            <LoadingSpinner text="Retrieving assessment mark history from database..." />
          ) : historyMarks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-surface-dark border border-white/10 text-center space-y-3 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <History className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-white">No Historical Marks Found</h4>
                <p className="text-xs text-slate-400">
                  No published marks recorded for {selectedSubject} in class {selectedClass} yet. Use "Capture Marks Form" to enter and publish your first test.
                </p>
              </div>
              <button
                onClick={() => setActiveCategory('entry')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                Capture Marks Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {historyMarks.map((batch, bIdx) => {
                const isExpanded = expandedHistoryIndex === bIdx;
                const batchLevel = getCapsLevel(batch.class_average);

                return (
                  <div
                    key={`${batch.assessment_name}-${bIdx}`}
                    className="rounded-3xl bg-surface-dark border border-white/10 overflow-hidden shadow-xl transition-all"
                  >
                    <div
                      onClick={() => setExpandedHistoryIndex(isExpanded ? null : bIdx)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">
                            {batch.assessment_name ? batch.assessment_name.replace(/\(\s*(\d+)\s*\/\s*\d+\s*\)/g, '($1%)') : 'Class Assessment'}
                          </span>
                          <Badge variant="indigo" size="sm">{batch.term || 'Term 3'}</Badge>
                          <Badge variant={batchLevel.variant} size="sm">Avg {batch.class_average}%</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            {batch.date_str || new Date(batch.recorded_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            {batch.total_learners} Learners Recorded
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xl font-extrabold font-mono text-white">{batch.class_average}%</span>
                          <span className="text-[10px] text-slate-400 block">Class Performance</span>
                        </div>
                        <div className="p-2 rounded-xl bg-surface-darker text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 space-y-3 bg-surface-darker/50 animate-fade-in">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                                <th className="pb-3 px-3">#</th>
                                <th className="pb-3 px-3">Learner ID</th>
                                <th className="pb-3 px-3">Full Name</th>
                                <th className="pb-3 px-3 text-center">Score %</th>
                                <th className="pb-3 px-3 text-right">CAPS Achievement Level</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {batch.marks.map((m: any, mIdx: number) => {
                                const pVal = Number(m.mark_percentage || 0);
                                const caps = getCapsLevel(pVal);
                                return (
                                  <tr key={m.child_id || mIdx} className="hover:bg-white/5 transition-colors">
                                    <td className="py-2.5 px-3 text-slate-400 font-mono">{mIdx + 1}</td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{m.learner_number || `2026-${m.child_id}`}</td>
                                    <td className="py-2.5 px-3 font-bold text-white">{`${m.full_name || ''} ${m.surname || ''}`.trim()}</td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{pVal}%</td>
                                    <td className="py-2.5 px-3 text-right">
                                      <Badge variant={caps.variant} size="sm">Level {caps.level} ({caps.label.split(' ')[0]})</Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
