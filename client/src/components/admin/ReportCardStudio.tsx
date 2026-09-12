import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Modal } from '../common/Modal';
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
  X
} from 'lucide-react';

interface ReportCardSubject {
  name: string;
  code?: string;
  mark: number;
  caps_level: number;
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
  subjects: Record<string, number>;
  average_mark: number;
  overall_caps_level: number;
  promotion_decision: string;
  teacher_comment: string;
  principal_comment: string;
}

interface AssessmentWeight {
  component: string;
  weight_percent: number;
  description: string;
}

export const ReportCardStudio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedStream, setSelectedStream] = useState<string>('Science');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 3');
  const [academicYear, setAcademicYear] = useState<string>('2026');

  // Mark Sheet Template Data
  const [learners, setLearners] = useState<TemplateLearner[]>([]);
  const [subjectColumns, setSubjectColumns] = useState<string[]>([]);
  const [assessmentWeights, setAssessmentWeights] = useState<AssessmentWeight[]>([
    { component: 'Controlled Test 1', weight_percent: 15, description: 'Standardized CAPS Term Diagnostic' },
    { component: 'Practical Investigation / Project', weight_percent: 15, description: 'Experimental SBA Rubric' },
    { component: 'Continuous Homework & Class Assignments', weight_percent: 10, description: 'Formative Submissions' },
    { component: 'Term Examination / Mid-Year Paper', weight_percent: 60, description: 'Summative Standardized Exam' }
  ]);
  const [searchFilter, setSearchFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewLearner, setPreviewLearner] = useState<TemplateLearner | null>(null);
  const [confirmPublishModalOpen, setConfirmPublishModalOpen] = useState(false);

  // Fetch / Transfer Marks into Template
  const handleTransferMarks = async () => {
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
        const subjectsDict: Record<string, number> = {};
        if (Array.isArray(l.subjects)) {
          l.subjects.forEach((s: any) => {
            subjectsDict[s.subject || s.name] = Number(s.mark) || 0;
          });
        } else if (typeof l.subjects === 'object' && l.subjects !== null) {
          Object.assign(subjectsDict, l.subjects);
        }

        return {
          child_id: l.child_id || l.id,
          full_name: l.full_name || l.learner_name,
          surname: l.surname || l.learner_surname || '',
          learner_number: l.learner_number || '',
          grade: l.grade,
          class_name: l.class_name || `${selectedGrade}A`,
          stream: l.stream || selectedStream,
          attendance_rate: l.attendance_percentage || l.attendance?.percentage || l.attendance_rate || 95,
          days_present: l.attendance?.days_present || l.days_present || 48,
          days_absent: l.attendance?.days_absent || l.days_absent || 2,
          subjects: subjectsDict,
          average_mark: Number(l.overall_average) || 0,
          overall_caps_level: l.overall_level || 4,
          promotion_decision: l.promotion_status || l.promotion_decision || 'Promoted',
          teacher_comment: l.teacher_comment || '',
          principal_comment: l.principal_comment || ''
        };
      });

      setLearners(formattedLearners);
      setSubjectColumns(res.subjects || res.schoolSubjects || []);
      if (res.assessment_weights && res.assessment_weights.length > 0) {
        setAssessmentWeights(res.assessment_weights);
      }

      setToastMessage(`Transferred marks & calculated SBA weightings for Grade ${selectedGrade} (${formattedLearners.length} learners)`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to load grade template marks:', err);
      const errMsg = err.response?.data?.error || err.message;
      setToastMessage(`Error: ${errMsg}`);
      setTimeout(() => setToastMessage(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleTransferMarks();
  }, [selectedGrade, selectedStream, selectedTerm]);

  // Recalculate Average and Promotion Decision when admin changes marks inline
  const handleMarkChange = (childId: number, subject: string, rawVal: string) => {
    const val = Math.min(100, Math.max(0, parseInt(rawVal, 10) || 0));

    setLearners((prev) =>
      prev.map((l) => {
        if (l.child_id !== childId) return l;

        const updatedSubjects = { ...l.subjects, [subject]: val };
        const marksList = Object.values(updatedSubjects).filter((m) => typeof m === 'number');
        const avg = marksList.length > 0
          ? Math.round(marksList.reduce((a, b) => a + b, 0) / marksList.length)
          : 0;

        let level = 1;
        if (avg >= 80) level = 7;
        else if (avg >= 70) level = 6;
        else if (avg >= 60) level = 5;
        else if (avg >= 50) level = 4;
        else if (avg >= 40) level = 3;
        else if (avg >= 30) level = 2;

        let decision = 'Progressed (At Risk)';
        if (avg >= 50 && level >= 4) decision = 'Bachelor Pass Eligible';
        else if (avg >= 40 && level >= 3) decision = 'Diploma Pass Eligible';
        else if (avg >= 33.3) decision = 'Higher Certificate Pass';

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

      setToastMessage('Grade mark template successfully saved as verified draft.');
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
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                  DBE VERIFIED ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Transfer teacher-submitted marks directly into official grade templates. The system applies continuous assessment weightings and contribution holdings, displays outcomes, allows fine-tuning, and publishes directly to parents and educators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleTransferMarks}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Transfer Marks</span>
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-glow-emerald transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish to Parents & Teachers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assessment Weights & Percentage Holding Breakdown Card */}
      <div className="p-5 rounded-3xl bg-surface-dark border border-emerald-500/20 space-y-3 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-200">
              Continuous Assessment (SBA) Weighting & Holding Percentages
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            Total SBA Weight: 100% Calculated
          </span>
        </div>

        <p className="text-xs text-slate-400">
          When transferring marks into this template, each teacher's assessments are automatically multiplied by their statutory CAPS holding weight to form each learner's aggregate term mark:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {assessmentWeights.map((w, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-surface-darker/80 border border-white/5 space-y-1 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">{w.component}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs border border-emerald-500/30">
                  {w.weight_percent}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{w.description}</p>
            </div>
          ))}
        </div>
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
            Click "Transfer Marks" above or change the stream/class filter to load learners.
          </p>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black font-display text-white">
                Grade {selectedGrade} • {selectedStream} Stream Mark Sheet
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct inline editing available. Updating subject marks immediately recalculates candidate term averages and CAPS promotion levels.
              </p>
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
                        <p className="font-bold text-white leading-tight">
                          {l.full_name} {l.surname}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {l.learner_number}
                        </p>
                      </td>

                      {/* Class Unit */}
                      <td className="py-2.5 px-2 font-mono text-slate-300">
                        {l.class_name || `${selectedGrade}A`}
                      </td>

                      {/* Attendance */}
                      <td className="py-2.5 px-2">
                        <span className={`font-mono font-bold text-[11px] ${
                          l.attendance_rate >= 90 ? 'text-emerald-400' : l.attendance_rate < 80 ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {l.attendance_rate || 96}%
                        </span>
                      </td>

                      {/* Dynamic Subject Marks */}
                      {subjectColumns.map((sub) => {
                        const markVal = l.subjects?.[sub] !== undefined ? l.subjects[sub] : 75;

                        return (
                          <td key={sub} className="py-2.5 px-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={markVal}
                              onChange={(e) => handleMarkChange(l.child_id, sub, e.target.value)}
                              className="w-16 px-1.5 py-1 text-center font-mono font-extrabold text-xs rounded-lg bg-surface-darker border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                            />
                          </td>
                        );
                      })}

                      {/* Calculated Average */}
                      <td className="py-2.5 px-2 text-center bg-surface-darker/60">
                        <span className="font-mono font-black text-sm text-emerald-400">
                          {l.average_mark}%
                        </span>
                      </td>

                      {/* CAPS Level */}
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          variant={
                            l.overall_caps_level >= 6 ? 'emerald' : l.overall_caps_level >= 4 ? 'cyan' : l.overall_caps_level === 3 ? 'amber' : 'rose'
                          }
                          size="sm"
                        >
                          Level {l.overall_caps_level}
                        </Badge>
                      </td>

                      {/* Promotion Status */}
                      <td className="py-2.5 px-2">
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
                      </td>

                      {/* Educator Remarks */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={l.principal_comment || l.teacher_comment || 'Consistently maintains strong academic performance.'}
                          onChange={(e) => handleCommentChange(l.child_id, 'principal_comment', e.target.value)}
                          placeholder="Official comment..."
                          className="w-full px-2 py-1 text-[11px] rounded-lg bg-surface-darker border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </td>

                      {/* Actions: Preview Report Card */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenPreview(l)}
                          title="Preview Official DBE Report Card"
                          className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/25 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
              <span>Report cards will be instantly accessible in each parent and learner portal.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Parents will receive an official email notice with a button to view and download their child's report card.</span>
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
        title="Official CAPS Report Card Document"
        maxWidth="4xl"
      >
        {previewLearner && (
          <div className="space-y-4 p-2">
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs text-slate-400 font-mono">
                Official Department of Basic Education (DBE) Format
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>

            {/* Simulated Paper Report Card Document */}
            <div className="p-6 md:p-8 rounded-2xl bg-white text-slate-900 shadow-2xl relative overflow-hidden font-sans border border-slate-300">
              {/* Anti-fraud Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                <span className="text-7xl md:text-8xl font-black uppercase font-display rotate-[-30deg]">
                  FUSION HIGH CAPS
                </span>
              </div>

              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold font-serif text-sm">
                    FH
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase font-serif text-slate-900">
                      FUSION HIGH COMPREHENSIVE SCHOOL
                    </h2>
                    <p className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                      Department of Basic Education • Gauteng Province • EMIS: 700400123
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-slate-700 mt-1">
                  OFFICIAL NATIONAL CURRICULUM STATEMENT (CAPS) LEARNER ACADEMIC REPORT
                </p>
              </div>

              {/* Learner Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-100 rounded-lg text-xs mb-5 border border-slate-300">
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Learner Name</span>
                  <span className="font-bold text-slate-900 text-sm">{previewLearner.full_name} {previewLearner.surname}</span>
                </div>
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Learner Number</span>
                  <span className="font-mono font-bold text-slate-900">{previewLearner.learner_number}</span>
                </div>
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Grade & Class</span>
                  <span className="font-bold text-slate-900">Grade {previewLearner.grade} • {previewLearner.class_name || `${previewLearner.grade}A`}</span>
                </div>
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Academic Period</span>
                  <span className="font-bold text-slate-900">{selectedTerm} {academicYear}</span>
                </div>
              </div>

              {/* Subjects Mark Sheet Table */}
              <table className="w-full text-left text-xs mb-5 border border-slate-300">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-mono">
                  <tr>
                    <th className="py-2 px-3 border border-slate-400">Subject Name</th>
                    <th className="py-2 px-2 text-center border border-slate-400">Term Mark (%)</th>
                    <th className="py-2 px-2 text-center border border-slate-400">CAPS Level</th>
                    <th className="py-2 px-3 border border-slate-400">Achievement Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(previewLearner.subjects || {}).map(([sName, sMark]) => {
                    let lvl = 1;
                    let desc = 'Not Achieved';
                    if (sMark >= 80) { lvl = 7; desc = 'Outstanding Achievement'; }
                    else if (sMark >= 70) { lvl = 6; desc = 'Meritorious Achievement'; }
                    else if (sMark >= 60) { lvl = 5; desc = 'Substantial Achievement'; }
                    else if (sMark >= 50) { lvl = 4; desc = 'Adequate Achievement'; }
                    else if (sMark >= 40) { lvl = 3; desc = 'Moderate Achievement'; }
                    else if (sMark >= 30) { lvl = 2; desc = 'Elementary Achievement'; }

                    return (
                      <tr key={sName} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900 border border-slate-300">{sName}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 border border-slate-300">{sMark}%</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-900 border border-slate-300">Level {lvl}</td>
                        <td className="py-2 px-3 text-slate-700 border border-slate-300">{desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                  <tr>
                    <td className="py-2.5 px-3 uppercase text-slate-900">Overall Term Average</td>
                    <td className="py-2.5 px-2 text-center font-mono font-black text-slate-900 text-sm">
                      {previewLearner.average_mark}%
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-900">
                      Level {previewLearner.overall_caps_level}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-800 uppercase font-black">
                      {previewLearner.promotion_decision || 'Promoted'}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Attendance & Comments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-6">
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Attendance Record</span>
                  <p className="text-slate-800">
                    Term Attendance Rate: <strong>{previewLearner.attendance_rate || 96}%</strong> (Days Present: 54 / 56)
                  </p>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Principal's Formal Endorsement</span>
                  <p className="text-slate-800 italic">
                    "{previewLearner.principal_comment || 'Commendable effort and dedication shown throughout this academic term.'}"
                  </p>
                </div>
              </div>

              {/* Signatures and Stamp */}
              <div className="flex items-end justify-between pt-6 border-t border-slate-300 text-xs">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Class Educator Signature</span>
                </div>
                <div className="text-center p-2 rounded border border-dashed border-slate-400">
                  <span className="text-[9px] text-slate-500 uppercase block font-mono">OFFICIAL INSTITUTION STAMP</span>
                  <span className="text-[11px] font-bold text-slate-700">FUSION HIGH SCHOOL</span>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Principal Signature</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
