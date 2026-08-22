import React, { useState, useEffect } from 'react';
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
  BarChart3
} from 'lucide-react';

interface LearnerMarkRecord {
  id: number;
  full_name: string;
  surname: string;
  learner_number: string;
  grade: number;
  class_name: string;
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

export const TeacherAssessments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || 'Mathematics';
  const initialClass = searchParams.get('class') || '10A';

  const [subjects, setSubjects] = useState<string[]>([initialSubject, 'Physical Sciences', 'Life Sciences', 'English FAL', 'Life Orientation']);
  const [classes, setClasses] = useState<string[]>([initialClass, '10A', '11A']);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);

  // Active Category View: 'formal' | 'term' | 'ai' | 'entry'
  const [activeCategory, setActiveCategory] = useState<'formal' | 'term' | 'ai' | 'entry'>('formal');

  // Mark Entry Form State
  const [assessmentName, setAssessmentName] = useState('Term 3 Control Test');
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [term, setTerm] = useState('Term 3');

  const [learners, setLearners] = useState<LearnerMarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const subNames = Array.from(new Set(list.map((c: any) => c.subject_name || c.title).filter(Boolean))) as string[];
          const classNames = Array.from(new Set(list.map((c: any) => c.class_name || `${c.grade}A`).filter(Boolean))) as string[];
          if (subNames.length > 0) {
            setSubjects(subNames);
            if (!searchParams.get('subject')) setSelectedSubject(subNames[0]);
          }
          if (classNames.length > 0) {
            setClasses(classNames);
            if (!searchParams.get('class')) setSelectedClass(classNames[0]);
          }
          return;
        }
        return teacherService.getWorkload();
      })
      .then((res: any) => {
        if (!res) return;
        const subList = res?.subjects || [];
        const clsList = res?.classes_taught || [];
        if (subList.length > 0) {
          setSubjects(Array.from(new Set(subList)));
          if (!searchParams.get('subject')) setSelectedSubject(subList[0]);
        }
        if (clsList.length > 0) {
          setClasses(Array.from(new Set(clsList)));
          if (!searchParams.get('class')) setSelectedClass(clsList[0]);
        }
      })
      .catch(() => {
        // Keeps defaults
      });
  }, [searchParams]);

  // 2. Load learners roster for selected class and subject
  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);

    teacherService.getClassRoster({ class: selectedClass, subject: selectedSubject })
      .then((res) => {
        const roster = Array.isArray(res) ? res : res.roster || res.learners || [];
        setLearners(roster.map((s: any) => {
          const baseMark = s.current_mark !== null && s.current_mark !== undefined 
            ? Math.round(parseFloat(s.current_mark)) 
            : 0;

          const t1 = s.term1_mark !== undefined && s.term1_mark !== null ? Math.round(parseFloat(s.term1_mark)) : baseMark;
          const t2 = s.term2_mark !== undefined && s.term2_mark !== null ? Math.round(parseFloat(s.term2_mark)) : baseMark;
          const t3 = s.term3_mark !== undefined && s.term3_mark !== null ? Math.round(parseFloat(s.term3_mark)) : baseMark;
          const aiScore = s.ai_score !== undefined && s.ai_score !== null ? Math.round(parseFloat(s.ai_score)) : (baseMark > 0 ? baseMark : 0);

          return {
            id: s.id || s.child_id,
            full_name: s.full_name || s.learner_name || s.name || 'Learner',
            surname: s.surname || s.learner_surname || '',
            learner_number: s.learner_number || `2026${String(s.id).padStart(3, '0')}`,
            grade: s.grade || parseInt(selectedClass.replace(/[^0-9]/g, ''), 10) || 10,
            class_name: s.class_name || selectedClass,
            formal_mark: baseMark,
            formal_task_name: assessmentName,
            term1_mark: t1,
            term2_mark: t2,
            term3_mark: t3,
            ai_activities_mark: aiScore,
            ai_completed_count: s.ai_completed_count || 0,
            inputMark: baseMark <= totalMarks ? (baseMark > 0 ? baseMark : '') : Math.round((baseMark / 100) * totalMarks),
          };
        }));
      })
      .catch((err) => {
        console.error('Error fetching class roster for assessments:', err);
        setError('Could not load class roster from database.');
        setLearners([]);
      })
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSubject]);

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
        assessment_name: assessmentName,
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

      // Update formal marks in state immediately
      setLearners(prev => prev.map(l => {
        const percentage = l.inputMark === '' ? 0 : Math.round(((l.inputMark as number) / totalMarks) * 100);
        return {
          ...l,
          formal_mark: percentage,
          formal_task_name: assessmentName
        };
      }));

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

  // Class Averages Calculations
  const formalAvg = learners.length > 0 
    ? Math.round(learners.reduce((acc, l) => acc + l.formal_mark, 0) / learners.length) 
    : 0;

  const termAvg = learners.length > 0 
    ? Math.round(learners.reduce((acc, l) => acc + ((l.term1_mark + l.term2_mark + l.term3_mark) / 3), 0) / learners.length) 
    : 0;

  const aiAvg = learners.length > 0 
    ? Math.round(learners.reduce((acc, l) => acc + l.ai_activities_mark, 0) / learners.length) 
    : 0;

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
          <span>{error}</span>
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
      </div>

      {/* ========================================================================= */}
      {/* CATEGORY 1: FORMAL ASSESSMENTS                                            */}
      {/* ========================================================================= */}
      {activeCategory === 'formal' && (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>Formal Assessment Scores — {selectedSubject} ({selectedClass})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Displays official SBA tests, controlled examinations, and teacher-entered marks recorded in the database.
              </p>
            </div>
            <Badge variant="indigo" size="md">Class Average: {formalAvg}%</Badge>
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching formal assessment records..." />
          ) : learners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                    <th className="pb-3 px-3">#</th>
                    <th className="pb-3 px-3">Learner ID</th>
                    <th className="pb-3 px-3">Full Name</th>
                    <th className="pb-3 px-3">Latest Formal Task</th>
                    <th className="pb-3 px-3 text-center">Score (%)</th>
                    <th className="pb-3 px-3 text-center">CAPS Level</th>
                    <th className="pb-3 px-3 text-right">Academic Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {learners.map((learner, idx) => {
                    const caps = getCapsLevel(learner.formal_mark);
                    const displayName = `${learner.full_name} ${learner.surname}`.trim();
                    return (
                      <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">{learner.learner_number}</td>
                        <td className="py-3.5 px-3 font-bold text-white text-sm">{displayName}</td>
                        <td className="py-3.5 px-3 text-slate-300 font-medium">{learner.formal_task_name}</td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-sm text-white">
                          {learner.formal_mark}%
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className={`text-xs font-semibold ${learner.formal_mark >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {learner.formal_mark >= 50 ? 'Achieved' : 'Needs Support'}
                          </span>
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
          {/* Assessment Config Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-5 rounded-3xl bg-surface-dark border border-white/10 shadow-xl">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assessment Task Title</label>
              <input
                type="text"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="e.g. Term 3 Control Test"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Term Cycle</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Term 4">Term 4</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Marks Possible</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Math.max(1, parseInt(e.target.value) || 50))}
                min={1}
                max={300}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSaveMarks}
                disabled={saving || learners.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Publish to Formal Marks</span>
                  </>
                )}
              </button>
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
    </div>
  );
};
