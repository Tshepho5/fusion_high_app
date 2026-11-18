import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Modal } from '../common/Modal';
import { SchoolSubjectsManager } from './SchoolSubjectsManager';
import { ReportCardStudio } from './ReportCardStudio';
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  ShieldCheck,
  TrendingUp,
  Award,
  BookOpen,
  GraduationCap,
  Check,
  RefreshCw
} from 'lucide-react';

interface AcademicRecord {
  id: string | number;
  child_id: number;
  learner_name: string;
  learner_number: string;
  grade: number;
  stream: string;
  class_name: string;
  subject: string;
  score: number | null;
  term: string | null;
  task_title: string;
  date: string | null;
  caps_level?: string | null;
  moderation_status?: string;
}

interface AuditSummary {
  total_assessments_recorded: number;
  scored_assessments: number;
  school_average_mark: number | null;
  sba_pass_rate: number | null;
  compliance_rate: number | null;
  levels_distribution: {
    level7: number;
    level6: number;
    level5: number;
    level4: number;
    level3: number;
    level2: number;
    level1: number;
  };
}

interface SubjectSchedule {
  subject: string;
  grade: number;
  assessments_count: number;
  average_mark: number | null;
  pass_rate: number | null;
  moderation_status: string;
  compliant?: boolean;
  moderated_by: string;
  last_updated: string | null;
  feedback?: string;
}

const LEVEL_CARDS = [
  { key: 'level7', label: 'Level 7 (80-100%)', caption: 'Outstanding', tone: 'text-emerald-800 dark:text-emerald-300 border-emerald-700/30 bg-emerald-500/10' },
  { key: 'level6', label: 'Level 6 (70-79%)', caption: 'Meritorious', tone: 'text-cyan-800 dark:text-cyan-300 border-cyan-700/30 bg-cyan-500/10' },
  { key: 'level5', label: 'Level 5 (60-69%)', caption: 'Substantial', tone: 'text-indigo-800 dark:text-indigo-300 border-indigo-700/30 bg-indigo-500/10' },
  { key: 'level4', label: 'Level 4 (50-59%)', caption: 'Adequate', tone: 'text-blue-800 dark:text-blue-300 border-blue-700/30 bg-blue-500/10' },
  { key: 'level3', label: 'Level 3 (40-49%)', caption: 'Moderate', tone: 'text-amber-800 dark:text-amber-300 border-amber-700/30 bg-amber-500/10' },
  { key: 'level2', label: 'Level 2 (30-39%)', caption: 'Elementary', tone: 'text-orange-800 dark:text-orange-300 border-orange-700/30 bg-orange-500/10' },
  { key: 'level1', label: 'Level 1 (0-29%)', caption: 'Not Achieved', tone: 'text-rose-800 dark:text-rose-300 border-rose-700/30 bg-rose-500/10' }
] as const;

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : `${value}%`;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function moderationVariant(status: string): 'emerald' | 'amber' | 'rose' | 'slate' {
  const clean = (status || '').toLowerCase();
  if (clean === 'approved' || clean === 'verified') return 'emerald';
  if (clean === 'discrepancy flagged') return 'rose';
  if (clean === 'under review') return 'amber';
  return 'slate';
}

