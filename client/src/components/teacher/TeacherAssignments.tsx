import React, { useState, useEffect } from 'react';
import { assignmentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Sparkles,
  Download,
  Eye,
  Award,
  ChevronRight,
  X,
  FileCheck,
  Send,
  Check,
  Filter,
  Layers,
  Edit3
} from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';

export const TeacherAssignments: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [aiAssessments, setAiAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter View: 'all' | 'homework' | 'ai'
  const [activeFilter, setActiveFilter] = useState<'all' | 'homework' | 'ai'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);

  // Marking Drawer
  const [activeSubmission, setActiveSubmission] = useState<any | null>(null);
  const [teacherScore, setTeacherScore] = useState<string>('');
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Mathematics',
    grade: '10',
    stream: 'Science',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_time: '23:59',
    total_marks: '50',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load published assignments and AI generated assessments
  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentService.getTeacherAssignments();
      const hwList = (res.assignments || []).map((a: any) => ({
        ...a,
        item_type: 'homework',
        status: a.status || (parseInt(a.pending_marking || 0, 10) === 0 && parseInt(a.total_submissions || 0, 10) > 0 ? 'graded' : 'ungraded')
      }));

      // Fetch any locally published AI assessments or defaults
      let localAiList: any[] = [];
      try {
        const stored = localStorage.getItem('fusion_teacher_ai_assessments');
        if (stored) localAiList = JSON.parse(stored);
      } catch (_) {}

      if (localAiList.length === 0) {
        localAiList = [
          {
            id: 'ai-1',
            title: 'Algebraic Expressions & Factorization Diagnostic Quiz',
            subject: 'Mathematics',
            grade: 10,
            due_date: new Date().toISOString(),
            total_marks: 20,
            description: 'AI Generated non-repeating practice quiz on trinomial factorization and quadratic roots.',
            item_type: 'ai_assessment',
            total_submissions: 28,
            pending_marking: 0,
            signed_submissions: 28,
            status: 'graded'
          },
          {
            id: 'ai-2',
            title: 'Electric Circuits & Ohm\'s Law Interactive Evaluation',
            subject: 'Physical Sciences',
            grade: 10,
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            total_marks: 30,
            description: 'AI Lesson Builder practice paper testing current, potential difference, and internal resistance.',
            item_type: 'ai_assessment',
            total_submissions: 19,
            pending_marking: 5,
            signed_submissions: 14,
            status: 'ungraded'
          }
        ];
      }

      setAssignments(hwList);
      setAiAssessments(localAiList);
    } catch (err: any) {
      console.error('Error loading teacher assignments:', err);
      setError(err.response?.data?.error || 'Failed to load homework assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Manual Status Change Handler (Graded vs Ungraded)
  const handleToggleStatus = (itemId: string | number, itemType: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'graded' ? 'ungraded' : 'graded';

    if (itemType === 'ai_assessment') {
      const updated = aiAssessments.map(a => a.id === itemId ? { ...a, status: nextStatus } : a);
      setAiAssessments(updated);
      try {
        localStorage.setItem('fusion_teacher_ai_assessments', JSON.stringify(updated));
      } catch (_) {}
      setSuccessMessage(`Assessment status updated to "${nextStatus.toUpperCase()}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    // Homework item
    const updated = assignments.map(a => a.id === itemId ? { ...a, status: nextStatus } : a);
    setAssignments(updated);
    setSuccessMessage(`Homework status updated to "${nextStatus.toUpperCase()}".`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleOpenSubmissions = async (assignment: any) => {
    setSelectedAssignment(assignment);
    setActiveSubmission(null);
    setLoadingSubmissions(true);
    try {
      const res = await assignmentService.getAssignmentSubmissions(assignment.id);
      setSubmissions(res.submissions || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject) {
      setError('Please provide an assignment title and select a subject.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const body = new FormData();
    body.append('title', formData.title);
    body.append('subject', formData.subject);
    body.append('grade', formData.grade);
    body.append('stream', formData.stream);
    body.append('due_date', formData.due_date);
    body.append('due_time', formData.due_time);
    body.append('total_marks', formData.total_marks);
    body.append('description', formData.description);
    if (selectedFile) {
      body.append('attachment', selectedFile);
    }

    try {
      await assignmentService.createAssignment(body);
      setSuccessMessage('Homework published successfully! Enrolled learners and parents notified.');
      setIsCreateModalOpen(false);
      setSelectedFile(null);
      setFormData({
        title: '',
        subject: 'Mathematics',
        grade: '10',
        stream: 'Science',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_time: '23:59',
        total_marks: '50',
        description: ''
      });
      fetchAssignments();
    } catch (err: any) {
      console.error('Error publishing assignment:', err);
      setError(err.response?.data?.error || 'Failed to publish assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMarking = (sub: any) => {
    setActiveSubmission(sub);
    setTeacherScore(sub.teacher_score !== null && sub.teacher_score !== undefined ? String(sub.teacher_score) : (sub.ai_score ? String(sub.ai_score) : ''));
    setTeacherFeedback(sub.teacher_feedback || sub.ai_feedback || '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    setSavingGrade(true);
    setError(null);
    try {
      await assignmentService.gradeSubmission(activeSubmission.id, {
        teacher_score: teacherScore,
        teacher_feedback: teacherFeedback
      });
      setSuccessMessage(`Mark officially recorded for ${activeSubmission.learner_name} ${activeSubmission.learner_surname}.`);
      
      // Refresh submissions list
      const res = await assignmentService.getAssignmentSubmissions(selectedAssignment.id);
      setSubmissions(res.submissions || []);
      
      const updated = res.submissions.find((s: any) => s.id === activeSubmission.id);
      setActiveSubmission(updated || null);
      fetchAssignments();
    } catch (err: any) {
      console.error('Error saving grade:', err);
      setError(err.response?.data?.error || 'Failed to record official mark.');
    } finally {
      setSavingGrade(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading assignments & AI assessments..." />;
  }

  // Combine and filter items
  const allCombined = [
    ...assignments,
    ...aiAssessments
  ];

  const filteredItems = allCombined.filter(item => {
    if (activeFilter === 'homework' && item.item_type !== 'homework') return false;
    if (activeFilter === 'ai' && item.item_type !== 'ai_assessment') return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-400" />
            <span>Assignments & AI Assessments Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track published homework tasks, inspect AI assessments sent to learners, review grading status, and adjust marks.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            setError(null);
            setSuccessMessage(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Homework</span>
        </button>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Status Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === 'all'
                ? 'bg-brand-600 text-white shadow-glow-indigo'
                : 'bg-surface-darker text-slate-400 hover:text-white'
            }`}
          >
            All Tasks ({allCombined.length})
          </button>

          <button
            onClick={() => setActiveFilter('homework')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === 'homework'
                ? 'bg-brand-600 text-white shadow-glow-indigo'
                : 'bg-surface-darker text-slate-400 hover:text-white'
            }`}
          >
            📘 Published Homework ({assignments.length})
          </button>

          <button
            onClick={() => setActiveFilter('ai')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === 'ai'
                ? 'bg-purple-600 text-white shadow-glow-purple'
                : 'bg-surface-darker text-slate-400 hover:text-white'
            }`}
          >
            ⚡ AI Assessments ({aiAssessments.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-surface-darker border border-white/10 px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="graded">Graded Only</option>
            <option value="ungraded">Ungraded Only</option>
          </select>
        </div>
      </div>

      {/* Assignments & AI Assessments Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Matching Assignments</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create homework or generate content using the AI Lesson & Builder to publish interactive assessments.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Homework Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((a) => {
            const isAI = a.item_type === 'ai_assessment';
            const isGraded = a.status === 'graded';
            const totalSubs = parseInt(a.total_submissions || 0, 10);
            const pendingMarking = parseInt(a.pending_marking || 0, 10);
            const signedSubs = parseInt(a.signed_submissions || 0, 10);

            return (
              <div
                key={a.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-xl space-y-4 ${
                  isAI
                    ? 'bg-surface-dark border-purple-500/30 hover:border-purple-500/60'
                    : 'bg-surface-dark border-white/10 hover:border-brand-500/30'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isAI 
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                    }`}>
                      {isAI ? '⚡ AI Assessment' : '📘 Homework'} • Gr {a.grade}
                    </span>

                    {/* Graded / Ungraded Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isGraded
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {isGraded ? 'Graded' : 'Ungraded'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">{a.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {a.description || `${a.subject} task for Grade ${a.grade}.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Subject: <strong className="text-slate-200">{a.subject}</strong></span>
                    <span className="font-mono text-cyan-400 font-bold">{a.total_marks || 50} Marks</span>
                  </div>

                  {a.file_url && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-darker border border-white/5 text-xs text-slate-300">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate flex-1 font-medium">{a.file_name || 'Attached Material'}</span>
                      <a
                        href={a.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Download Brief"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  {/* Submission Counters */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-surface-darker border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Learners</span>
                      <p className="text-sm font-extrabold text-white font-mono mt-0.5">{totalSubs || 25}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-darker border border-white/5">
                      <span className="text-[10px] text-amber-400 uppercase font-bold">Ungraded</span>
                      <p className="text-sm font-extrabold text-amber-300 font-mono mt-0.5">{pendingMarking}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-darker border border-white/5">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">Graded</span>
                      <p className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{signedSubs || totalSubs}</p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(a.id, a.item_type, a.status)}
                      className="px-3 py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs border border-white/10 transition-colors flex items-center gap-1.5 shrink-0"
                      title="Manually toggle Graded / Ungraded status"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isGraded ? 'Set Ungraded' : 'Set Graded'}</span>
                    </button>

                    {!isAI && (
                      <button
                        onClick={() => handleOpenSubmissions(a)}
                        className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Submissions ({totalSubs})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE HOMEWORK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-3xl bg-surface-dark border border-brand-500/30 p-6 md:p-7 shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Publish New Homework Task</h3>
                  <p className="text-[11px] text-slate-400">All enrolled learners and linked parents will receive alerts.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Homework Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exercise 4.2: Quadratic Inequalities and Factorization"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Subject *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physical Sciences">Physical Sciences</option>
                    <option value="Life Sciences">Life Sciences</option>
                    <option value="English FAL">English FAL</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Geography">Geography</option>
                    <option value="Life Orientation">Life Orientation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Target Grade *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={formData.total_marks}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_marks: e.target.value }))}
                    min="1"
                    max="200"
                    className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Submission Deadline Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Deadline Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.due_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Instructions / Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide page references, questions to complete, or instructions..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Attach Brief / Worksheet PDF (Optional)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-surface-darker text-slate-300 hover:text-white font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold shadow-glow-indigo transition-all disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSIONS REVIEW MODAL */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl rounded-3xl bg-surface-dark border border-brand-500/30 p-6 md:p-7 shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  SUBMISSION MANAGER
                </span>
                <h3 className="text-lg font-bold text-white">{selectedAssignment.title}</h3>
                <p className="text-xs text-slate-400">
                  {selectedAssignment.subject} • Grade {selectedAssignment.grade} • Due {new Date(selectedAssignment.due_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAssignment(null);
                  setActiveSubmission(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-surface-darker"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingSubmissions ? (
              <LoadingSpinner text="Retrieving student submissions..." />
            ) : submissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No submissions received yet from learners.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Submissions List */}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {submissions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleOpenMarking(s)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activeSubmission?.id === s.id
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-md'
                          : 'bg-surface-darker border-white/5 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{s.learner_name} {s.learner_surname}</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {s.teacher_score !== null ? `${s.teacher_score} / ${selectedAssignment.total_marks}` : (s.ai_score ? `AI: ${s.ai_score}` : 'Pending')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {s.submission_text || (s.file_url ? 'Attachment Submitted' : 'No text')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Marking Panel */}
                <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-3 text-xs">
                  {activeSubmission ? (
                    <form onSubmit={handleSaveGrade} className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h4 className="font-bold text-white">
                          Marking: {activeSubmission.learner_name} {activeSubmission.learner_surname}
                        </h4>
                        <Badge variant={activeSubmission.teacher_score !== null ? 'emerald' : 'amber'} size="sm">
                          {activeSubmission.teacher_score !== null ? 'Signed Off' : 'Needs Mark'}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Student Answer / Response:</span>
                        <div className="p-3 rounded-xl bg-surface-dark border border-white/5 text-slate-200 text-xs max-h-32 overflow-y-auto">
                          {activeSubmission.submission_text || 'No text submitted.'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold mb-1">
                            Score (Out of {selectedAssignment.total_marks})
                          </label>
                          <input
                            type="number"
                            required
                            value={teacherScore}
                            onChange={(e) => setTeacherScore(e.target.value)}
                            max={selectedAssignment.total_marks}
                            min={0}
                            className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-white font-mono font-bold focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Teacher Feedback</label>
                        <textarea
                          rows={2}
                          value={teacherFeedback}
                          onChange={(e) => setTeacherFeedback(e.target.value)}
                          placeholder="Constructive feedback for the learner..."
                          className="w-full rounded-xl bg-surface-dark border border-white/10 p-2.5 text-white focus:ring-2 focus:ring-brand-500 text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingGrade}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md"
                      >
                        {savingGrade ? 'Recording...' : 'Commit Mark & Sign Off'}
                      </button>
                    </form>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      Select a submission on the left to grade or inspect student responses.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
