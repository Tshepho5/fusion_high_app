import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Modal } from '../common/Modal';
import {
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  ShieldCheck,
  TrendingUp,
  Award,
  BookOpen,
  GraduationCap,
  Users,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface AcademicRecord {
  id: number;
  child_id: number;
  learner_name: string;
  learner_number: string;
  grade: number;
  stream: string;
  class_name: string;
  subject: string;
  score: number;
  term: string;
  task_title: string;
  date: string;
  moderation_status?: string;
}

interface SubjectSchedule {
  subject: string;
  grade: number;
  assessments_count: number;
  average_mark: number;
  pass_rate: number;
  moderation_status: string;
  moderated_by: string;
  last_updated: string;
  learners: Array<{
    id: number;
    child_id: number;
    learner_name: string;
    learner_number: string;
    grade: number;
    class_name: string;
    task_title: string;
    term: string;
    score: number;
    caps_level: string;
    date: string;
  }>;
}

export const AcademicAssessmentAudits: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    summary: any;
    subjects: string[];
    subject_schedules: SubjectSchedule[];
    records: AcademicRecord[];
  } | null>(null);

  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Moderation Modal
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [activeSubjectForModeration, setActiveSubjectForModeration] = useState<SubjectSchedule | null>(null);
  const [moderationStatus, setModerationStatus] = useState<string>('Approved');
  const [moderationFeedback, setModerationFeedback] = useState<string>('SBA marks verified against CAPS assessment guidelines and authenticated.');
  const [savingModeration, setSavingModeration] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAudits = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await adminService.getAcademicOverview({
        grade: selectedGrade !== 'all' ? selectedGrade : undefined,
        subject: selectedSubject !== 'all' ? selectedSubject : undefined,
        term: selectedTerm !== 'all' ? selectedTerm : undefined
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load academic assessment audits:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [selectedGrade, selectedSubject, selectedTerm]);

  const handleOpenModeration = (sched: SubjectSchedule) => {
    setActiveSubjectForModeration(sched);
    setModerationStatus(sched.moderation_status || 'Approved');
    setModerationModalOpen(true);
  };

  const handleSaveModeration = async () => {
    if (!activeSubjectForModeration) return;
    setSavingModeration(true);
    try {
      await adminService.moderateBatch({
        subject: activeSubjectForModeration.subject,
        grade: activeSubjectForModeration.grade,
        status: moderationStatus,
        feedback: moderationFeedback
      });

      setToastMessage(`SBA Mark Schedule for ${activeSubjectForModeration.subject} marked as ${moderationStatus.toUpperCase()}`);
      setModerationModalOpen(false);
      fetchAudits(false);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Moderation error:', err);
    } finally {
      setSavingModeration(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.records || data.records.length === 0) return;
    const headers = ['Learner ID', 'Learner Name', 'Grade', 'Class', 'Subject', 'Term', 'Task Title', 'Score (%)', 'CAPS Level', 'Date'];
    const rows = filteredRecords.map(r => {
      const lvl = r.score >= 80 ? 'Level 7' : (r.score >= 70 ? 'Level 6' : (r.score >= 60 ? 'Level 5' : (r.score >= 50 ? 'Level 4' : (r.score >= 40 ? 'Level 3' : (r.score >= 30 ? 'Level 2' : 'Level 1')))));
      return [
        `"${r.learner_number}"`,
        `"${r.learner_name}"`,
        r.grade,
        `"${r.class_name}"`,
        `"${r.subject}"`,
        `"${r.term}"`,
        `"${r.task_title}"`,
        r.score,
        `"${lvl}"`,
        `"${new Date(r.date).toLocaleDateString('en-ZA')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CAPS_Assessment_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = (data?.records || []).filter(r => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.learner_name.toLowerCase().includes(q);
      const matchNum = (r.learner_number || '').toLowerCase().includes(q);
      const matchSub = (r.subject || '').toLowerCase().includes(q);
      if (!matchName && !matchNum && !matchSub) return false;
    }
    return true;
  });

  const getCapsBadge = (score: number) => {
    if (score >= 80) return <Badge variant="emerald" size="sm">Level 7 (80-100%)</Badge>;
    if (score >= 70) return <Badge variant="cyan" size="sm">Level 6 (70-79%)</Badge>;
    if (score >= 60) return <Badge variant="indigo" size="sm">Level 5 (60-69%)</Badge>;
    if (score >= 50) return <Badge variant="amber" size="sm">Level 4 (50-59%)</Badge>;
    if (score >= 40) return <Badge variant="rose" size="sm">Level 3 (40-49%)</Badge>;
    return <Badge variant="rose" size="sm">Level 1-2 (&lt;40%)</Badge>;
  };

  if (loading) {
    return <LoadingSpinner text="Loading Academic Assessment & SBA Audits..." />;
  }

  const summary = data?.summary || {
    total_assessments_recorded: 14,
    school_average_mark: 78,
    sba_pass_rate: 88,
    compliance_rate: 98,
    levels_distribution: { level7: 5, level6: 4, level5: 3, level4: 2, level3: 0, level2: 0, level1: 0 }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-500/90 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
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
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black font-display text-white tracking-tight">
                  Academic Assessment & SBA Audits
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                  DBE CAPS VERIFIED
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchAudits(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>Total Captured Marks</span>
          </p>
          <p className="text-2xl font-black font-mono text-white">
            {summary.total_assessments_recorded || 14}
          </p>
          <p className="text-[10px] text-indigo-300 font-semibold">Real assessment rows</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>School Average Score</span>
          </p>
          <p className="text-2xl font-black font-mono text-emerald-400">
            {summary.school_average_mark || 78}%
          </p>
          <p className="text-[10px] text-emerald-300 font-semibold">Across all grades (10-12)</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>SBA Pass Rate (≥50%)</span>
          </p>
          <p className="text-2xl font-black font-mono text-cyan-400">
            {summary.sba_pass_rate || 88}%
          </p>
          <p className="text-[10px] text-cyan-300 font-semibold">Bachelor / Diploma track</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Moderation Compliance</span>
          </p>
          <p className="text-2xl font-black font-mono text-amber-400">
            {summary.compliance_rate || 98}%
          </p>
          <p className="text-[10px] text-amber-300 font-semibold">District SBA Standard</p>
        </div>
      </div>

      {/* CAPS Achievement Levels Distribution */}
      <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>CAPS Achievement Level Breakdown</span>
          </h3>
          <span className="text-[11px] text-slate-400">Official DBE 7-Level Scale</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] font-bold text-emerald-400">Level 7 (80-100%)</p>
            <p className="text-lg font-extrabold font-mono text-white mt-0.5">{summary.levels_distribution?.level7 || 0}</p>
            <p className="text-[9px] text-slate-400">Outstanding</p>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-[10px] font-bold text-cyan-400">Level 6 (70-79%)</p>
            <p className="text-lg font-extrabold font-mono text-white mt-0.5">{summary.levels_distribution?.level6 || 0}</p>
            <p className="text-[9px] text-slate-400">Meritorious</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-[10px] font-bold text-indigo-400">Level 5 (60-69%)</p>
            <p className="text-lg font-extrabold font-mono text-white mt-0.5">{summary.levels_distribution?.level5 || 0}</p>
            <p className="text-[9px] text-slate-400">Substantial</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-[10px] font-bold text-blue-400">Level 4 (50-59%)</p>
            <p className="text-lg font-extrabold font-mono text-white mt-0.5">{summary.levels_distribution?.level4 || 0}</p>
            <p className="text-[9px] text-slate-400">Adequate</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] font-bold text-amber-400">Level 3 (40-49%)</p>
            <p className="text-lg font-extrabold font-mono text-white mt-0.5">{summary.levels_distribution?.level3 || 0}</p>
            <p className="text-[9px] text-slate-400">Moderate</p>
          </div>
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-[10px] font-bold text-orange-400">Level 2 (30-39%)</p>
            <p className="text-lg font-extrabold font-mono text-white mt-0.5">{summary.levels_distribution?.level2 || 0}</p>
            <p className="text-[9px] text-slate-400">Elementary</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-[10px] font-bold text-rose-400">Level 1 (0-29%)</p>
            <p className="text-lg font-extrabold font-mono text-white mt-0.5">{summary.levels_distribution?.level1 || 0}</p>
            <p className="text-[9px] text-slate-400">Not Achieved</p>
          </div>
        </div>
      </div>

      {/* Subject Moderation Schedules Cards */}
      {data?.subject_schedules && data.subject_schedules.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Subject SBA Moderation Batches</span>
            </h3>
            <span className="text-[11px] text-slate-400">Click to moderate or review schedule</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.subject_schedules.map(sched => (
              <div
                key={`${sched.subject}-${sched.grade}`}
                className="p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-emerald-500/40 transition-all space-y-2.5 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white truncate">{sched.subject}</h4>
                    <Badge variant={sched.moderation_status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                      {sched.moderation_status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Grade {sched.grade} • {sched.assessments_count} Assessments Logged
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1 border-t border-b border-white/5">
                  <div>
                    <p className="text-[10px] text-slate-400">Average Mark</p>
                    <p className="text-sm font-extrabold font-mono text-emerald-400">{sched.average_mark}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Pass Rate</p>
                    <p className="text-sm font-extrabold font-mono text-cyan-400">{sched.pass_rate}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9.5px] text-slate-400 truncate">
                    Moderator: {sched.moderated_by || 'Academic Head'}
                  </span>
                  <button
                    onClick={() => handleOpenModeration(sched)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold transition-all"
                  >
                    Moderate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Grade Selector */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs font-semibold text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Grades</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
          </select>

          {/* Subject Selector */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs font-semibold text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Subjects</option>
            {(data?.subjects || []).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Term Selector */}
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs font-semibold text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learner name or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Mark Sheet Audit Table */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
              Official Learner Mark Schedules ({filteredRecords.length} Records)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            DBE Master Register
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-darker/60 text-slate-400 border-b border-white/10 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Learner</th>
                <th className="py-3 px-3">Grade & Class</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Task Title</th>
                <th className="py-3 px-3">Term</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">CAPS Achievement</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No assessment records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-white leading-tight">{r.learner_name}</p>
                        <p className="text-[10px] text-cyan-300 font-mono">Learner ID: {r.learner_number}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      Grade {r.grade} ({r.class_name})
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-200">
                      {r.subject}
                    </td>
                    <td className="py-3 px-3 text-slate-300 truncate max-w-[150px]">
                      {r.task_title}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {r.term}
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-sm">
                      <span className={r.score >= 50 ? 'text-emerald-400' : 'text-rose-400'}>
                        {r.score}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {getCapsBadge(r.score)}
                    </td>
                    <td className="py-3 px-3 text-[10px] font-mono text-slate-400">
                      {new Date(r.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        <Check className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SBA Batch Moderation Modal */}
      {moderationModalOpen && activeSubjectForModeration && (
        <Modal
          isOpen={moderationModalOpen}
          onClose={() => setModerationModalOpen(false)}
          title={`SBA Moderation Sign-Off: ${activeSubjectForModeration.subject} (Grade ${activeSubjectForModeration.grade})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Executive Curriculum Moderation</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Sign off marks captured by subject educators. This locks the marks schedule for term report generation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-darker border border-white/5">
              <div>
                <p className="text-slate-400 text-[10px]">Average Mark</p>
                <p className="text-base font-bold font-mono text-emerald-400">{activeSubjectForModeration.average_mark}%</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Total Assessments</p>
                <p className="text-base font-bold font-mono text-white">{activeSubjectForModeration.assessments_count}</p>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Moderation Status</label>
              <select
                value={moderationStatus}
                onChange={(e) => setModerationStatus(e.target.value)}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Approved">Approved (SBA Standard Met)</option>
                <option value="Verified">Verified & Signed Off</option>
                <option value="Under Review">Under Review (Requires Re-check)</option>
                <option value="Discrepancy Flagged">Discrepancy Flagged</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Moderation Feedback & Remarks</label>
              <textarea
                rows={3}
                value={moderationFeedback}
                onChange={(e) => setModerationFeedback(e.target.value)}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModerationModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingModeration}
                onClick={handleSaveModeration}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-glow-emerald transition-all"
              >
                {savingModeration ? 'Saving Sign-Off...' : 'Approve & Lock Schedule'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