export const AcademicAssessmentAudits: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'subjects' | 'report-cards' | 'audits'>('subjects');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<{
    summary: AuditSummary;
    subjects: string[];
    subject_schedules: SubjectSchedule[];
    records: AcademicRecord[];
  } | null>(null);

  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [activeSubjectForModeration, setActiveSubjectForModeration] = useState<SubjectSchedule | null>(null);
  const [moderationStatus, setModerationStatus] = useState<string>('Approved');
  const [moderationFeedback, setModerationFeedback] = useState('');
  const [savingModeration, setSavingModeration] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtersActive = selectedGrade !== 'all' || selectedSubject !== 'all' || selectedTerm !== 'all' || appliedSearch.length > 0;

  const fetchAudits = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setLoadError(null);

    try {
      const res = await adminService.getAcademicOverview({
        grade: selectedGrade !== 'all' ? selectedGrade : undefined,
        subject: selectedSubject !== 'all' ? selectedSubject : undefined,
        term: selectedTerm !== 'all' ? selectedTerm : undefined,
        search: appliedSearch || undefined
      });
      setData({
        summary: res.summary,
        subjects: Array.isArray(res.subjects) ? res.subjects : [],
        subject_schedules: Array.isArray(res.subject_schedules) ? res.subject_schedules : [],
        records: Array.isArray(res.records) ? res.records : []
      });
    } catch (err: any) {
      console.error('Failed to load academic assessment audits:', err);
      if (showLoading) setData(null);
      setLoadError(err?.response?.data?.error || 'The assessment records could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (activeSubTab === 'audits') {
      fetchAudits();
    }
  }, [activeSubTab, selectedGrade, selectedSubject, selectedTerm, appliedSearch]);

  const handleOpenModeration = (sched: SubjectSchedule) => {
    setActiveSubjectForModeration(sched);
    setModerationStatus(sched.moderation_status && sched.moderation_status !== 'Not moderated' ? sched.moderation_status : 'Under Review');
    setModerationFeedback(sched.feedback || '');
    setModerationError(null);
    setModerationModalOpen(true);
  };

  const handleSaveModeration = async () => {
    if (!activeSubjectForModeration) return;
    setSavingModeration(true);
    setModerationError(null);
    try {
      await adminService.moderateBatch({
        subject: activeSubjectForModeration.subject,
        grade: activeSubjectForModeration.grade,
        term: selectedTerm !== 'all' ? selectedTerm : '',
        status: moderationStatus,
        feedback: moderationFeedback
      });

      setToastMessage(`${activeSubjectForModeration.subject} Grade ${activeSubjectForModeration.grade} marked as ${moderationStatus}`);
      setModerationModalOpen(false);
      fetchAudits(false);
      window.setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setModerationError(err?.response?.data?.error || 'The moderation decision could not be saved.');
    } finally {
      setSavingModeration(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.records.length === 0) return;
    const headers = ['Learner number', 'Learner name', 'Grade', 'Class', 'Subject', 'Term', 'Task title', 'Score (%)', 'CAPS level', 'Moderation', 'Date'];
    const rows = data.records.map((record) => [
      `"${(record.learner_number || '').replace(/"/g, '""')}"`,
      `"${(record.learner_name || '').replace(/"/g, '""')}"`,
      record.grade ?? '',
      `"${(record.class_name || '').replace(/"/g, '""')}"`,
      `"${(record.subject || '').replace(/"/g, '""')}"`,
      `"${(record.term || '').replace(/"/g, '""')}"`,
      `"${(record.task_title || '').replace(/"/g, '""')}"`,
      record.score === null || record.score === undefined ? '' : record.score,
      `"${(record.caps_level || '').replace(/"/g, '""')}"`,
      `"${(record.moderation_status || 'Not moderated').replace(/"/g, '""')}"`,
      `"${formatDate(record.date)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CAPS_Assessment_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const summary = data?.summary;
  const records = data?.records || [];

  const tabClass = (active: boolean, activeTone: string) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shrink-0 border ${
      active
        ? `${activeTone} text-white shadow-sm`
        : 'text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
    }`;

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-[var(--text-primary)]">
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--card-background)] border border-[var(--border-color)] shadow-sm overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('subjects')}
          className={tabClass(activeSubTab === 'subjects', 'bg-blue-700 border-blue-800')}
        >
          <BookOpen className="w-4 h-4" />
          <span>School Curriculum & Subjects (Grades 8 - 12)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('report-cards')}
          className={tabClass(activeSubTab === 'report-cards', 'bg-emerald-700 border-emerald-800')}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>CAPS Report Card Studio & Holding %</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audits')}
          className={tabClass(activeSubTab === 'audits', 'bg-purple-700 border-purple-800')}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>SBA Mark Audits & Moderation</span>
        </button>
      </div>

      {activeSubTab === 'subjects' && (
        <SchoolSubjectsManager onOpenReportCardStudio={() => setActiveSubTab('report-cards')} />
      )}

      {activeSubTab === 'report-cards' && (
        <ReportCardStudio />
      )}

      {activeSubTab === 'audits' && (
        loading ? (
          <LoadingSpinner text="Loading assessment records..." />
        ) : (
          <div className="space-y-6">
            {toastMessage && (
              <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-700 text-white font-bold text-xs shadow-2xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>{toastMessage}</span>
              </div>
            )}

            <div className="rounded-3xl bg-[var(--card-background)] border border-[var(--border-color)] p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-700/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl md:text-2xl font-black font-display text-[var(--text-primary)] tracking-tight">
                        Academic Assessment & SBA Audits
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--text-primary)] font-mono text-[10px] font-bold border border-[var(--border-color)]">
                        DBE CAPS
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Figures are calculated from this school's captured assessment records.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => fetchAudits(false)}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--input-background)] hover:bg-[var(--accent-soft)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-bold transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Records</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={records.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV Report</span>
                  </button>
                </div>
              </div>
            </div>

            {loadError && (
              <div className="rounded-2xl border border-rose-700/40 bg-rose-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold">{loadError}</p>
                </div>
                <button
                  onClick={() => fetchAudits(data === null)}
                  className="px-3 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold"
                >
                  Try again
                </button>
              </div>
            )}

            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <StatCard icon={<Award className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-300" />} label="Total captured marks" value={String(summary.total_assessments_recorded)} note="Assessment rows for this school" />
                <StatCard icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />} label="School average score" value={formatPercent(summary.school_average_mark)} note={summary.scored_assessments ? `From ${summary.scored_assessments} scored rows` : 'No scored assessments'} />
                <StatCard icon={<GraduationCap className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />} label="SBA pass rate (≥50%)" value={formatPercent(summary.sba_pass_rate)} note="Scored assessments at Level 4 or above" />
                <StatCard icon={<ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />} label="Moderation compliance" value={formatPercent(summary.compliance_rate)} note="Approved or verified schedules only" />
              </div>
            )}

            {summary && (
              <div className="p-5 rounded-3xl bg-[var(--card-background)] border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                    <span>CAPS achievement level breakdown</span>
                  </h3>
                  <span className="text-[11px] text-[var(--text-secondary)]">DBE 7-level scale</span>
                </div>
                {summary.scored_assessments === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Achievement levels appear after a scored assessment is captured. A blank mark is not counted as zero.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
                    {LEVEL_CARDS.map((level) => (
                      <div key={level.key} className={`p-2.5 rounded-xl border ${level.tone}`}>
                        <p className="text-[10px] font-bold">{level.label}</p>
                        <p className="text-lg font-extrabold font-mono text-[var(--text-primary)] mt-0.5">
                          {summary.levels_distribution?.[level.key] ?? 0}
                        </p>
                        <p className="text-[9px] text-[var(--text-secondary)]">{level.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {data?.subject_schedules && data.subject_schedules.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
                    <span>Subject SBA moderation batches</span>
                  </h3>
                  <span className="text-[11px] text-[var(--text-secondary)]">Schedules stay unmoderated until they are signed off</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.subject_schedules.map((sched) => (
                    <div
                      key={`${sched.subject}-${sched.grade}`}
                      className="p-4 rounded-2xl bg-[var(--card-background)] border border-[var(--border-color)] space-y-2.5 shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{sched.subject}</h4>
                          <Badge variant={moderationVariant(sched.moderation_status)} size="sm">
                            {sched.moderation_status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                          Grade {sched.grade} • {sched.assessments_count} assessments logged
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs py-1 border-t border-b border-[var(--border-color)]">
                        <div>
                          <p className="text-[10px] text-[var(--text-secondary)]">Average mark</p>
                          <p className="text-sm font-extrabold font-mono text-emerald-800 dark:text-emerald-300">{formatPercent(sched.average_mark)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-secondary)]">Pass rate</p>
                          <p className="text-sm font-extrabold font-mono text-cyan-800 dark:text-cyan-300">{formatPercent(sched.pass_rate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-[var(--text-secondary)] truncate">
                          {sched.moderated_by ? `Moderator: ${sched.moderated_by}` : 'Not yet moderated'}
                        </span>
                        <button
                          onClick={() => handleOpenModeration(sched)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--text-primary)] border border-[var(--border-color)] text-[10px] font-bold"
                        >
                          Moderate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[var(--card-background)] border border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--input-background)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-600">
                  <option value="all">All Grades (8-12)</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--input-background)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-600">
                  <option value="all">All Subjects</option>
                  {(data?.subjects || []).map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--input-background)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-600">
                  <option value="all">All Terms</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                  <option value="Term 4">Term 4</option>
                </select>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search learner name or number..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--input-background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-[var(--card-background)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">
                    Learner mark schedules ({records.length} records)
                  </h3>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] font-mono">School register</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-background)] text-[var(--text-secondary)] border-b border-[var(--border-color)] uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Learner</th>
                      <th className="py-3 px-3">Grade & class</th>
                      <th className="py-3 px-3">Subject</th>
                      <th className="py-3 px-3">Task title</th>
                      <th className="py-3 px-3">Term</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">CAPS achievement</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-4 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 px-6 text-center">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {filtersActive ? 'No assessment records match these filters.' : 'No assessment records have been captured yet.'}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                            {filtersActive
                              ? 'Change the grade, subject, term, or learner search to see other captured marks.'
                              : 'Subject teachers capture marks in the mark book. This audit stays empty until those records exist.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                          <td className="py-3 px-4">
                            <p className="font-bold text-[var(--text-primary)] leading-tight">{record.learner_name}</p>
                            <p className="text-[10px] text-cyan-800 dark:text-cyan-300 font-mono">
                              {record.learner_number ? `Learner number: ${record.learner_number}` : 'Learner number not assigned'}
                            </p>
                          </td>
                          <td className="py-3 px-3 font-mono text-[var(--text-secondary)]">
                            Grade {record.grade}{record.class_name ? ` (${record.class_name})` : ''}
                          </td>
                          <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{record.subject}</td>
                          <td className="py-3 px-3 text-[var(--text-secondary)] truncate max-w-[150px]">{record.task_title}</td>
                          <td className="py-3 px-3 font-mono text-[var(--text-secondary)]">{record.term || '—'}</td>
                          <td className="py-3 px-3 font-mono font-extrabold text-sm">
                            <span className={record.score === null || record.score === undefined ? 'text-[var(--text-secondary)]' : record.score >= 50 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}>
                              {formatPercent(record.score)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {record.caps_level ? <Badge variant={record.score !== null && record.score >= 50 ? 'emerald' : 'rose'} size="sm">{record.caps_level}</Badge> : <span className="text-[var(--text-secondary)]">Not scored</span>}
                          </td>
                          <td className="py-3 px-3 text-[10px] font-mono text-[var(--text-secondary)]">{formatDate(record.date)}</td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant={moderationVariant(record.moderation_status || 'Not moderated')} size="sm">
                              {record.moderation_status === 'Approved' || record.moderation_status === 'Verified' ? <Check className="w-3 h-3" /> : null}
                              <span>{record.moderation_status || 'Not moderated'}</span>
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {moderationModalOpen && activeSubjectForModeration && (
              <Modal
                isOpen={moderationModalOpen}
                onClose={() => setModerationModalOpen(false)}
                title={`SBA moderation: ${activeSubjectForModeration.subject} (Grade ${activeSubjectForModeration.grade})`}
                maxWidth="lg"
              >
                <div className="space-y-4 text-xs text-[var(--text-primary)]">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-700/30 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Curriculum moderation</span>
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Sign off the marks captured for this subject and grade. An unsigned schedule is not counted as compliant.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--input-background)] border border-[var(--border-color)]">
                    <div>
                      <p className="text-[var(--text-secondary)] text-[10px]">Average mark</p>
                      <p className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-300">{formatPercent(activeSubjectForModeration.average_mark)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-secondary)] text-[10px]">Total assessments</p>
                      <p className="text-base font-bold font-mono text-[var(--text-primary)]">{activeSubjectForModeration.assessments_count}</p>
                    </div>
                  </div>
                  {moderationError && (
                    <p className="text-rose-700 dark:text-rose-300 font-semibold">{moderationError}</p>
                  )}
                  <div>
                    <label className="block text-[var(--text-primary)] font-bold mb-1">Moderation status</label>
                    <select
                      value={moderationStatus}
                      onChange={(e) => setModerationStatus(e.target.value)}
                      className="w-full rounded-xl bg-[var(--input-background)] border border-[var(--border-color)] px-3 py-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="Approved">Approved</option>
                      <option value="Verified">Verified</option>
                      <option value="Under Review">Under review</option>
                      <option value="Discrepancy Flagged">Discrepancy flagged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--text-primary)] font-bold mb-1">Remarks</label>
                    <textarea
                      rows={3}
                      value={moderationFeedback}
                      onChange={(e) => setModerationFeedback(e.target.value)}
                      className="w-full rounded-xl bg-[var(--input-background)] border border-[var(--border-color)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => setModerationModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[var(--input-background)] text-[var(--text-primary)] border border-[var(--border-color)] font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingModeration}
                      onClick={handleSaveModeration}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold disabled:opacity-60"
                    >
                      {savingModeration ? 'Saving...' : 'Save moderation'}
                    </button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        )
      )}
    </div>
  );
};

function StatCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="p-4 rounded-2xl bg-[var(--card-background)] border border-[var(--border-color)] space-y-1">
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </p>
      <p className="text-2xl font-black font-mono text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--text-secondary)] font-semibold">{note}</p>
    </div>
  );
}
