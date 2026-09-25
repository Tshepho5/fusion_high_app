import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Modal } from '../common/Modal';
import {
  BookOpen,
  Users,
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Award,
  Sparkles,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface SubjectSummary {
  id: number;
  name: string;
  code: string;
  grade: number;
  stream: string;
  teacher_name: string;
  learner_count: number;
  enrolled_count?: number;
  marks_count?: number;
  assessments_count?: number;
  average_mark: number;
  pass_rate: number;
  status: string;
  status_color: string;
}

interface SubjectLearner {
  id: number;
  child_id: number;
  full_name: string;
  surname: string;
  learner_number: string;
  grade: number;
  class_name: string;
  stream: string;
  attendance_rate: number;
  subject_mark: number;
  caps_level: number;
  caps_rating: string;
  flags: Array<{ type: string; severity: string }>;
}

interface SchoolSubjectsManagerProps {
  onOpenReportCardStudio?: (grade: string, stream: string) => void;
}

export const SchoolSubjectsManager: React.FC<SchoolSubjectsManagerProps> = ({
  onOpenReportCardStudio,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  
  // Filters
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 3');
  const [searchQuery, setSearchQuery] = useState('');

  // Learner Register Modal State
  const [selectedSubject, setSelectedSubject] = useState<SubjectSummary | null>(null);
  const [learnerRegisterModalOpen, setLearnerRegisterModalOpen] = useState(false);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [learnersList, setLearnersList] = useState<SubjectLearner[]>([]);
  const [learnerSearch, setLearnerSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSubjects = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await adminService.getSubjectsSummary({
        grade: selectedGrade !== 'all' ? selectedGrade : undefined,
        stream: selectedStream !== 'All' ? selectedStream : undefined,
        term: selectedTerm
      });
      setSubjects(res.subjects || []);
    } catch (err: any) {
      console.error('Failed to load school subjects summary:', err);
      setSubjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedGrade, selectedStream, selectedTerm]);

  const handleOpenLearnersModal = async (sub: SubjectSummary) => {
    setSelectedSubject(sub);
    setLearnerRegisterModalOpen(true);
    setLoadingLearners(true);
    setLearnerSearch('');

    try {
      const res = await adminService.getSubjectLearners({
        subject: sub.name,
        grade: sub.grade,
        stream: sub.stream,
        term: selectedTerm
      });
      setLearnersList(res.learners || []);
    } catch (err: any) {
      console.error('Failed to fetch subject learners:', err);
      setLearnersList([]);
    } finally {
      setLoadingLearners(false);
    }
  };

  const handleExportLearnersCSV = () => {
    if (!selectedSubject || learnersList.length === 0) return;
    const headers = ['Learner Number', 'Full Name', 'Grade', 'Class', 'Attendance Rate (%)', 'Subject Mark (%)', 'CAPS Level', 'Flags'];
    const rows = filteredLearners.map(l => [
      `"${l.learner_number}"`,
      `"${l.full_name} ${l.surname}"`,
      l.grade,
      `"${l.class_name}"`,
      l.attendance_rate,
      l.subject_mark,
      `"Level ${l.caps_level} (${l.caps_rating})"`,
      `"${(l.flags || []).map(f => f.type).join('; ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedSubject.name}_Grade${selectedSubject.grade}_Learners_${selectedTerm}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubjects = subjects.filter(s => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCode = (s.code || '').toLowerCase().includes(q);
      const matchTeacher = (s.teacher_name || '').toLowerCase().includes(q);
      const matchStream = (s.stream || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchTeacher && !matchStream) return false;
    }
    return true;
  });

  const filteredLearners = learnersList.filter(l => {
    if (learnerSearch.trim()) {
      const q = learnerSearch.toLowerCase();
      const matchName = `${l.full_name} ${l.surname}`.toLowerCase().includes(q);
      const matchNumber = (l.learner_number || '').toLowerCase().includes(q);
      const matchClass = (l.class_name || '').toLowerCase().includes(q);
      if (!matchName && !matchNumber && !matchClass) return false;
    }
    return true;
  });

  // Calculate High-level KPIs
  const totalEnrolled = subjects.reduce((sum, s) => sum + (s.learner_count || s.enrolled_count || 0), 0);
  const avgSchoolScore = subjects.length > 0 
    ? Math.round(subjects.reduce((sum, s) => sum + (s.average_mark || 0), 0) / subjects.length)
    : 0;
  const publishedSubjectsCount = subjects.filter(s => s.status?.includes('Published') || (s.marks_count || 0) > 0).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-500/95 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400/40 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/70 via-surface-dark to-surface-dark border border-blue-500/20 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow-blue shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black font-display text-white tracking-tight">
                  School Curriculum & Subjects Directory
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30">
                  GRADES 8 – 12 CAPS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchSubjects(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Subjects</span>
            </button>
            {onOpenReportCardStudio && (
              <button
                onClick={() => onOpenReportCardStudio(selectedGrade !== 'all' ? selectedGrade : '10', selectedStream !== 'All' ? selectedStream : 'Science')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-glow-indigo transition-all active:scale-95"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Launch Report Card Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Active Subjects</span>
          </p>
          <p className="text-2xl font-black font-mono text-white">
            {filteredSubjects.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Enrolled Learners</span>
          </p>
          <p className="text-2xl font-black font-mono text-cyan-400">
            {totalEnrolled}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Overall Subject Average</span>
          </p>
          <p className="text-2xl font-black font-mono text-emerald-400">
            {avgSchoolScore}%
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Marks Published to Admin</span>
          </p>
          <p className="text-2xl font-black font-mono text-emerald-400">
            {publishedSubjectsCount} / {subjects.length}
          </p>
        </div>
      </div>

      {/* Filter and Grade Selector Bar */}
      <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-4">
        {/* Grade Quick Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>Select Grade:</span>
            </span>
            {['all', '8', '9', '10', '11', '12'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGrade === g
                    ? 'bg-blue-600 text-white shadow-glow-blue border border-blue-400/40'
                    : 'bg-surface-darker hover:bg-white/5 text-slate-300 border border-white/10'
                }`}
              >
                {g === 'all' ? 'All Grades (8-12)' : `Grade ${g}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Showing <strong className="text-white">{filteredSubjects.length}</strong> subjects
            </span>
          </div>
        </div>

        {/* Secondary Stream & Term Filters + Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Stream Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Stream:</span>
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Streams</option>
                <option value="General">General (GET & Core)</option>
                <option value="Science">Science (Maths & Physical Sci)</option>
                <option value="Commerce">Commerce (Acc & Business)</option>
                <option value="Tourism">Tourism & Hospitality</option>
              </select>
            </div>

            {/* Term Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Academic Term:</span>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3 (Active)</option>
                <option value="Term 4">Term 4 (Final)</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject, code, teacher..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {loading ? (
        <LoadingSpinner text="Retrieving verified school subjects and educator allocations..." />
      ) : filteredSubjects.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">No subjects found for this selection</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try switching the Grade or Stream filter to explore all offerings across Grades 8, 9, 10, 11, and 12.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => {
            const hasPublished = sub.status?.includes('Published') || (sub.marks_count || 0) > 0;
            const isSubmitted = sub.status?.includes('Submitted');

            return (
              <div
                key={`${sub.id}-${sub.grade}-${sub.name}`}
                className="p-5 rounded-2xl bg-surface-dark border border-white/10 hover:border-blue-500/40 hover:shadow-glow-blue transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 font-mono text-[10px] font-black border border-blue-500/25 uppercase tracking-wider">
                      {sub.code || 'SUBJ'} • Grade {sub.grade}
                    </span>

                    {hasPublished ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10.5px] border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Marks Published</span>
                      </span>
                    ) : isSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold text-[10.5px] border border-cyan-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Submitted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10.5px] border border-amber-500/30">
                        <Clock className="w-3 h-3" />
                        <span>Pending Entry</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Stream */}
                  <div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Stream: <strong className="text-slate-200">{sub.stream || 'General'}</strong>
                    </p>
                  </div>

                  {/* Educator Details */}
                  <div className="p-2.5 rounded-xl bg-surface-darker/60 border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-400" />
                      <span>Subject Educator</span>
                    </p>
                    <p className="text-xs font-bold text-slate-200 truncate">
                      {sub.teacher_name || 'Department Educator'}
                    </p>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-slate-400">Class Average</p>
                      <p className="text-sm font-extrabold font-mono text-emerald-400">
                        {sub.average_mark !== null && sub.average_mark !== undefined ? `${sub.average_mark}%` : 'Pending'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Pass Rate (≥40%)</p>
                      <p className="text-sm font-extrabold font-mono text-cyan-400">
                        {sub.pass_rate !== null && sub.pass_rate !== undefined ? `${sub.pass_rate}%` : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Action Button: View Learners */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    <strong className="text-white">{sub.learner_count ?? sub.enrolled_count ?? 0}</strong> Learners
                  </span>

                  <button
                    onClick={() => handleOpenLearnersModal(sub)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <span>View Learners & Flags</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Subject Learners Register & Risk Flags */}
      <Modal
        isOpen={learnerRegisterModalOpen}
        onClose={() => setLearnerRegisterModalOpen(false)}
        title=""
        maxWidth="4xl"
      >
        {selectedSubject && (
          <div className="space-y-5 p-1 md:p-2">
            {/* Modal Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black font-display text-white">
                      {selectedSubject.name} — Class Register
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30">
                      Grade {selectedSubject.grade} • {selectedSubject.stream}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Educator: <strong className="text-white">{selectedSubject.teacher_name}</strong> • {selectedTerm}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportLearnersCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Register</span>
                </button>
              </div>
            </div>

            {/* Quick KPI stats on modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-darker border border-white/5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled</p>
                <p className="text-lg font-black font-mono text-white">{learnersList.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-darker border border-white/5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Subject Average</p>
                <p className="text-lg font-black font-mono text-emerald-400">
                  {learnersList.length > 0 ? Math.round(learnersList.reduce((s, l) => s + l.subject_mark, 0) / learnersList.length) : 0}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-darker border border-white/5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">At-Risk (&lt;40%)</p>
                <p className="text-lg font-black font-mono text-rose-400">
                  {learnersList.filter(l => l.subject_mark < 40).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-darker border border-white/5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Level 7 (&ge;80%)</p>
                <p className="text-lg font-black font-mono text-cyan-400">
                  {learnersList.filter(l => l.subject_mark >= 80).length}
                </p>
              </div>
            </div>

            {/* Search Filter for Learners */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={learnerSearch}
                onChange={(e) => setLearnerSearch(e.target.value)}
                placeholder="Filter by learner name, student number or class..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Learners Table */}
            {loadingLearners ? (
              <div className="py-12 text-center">
                <LoadingSpinner text="Retrieving verified learner register & attendance records..." />
              </div>
            ) : filteredLearners.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No learners found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-darker/90 text-slate-400 font-mono text-[10px] uppercase border-b border-white/10">
                    <tr>
                      <th className="py-3 px-3">Learner</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-3">Attendance</th>
                      <th className="py-3 px-3 text-right">Term Mark</th>
                      <th className="py-3 px-3">CAPS Level</th>
                      <th className="py-3 px-3">Academic & Risk Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {filteredLearners.map((l) => {
                      const isHighAtt = l.attendance_rate >= 90;
                      const isLowAtt = l.attendance_rate < 80;

                      return (
                        <tr key={l.id || l.child_id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-white">{l.full_name} {l.surname}</p>
                            <p className="text-[10px] font-mono text-slate-400">{l.learner_number}</p>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {l.class_name || `Gr ${l.grade}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] ${
                              isHighAtt ? 'text-emerald-400' : isLowAtt ? 'text-rose-400' : 'text-amber-400'
                            }`}>
                              <CalendarCheck className="w-3 h-3" />
                              <span>{l.attendance_rate}%</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-white">
                            {l.subject_mark}%
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                l.caps_level >= 6 ? 'emerald' : l.caps_level >= 4 ? 'cyan' : l.caps_level === 3 ? 'amber' : 'rose'
                              }
                              size="sm"
                            >
                              Level {l.caps_level} ({l.caps_rating})
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {(!l.flags || l.flags.length === 0) && (
                                <span className="text-[10px] text-slate-500 font-mono">None</span>
                              )}
                              {(l.flags || []).map((f, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold ${
                                    f.severity === 'critical'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : f.severity === 'amber'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : f.severity === 'gold'
                                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}
                                >
                                  {f.type}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
