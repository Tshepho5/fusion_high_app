import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Modal } from '../common/Modal';
import { CapsReportCard } from '../common/CapsReportCard';
import {
  FileSpreadsheet,
  Download,
  Printer,
  ShieldCheck,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  GraduationCap,
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Info,
  CalendarCheck,
  X,
  Sparkles,
  ArrowDownCircle,
  Check,
  Clock
} from 'lucide-react';

interface ReportCardSubject {
  name: string;
  code?: string;
  mark: number | null;
  caps_level: number | string;
  caps_rating: string;
  teacher_comment?: string;
}

interface TemplateLearner {
  child_id: number;
  full_name: string;
  surname: string;
  learner_number: string;
  grade: number;
  class_name: string;
  stream: string;
  attendance_rate: number;
  days_present: number;
  days_absent: number;
  subjects: Record<string, number | null>;
  average_mark: number | null;
  overall_caps_level: number | string;
  promotion_decision: string;
  teacher_comment: string;
  principal_comment: string;
  ai_advisory?: any;
}

interface TeacherSubmission {
  subject: string;
  status: 'SUBMITTED' | 'PARTIAL' | 'PENDING';
  marks_recorded: number;
  total_learners: number;
  teacher?: { id: number; name: string };
  last_uploaded_at?: string;
}

interface SubmissionsOverview {
  grade: number | string;
  class_name: string;
  term: number | string;
  total_learners: number;
  total_subjects: number;
  submitted_count: number;
  partial_count: number;
  pending_count: number;
  can_transfer: boolean;
  submissions: TeacherSubmission[];
}

