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
  Send
} from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';

export const TeacherAssignments: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentService.getTeacherAssignments();
      setAssignments(res.assignments || []);
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
      setSuccessMessage(`Mark officially signed off for ${activeSubmission.learner_name} ${activeSubmission.learner_surname}.`);
      
      // Refresh submissions list
      const res = await assignmentService.getAssignmentSubmissions(selectedAssignment.id);
      setSubmissions(res.submissions || []);
      
      // Update active submission in view
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
    return <LoadingSpinner size="lg" text="Loading homework & assignment workspace..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-400" />
            <span>Homework & Digital Assignment Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Publish CAPS homework tasks, attach briefs, review learner submissions, and apply official marks.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            setError(null);
            setSuccessMessage(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all self-start sm:self-auto"
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

      {/* Assignments Grid */}
      {assignments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Homework Published Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create your first homework task to distribute lesson material, assign exercises, and track learner submissions in real time.
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
          {assignments.map((a) => {
            const totalSubs = parseInt(a.total_submissions || 0, 10);
            const pendingMarking = parseInt(a.pending_marking || 0, 10);
            const signedSubs = parseInt(a.signed_submissions || 0, 10);

            return (
              <div
                key={a.id}
                className="p-5 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/30 transition-all flex flex-col justify-between shadow-xl space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold uppercase tracking-wider border border-brand-500/30">
                      {a.subject} • Gr {a.grade}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Due {new Date(a.due_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">{a.title}</h3>
                    {a.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}
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
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Submissions</span>
                      <p className="text-sm font-extrabold text-white font-mono mt-0.5">{totalSubs}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-darker border border-white/5">
                      <span className="text-[10px] text-amber-400 uppercase font-bold">To Mark</span>
                      <p className="text-sm font-extrabold text-amber-300 font-mono mt-0.5">{pendingMarking}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-darker border border-white/5">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">Signed Off</span>
                      <p className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{signedSubs}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenSubmissions(a)}
                    className="w-full py-2.5 rounded-xl bg-brand-600/90 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Review Submissions ({totalSubs})</span>
                  </button>
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
                <label className="block text-slate-300 font-bold mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Euclidean Geometry Riders & Circle Theorems Exercise"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Subject *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physical Sciences">Physical Sciences</option>
                    <option value="Life Sciences">Life Sciences</option>
                    <option value="English FAL">English FAL</option>
                    <option value="Geography">Geography</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Life Orientation">Life Orientation</option>
                    <option value="Computer Applications Technology">CAT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Grade Level *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total Marks *</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={formData.total_marks}
                    onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Due Time</label>
                  <input
                    type="time"
                    value={formData.due_time}
                    onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Instructions & Guidelines</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Complete questions 1 to 8 on page 142. Show all step-by-step calculations and geometric reasons."
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Attach Brief / Worksheet (PDF / DOCX / Image)</label>
                <div className="p-4 border-2 border-dashed border-white/15 hover:border-brand-500/40 rounded-2xl bg-surface-darker/60 text-center transition-all">
                  <input
                    type="file"
                    id="teacher-file-upload"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  />
                  <label htmlFor="teacher-file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                    <UploadCloud className="w-6 h-6 text-brand-400" />
                    <span className="font-bold text-white text-xs">
                      {selectedFile ? selectedFile.name : 'Click to select document or worksheet'}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, Word, or image up to 25MB</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-bold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Publishing...' : 'Publish & Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSIONS REVIEW MODAL */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="relative w-full max-w-5xl rounded-3xl bg-surface-dark border border-white/10 shadow-2xl p-6 flex flex-col max-h-[92vh] overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedAssignment.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold">
                    Grade {selectedAssignment.grade} • {selectedAssignment.subject}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Marks: {selectedAssignment.total_marks} • Due: {selectedAssignment.due_date}
                </p>
              </div>

              <button
                onClick={() => setSelectedAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 flex-1 overflow-y-auto">
              {/* Left Column: Submissions Table */}
              <div className={activeSubmission ? 'lg:col-span-6 space-y-3' : 'lg:col-span-12 space-y-3'}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-400" />
                    <span>Learner Submissions ({submissions.length})</span>
                  </h4>
                </div>

                {loadingSubmissions ? (
                  <LoadingSpinner size="md" text="Loading submissions..." />
                ) : submissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-surface-darker border border-white/5">
                    No learners have submitted solutions for this task yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub) => {
                      const isSelected = activeSubmission?.id === sub.id;
                      const isSigned = sub.status === 'teacher_signed';

                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleOpenMarking(sub)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-brand-600/20 border-brand-500 shadow-md'
                              : 'bg-surface-darker border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <h5 className="text-xs font-bold text-white">
                              {sub.learner_name} {sub.learner_surname}
                            </h5>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Submitted: {new Date(sub.submitted_at).toLocaleDateString()} at {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              {isSigned ? (
                                <Badge variant="emerald" size="sm">
                                  Signed: {sub.teacher_score}/{selectedAssignment.total_marks} ({sub.teacher_percentage}%)
                                </Badge>
                              ) : (
                                <Badge variant="indigo" size="sm">
                                  AI Evaluated: {sub.ai_score}/{selectedAssignment.total_marks} ({sub.ai_percentage}%)
                                </Badge>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Marking & AI Insights Drawer */}
              {activeSubmission && (
                <div className="lg:col-span-6 rounded-3xl bg-surface-darker border border-brand-500/20 p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {activeSubmission.learner_name} {activeSubmission.learner_surname}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Learner Number: {activeSubmission.learner_number || 'N/A'}
                        </p>
                      </div>
                      <Badge variant={activeSubmission.status === 'teacher_signed' ? 'emerald' : 'indigo'} size="sm">
                        {activeSubmission.status === 'teacher_signed' ? 'Official Signed Mark' : 'Pending Educator Sign-Off'}
                      </Badge>
                    </div>

                    {/* Submission File or Text */}
                    {activeSubmission.file_url && (
                      <div className="p-3 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-300 truncate">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="truncate">{activeSubmission.file_name || 'Learner Document Solution'}</span>
                        </div>
                        <a
                          href={activeSubmission.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                      </div>
                    )}

                    {activeSubmission.submission_text && (
                      <div className="p-3 rounded-2xl bg-surface-dark border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Learner Workings / Text:</span>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {activeSubmission.submission_text}
                        </p>
                      </div>
                    )}

                    {/* 🌟 FUSION AI SUBJECT EVALUATOR INSIGHTS */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-surface-dark border border-indigo-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span>Fusion AI Subject Evaluator</span>
                        </span>
                        <span className="text-xs font-bold font-mono text-cyan-300">
                          Estimated: {activeSubmission.ai_score} / {selectedAssignment.total_marks} ({activeSubmission.ai_percentage}%)
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        "{activeSubmission.ai_feedback}"
                      </p>

                      {activeSubmission.ai_strengths && (
                        <div className="text-[11px] text-emerald-300">
                          <strong>Strengths:</strong> {activeSubmission.ai_strengths}
                        </div>
                      )}

                      {activeSubmission.ai_areas_for_improvement && (
                        <div className="text-[11px] text-amber-300">
                          <strong>Improvement Focus:</strong> {activeSubmission.ai_areas_for_improvement}
                        </div>
                      )}
                    </div>

                    {/* Teacher Formal Grade Input Form */}
                    <form onSubmit={handleSaveGrade} className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold text-xs mb-1">
                            Official Educator Score (Out of {selectedAssignment.total_marks}) *
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            min="0"
                            max={selectedAssignment.total_marks}
                            value={teacherScore}
                            onChange={(e) => setTeacherScore(e.target.value)}
                            placeholder={`e.g. ${activeSubmission.ai_score || 42}`}
                            className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-white font-mono text-xs focus:ring-2 focus:ring-brand-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold text-xs mb-1">
                            Achievement Percentage
                          </label>
                          <div className="px-3 py-2 rounded-xl bg-surface-dark border border-white/5 text-emerald-400 font-mono text-xs font-bold">
                            {teacherScore && selectedAssignment.total_marks
                              ? `${Math.round((parseFloat(teacherScore) / parseFloat(selectedAssignment.total_marks)) * 100)}%`
                              : '—'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold text-xs mb-1">
                          Educator Feedback & Comments (Sent to Learner & Parent)
                        </label>
                        <textarea
                          rows={2}
                          value={teacherFeedback}
                          onChange={(e) => setTeacherFeedback(e.target.value)}
                          placeholder="e.g. Well reasoned answers. Good geometric proofs on circle theorems."
                          className="w-full rounded-xl bg-surface-dark border border-white/10 p-2.5 text-white text-xs focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingGrade}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>{savingGrade ? 'Signing Off...' : 'Sign Off & Record Official Mark'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
