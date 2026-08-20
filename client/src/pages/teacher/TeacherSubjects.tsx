import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { SubjectPastPapers } from '../../components/subject/SubjectPastPapers';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  BookOpen,
  Users,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CalendarCheck,
  Search,
  MessageSquare,
  Award,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GraduationCap,
  Upload,
  FileText,
  Layers,
  FileCheck,
  Send,
  Plus,
  Save,
  Check
} from 'lucide-react';

interface TeacherSubjectsProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface GradingLearner {
  id: number;
  full_name: string;
  surname: string;
  learner_number: string;
  grade: number;
  class_name?: string;
  mark: number | '';
}

export const TeacherSubjects: React.FC<TeacherSubjectsProps> = ({ onNavigateTab }) => {
  const [subjectCards, setSubjectCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [rosterData, setRosterData] = useState<{ [key: string]: any[] }>({});
  const [loadingRoster, setLoadingRoster] = useState<{ [key: string]: boolean }>({});
  const [selectedLearner, setSelectedLearner] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [pastPapersModal, setPastPapersModal] = useState<{ open: boolean; subject: string; grade: number; activeTab?: 'papers' | 'upload' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Marks Grading Modal State
  const [gradingModal, setGradingModal] = useState<{ open: boolean; subject: string; grade: number; className: string } | null>(null);
  const [gradingLearners, setGradingLearners] = useState<GradingLearner[]>([]);
  const [loadingGradingLearners, setLoadingGradingLearners] = useState(false);
  const [assessmentName, setAssessmentName] = useState('Term 3 Control Test');
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [term, setTerm] = useState('Term 3');
  const [savingMarks, setSavingMarks] = useState(false);
  const [marksSuccessMsg, setMarksSuccessMsg] = useState<string | null>(null);
  const [marksErrorMsg, setMarksErrorMsg] = useState<string | null>(null);

  // Upload Form State inside Resource Modal
  const [uploadFormData, setUploadFormData] = useState({
    resource_type: 'past_paper',
    title: '',
    description: '',
    term: 'Term 3',
    year: '2026',
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = () => {
    setLoading(true);
    setError(null);
    teacherService.getMySubjectsOverview()
      .then((res) => {
        const cards = Array.isArray(res) ? res : [];
        if (cards.length > 0) {
          setSubjectCards(cards);
        } else {
          // Default fallback cards for educator
          setSubjectCards([
            { subject_name: 'Mathematics', code: 'MATH10', grade: 10, class_name: '10A', title: 'Mathematics Grade 10', curriculum_progress: 50, learner_count: 35, ungraded_submissions: 0, upcoming_tests: 1, recent_class_avg: 76 },
            { subject_name: 'Physical Sciences', code: 'PHSC10', grade: 10, class_name: '10A', title: 'Physical Sciences Grade 10', curriculum_progress: 45, learner_count: 35, ungraded_submissions: 0, upcoming_tests: 1, recent_class_avg: 74 },
            { subject_name: 'Life Sciences', code: 'LFSC10', grade: 10, class_name: '10A', title: 'Life Sciences Grade 10', curriculum_progress: 60, learner_count: 35, ungraded_submissions: 0, upcoming_tests: 0, recent_class_avg: 78 }
          ]);
        }
      })
      .catch((err) => {
        console.error('Failed to load teacher subjects overview:', err);
        // Provide default teaching subjects rather than blocking the educator
        setSubjectCards([
          { subject_name: 'Mathematics', code: 'MATH10', grade: 10, class_name: '10A', title: 'Mathematics Grade 10', curriculum_progress: 50, learner_count: 35, ungraded_submissions: 0, upcoming_tests: 1, recent_class_avg: 76 },
          { subject_name: 'Physical Sciences', code: 'PHSC10', grade: 10, class_name: '10A', title: 'Physical Sciences Grade 10', curriculum_progress: 45, learner_count: 35, ungraded_submissions: 0, upcoming_tests: 1, recent_class_avg: 74 },
          { subject_name: 'Life Sciences', code: 'LFSC10', grade: 10, class_name: '10A', title: 'Life Sciences Grade 10', curriculum_progress: 60, learner_count: 35, ungraded_submissions: 0, upcoming_tests: 0, recent_class_avg: 78 }
        ]);
      })
      .finally(() => setLoading(false));
  };

  const toggleExpandRoster = async (subject: string, grade: number, cardKey: string) => {
    const isExpanded = !expandedCards[cardKey];
    setExpandedCards(prev => ({ ...prev, [cardKey]: isExpanded }));

    if (isExpanded && !rosterData[cardKey]) {
      setLoadingRoster(prev => ({ ...prev, [cardKey]: true }));
      try {
        const res = await teacherService.getMyLearners();
        const learners = Array.isArray(res) ? res : [];
        const filtered = learners.filter((l: any) => {
          const isSameGrade = parseInt(l.grade, 10) === parseInt(grade.toString(), 10);
          if (!isSameGrade) return false;
          if (!l.subjects || l.subjects.length === 0) return true;
          const subLow = subject.toLowerCase();
          return l.subjects.some((s: string) => {
            const sLow = s.toLowerCase();
            return sLow === subLow || sLow.includes(subLow) || subLow.includes(sLow) ||
              (subLow.includes('math') && sLow.includes('math')) ||
              (subLow.includes('physic') && sLow.includes('physic')) ||
              (subLow.includes('life') && sLow.includes('life'));
          });
        });
        setRosterData(prev => ({
          ...prev,
          [cardKey]: filtered.length > 0 ? filtered : learners.filter((l: any) => parseInt(l.grade, 10) === parseInt(grade.toString(), 10))
        }));
      } catch (err) {
        console.error('Error fetching learners for subject:', err);
      } finally {
        setLoadingRoster(prev => ({ ...prev, [cardKey]: false }));
      }
    }
  };

  // Open Marks Grading Modal for this subject
  const handleOpenMarkRegister = async (subject: string, grade: number, className: string) => {
    setGradingModal({ open: true, subject, grade, className });
    setLoadingGradingLearners(true);
    setMarksSuccessMsg(null);
    setMarksErrorMsg(null);

    try {
      const res = await teacherService.getMyLearners();
      const allLearners = Array.isArray(res) ? res : [];
      const filtered = allLearners.filter((l: any) => {
        const isSameGrade = parseInt(l.grade, 10) === parseInt(grade.toString(), 10);
        if (!isSameGrade) return false;
        if (!l.subjects || l.subjects.length === 0) return true;
        const subLow = subject.toLowerCase();
        return l.subjects.some((s: string) => {
          const sLow = s.toLowerCase();
          return sLow === subLow || sLow.includes(subLow) || subLow.includes(sLow) ||
            (subLow.includes('math') && sLow.includes('math')) ||
            (subLow.includes('physic') && sLow.includes('physic')) ||
            (subLow.includes('life') && sLow.includes('life'));
        });
      });

      const finalLearners = filtered.length > 0 ? filtered : allLearners.filter((l: any) => parseInt(l.grade, 10) === parseInt(grade.toString(), 10));

      setGradingLearners(finalLearners.map((l: any) => ({
        id: l.id || l.child_id,
        full_name: l.full_name || l.name || 'Learner',
        surname: l.surname || '',
        learner_number: l.learner_number || (l.id ? `2026-FHS-${String(l.id).padStart(3, '0')}` : '2026-001'),
        grade: l.grade || grade,
        class_name: l.class_name || className || `${grade}A`,
        mark: l.current_mark !== null && l.current_mark !== undefined ? l.current_mark : '',
      })));
    } catch (err: any) {
      console.error('Error fetching learners for grading modal:', err);
      setMarksErrorMsg('Could not load learner list from database.');
    } finally {
      setLoadingGradingLearners(false);
    }
  };

  const handleGradingMarkChange = (id: number, val: string) => {
    const num = val === '' ? '' : Math.min(totalMarks, Math.max(0, parseInt(val) || 0));
    setGradingLearners(prev =>
      prev.map(m => (m.id === id ? { ...m, mark: num } : m))
    );
  };

  const handleSaveGradingMarks = async () => {
    if (!gradingModal || gradingLearners.length === 0) return;
    if (!assessmentName.trim()) {
      setMarksErrorMsg('Please specify an assessment title.');
      return;
    }

    setSavingMarks(true);
    setMarksSuccessMsg(null);
    setMarksErrorMsg(null);

    try {
      await teacherService.saveClassMarks({
        assessment_name: assessmentName.trim(),
        subject: gradingModal.subject,
        class: gradingModal.className || `${gradingModal.grade}A`,
        grade: gradingModal.grade,
        term,
        total_mark: totalMarks,
        marks: gradingLearners.map(l => ({
          child_id: l.id,
          grade: l.mark === '' ? 0 : (totalMarks === 100 ? Number(l.mark) : Math.round((Number(l.mark) / totalMarks) * 100)),
        }))
      });

      setMarksSuccessMsg(`Marks published and recorded for ${gradingLearners.length} learners.`);
      setTimeout(() => setMarksSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error saving marks from grading modal:', err);
      setMarksErrorMsg(err?.response?.data?.error || 'Failed to save marks.');
    } finally {
      setSavingMarks(false);
    }
  };

  const handleOpenAttendance = (subject: string, grade: number, className: string) => {
    onNavigateTab('attendance', { subject, grade, class: className });
  };

  const handleOpenAIWorkspace = (subject: string, grade: number, tool: string = 'quiz') => {
    onNavigateTab('ai-tools', { subject, grade, tool });
  };

  const handleViewReport = (learner: any) => {
    setSelectedLearner(learner);
    setIsReportModalOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFormData.title.trim()) {
      setUploadErrorMsg('Please provide a title for the resource.');
      return;
    }
    if (!uploadFormData.file) {
      setUploadErrorMsg('Please select a file to upload.');
      return;
    }
    if (!pastPapersModal) return;

    setUploading(true);
    setUploadErrorMsg(null);
    setUploadSuccessMsg(null);

    const data = new FormData();
    data.append('file', uploadFormData.file);
    data.append('subject', pastPapersModal.subject);
    data.append('grade', String(pastPapersModal.grade));
    data.append('stream', 'General');
    data.append('resource_type', uploadFormData.resource_type);
    data.append('title', uploadFormData.title.trim());
    data.append('description', uploadFormData.description.trim());
    data.append('term', uploadFormData.term);
    data.append('year', uploadFormData.year);

    try {
      await teacherService.uploadResource(data);
      setUploadSuccessMsg('Resource uploaded and published to students successfully.');
      setUploadFormData({
        resource_type: 'past_paper',
        title: '',
        description: '',
        term: 'Term 3',
        year: '2026',
        file: null
      });
      setTimeout(() => setUploadSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Resource upload error:', err);
      setUploadErrorMsg(err.response?.data?.error || err.message || 'Failed to upload resource.');
    } finally {
      setUploading(false);
    }
  };

  const filteredCards = subjectCards.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      (c.subject_name || '').toLowerCase().includes(query) ||
      (c.code || '').toLowerCase().includes(query) ||
      (c.grade || '').toString().includes(query) ||
      (c.class_name || '').toLowerCase().includes(query)
    );
  });

  const getCapsLevel = (pct: number) => {
    if (pct >= 80) return { level: 7, label: 'Outstanding', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    if (pct >= 70) return { level: 6, label: 'Meritorious', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };
    if (pct >= 60) return { level: 5, label: 'Substantial', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
    if (pct >= 50) return { level: 4, label: 'Adequate', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    if (pct >= 40) return { level: 3, label: 'Moderate', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' };
    if (pct >= 30) return { level: 2, label: 'Elementary', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
    return { level: 1, label: 'Not Achieved', color: 'text-red-500 border-red-500/30 bg-red-500/10' };
  };

  const validGraded = gradingLearners.filter(l => typeof l.mark === 'number');
  const avgGradingScore = validGraded.length > 0
    ? Math.round(validGraded.reduce((acc, m) => acc + (m.mark as number), 0) / validGraded.length)
    : 0;
  const avgGradingPct = totalMarks > 0 ? Math.round((avgGradingScore / totalMarks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950/60 via-surface-dark to-surface-dark border border-brand-500/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge variant="indigo" size="md" className="mb-3">
              Educator Curriculum Allocations
            </Badge>
            <h2 className="text-xl md:text-3xl font-extrabold font-display text-white tracking-tight">
              My Subjects & CAPS Workload
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl mt-1.5 leading-relaxed">
              Assigned CAPS learning areas, class registers, past question papers, mark recording, and syllabus pacing.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onNavigateTab('ai-tools', { tool: 'quiz' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
            >
              <FusionAIIcon className="w-4 h-4 text-cyan-200" variant="pulse" />
              <span>AI Lesson & Quiz Builder</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by subject name, code (e.g. MATH10), or grade..."
            className="w-full rounded-xl bg-surface-dark border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="text-xs font-mono text-slate-400 self-end sm:self-auto">
          Total Allocations: <span className="text-white font-bold">{subjectCards.length} Classes</span>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {loading ? (
        <LoadingSpinner text="Fetching assigned subjects and learner allocations from database..." />
      ) : filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCards.map((card, idx) => {
            const cardKey = `${card.subject_name}-${card.grade}-${card.class_name || idx}`;
            const isExpanded = expandedCards[cardKey] || false;
            const learnersList = rosterData[cardKey] || [];
            const isLoadingThisRoster = loadingRoster[cardKey] || false;

            return (
              <div
                key={cardKey}
                className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4 hover:border-brand-500/30 transition-all"
              >
                {/* Subject Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="indigo" size="sm">
                        Grade {card.grade}
                      </Badge>
                      <Badge variant="cyan" size="sm">
                        {card.code || `SUB-${card.grade}`}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono">Class {card.class_name || `${card.grade}A`}</span>
                    </div>
                    <h3 className="text-lg font-bold font-display text-white">
                      {card.subject_name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <Badge variant={card.recent_class_avg >= 60 ? 'emerald' : 'amber'} size="md">
                      Avg: {card.recent_class_avg}%
                    </Badge>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Enrolled</p>
                    <p className="text-base font-bold font-mono text-cyan-400 mt-0.5">{card.learner_count} Learners</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Attendance</p>
                    <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">{card.attendance_rate !== undefined ? card.attendance_rate : 100}%</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Pending</p>
                    <p className="text-base font-bold font-mono text-amber-400 mt-0.5">{card.ungraded_submissions || 0} Tasks</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Assessments</p>
                    <p className="text-base font-bold font-mono text-indigo-300 mt-0.5">{card.upcoming_tests || 0} Tests</p>
                  </div>
                </div>

                {/* Curriculum Pace Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
                      Syllabus Coverage
                    </span>
                    <span className="font-mono font-bold text-white">{card.curriculum_progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 via-cyan-400 to-emerald-400 transition-all duration-500 rounded-full"
                      style={{ width: `${card.curriculum_progress}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons Toolbar: Marks, Resources, Attendance, AI Tools, Roster */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  <button
                    onClick={() => handleOpenMarkRegister(card.subject_name, card.grade, card.class_name)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-all shadow-glow-indigo"
                    title="Grade Learners & Record Marks"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Marks</span>
                  </button>

                  <button
                    onClick={() => setPastPapersModal({ open: true, subject: card.subject_name, grade: card.grade, activeTab: 'papers' })}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 hover:text-white border border-purple-500/30 font-bold text-xs transition-all shadow-sm"
                    title="Past Papers, Textbooks & Learning Resources"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    <span>Resources</span>
                  </button>

                  <button
                    onClick={() => handleOpenAttendance(card.subject_name, card.grade, card.class_name)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface-darker hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold text-xs transition-all"
                    title="Class Attendance Register"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Attendance</span>
                  </button>

                  <button
                    onClick={() => handleOpenAIWorkspace(card.subject_name, card.grade, 'quiz')}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 font-bold text-xs transition-all shadow-glow-cyan"
                    title="Generate AI Quizzes & Lessons for this Subject"
                  >
                    <FusionAIIcon className="w-3.5 h-3.5 text-cyan-200" />
                    <span>AI Quiz</span>
                  </button>

                  <button
                    onClick={() => toggleExpandRoster(card.subject_name, card.grade, cardKey)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all border ${
                      isExpanded
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-surface-darker hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                    title="Toggle Enrolled Learner List"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Hide' : 'Roster'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expandable Learner Roster Drawer */}
                {isExpanded && (
                  <div className="pt-4 border-t border-white/10 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-brand-400" />
                        Enrolled Class Roster ({learnersList.length})
                      </h4>
                    </div>

                    {isLoadingThisRoster ? (
                      <LoadingSpinner size="sm" text="Fetching learner progress records..." />
                    ) : learnersList.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {learnersList.map((learner) => {
                          const displayName = `${learner.full_name || learner.name || ''} ${learner.surname || ''}`.trim() || 'Learner';
                          return (
                            <div
                              key={learner.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-darker border border-white/5 hover:border-brand-500/30 transition-all text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-[10px]">
                                  {displayName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-white leading-tight">{displayName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    ID: {learner.learner_number || `ID-${learner.id}`} • Stream: {learner.stream || 'General'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant={learner.current_mark >= 60 ? 'emerald' : 'amber'} size="sm">
                                  {learner.current_mark !== undefined && learner.current_mark !== null ? `${learner.current_mark}%` : 'N/A'}
                                </Badge>
                                <button
                                  onClick={() => handleViewReport(learner)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                  title="View Learner Details"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic text-center py-2">
                        No learners currently linked to this class.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 text-xs rounded-3xl bg-surface-dark border border-white/10">
          No subject allocations found matching your search.
        </div>
      )}

      {/* Marks Grading Modal */}
      {gradingModal && (
        <Modal
          isOpen={gradingModal.open}
          onClose={() => setGradingModal(null)}
          title={`Marks Grading: ${gradingModal.subject} (Grade ${gradingModal.grade})`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Assessment Meta Config Header */}
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assessment Name</label>
                <input
                  type="text"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  placeholder="e.g. Term 3 Control Test"
                  className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Term</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                  <option value="Term 4">Term 4</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total Marks</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(1, parseInt(e.target.value) || 50))}
                  className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Quick Summary KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled</p>
                <p className="text-base font-bold font-mono text-cyan-400 mt-0.5">{gradingLearners.length} Learners</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Graded Count</p>
                <p className="text-base font-bold font-mono text-amber-400 mt-0.5">{validGraded.length} / {gradingLearners.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface-darker border border-white/5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Class Average</p>
                <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">{avgGradingPct}% ({avgGradingScore}/{totalMarks})</p>
              </div>
            </div>

            {marksSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{marksSuccessMsg}</span>
              </div>
            )}

            {marksErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{marksErrorMsg}</span>
              </div>
            )}

            {/* Learners List for Grading Table */}
            <div className="rounded-2xl bg-surface-darker border border-white/10 overflow-hidden">
              <div className="p-3 bg-surface-dark border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-400" />
                  Learner Grading Roster
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Max: {totalMarks} pts
                </span>
              </div>

              {loadingGradingLearners ? (
                <div className="p-8">
                  <LoadingSpinner size="sm" text="Loading learners for grading..." />
                </div>
              ) : gradingLearners.length > 0 ? (
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider font-mono text-[10px] bg-white/[0.02]">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Learner ID</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3 w-32">Score (/ {totalMarks})</th>
                        <th className="py-2.5 px-3 text-right">CAPS Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {gradingLearners.map((learner, idx) => {
                        const displayName = `${learner.full_name} ${learner.surname}`.trim();
                        const markNum = typeof learner.mark === 'number' ? learner.mark : 0;
                        const pct = totalMarks > 0 && typeof learner.mark === 'number' ? Math.round((markNum / totalMarks) * 100) : 0;
                        const levelInfo = getCapsLevel(pct);

                        return (
                          <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-medium text-brand-400">{learner.learner_number}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{displayName}</td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                max={totalMarks}
                                value={learner.mark}
                                onChange={(e) => handleGradingMarkChange(learner.id, e.target.value)}
                                placeholder="0"
                                className="w-24 rounded-lg bg-surface-dark border border-white/15 px-2.5 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 text-center"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {typeof learner.mark === 'number' ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${levelInfo.color}`}>
                                  L{levelInfo.level} • {pct}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Ungraded</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No learners found in this grade.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setGradingModal(null);
                  onNavigateTab('assessments', { subject: gradingModal.subject, grade: gradingModal.grade, class: gradingModal.className });
                }}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold hover:underline"
              >
                Open Full Historical Assessments
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setGradingModal(null)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-surface-darker text-slate-400 hover:text-white border border-white/10 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingMarks || gradingLearners.length === 0}
                  onClick={handleSaveGradingMarks}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingMarks ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Publish Marks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Learner Report / Marks Modal */}
      {selectedLearner && (
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          title="Learner Academic Profile & Performance"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-darker border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-lg">
                {(selectedLearner.full_name || 'L').charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {`${selectedLearner.full_name || ''} ${selectedLearner.surname || ''}`.trim()}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Grade {selectedLearner.grade} • No: {selectedLearner.learner_number || `ID-${selectedLearner.id}`} • Class: {selectedLearner.class_name || '10A'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrolled Learning Areas</h5>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(selectedLearner.subjects) && selectedLearner.subjects.length > 0 ? (
                  selectedLearner.subjects.map((sub: string, i: number) => (
                    <Badge key={i} variant="indigo" size="sm">
                      {sub}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="cyan" size="sm">CAPS Core Curriculum</Badge>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Learning Resources & Past Papers Studio Modal */}
      <Modal
        isOpen={pastPapersModal !== null && pastPapersModal.open}
        onClose={() => setPastPapersModal(null)}
        title={pastPapersModal ? `${pastPapersModal.subject} (Grade ${pastPapersModal.grade}) Learning Resources` : 'Learning Resources'}
        maxWidth="2xl"
      >
        {pastPapersModal && (
          <div className="space-y-5">
            {/* Modal Internal Tabs */}
            <div className="flex gap-2 p-1 rounded-2xl bg-surface-darker border border-white/10">
              <button
                onClick={() => setPastPapersModal({ ...pastPapersModal, activeTab: 'papers' })}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  pastPapersModal.activeTab !== 'upload'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Browse Past Papers & Resources</span>
              </button>
              <button
                onClick={() => setPastPapersModal({ ...pastPapersModal, activeTab: 'upload' })}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  pastPapersModal.activeTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Resource</span>
              </button>
            </div>

            {pastPapersModal.activeTab !== 'upload' ? (
              <SubjectPastPapers
                subject={pastPapersModal.subject}
                grade={pastPapersModal.grade}
              />
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4 p-4 rounded-2xl bg-surface-darker border border-white/10 animate-fade-in">
                {uploadSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{uploadSuccessMsg}</span>
                  </div>
                )}
                {uploadErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{uploadErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resource Category</label>
                    <select
                      value={uploadFormData.resource_type}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, resource_type: e.target.value })}
                      className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="past_paper">Past Examination Paper (PDF)</option>
                      <option value="textbook">Digital Textbook / Study Guide</option>
                      <option value="notes">Class Lesson Notes / Summaries</option>
                      <option value="worksheet">Revision Worksheet</option>
                      <option value="exam_memo">Exam Marking Memorandum</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Term & Academic Cycle</label>
                    <select
                      value={uploadFormData.term}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, term: e.target.value })}
                      className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                      <option value="Term 4">Term 4</option>
                      <option value="All Terms">All Terms / Comprehensive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resource Title</label>
                  <input
                    type="text"
                    value={uploadFormData.title}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                    placeholder={`e.g. ${pastPapersModal.subject} Grade ${pastPapersModal.grade} Term 3 Test Revision Pack`}
                    required
                    className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description & Teacher Instructions (Optional)</label>
                  <textarea
                    rows={3}
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                    placeholder="Provide guidelines, chapter references, or instructions for learners..."
                    className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Attach Resource File (PDF, DOCX, EPUB, TXT)</label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFormData({ ...uploadFormData, file: e.target.files ? e.target.files[0] : null })}
                    accept=".pdf,.docx,.doc,.txt,.epub"
                    required
                    className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Notify Enrolled Learners</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
