import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacherService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertCircle,
  Award,
  TrendingUp,
  Activity,
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

export const normalizeClassGrade = (clsStr: string | number | null | undefined): string => {
  if (clsStr === null || clsStr === undefined) return '';
  const s = String(clsStr).trim();
  if (!s || s.toLowerCase() === 'all') return 'all';
  // Match standard grade strings like "Class 11", "Grade 11", "11 · School 13", "11 - School 13", "10A", "10B", etc.
  const match = s.match(/(?:grade|class)?\s*(\d{1,2})/i);
  if (match) {
    return match[1];
  }
  const digits = s.replace(/[^0-9]/g, '');
  return digits || s;
};

interface TeacherWorkloadAssignment {
  subject: string;
  grade?: string;
  className?: string;
}

export const TeacherAssessments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const querySubject = searchParams.get('subject');
  const queryClass = searchParams.get('class');

  const [teacherAssignments, setTeacherAssignments] = useState<TeacherWorkloadAssignment[]>([]);
  const [allTeacherSubjects, setAllTeacherSubjects] = useState<string[]>(querySubject ? [querySubject] : []);
  const [classes, setClasses] = useState<string[]>(queryClass ? [normalizeClassGrade(queryClass)] : ['10', '11', '12']);
  const [selectedSubject, setSelectedSubject] = useState<string>(querySubject || '');
  const [selectedClass, setSelectedClass] = useState<string>(queryClass ? normalizeClassGrade(queryClass) : '10');

  // Compute subjects dynamically: only subjects assigned to this specific teacher
  // If a specific class is selected, show subjects assigned to this teacher for that class (or all assigned subjects if no class filter)
  const subjects = useMemo(() => {
    if (allTeacherSubjects.length === 0) {
      return querySubject ? [querySubject] : [];
    }
    if (!selectedClass || selectedClass === 'all') {
      return allTeacherSubjects;
    }
    const normSelectedGrade = normalizeClassGrade(selectedClass);
    const matching = teacherAssignments.filter(a => {
      if (!a.grade && !a.className) return true; // subject assigned to educator across all classes
      const gNorm = normalizeClassGrade(a.grade || a.className);
      return gNorm === normSelectedGrade;
    }).map(a => a.subject);

    const uniqueForGrade = Array.from(new Set(matching.filter(Boolean)));
    return uniqueForGrade.length > 0 ? uniqueForGrade : allTeacherSubjects;
  }, [selectedClass, teacherAssignments, allTeacherSubjects, querySubject]);

  // Keep selectedSubject in sync with available assigned subjects
  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSubject || !subjects.includes(selectedSubject)) {
        setSelectedSubject(subjects[0]);
      }
    }
  }, [subjects, selectedSubject]);

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History Marks State
  const [historyMarks, setHistoryMarks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState<number | null>(0);

  // Helper for CAPS level calculation
  const getCapsLevel = (percentage: number) => {
    if (percentage >= 80) return { level: 7, label: 'Outstanding (80-100%)', variant: 'cyan' as const };
    if (percentage >= 70) return { level: 6, label: 'Meritorious (70-79%)', variant: 'cyan' as const };
    if (percentage >= 60) return { level: 5, label: 'Substantial (60-69%)', variant: 'cyan' as const };
    if (percentage >= 50) return { level: 4, label: 'Adequate (50-59%)', variant: 'slate' as const };
    if (percentage >= 40) return { level: 3, label: 'Moderate (40-49%)', variant: 'slate' as const };
    if (percentage >= 30) return { level: 2, label: 'Elementary (30-39%)', variant: 'rose' as const };
    return { level: 1, label: 'Not Achieved (0-29%)', variant: 'rose' as const };
  };

  // 1. Load teacher assigned workload, classes, and available subjects
  useEffect(() => {
    let isMounted = true;

    const loadWorkloadAndClasses = async () => {
      try {
        let assignmentsList: TeacherWorkloadAssignment[] = [];
        let extractedClasses: string[] = [];

        // Source A: getMySubjectsOverview (active workload cards from teacher_assignments, teacher_timetable, classes)
        try {
          const overview = await teacherService.getMySubjectsOverview();
          const list = Array.isArray(overview) ? overview : [];
          list.forEach((c: any) => {
            const sub = (c.subject_name || c.subject || '').trim();
            const norm = normalizeClassGrade(c.class_name || c.grade || c.grade_level);
            if (sub) {
              assignmentsList.push({ subject: sub, grade: norm || undefined, className: c.class_name });
            }
            if (norm && norm !== 'all') extractedClasses.push(norm);
          });
        } catch (_) {}

        // Source B: getWorkload (teacher workload profile from employee record & assignments)
        try {
          const wl = await teacherService.getWorkload();
          if (wl?.subjects && Array.isArray(wl.subjects)) {
            wl.subjects.forEach((s: string) => {
              const sub = (s || '').trim();
              if (sub) assignmentsList.push({ subject: sub });
            });
          }
          if (wl?.grades_taught && Array.isArray(wl.grades_taught)) {
            wl.grades_taught.forEach((g: any) => {
              const norm = normalizeClassGrade(g);
              if (norm && norm !== 'all') extractedClasses.push(norm);
            });
          }
        } catch (_) {}

        // Source C: getClasses (teacher assigned class list)
        try {
          const clsRes = await teacherService.getClasses();
          const list = Array.isArray(clsRes) ? clsRes : clsRes?.classes || [];
          list.forEach((c: any) => {
            const sub = (c.subject_name || c.subject || '').trim();
            const norm = normalizeClassGrade(c.name || c.class_name || c.grade || c.grade_level);
            if (sub) {
              assignmentsList.push({ subject: sub, grade: norm || undefined, className: c.name || c.class_name });
            }
            if (norm && norm !== 'all') extractedClasses.push(norm);
          });
        } catch (_) {}

        if (!isMounted) return;

        // Deduplicate classes to numeric grades only: '8', '9', '10', '11', '12'
        const uniqueClasses = Array.from(
          new Set(extractedClasses.filter(c => c && /^\d+$/.test(c)))
        ).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

        // Deduplicate subjects assigned to this specific teacher
        const uniqueTeacherSubjects = Array.from(
          new Set(assignmentsList.map(a => a.subject).filter(Boolean))
        );

        setTeacherAssignments(assignmentsList);
        setAllTeacherSubjects(uniqueTeacherSubjects);
        if (uniqueClasses.length > 0) {
          setClasses(uniqueClasses);
        }

        setSelectedClass(prev => {
          const normQuery = queryClass ? normalizeClassGrade(queryClass) : null;
          if (normQuery && uniqueClasses.includes(normQuery)) return normQuery;
          const normPrev = prev ? normalizeClassGrade(prev) : null;
          if (normPrev && uniqueClasses.includes(normPrev)) return normPrev;
          return uniqueClasses[0] || '10';
        });

        setSelectedSubject(prev => {
          if (querySubject && uniqueTeacherSubjects.includes(querySubject)) return querySubject;
          if (prev && uniqueTeacherSubjects.includes(prev)) return prev;
          return uniqueTeacherSubjects[0] || '';
        });
      } catch (err) {
        console.warn('Teacher workload load notice:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingHistory(false);
        }
      }
    };

    loadWorkloadAndClasses();

    return () => { isMounted = false; };
  }, [searchParams]);

  // 2. Load learners roster for selected class, subject, and term (with strict grade isolation)
  const fetchRoster = async () => {
    setLoading(true);
    setError(null);

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const rawClass = selectedClass || classes[0] || '10';
    const isAll = rawClass === 'all';
    const normGradeNum = isAll ? null : parseInt(normalizeClassGrade(rawClass), 10);
    const targetClass = isAll ? 'all' : (normGradeNum ? String(normGradeNum) : '10');
    const targetSubject = selectedSubject || subjects[0] || '';

    if (!targetSubject) {
      setLoading(false);
      clearTimeout(safetyTimer);
      return;
    }

    try {
      let roster: any[] = [];

      // Tier 1: Primary class-roster endpoint
      try {
        const res = await teacherService.getClassRoster({
          class: targetClass,
          grade: normGradeNum || undefined,
          subject: targetSubject,
          term
        });
        roster = Array.isArray(res) ? res : (res?.roster || res?.learners || []);
      } catch (err) {
        console.warn('Tier 1 getClassRoster notice:', err);
      }

      // Tier 2: Attendance Roster (Exact endpoint powering "Mark Register")
      if (roster.length === 0 && !normGradeNum) {
        try {
          const attRes = await teacherService.getAttendanceRoster({
            class: targetClass === 'all' ? '' : targetClass,
            date: new Date().toISOString().split('T')[0],
            subject: targetSubject
          });
          const attList = Array.isArray(attRes) ? attRes : (attRes?.roster || []);
          if (attList.length > 0) {
            roster = attList;
          }
        } catch (err) {
          console.warn('Tier 2 getAttendanceRoster notice:', err);
        }
      }

      // Tier 3: Enrolled learners list (strictly isolated by target grade, never leaking other grades)
      if (roster.length === 0) {
        try {
          const myRes = await teacherService.getMyLearners({ subject: targetSubject });
          const allList = Array.isArray(myRes) ? myRes : (myRes?.learners || []);
          if (allList.length > 0) {
            if (normGradeNum !== null && !isNaN(normGradeNum)) {
              roster = allList.filter((l: any) => {
                const lGrade = parseInt(normalizeClassGrade(l.grade || l.class_name), 10);
                return lGrade === normGradeNum;
              });
            } else {
              roster = allList;
            }
          }
        } catch (err) {
          console.warn('Tier 3 getMyLearners notice:', err);
        }
      }

      clearTimeout(safetyTimer);

      // STRICT GRADE ISOLATION:
      // If a specific grade is selected, ensure ONLY matching grade learners are kept
      let strictlyFiltered = roster;
      if (normGradeNum !== null && !isNaN(normGradeNum)) {
        strictlyFiltered = roster.filter((l: any) => {
          const lGrade = parseInt(normalizeClassGrade(l.grade || l.class_name), 10);
          return lGrade === normGradeNum;
        });
      }

      // Deduplicate learners by id / child_id to prevent duplicates
      const seenIds = new Set<string | number>();
      const deduplicated = strictlyFiltered.filter((l: any) => {
        const id = l.id || l.child_id;
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      if (deduplicated.length > 0) {
        setLearners(deduplicated.map((s: any) => {
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

          const learnerGrade = parseInt(normalizeClassGrade(s.grade || s.class_name), 10) || normGradeNum || 10;
          const learnerClass = String(learnerGrade);

          return {
            id: s.id || s.child_id,
            full_name: s.full_name || s.learner_name || s.name || 'Learner',
            surname: s.surname || s.learner_surname || '',
            learner_number: s.learner_number || (s.id ? `2026-FHS-${String(s.id).padStart(3, '0')}` : '2026-001'),
            grade: learnerGrade,
            class_name: learnerClass,
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
            ai_completed_count: s.ai_completed_count || (aiScore > 0 ? 2 : 0),
            inputMark: currentCompMark,
          };
        }));
      } else {
        setLearners([]);
      }
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('Error fetching class roster for assessments:', err);
      setError('Could not load class roster from database.');
      setLearners([]);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
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
    if (!selectedClass) {
      setLoadingHistory(false);
      setHistoryMarks([]);
      return;
    }
    setLoadingHistory(true);

    const safetyHistoryTimer = setTimeout(() => {
      setLoadingHistory(false);
    }, 4000);

    teacherService.getClassMarksHistory({ class: selectedClass, subject: selectedSubject, term })
      .then((res: any) => {
        clearTimeout(safetyHistoryTimer);
        setHistoryMarks(res?.history || []);
      })
      .catch((err: any) => {
        clearTimeout(safetyHistoryTimer);
        console.error('Failed to load marks history:', err);
        setHistoryMarks([]);
      })
      .finally(() => {
        clearTimeout(safetyHistoryTimer);
        setLoadingHistory(false);
      });
  };

  useEffect(() => {
    if (selectedClass) {
      fetchHistory();
    } else {
      setLoadingHistory(false);
      setHistoryMarks([]);
    }
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
    const valid = learners.map(l => (l.term1_mark + l.term2_mark + l.term3_mark) / 3).filter(v => v > 0);
    return valid.length > 0 ? Math.round(valid.reduce((acc, v) => acc + v, 0) / valid.length) : 0;
  }, [learners]);

  const aiAvg = useMemo(() => {
    if (learners.length === 0) return 0;
    const valid = learners.map(l => l.ai_activities_mark).filter(v => v > 0);
    return valid.length > 0 ? Math.round(valid.reduce((acc, l) => acc + l, 0) / valid.length) : 0;
  }, [learners]);

  // Available Formal Assessments in this Schedule
  const availableFormalAssessments = useMemo(() => {
    if (learners.length === 0) return [];
    return ASSESSMENT_COMPONENTS.filter(comp => comp.isFormal).map(comp => {
      const recordedCount = learners.filter(l => {
        const val = (l as any)[comp.key];
        return val !== null && val !== undefined && typeof val.score === 'number';
      }).length;
      return {
        ...comp,
        recordedCount,
        isRecorded: recordedCount > 0
      };
    }).filter(c => c.isRecorded);
  }, [learners]);

  // Term Tasks & Cumulative Marks calculations for Item 2
  const term1Avg = useMemo(() => {
    const list = learners.map(l => l.term1_mark).filter(m => m > 0);
    return list.length > 0 ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
  }, [learners]);

  const term2Avg = useMemo(() => {
    const list = learners.map(l => l.term2_mark).filter(m => m > 0);
    return list.length > 0 ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
  }, [learners]);

  const term3Avg = useMemo(() => {
    const list = learners.map(l => l.term3_mark).filter(m => m > 0);
    return list.length > 0 ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
  }, [learners]);

  const taskAverages = useMemo(() => {
    const calcTask = (key: 'test1' | 'test2' | 'assignment' | 'project' | 'exam') => {
      const pcts = learners.map(l => (l as any)[key]?.percentage).filter(p => typeof p === 'number' && !isNaN(p) && p > 0);
      return pcts.length > 0 ? Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length) : 0;
    };
    return {
      test1: calcTask('test1'),
      test2: calcTask('test2'),
      assignment: calcTask('assignment'),
      project: calcTask('project'),
      exam: calcTask('exam'),
    };
  }, [learners]);

  const cumulativeMarksCount = useMemo(() => {
    return learners.filter(l => l.term1_mark > 0 || l.term2_mark > 0 || l.term3_mark > 0 || l.formal_mark > 0 || l.final_calculated_mark !== null).length;
  }, [learners]);

  const totalAiActivitiesCount = useMemo(() => {
    return learners.reduce((sum, l) => sum + (l.ai_completed_count || 0), 0);
  }, [learners]);

  const activeSubjectDisplay = selectedSubject || subjects[0] || 'Assigned Subject';
  const activeClassDisplay = selectedClass === 'all' ? 'All Classes' : (normalizeClassGrade(selectedClass) || classes[0] || '10');

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
      {/* Header Banner - Cool Monochromatic Teal Theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900/95 via-[#0A1D27]/85 to-slate-900/95 border border-[#13C8D9]/25 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#13C8D9]" />
            <span>Learner Assessment & Performance Matrix</span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveCategory('entry')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#13C8D9] hover:bg-[#18E2EC] text-slate-950 font-extrabold text-xs shadow-md transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4 text-teal-800" />
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
            {classes.length > 0 ? (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#13C8D9] cursor-pointer"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-surface-darker text-slate-400 text-xs font-bold border border-white/5">
                None available
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subject:</span>
            {subjects.length > 0 ? (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#13C8D9] cursor-pointer"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-surface-darker text-slate-400 text-xs font-bold border border-white/5">
                No subjects assigned
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono font-medium flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#13C8D9]" />
          <span>{learners.length} Enrolled Learners in {activeClassDisplay}</span>
        </div>
      </div>

      {/* Class Averages Summary KPI Cards - Monochromatic Teal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Formal Assessments Average */}
        <div className="p-5 rounded-3xl bg-surface-dark border border-[#13C8D9]/20 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#13C8D9] uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#13C8D9]" />
              Formal Assessments Average
            </span>
            <Badge variant={getCapsLevel(formalAvg).variant} size="sm">
              Level {getCapsLevel(formalAvg).level}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{formalAvg > 0 ? `${formalAvg}%` : '0%'}</span>
            <span className="text-xs text-slate-400 font-medium">Class Tests & Tasks</span>
          </div>
        </div>

        {/* Card 2: Term Marks Cumulative Average */}
        <div className="p-5 rounded-3xl bg-surface-dark border border-[#13C8D9]/20 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#13C8D9] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#13C8D9]" />
              Term Marks Average
            </span>
            <Badge variant={getCapsLevel(termAvg).variant} size="sm">
              Level {getCapsLevel(termAvg).level}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{termAvg > 0 ? `${termAvg}%` : '0%'}</span>
            <span className="text-xs text-slate-400 font-medium">Cumulative Terms 1–3</span>
          </div>
        </div>

        {/* Card 3: In-App Activities Average */}
        <div className="p-5 rounded-3xl bg-surface-dark border border-[#13C8D9]/20 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#13C8D9] uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#13C8D9]" />
              In-App Activities Average
            </span>
            <Badge variant={getCapsLevel(aiAvg).variant} size="sm">
              Level {getCapsLevel(aiAvg).level}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{aiAvg > 0 ? `${aiAvg}%` : '0%'}</span>
            <span className="text-xs text-slate-400 font-medium">In-App Practice</span>
          </div>
        </div>
      </div>

      {/* Category Performance Switcher Tabs - Teal Monochromatic */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('formal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'formal'
              ? 'bg-[#13C8D9] text-slate-950 shadow-md font-extrabold'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Award className={`w-4 h-4 ${activeCategory === 'formal' ? 'text-teal-900' : 'text-[#13C8D9]'}`} />
          <span>Formal Assessments</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${activeCategory === 'formal' ? 'bg-black/20 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'}`}>
            {formalAvg > 0 ? `${formalAvg}%` : '0%'} Avg
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('term')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'term'
              ? 'bg-[#13C8D9] text-slate-950 shadow-md font-extrabold'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <TrendingUp className={`w-4 h-4 ${activeCategory === 'term' ? 'text-teal-900' : 'text-[#13C8D9]'}`} />
          <span>Term Marks Breakdown</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${activeCategory === 'term' ? 'bg-black/20 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'}`}>
            {termAvg > 0 ? `${termAvg}%` : '0%'} Avg
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'ai'
              ? 'bg-[#13C8D9] text-slate-950 shadow-md font-extrabold'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Activity className={`w-4 h-4 ${activeCategory === 'ai' ? 'text-teal-900' : 'text-[#13C8D9]'}`} />
          <span>In-App Activities</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${activeCategory === 'ai' ? 'bg-black/20 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'}`}>
            {aiAvg > 0 ? `${aiAvg}%` : '0%'} Avg
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('entry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'entry'
              ? 'bg-[#13C8D9] text-slate-950 shadow-md font-extrabold'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Save className={`w-4 h-4 ${activeCategory === 'entry' ? 'text-teal-900' : 'text-[#13C8D9]'}`} />
          <span>Capture Marks Form</span>
        </button>

        <button
          onClick={() => setActiveCategory('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'history'
              ? 'bg-[#13C8D9] text-slate-950 shadow-md font-extrabold'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <History className={`w-4 h-4 ${activeCategory === 'history' ? 'text-teal-900' : 'text-[#13C8D9]'}`} />
          <span>History Marks</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${activeCategory === 'history' ? 'bg-black/20 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'}`}>
            {historyMarks.length} Records
          </span>
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
                <div className="p-2 rounded-xl bg-[#13C8D9]/15 text-[#13C8D9] border border-[#13C8D9]/30">
                  <Award className="w-5 h-5 text-[#13C8D9]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>CAPS Formal Assessment Schedule — {activeSubjectDisplay} ({activeClassDisplay})</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#13C8D9]/15 text-[#13C8D9] border border-[#13C8D9]/30 font-bold">
                      {term}
                    </span>
                  </h3>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      term === t
                        ? 'bg-[#13C8D9] text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-white font-mono text-xs font-bold">
                Class Average: {formalAvg > 0 ? `${formalAvg}%` : '0%'}
              </span>
            </div>
          </div>

          {/* REQUIREMENT 1: Number of formal assessments available & list of formal assessments available */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#071922] via-[#0B2533] to-[#071922] border border-[#13C8D9]/25 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#13C8D9]" />
                Formal Assessments Available:
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-mono font-extrabold bg-[#13C8D9]/20 text-[#13C8D9] border border-[#13C8D9]/35 text-xs">
                {availableFormalAssessments.length > 0 ? availableFormalAssessments.length : 0}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {availableFormalAssessments.length > 0 ? (
                availableFormalAssessments.map((comp) => (
                  <span
                    key={comp.key}
                    className="px-2.5 py-1 rounded-xl bg-surface-dark border border-[#13C8D9]/30 text-white font-medium text-[11px] flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#13C8D9]" />
                    <span>{comp.label}:</span>
                    <span className="text-[#13C8D9] font-mono font-bold">{comp.recordedCount} Recorded</span>
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px] font-mono">
                  None available for {term}
                </span>
              )}
            </div>
          </div>

          {/* CAPS Assessment Weighting & Calculation Formula Explainer */}
          <div className="p-3.5 rounded-2xl bg-[#091E28]/60 border border-[#13C8D9]/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#13C8D9] animate-pulse" />
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
                    <th className="py-3 px-2">Class</th>
                    <th className="py-3 px-3">Full Name</th>
                    <th className="py-3 px-2 text-center text-cyan-300">Test 1</th>
                    <th className="py-3 px-2 text-center text-cyan-300">Test 2</th>
                    <th className="py-3 px-2 text-center text-cyan-300">Assignment</th>
                    <th className="py-3 px-2 text-center text-cyan-300">Project</th>
                    <th className="py-3 px-2 text-center text-cyan-300">Exam</th>
                    <th className="py-3 px-2 text-center text-[#13C8D9] font-bold">SBA (%)</th>
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
                    const caps = finalMark !== null ? getCapsLevel(finalMark) : { level: '-', label: 'Pending', variant: 'slate' as const };
                    const displayName = `${learner.full_name} ${learner.surname}`.trim();

                    return (
                      <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-2 font-mono font-bold text-[#13C8D9] text-[11px]">{learner.learner_number}</td>
                        <td className="py-3 px-2 font-mono text-slate-300 text-[11px]">
                          <span className="px-2 py-0.5 rounded-lg bg-surface-darker border border-white/5 font-semibold text-slate-200">
                            {normalizeClassGrade(learner.class_name || learner.grade) || '10'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white text-xs whitespace-nowrap">{displayName}</td>

                        {/* Controlled Test 1 */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.test1 ? (
                            <span className="px-1.5 py-0.5 rounded bg-[#13C8D9]/15 text-[#13C8D9] font-bold text-[11px]" title={`Score: ${learner.test1.score}/${learner.test1.max_score} (Weight: ${learner.test1.weight})`}>
                              {learner.test1.score}/{learner.test1.max_score} <span className="text-[9.5px]">({learner.test1.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Controlled Test 2 */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.test2 ? (
                            <span className="px-1.5 py-0.5 rounded bg-[#13C8D9]/15 text-[#13C8D9] font-bold text-[11px]" title={`Score: ${learner.test2.score}/${learner.test2.max_score} (Weight: ${learner.test2.weight})`}>
                              {learner.test2.score}/{learner.test2.max_score} <span className="text-[9.5px]">({learner.test2.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Assignment */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.assignment ? (
                            <span className="px-1.5 py-0.5 rounded bg-[#13C8D9]/15 text-[#13C8D9] font-bold text-[11px]" title={`Score: ${learner.assignment.score}/${learner.assignment.max_score}`}>
                              {learner.assignment.score}/{learner.assignment.max_score} <span className="text-[9.5px]">({learner.assignment.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Project / Investigation */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.project ? (
                            <span className="px-1.5 py-0.5 rounded bg-[#13C8D9]/15 text-[#13C8D9] font-bold text-[11px]" title={`Score: ${learner.project.score}/${learner.project.max_score}`}>
                              {learner.project.score}/{learner.project.max_score} <span className="text-[9.5px]">({learner.project.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Controlled Examination */}
                        <td className="py-3 px-2 text-center font-mono">
                          {learner.exam ? (
                            <span className="px-1.5 py-0.5 rounded bg-[#13C8D9]/15 text-[#13C8D9] font-bold text-[11px]" title={`Score: ${learner.exam.score}/${learner.exam.max_score}`}>
                              {learner.exam.score}/{learner.exam.max_score} <span className="text-[9.5px]">({learner.exam.percentage}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">—</span>
                          )}
                        </td>

                        {/* Calculated SBA Mark */}
                        <td className="py-3 px-2 text-center font-mono font-bold text-cyan-300 text-xs">
                          {learner.sba_mark !== null && learner.sba_mark !== undefined ? `${learner.sba_mark}%` : '—'}
                        </td>

                        {/* Calculated Final Mark */}
                        <td className="py-3 px-2 text-center font-mono font-black text-sm bg-emerald-500/10 text-emerald-400">
                          {finalMark !== null ? `${finalMark}%` : <span className="text-[10px] text-slate-400 font-bold">Pending</span>}
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
                            className="px-2.5 py-1 rounded-lg bg-surface-darker hover:bg-white/10 text-[#13C8D9] hover:text-white border border-[#13C8D9]/30 text-[10px] font-bold transition-all cursor-pointer"
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
            <div className="p-8 text-center text-slate-400 text-xs bg-surface-darker rounded-2xl border border-white/5 space-y-1">
              <p className="font-bold text-white">0 Formal Assessments Available</p>
              <p>None available for {activeSubjectDisplay} ({activeClassDisplay}).</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 2: TERM MARKS BREAKDOWN                                         */}
      {/* ========================================================================= */}
      {activeCategory === 'term' && (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#13C8D9]" />
                <span>Term Cumulative Marks — {activeSubjectDisplay} ({activeClassDisplay})</span>
              </h3>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-white font-mono text-xs font-bold">
              Term Average: {termAvg > 0 ? `${termAvg}%` : '0%'}
            </span>
          </div>

          {/* REQUIREMENT 2: Cumulative marks available & averages for each term task */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Cumulative Marks Available */}
            <div className="p-3.5 rounded-2xl bg-surface-darker border border-[#13C8D9]/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Cumulative Marks Available
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold font-mono text-[#13C8D9]">
                  {cumulativeMarksCount > 0 ? cumulativeMarksCount : 0}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  / {learners.length} {learners.length === 0 ? '(None available)' : 'Learners'}
                </span>
              </div>
            </div>

            {/* Test 1 Average */}
            <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Controlled Test 1 Avg
              </span>
              <div className="text-xl font-extrabold font-mono text-white">
                {taskAverages.test1 > 0 ? `${taskAverages.test1}%` : '0%'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                {taskAverages.test1 > 0 ? 'Recorded' : 'None available'}
              </span>
            </div>

            {/* Test 2 Average */}
            <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Controlled Test 2 Avg
              </span>
              <div className="text-xl font-extrabold font-mono text-white">
                {taskAverages.test2 > 0 ? `${taskAverages.test2}%` : '0%'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                {taskAverages.test2 > 0 ? 'Recorded' : 'None available'}
              </span>
            </div>

            {/* Assignment Average */}
            <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Assignment Avg
              </span>
              <div className="text-xl font-extrabold font-mono text-white">
                {taskAverages.assignment > 0 ? `${taskAverages.assignment}%` : '0%'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                {taskAverages.assignment > 0 ? 'Recorded' : 'None available'}
              </span>
            </div>

            {/* Project Average */}
            <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Project Avg
              </span>
              <div className="text-xl font-extrabold font-mono text-white">
                {taskAverages.project > 0 ? `${taskAverages.project}%` : '0%'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                {taskAverages.project > 0 ? 'Recorded' : 'None available'}
              </span>
            </div>

            {/* Exam Average */}
            <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Exam Avg
              </span>
              <div className="text-xl font-extrabold font-mono text-white">
                {taskAverages.exam > 0 ? `${taskAverages.exam}%` : '0%'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                {taskAverages.exam > 0 ? 'Recorded' : 'None available'}
              </span>
            </div>
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
                    {/* REQUIREMENT 4: Display learner respective class */}
                    <th className="pb-3 px-3">Class</th>
                    <th className="pb-3 px-3">Full Name</th>
                    <th className="pb-3 px-3 text-center">Term 1</th>
                    <th className="pb-3 px-3 text-center">Term 2</th>
                    <th className="pb-3 px-3 text-center">Term 3</th>
                    <th className="pb-3 px-3 text-center font-bold text-[#13C8D9]">Cumulative Avg</th>
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
                        <td className="py-3.5 px-3 font-mono font-bold text-[#13C8D9]">{learner.learner_number}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">
                          <span className="px-2 py-0.5 rounded-lg bg-surface-darker border border-white/5 font-semibold text-slate-200">
                            {normalizeClassGrade(learner.class_name || learner.grade) || '10'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-white text-sm">{displayName}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">{learner.term1_mark > 0 ? `${learner.term1_mark}%` : '0%'}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">{learner.term2_mark > 0 ? `${learner.term2_mark}%` : '0%'}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">{learner.term3_mark > 0 ? `${learner.term3_mark}%` : '0%'}</td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-sm text-[#13C8D9]">{avg > 0 ? `${avg}%` : '0%'}</td>
                        <td className="py-3.5 px-3 text-right">
                          <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Table Footer with Class Column Averages */}
                <tfoot>
                  <tr className="border-t border-white/10 bg-white/[0.02] font-mono text-xs font-bold text-slate-300">
                    <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-[11px] text-slate-400">
                      Class Average Across Term Tasks:
                    </td>
                    <td className="py-3 px-3 text-center text-white">{term1Avg > 0 ? `${term1Avg}%` : '0%'}</td>
                    <td className="py-3 px-3 text-center text-white">{term2Avg > 0 ? `${term2Avg}%` : '0%'}</td>
                    <td className="py-3 px-3 text-center text-white">{term3Avg > 0 ? `${term3Avg}%` : '0%'}</td>
                    <td className="py-3 px-3 text-center text-[#13C8D9] text-sm font-extrabold">{termAvg > 0 ? `${termAvg}%` : '0%'}</td>
                    <td className="py-3 px-3 text-right text-[11px] text-slate-400">Class Overall</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs bg-surface-darker rounded-2xl border border-white/5 space-y-1">
              <p className="font-bold text-white">0 Cumulative Marks Available</p>
              <p>None available for class {activeClassDisplay}.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 3: IN-APP ACTIVITIES & HISTORIC ASSESSMENTS PUBLISHED           */}
      {/* ========================================================================= */}
      {activeCategory === 'ai' && (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#13C8D9]" />
                <span>In-App Activities & Historic Published Assessments — {activeSubjectDisplay} ({activeClassDisplay})</span>
              </h3>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-white font-mono text-xs font-bold">
              Activity Average: {aiAvg > 0 ? `${aiAvg}%` : '0%'}
            </span>
          </div>

          {/* Summary Strip for In-App Activities History & Historic Assessments Published */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-darker border border-[#13C8D9]/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#13C8D9]" />
                In-App Activities Completed
              </span>
              <div className="text-2xl font-extrabold font-mono text-[#13C8D9]">
                {totalAiActivitiesCount > 0 ? totalAiActivitiesCount : 0}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {totalAiActivitiesCount > 0 ? 'Interactive modules logged' : 'None available'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                Historic Assessments Published
              </span>
              <div className="text-2xl font-extrabold font-mono text-white">
                {historyMarks.length > 0 ? historyMarks.length : 0}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {historyMarks.length > 0 ? 'Official published batches' : 'None available'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Practice Average
              </span>
              <div className="text-2xl font-extrabold font-mono text-white">
                {aiAvg > 0 ? `${aiAvg}%` : '0%'}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {aiAvg > 0 ? 'Class mastery score' : 'None available'}
              </span>
            </div>
          </div>

          {/* Section 1: In-App Activities History per Learner */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#13C8D9]" />
                <span>In-App Activities History ({learners.length > 0 ? learners.length : 0} Learners)</span>
              </h4>
            </div>

            {loading ? (
              <LoadingSpinner text="Fetching AI activity analytics..." />
            ) : learners.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface-darker">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Learner ID</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-3">Full Name</th>
                      <th className="py-3 px-3 text-center">Modules Completed</th>
                      <th className="py-3 px-3 text-center">AI Practice Score</th>
                      <th className="py-3 px-3 text-center">Mastery Level</th>
                      <th className="py-3 px-3 text-right">Activity Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {learners.map((learner, idx) => {
                      const caps = getCapsLevel(learner.ai_activities_mark);
                      const displayName = `${learner.full_name} ${learner.surname}`.trim();
                      const hasCompleted = learner.ai_completed_count > 0;
                      return (
                        <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-[#13C8D9]">{learner.learner_number}</td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            <span className="px-2 py-0.5 rounded-lg bg-surface-dark border border-white/5 font-semibold text-slate-200">
                              {normalizeClassGrade(learner.class_name || learner.grade) || '10'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-white">{displayName}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                            {learner.ai_completed_count > 0 ? `${learner.ai_completed_count} Quizzes` : '0 Quizzes'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-white">
                            {learner.ai_activities_mark > 0 ? `${learner.ai_activities_mark}%` : '0%'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-xs font-semibold ${hasCompleted ? 'text-[#13C8D9]' : 'text-slate-500'}`}>
                              {hasCompleted ? 'Active in App' : 'None available'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-surface-darker rounded-2xl border border-white/5 space-y-1">
                <p className="font-bold text-white">0 In-App Activities Found</p>
                <p>None available for class {activeClassDisplay}.</p>
              </div>
            )}
          </div>

          {/* Section 2: Historic Assessments Published Archive */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Historic Assessments Published ({historyMarks.length > 0 ? historyMarks.length : 0})</span>
              </h4>
              <button
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-darker text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh History</span>
              </button>
            </div>

            {loadingHistory ? (
              <LoadingSpinner text="Retrieving published assessments history..." />
            ) : historyMarks.length > 0 ? (
              <div className="space-y-3">
                {historyMarks.map((batch, bIdx) => {
                  const isExpanded = expandedHistoryIndex === bIdx;
                  const batchLevel = getCapsLevel(batch.class_average);

                  return (
                    <div
                      key={`${batch.assessment_name}-${bIdx}`}
                      className="rounded-2xl bg-surface-darker border border-white/10 overflow-hidden shadow-md transition-all"
                    >
                      <div
                        onClick={() => setExpandedHistoryIndex(isExpanded ? null : bIdx)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-white">
                              {batch.assessment_name ? batch.assessment_name.replace(/\(\s*(\d+)\s*\/\s*\d+\s*\)/g, '($1%)') : 'Class Assessment'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#13C8D9]/15 text-[#13C8D9] font-mono text-[10px] font-bold border border-[#13C8D9]/30">
                              {batch.term || 'Term 3'}
                            </span>
                            <Badge variant={batchLevel.variant} size="sm">Avg {batch.class_average > 0 ? `${batch.class_average}%` : '0%'}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#13C8D9]" />
                              {batch.date_str || new Date(batch.recorded_at).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#13C8D9]" />
                              {batch.total_learners} Learners Published
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-lg font-extrabold font-mono text-white">{batch.class_average > 0 ? `${batch.class_average}%` : '0%'}</span>
                            <span className="text-[10px] text-slate-400 block">Class Avg</span>
                          </div>
                          <div className="p-1.5 rounded-xl bg-surface-dark text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 space-y-3 bg-black/20 border-t border-white/5 animate-fade-in">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                                  <th className="pb-2.5 px-3">#</th>
                                  <th className="pb-2.5 px-3">Learner ID</th>
                                  <th className="pb-2.5 px-3">Full Name</th>
                                  <th className="pb-2.5 px-3 text-center">Score %</th>
                                  <th className="pb-2.5 px-3 text-right">CAPS Achievement Level</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {batch.marks.map((m: any, mIdx: number) => {
                                  const pVal = Number(m.mark_percentage || 0);
                                  const caps = getCapsLevel(pVal);
                                  return (
                                    <tr key={m.child_id || mIdx} className="hover:bg-white/5 transition-colors">
                                      <td className="py-2 px-3 text-slate-400 font-mono">{mIdx + 1}</td>
                                      <td className="py-2 px-3 font-mono font-bold text-[#13C8D9]">{m.learner_number || `2026-${m.child_id}`}</td>
                                      <td className="py-2 px-3 font-bold text-white">{`${m.full_name || ''} ${m.surname || ''}`.trim()}</td>
                                      <td className="py-2 px-3 text-center font-mono font-bold text-white">{pVal > 0 ? `${pVal}%` : '0%'}</td>
                                      <td className="py-2 px-3 text-right">
                                        <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
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
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-surface-darker rounded-2xl border border-white/5 space-y-1">
                <p className="font-bold text-white">0 Historic Assessments Published</p>
                <p>None available for {activeSubjectDisplay} ({activeClassDisplay}).</p>
              </div>
            )}
          </div>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#13C8D9] block mb-1">
                  Step 1: Select Academic Term & Assessment Task Component
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span>Allocate Marks: {ASSESSMENT_COMPONENTS.find(c => c.key === selectedComponent)?.label || 'Assessment'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#13C8D9]/20 text-[#13C8D9] border border-[#13C8D9]/30">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      term === t
                        ? 'bg-[#13C8D9] text-slate-950 font-bold shadow-md'
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
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#13C8D9]/25 to-slate-900 border-[#13C8D9] shadow-md'
                          : 'bg-surface-darker border-white/10 hover:border-white/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          comp.isFormal ? 'bg-[#13C8D9]/20 text-[#13C8D9]' : 'bg-slate-700/40 text-slate-300'
                        }`}>
                          {comp.isFormal ? 'Formal SBA' : 'Practice'}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#13C8D9]" />}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#13C8D9] cursor-pointer"
                >
                  <option value="all">All Classes</option>
                  {classes.map(c => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#13C8D9] cursor-pointer"
                >
                  {subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assessment Title</label>
                <input
                  type="text"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  placeholder="e.g. Term 3 Controlled Test 1"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#13C8D9] font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <select
                  value={isFormal ? 'formal' : 'informal'}
                  onChange={(e) => setIsFormal(e.target.value === 'formal')}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#13C8D9] cursor-pointer"
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
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#13C8D9] cursor-pointer"
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
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#13C8D9]"
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
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-[#13C8D9] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#13C8D9]"
                  title="Weights control non-uniform contribution to the final report mark (e.g. Exam: 100, Test: 50, Assignment: 30)"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSaveMarks}
                  disabled={saving || learners.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#13C8D9] hover:bg-[#18E2EC] text-slate-950 font-extrabold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-teal-800" />
                      <span>Save {isFormal ? 'Formal' : 'Practice'} Marks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* REQUIREMENT 4: Mark Input Table - Display list of learners in their respective classes */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Enter Scores: {assessmentName} — {activeClassDisplay}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Subject: {activeSubjectDisplay} • Total: {totalMarks} Marks • {term} • Displaying learners in their respective classes
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-surface-darker p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setSelectedClass('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      selectedClass === 'all' ? 'bg-[#13C8D9] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Classes
                  </button>
                  {classes.map(cls => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        selectedClass === cls ? 'bg-[#13C8D9] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchRoster}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Reload learners from class register and roster"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#13C8D9] ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
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
                      {/* REQUIREMENT 4: Respective Class column */}
                      <th className="pb-3 px-3">Class</th>
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
                          <td className="py-3.5 px-3 font-mono font-bold text-[#13C8D9]">{learner.learner_number}</td>
                          <td className="py-3.5 px-3 font-mono text-slate-300">
                            <span className="px-2 py-0.5 rounded-lg bg-surface-darker border border-white/5 font-semibold text-slate-200">
                              {normalizeClassGrade(learner.class_name || learner.grade) || '10'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-white text-sm">{displayName}</td>
                          <td className="py-3.5 px-3">
                            <input
                              type="number"
                              value={learner.inputMark}
                              onChange={(e) => handleInputChange(learner.id, e.target.value)}
                              min={0}
                              max={totalMarks}
                              className="w-28 rounded-xl bg-surface-darker border border-white/10 px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#13C8D9]"
                            />
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                            {percentage > 0 ? `${percentage}%` : '0%'}
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
              <div className="p-8 text-center text-slate-400 text-xs bg-surface-darker rounded-2xl border border-white/5 space-y-3">
                <p className="font-bold text-white text-sm">0 Learners Available</p>
                <p>No learners found in Class {activeClassDisplay}.</p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setSelectedClass('all')}
                    className="px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-white/5 border border-white/10 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    View All Classes
                  </button>
                  <button
                    onClick={fetchRoster}
                    className="px-4 py-2 rounded-xl bg-[#13C8D9] hover:bg-[#18E2EC] text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Load Enrolled Learners</span>
                  </button>
                </div>
              </div>
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
                <History className="w-5 h-5 text-[#13C8D9]" />
                <span>Recorded Assessment History — {activeSubjectDisplay} ({activeClassDisplay})</span>
              </h3>
            </div>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-darker text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {loadingHistory ? (
            <LoadingSpinner text="Retrieving assessment mark history from database..." />
          ) : historyMarks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-surface-dark border border-white/10 text-center space-y-3 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#13C8D9]/10 border border-[#13C8D9]/30 text-[#13C8D9] flex items-center justify-center mx-auto">
                <History className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-white">0 Historical Marks Found</h4>
                <p className="text-xs text-slate-400">
                  None available for {activeSubjectDisplay} in class {activeClassDisplay} yet. Use "Capture Marks Form" to enter and publish your first test.
                </p>
              </div>
              <button
                onClick={() => setActiveCategory('entry')}
                className="px-4 py-2 rounded-xl bg-[#13C8D9] hover:bg-[#18E2EC] text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-white">
                            {batch.assessment_name ? batch.assessment_name.replace(/\(\s*(\d+)\s*\/\s*\d+\s*\)/g, '($1%)') : 'Class Assessment'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#13C8D9]/15 text-[#13C8D9] font-mono text-[10px] font-bold border border-[#13C8D9]/30">
                            {batch.term || 'Term 3'}
                          </span>
                          <Badge variant={batchLevel.variant} size="sm">Avg {batch.class_average > 0 ? `${batch.class_average}%` : '0%'}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#13C8D9]" />
                            {batch.date_str || new Date(batch.recorded_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#13C8D9]" />
                            {batch.total_learners} Learners Recorded
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xl font-extrabold font-mono text-white">{batch.class_average > 0 ? `${batch.class_average}%` : '0%'}</span>
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
                                    <td className="py-2.5 px-3 font-mono font-bold text-[#13C8D9]">{m.learner_number || `2026-${m.child_id}`}</td>
                                    <td className="py-2.5 px-3 font-bold text-white">{`${m.full_name || ''} ${m.surname || ''}`.trim()}</td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{pVal > 0 ? `${pVal}%` : '0%'}</td>
                                    <td className="py-2.5 px-3 text-right">
                                      <Badge variant={caps.variant} size="sm">Level {caps.level}</Badge>
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