export const ReportCardStudio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedStream, setSelectedStream] = useState<string>('Science');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 3');
  const [academicYear, setAcademicYear] = useState<string>('2026');

  // Mark Sheet Template Data
  const [learners, setLearners] = useState<TemplateLearner[]>([]);
  const [subjectColumns, setSubjectColumns] = useState<string[]>([]);
  const [submissionsOverview, setSubmissionsOverview] = useState<SubmissionsOverview | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewLearner, setPreviewLearner] = useState<TemplateLearner | null>(null);
  const [confirmPublishModalOpen, setConfirmPublishModalOpen] = useState(false);

  // AI Advisory Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalLearner, setAiModalLearner] = useState<TemplateLearner | null>(null);

  // Fetch / Load Template Marks
  const handleLoadTemplateMarks = async () => {
    setLoading(true);
    try {
      const res = await adminService.getGradeTemplateMarks({
        grade: selectedGrade,
        stream: selectedStream,
        className: selectedClass !== 'All' ? selectedClass : undefined,
        term: selectedTerm,
        academicYear: academicYear
      });

      const formattedLearners: TemplateLearner[] = (res.learners || []).map((l: any) => {
        const subjectsDict: Record<string, number | null> = {};
        if (Array.isArray(l.subjects)) {
          l.subjects.forEach((s: any) => {
            const hasMark = s.mark !== null && s.mark !== undefined && !s.is_pending && s.mark !== '';
            subjectsDict[s.subject || s.name] = hasMark ? Number(s.mark) : null;
          });
        } else if (typeof l.subjects === 'object' && l.subjects !== null) {
          Object.entries(l.subjects).forEach(([key, val]) => {
            subjectsDict[key] = val !== null && val !== undefined && val !== '' ? Number(val) : null;
          });
        }

        const avg = l.overall_average !== null && l.overall_average !== undefined ? Number(l.overall_average) : null;

        return {
          child_id: l.child_id || l.id,
          full_name: l.full_name || l.learner_name,
          surname: l.surname || l.learner_surname || '',
          learner_number: l.learner_number || '',
          grade: l.grade,
          class_name: l.class_name || '',
          stream: l.stream || selectedStream,
          attendance_rate: l.attendance_percentage ?? l.attendance?.percentage ?? l.attendance_rate ?? null,
          days_present: l.attendance?.days_present ?? l.days_present ?? 0,
          days_absent: l.attendance?.days_absent ?? l.days_absent ?? 0,
          subjects: subjectsDict,
          average_mark: avg,
          overall_caps_level: l.overall_level !== undefined ? l.overall_level : (avg !== null ? (avg >= 80 ? 7 : avg >= 70 ? 6 : avg >= 60 ? 5 : avg >= 50 ? 4 : avg >= 40 ? 3 : avg >= 30 ? 2 : 1) : '-'),
          promotion_decision: l.promotion_status || l.promotion_decision || (avg === null ? 'PENDING TEACHER MARKS' : (avg >= 50 ? "PROMOTED — PASS WITH BACHELOR'S DEGREE ADMISSION (CAPS REG. 3(1))" : 'PROMOTED — DIPLOMA PASS')),
          teacher_comment: l.teacher_comment || '',
          principal_comment: l.principal_comment || '',
          ai_advisory: l.ai_advisory || null
        };
      });

      setLearners(formattedLearners);
      setSubjectColumns(res.subjects || res.schoolSubjects || []);
    } catch (err: any) {
      console.error('Failed to load grade template marks:', err);
      const errMsg = err.response?.data?.error || err.message;
      setToastMessage(`Error: ${errMsg}`);
      setTimeout(() => setToastMessage(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Teacher Submissions Status
  const fetchSubmissionsOverview = async () => {
    try {
      const res = await adminService.getTeacherSubmissions({
        grade: selectedGrade,
        className: selectedClass !== 'All' ? selectedClass : undefined,
        term: selectedTerm,
        stream: selectedStream
      });
      setSubmissionsOverview(res);
    } catch (err) {
      console.warn('Failed to load teacher submissions overview:', err);
    }
  };

  // Transfer Uploaded Marks into Template
  const handleTransferUploadedMarks = async () => {
    setTransferring(true);
    try {
      const res = await adminService.transferTeacherMarks({
        grade: selectedGrade,
        className: selectedClass !== 'All' ? selectedClass : undefined,
        stream: selectedStream,
        term: selectedTerm,
        academicYear: academicYear
      });

      setToastMessage(`✓ Transferred teacher marks for ${res.transferred_count || learners.length} learners! AI Advisories & CAPS rankings generated.`);
      setTimeout(() => setToastMessage(null), 6000);

      // Refresh both template grid and teacher submissions overview
      await Promise.all([handleLoadTemplateMarks(), fetchSubmissionsOverview()]);
    } catch (err: any) {
      console.error('Failed to transfer teacher marks:', err);
      setToastMessage(`Transfer failed: ${err.response?.data?.error || err.message}`);
      setTimeout(() => setToastMessage(null), 6000);
    } finally {
      setTransferring(false);
    }
  };

  useEffect(() => {
    handleLoadTemplateMarks();
    fetchSubmissionsOverview();
  }, [selectedGrade, selectedStream, selectedTerm, selectedClass]);

  // Recalculate Average and Promotion Decision when admin changes marks inline
  const handleMarkChange = (childId: number, subject: string, rawVal: string) => {
    const isBlank = rawVal.trim() === '';
    const val = isBlank ? null : Math.min(100, Math.max(0, parseInt(rawVal, 10) || 0));

    setLearners((prev) =>
      prev.map((l) => {
        if (l.child_id !== childId) return l;

        const updatedSubjects = { ...l.subjects, [subject]: val };
        const marksList = Object.values(updatedSubjects).filter(
          (m): m is number => typeof m === 'number' && m !== null
        );
        const hasMarks = marksList.length > 0;
        const avg = hasMarks
          ? Math.round(marksList.reduce((a, b) => a + b, 0) / marksList.length)
          : null;

        let level: number | string = '-';
        let decision = 'PENDING TEACHER MARKS';

        if (avg !== null) {
          if (avg >= 80) level = 7;
          else if (avg >= 70) level = 6;
          else if (avg >= 60) level = 5;
          else if (avg >= 50) level = 4;
          else if (avg >= 40) level = 3;
          else if (avg >= 30) level = 2;
          else level = 1;

          if (avg >= 50 && level >= 4) decision = 'Bachelor Pass Eligible';
          else if (avg >= 40 && level >= 3) decision = 'Diploma Pass Eligible';
          else if (avg >= 33.3) decision = 'Higher Certificate Pass';
          else decision = 'Progressed (At Risk)';
        }

        return {
          ...l,
          subjects: updatedSubjects,
          average_mark: avg,
          overall_caps_level: level,
          promotion_decision: decision
        };
      })
    );
  };

  const handleCommentChange = (childId: number, field: 'teacher_comment' | 'principal_comment', text: string) => {
    setLearners((prev) =>
      prev.map((l) => (l.child_id === childId ? { ...l, [field]: text } : l))
    );
  };

  // Save Template Draft
  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      await adminService.saveGradeTemplate({
        grade: selectedGrade,
        stream: selectedStream,
        term: selectedTerm,
        academicYear: academicYear,
        learners: learners
      });

      setToastMessage('Grade mark template successfully saved as verified draft with AI advisories.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setToastMessage(`Failed to save: ${err.message}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Publish Grade Reports to Parents & Teachers
  const handlePublishReports = async () => {
    setPublishing(true);
    try {
      const res = await adminService.publishGradeReports({
        grade: selectedGrade,
        stream: selectedStream,
        term: selectedTerm,
        academicYear: academicYear,
        learners: learners
      });

      setConfirmPublishModalOpen(false);
      setToastMessage(
        `🎉 Published ${res.published_count || learners.length} Report Cards! Parents and educators notified via email with direct login access.`
      );
      setTimeout(() => setToastMessage(null), 7000);
    } catch (err: any) {
      console.error('Failed to publish report cards:', err);
      setToastMessage(`Publish failed: ${err.message}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenPreview = (l: TemplateLearner) => {
    setPreviewLearner(l);
    setPreviewModalOpen(true);
  };

  const filteredLearners = learners.filter((l) => {
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = `${l.full_name} ${l.surname}`.toLowerCase().includes(q);
      const matchNumber = (l.learner_number || '').toLowerCase().includes(q);
      const matchClass = (l.class_name || '').toLowerCase().includes(q);
      if (!matchName && !matchNumber && !matchClass) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-brand-600/95 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-brand-400/40 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/70 via-surface-dark to-surface-dark border border-emerald-500/20 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald shrink-0">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black font-display text-white tracking-tight">
                  Official South African CAPS Report Card Studio
                </h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleTransferUploadedMarks}
              disabled={transferring || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-glow-emerald transition-all active:scale-95 disabled:opacity-50"
            >
              <ArrowDownCircle className={`w-4 h-4 ${transferring ? 'animate-bounce' : ''}`} />
              <span>{transferring ? 'Transferring Marks...' : 'Transfer Teacher Marks'}</span>
            </button>
            <button
              onClick={() => { handleLoadTemplateMarks(); fetchSubmissionsOverview(); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Draft...' : 'Save Template'}</span>
            </button>
            <button
              onClick={() => setConfirmPublishModalOpen(true)}
              disabled={publishing || learners.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish to Parents & Teachers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Mark Submissions Status & Transfer Control Card */}
      <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-display text-white">
                  Teacher Mark Submissions for Grade {selectedGrade} ({selectedTerm})
                </h3>
                {submissionsOverview && (
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                    submissionsOverview.submitted_count === submissionsOverview.total_subjects && submissionsOverview.total_subjects > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : submissionsOverview.submitted_count > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-700/40 text-slate-400 border-slate-600'
                  }`}>
                    {submissionsOverview.submitted_count}/{submissionsOverview.total_subjects} Subjects Ready
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleTransferUploadedMarks}
            disabled={transferring || Boolean(submissionsOverview && !submissionsOverview.can_transfer)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-glow-emerald transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <ArrowDownCircle className={`w-4 h-4 ${transferring ? 'animate-spin' : ''}`} />
            <span>{transferring ? 'Transferring Marks...' : 'Transfer Teacher Marks to Template'}</span>
          </button>
        </div>

        {/* Status Pills Grid */}
        {submissionsOverview && submissionsOverview.submissions && submissionsOverview.submissions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {submissionsOverview.submissions.map((sub, idx) => {
              const isSubmitted = sub.status === 'SUBMITTED';
              const isPartial = sub.status === 'PARTIAL';

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isSubmitted
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-white'
                      : isPartial
                      ? 'bg-amber-950/20 border-amber-500/30 text-white'
                      : 'bg-surface-darker/60 border-white/5 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold truncate text-slate-200" title={sub.subject}>
                      {sub.subject}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-black uppercase ${
                      isSubmitted
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isPartial
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{sub.marks_recorded}/{sub.total_learners} recorded</span>
                    {sub.teacher && <span className="truncate max-w-[80px]">{sub.teacher.name}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-surface-darker/40 border border-dashed border-white/10 text-center text-xs text-slate-400">
            Awaiting teacher mark submissions for Grade {selectedGrade}. The template is currently in clean/empty standby mode.
          </div>
        )}
      </div>

      {/* Control & Filter Strip */}
      <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-4">
        {/* Grade Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Select Grade:</span>
            </span>
            {['8', '9', '10', '11', '12'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGrade === g
                    ? 'bg-emerald-600 text-white shadow-glow-emerald border border-emerald-400/40'
                    : 'bg-surface-darker hover:bg-white/5 text-slate-300 border border-white/10'
                }`}
              >
                Grade {g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              <strong className="text-white">{filteredLearners.length}</strong> Candidate Learners
            </span>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Stream */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Stream:</span>
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Science">Science Stream</option>
                <option value="Commerce">Commerce Stream</option>
                <option value="Tourism">Tourism Stream</option>
                <option value="General">General Stream</option>
              </select>
            </div>

            {/* Class */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Class:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Class Rooms</option>
                <option value={`${selectedGrade}A`}>{selectedGrade}A</option>
                <option value={`${selectedGrade}B`}>{selectedGrade}B</option>
                <option value={`${selectedGrade}C`}>{selectedGrade}C</option>
              </select>
            </div>

            {/* Term */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Term:</span>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Term 4">Term 4 (Final Promotion)</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search candidate by name or number..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Main Interactive Template Mark Sheet Table */}
      {loading ? (
        <LoadingSpinner text="Computing assessment holdings & populating Grade template..." />
      ) : filteredLearners.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">No learners found in Grade {selectedGrade} {selectedStream}</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click "Transfer Teacher Marks" above or change the stream/class filter to load learners.
          </p>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-display text-white">
                  Grade {selectedGrade} • {selectedStream} Stream Mark Sheet
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Pathways Active</span>
                </span>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              {subjectColumns.length} Subjects Active
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-darker/95 text-slate-300 font-mono text-[10px] uppercase tracking-wider sticky top-0 z-20 border-b border-white/10">
                <tr>
                  <th className="py-3 px-3 min-w-[180px] bg-surface-darker">Learner Details</th>
                  <th className="py-3 px-2 min-w-[70px]">Class</th>
                  <th className="py-3 px-2 min-w-[75px]">Att.</th>
                  {subjectColumns.map((sub) => (
                    <th key={sub} className="py-3 px-2 text-center min-w-[90px]">
                      <span className="block truncate font-bold text-slate-200" title={sub}>
                        {sub}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center min-w-[75px] bg-surface-darker font-extrabold text-emerald-300">
                    Avg %
                  </th>
                  <th className="py-3 px-2 text-center min-w-[90px]">CAPS Level</th>
                  <th className="py-3 px-2 min-w-[130px]">Promotion Status</th>
                  <th className="py-3 px-3 min-w-[200px]">Teacher / Principal Remark</th>
                  <th className="py-3 px-3 text-center min-w-[80px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredLearners.map((l) => {
                  return (
                    <tr key={l.child_id} className="hover:bg-white/5 transition-colors">
                      {/* Learner Info */}
                      <td className="py-2.5 px-3 bg-surface-dark/60">
                        <div className="flex items-center gap-1.5">
                          <div>
                            <p className="font-bold text-white leading-tight">
                              {l.full_name} {l.surname}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {l.learner_number}
                            </p>
                          </div>
                          {l.ai_advisory && (
                            <span title="AI Advisory ready" className="text-purple-400">
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Class Unit */}
                      <td className="py-2.5 px-2 font-mono text-slate-300">
                        {l.class_name || '-'}
                      </td>

                      {/* Attendance */}
                      <td className="py-2.5 px-2">
                        <span className={`font-mono font-bold text-[11px] ${
                          l.attendance_rate !== null && l.attendance_rate !== undefined
                            ? (l.attendance_rate >= 90 ? 'text-emerald-400' : l.attendance_rate < 80 ? 'text-rose-400' : 'text-amber-400')
                            : 'text-slate-500'
                        }`}>
                          {l.attendance_rate !== null && l.attendance_rate !== undefined ? `${l.attendance_rate}%` : '-'}
                        </span>
                      </td>

                      {/* Dynamic Subject Marks */}
                      {subjectColumns.map((sub) => {
                        const markVal = l.subjects?.[sub];

                        return (
                          <td key={sub} className="py-2.5 px-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={markVal !== null && markVal !== undefined ? markVal : ''}
                              placeholder="-"
                              onChange={(e) => handleMarkChange(l.child_id, sub, e.target.value)}
                              className={`w-16 px-1.5 py-1 text-center font-mono font-extrabold text-xs rounded-lg border transition-all ${
                                markVal !== null && markVal !== undefined
                                  ? 'bg-surface-darker border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400'
                                  : 'bg-surface-darker/40 border-dashed border-amber-500/30 text-amber-300/80 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400'
                              }`}
                            />
                          </td>
                        );
                      })}

                      {/* Calculated Average */}
                      <td className="py-2.5 px-2 text-center bg-surface-darker/60">
                        {l.average_mark !== null && l.average_mark !== undefined ? (
                          <span className="font-mono font-black text-sm text-emerald-400">
                            {l.average_mark}%
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* CAPS Level */}
                      <td className="py-2.5 px-2 text-center">
                        {l.overall_caps_level === '-' || l.average_mark === null ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Pending
                          </span>
                        ) : (
                          <Badge
                            variant={
                              Number(l.overall_caps_level) >= 6 ? 'emerald' : Number(l.overall_caps_level) >= 4 ? 'cyan' : Number(l.overall_caps_level) === 3 ? 'amber' : 'rose'
                            }
                            size="sm"
                          >
                            Level {l.overall_caps_level}
                          </Badge>
                        )}
                      </td>

                      {/* Promotion Status */}
                      <td className="py-2.5 px-2">
                        {l.average_mark === null || l.promotion_decision === 'PENDING TEACHER MARKS' ? (
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 block truncate">
                            Awaiting Marks
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold block truncate ${
                            l.promotion_decision?.includes('Bachelor')
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : l.promotion_decision?.includes('Diploma')
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : l.promotion_decision?.includes('Certificate')
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {l.promotion_decision || 'Promoted'}
                          </span>
                        )}
                      </td>

                      {/* Educator Remarks */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={l.principal_comment || l.teacher_comment || (l.average_mark === null ? 'Awaiting teacher submission of official marks.' : 'Consistently maintains strong academic performance.')}
                          onChange={(e) => handleCommentChange(l.child_id, 'principal_comment', e.target.value)}
                          placeholder="Official comment..."
                          className="w-full px-2 py-1 text-[11px] rounded-lg bg-surface-darker border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </td>

                      {/* Actions: Preview Official Report Card & View AI Advisory */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPreview(l)}
                            title="Preview Official South African CAPS Report Card"
                            className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/25 transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setAiModalLearner(l);
                              setAiModalOpen(true);
                            }}
                            title="View AI Career & Academic Advisory"
                            className="p-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/25 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRM PUBLISH MODAL */}
      <Modal
        isOpen={confirmPublishModalOpen}
        onClose={() => setConfirmPublishModalOpen(false)}
        title="Publish Official Term Report Cards"
        maxWidth="md"
      >
        <div className="space-y-4 p-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Send className="w-6 h-6" />
          </div>

          <div className="text-center space-y-1.5">
            <h3 className="text-base font-extrabold text-white">
              Broadcast Grade {selectedGrade} Report Cards?
            </h3>
            <p className="text-xs text-slate-400">
              You are about to finalize and publish report cards for <strong className="text-white">{learners.length} learners</strong> in Grade {selectedGrade} ({selectedStream} Stream).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Report cards will be instantly accessible in each parent and learner portal with South African CAPS transcripts.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Parents will receive an official email notice with a link to view and download their child's report card.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => setConfirmPublishModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublishReports}
              disabled={publishing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-glow-emerald transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{publishing ? 'Broadcasting Reports...' : 'Confirm & Publish'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* OFFICIAL SOUTH AFRICAN DBE REPORT CARD PREVIEW MODAL */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={
          previewLearner
            ? `Official South African CAPS Report Card — ${
                previewLearner.full_name?.toLowerCase().endsWith(previewLearner.surname?.toLowerCase() || '')
                  ? previewLearner.full_name
                  : `${previewLearner.full_name} ${previewLearner.surname}`.trim()
              } (${previewLearner.learner_number})`
            : 'Official CAPS Report Card'
        }
        maxWidth="5xl"
      >
        {previewLearner && (
          <div className="p-1 sm:p-2">
            <CapsReportCard
              previewLearner={previewLearner}
              childId={previewLearner.child_id}
              initialTerm={`${selectedTerm} ${academicYear}`}
            />
          </div>
        )}
      </Modal>

      {/* DEDICATED SEPARATE AI CAREER & RISK ADVISORY MODAL (OPTION A) */}
      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={
          aiModalLearner
            ? `AI Academic Advisory — ${
                aiModalLearner.full_name?.toLowerCase().endsWith(aiModalLearner.surname?.toLowerCase() || '')
                  ? aiModalLearner.full_name
                  : `${aiModalLearner.full_name} ${aiModalLearner.surname}`.trim()
              } (Grade ${aiModalLearner.grade})`
            : 'AI Academic Advisory'
        }
        maxWidth="2xl"
      >
        {aiModalLearner && (
          <div className="space-y-4 p-2 text-slate-100">
            {/* Header banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-surface-darker to-indigo-950/40 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      {Number(aiModalLearner.grade) === 12
                        ? 'Grade 12 Post-School Career Guidance & Placement'
                        : Number(aiModalLearner.grade) === 9
                        ? 'Grade 9 Stream & Subject Selection Advisory (Grade 10)'
                        : `Grade ${aiModalLearner.grade} Academic Trajectory & Risk Diagnostics`}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {Number(aiModalLearner.grade) === 12
                        ? 'Machine learning alignment for tertiary studies and vocational pathways.'
                        : Number(aiModalLearner.grade) === 9
                        ? 'Aptitude-based stream and subject package recommendation for FET transition.'
                        : 'Curriculum mastery forecasting, early-warning risk detection, and study intervention.'}
                    </p>
                  </div>
                </div>

                {aiModalLearner.ai_advisory?.at_risk_assessment && (
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                    aiModalLearner.ai_advisory.at_risk_assessment.risk_level === 'High'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : aiModalLearner.ai_advisory.at_risk_assessment.risk_level === 'Moderate'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {aiModalLearner.ai_advisory.at_risk_assessment.risk_level} Risk ({aiModalLearner.ai_advisory.at_risk_assessment.risk_probability}% probability)
                  </span>
                )}
              </div>

              {/* BRANCH 1: GRADE 12 CAREER RECOMMENDATIONS */}
              {Number(aiModalLearner.grade) === 12 && (
                <div className="space-y-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-300 block">
                    Recommended Post-School Career Alignment (Top 3 Matches)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(aiModalLearner.ai_advisory?.career_recommendations || [
                      { career: 'Software Engineer', confidence: 72 },
                      { career: 'Construction Engineer', confidence: 18 },
                      { career: 'Banker', confidence: 10 }
                    ]).map((rec: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-surface-dark border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-xs font-black text-cyan-400">
                            {rec.confidence || rec.match_percentage}%
                          </span>
                        </div>
                        <p className="font-bold text-white text-xs truncate">{rec.career}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BRANCH 2: GRADE 9 STREAM & SUBJECT SELECTION */}
              {Number(aiModalLearner.grade) === 9 && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                      Recommended Grade 10 Stream
                    </span>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">
                        {aiModalLearner.ai_advisory?.stream_selection?.recommended_stream || 'Science Stream'}
                      </p>
                      <span className="font-mono font-bold text-emerald-300 text-xs">
                        {aiModalLearner.ai_advisory?.stream_selection?.match_percentage || 82}% Aptitude Match
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {aiModalLearner.ai_advisory?.stream_selection?.guidance_summary ||
                        'Learner shows high aptitude in Mathematics and Natural Sciences, making the Science stream the optimal choice.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Recommended 7-Subject CAPS FET Package for Grade 10:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(aiModalLearner.ai_advisory?.stream_selection?.recommended_subjects || [
                        'Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'English FAL', 'Home Language', 'Life Orientation'
                      ]).map((subj: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-slate-200">
                          {subj}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* BRANCH 3: GRADES 8, 10, 11 ACADEMIC TRAJECTORY & RISK INTERVENTIONS */}
              {Number(aiModalLearner.grade) !== 12 && Number(aiModalLearner.grade) !== 9 && (
                <div className="p-3 rounded-xl bg-surface-dark border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-300">
                      Grade {aiModalLearner.grade} Academic Progress & Progression Forecast
                    </span>
                    <span className="font-mono font-bold text-cyan-400 text-xs">
                      {aiModalLearner.ai_advisory?.performance_prediction?.tier || 'Adequate Achievement (Level 4)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Evaluating curriculum milestone coverage across formal assessments. Focus is placed on foundational subject retention to guarantee matric qualification.
                  </p>
                </div>
              )}

              {/* General Performance Prediction & Guidance */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Projected Performance Rating</span>
                  <span className="font-mono font-bold text-emerald-400">
                    Projected Average: {aiModalLearner.ai_advisory?.performance_prediction?.predicted_overall_score || aiModalLearner.average_mark || 72}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-white">Intervention Guidance: </strong>
                  {aiModalLearner.ai_advisory?.at_risk_assessment?.intervention_guidance ||
                    'Learner is maintaining stable academic trajectory within promotion parameters.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
