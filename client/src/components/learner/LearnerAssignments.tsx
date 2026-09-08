import React, { useState, useEffect } from 'react';
import { assignmentService } from '../../services/api';
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  Send,
  X,
  FileCheck,
  Filter,
  Layers,
  ChevronRight,
  Award,
  Zap,
  Check,
  HelpCircle
} from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';

export const LearnerAssignments: React.FC<{ filterSubject?: string }> = ({ filterSubject }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected filters
  const [selectedSubject, setSelectedSubject] = useState<string>(filterSubject || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, pending, submitted, marked

  // Standard Submission Modal
  const [submittingAssignment, setSubmittingAssignment] = useState<any | null>(null);
  const [submissionText, setSubmissionText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeAIResult, setActiveAIResult] = useState<any | null>(null);

  // Interactive Multiple Choice Quiz Taking State
  const [takingQuizAssignment, setTakingQuizAssignment] = useState<any | null>(null);
  const [quizQuestionsList, setQuizQuestionsList] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{ [qIdx: number]: string }>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);
  const [quizEvaluationResult, setQuizEvaluationResult] = useState<any | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentService.getLearnerAssignments();
      setAssignments(res.assignments || []);
    } catch (err: any) {
      console.error('Error loading learner assignments:', err);
      setError(err.response?.data?.error || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (filterSubject) {
      setSelectedSubject(filterSubject);
    }
  }, [filterSubject]);

  const uniqueSubjects = Array.from(new Set(assignments.map(a => a.subject))).filter(Boolean);

  const filteredAssignments = assignments.filter(a => {
    if (selectedSubject !== 'all' && a.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
      return false;
    }
    if (filterStatus === 'pending') {
      return !a.submission_id;
    }
    if (filterStatus === 'submitted') {
      return a.submission_id && a.submission_status !== 'teacher_signed';
    }
    if (filterStatus === 'marked') {
      return a.submission_status === 'teacher_signed';
    }
    return true;
  });

  const handleOpenSubmitModal = (assignment: any) => {
    setSubmittingAssignment(assignment);
    setSubmissionText(assignment.submission_text || '');
    setSelectedFile(null);
    setActiveAIResult(null);
    setError(null);
  };

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;

    if (!selectedFile && !submissionText.trim()) {
      setError('Please upload your completed homework file or type your solution.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('submission_text', submissionText);
    if (selectedFile) {
      formData.append('submission_file', selectedFile);
    }

    try {
      const res = await assignmentService.submitHomework(submittingAssignment.id, formData);
      setActiveAIResult(res.ai_evaluation);
      setSuccessMessage('Homework successfully submitted! Evaluated by Fusion AI Evaluator.');
      fetchAssignments();
    } catch (err: any) {
      console.error('Error submitting homework:', err);
      setError(err.response?.data?.error || 'Failed to submit homework.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenQuiz = (assignment: any) => {
    let questions: any[] = [];
    if (assignment.questions) {
      try {
        questions = typeof assignment.questions === 'string' ? JSON.parse(assignment.questions) : assignment.questions;
      } catch (_) {}
    }
    setTakingQuizAssignment(assignment);
    setQuizQuestionsList(questions);

    // If previously submitted, parse answers
    let savedAnswers: { [qIdx: number]: string } = {};
    if (assignment.submission_text) {
      try {
        const parsed = JSON.parse(assignment.submission_text);
        if (parsed.answers) savedAnswers = parsed.answers;
        else if (typeof parsed === 'object') savedAnswers = parsed;
      } catch (_) {
        const lines = assignment.submission_text.split('\n');
        lines.forEach((l: string) => {
          const parts = l.split(':');
          if (parts.length > 1) {
            const idx = parseInt(parts[0].replace(/[^0-9]/g, ''), 10) - 1;
            if (!isNaN(idx)) savedAnswers[idx] = parts.slice(1).join(':').trim();
          }
        });
      }
    }
    setQuizAnswers(savedAnswers);
    setQuizEvaluationResult(assignment.submission_id ? {
      ai_score: assignment.ai_score,
      ai_percentage: assignment.ai_percentage,
      ai_feedback: assignment.ai_feedback,
      ai_strengths: assignment.ai_strengths,
      ai_areas_for_improvement: assignment.ai_areas_for_improvement,
      teacher_score: assignment.teacher_score,
      teacher_percentage: assignment.teacher_percentage,
      teacher_feedback: assignment.teacher_feedback
    } : null);
    setError(null);
  };

  const handleSelectQuizOption = (qIdx: number, opt: string) => {
    if (takingQuizAssignment?.submission_status === 'teacher_signed') return;
    setQuizAnswers(prev => ({
      ...prev,
      [qIdx]: opt
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!takingQuizAssignment) return;

    if (Object.keys(quizAnswers).length === 0) {
      setError('Please select an answer for at least one question before submitting.');
      return;
    }

    setIsSubmittingQuiz(true);
    setError(null);

    const formData = new FormData();
    const submissionPayload = {
      answers: quizAnswers,
      format: 'multiple_choice_quiz',
      submitted_at: new Date().toISOString()
    };
    formData.append('submission_text', JSON.stringify(submissionPayload));

    try {
      const res = await assignmentService.submitHomework(takingQuizAssignment.id, formData);
      setQuizEvaluationResult(res.ai_evaluation);
      setSuccessMessage(`Interactive Quiz submitted! Auto-graded: ${res.ai_evaluation?.ai_score}/${takingQuizAssignment.total_marks} (${res.ai_evaluation?.ai_percentage}%).`);
      fetchAssignments();
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      setError(err.response?.data?.error || 'Failed to submit quiz.');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading homework & digital assignments..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-400" />
            <span>Homework & Assignment Submission Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Download educator worksheets, upload your homework solutions, and receive instant AI concept evaluation before teacher sign-off.
          </p>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-surface-dark border border-white/10 text-xs">
            <span className="text-slate-400">Total: </span>
            <strong className="text-white font-mono">{assignments.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <span>Pending: </span>
            <strong className="font-mono">{assignments.filter(a => !a.submission_id).length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <span>Marked: </span>
            <strong className="font-mono">{assignments.filter(a => a.submission_status === 'teacher_signed').length}</strong>
          </div>
        </div>
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedSubject === 'all'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Subjects
        </button>
        {uniqueSubjects.map(subj => (
          <button
            key={subj}
            onClick={() => setSelectedSubject(subj)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedSubject === subj
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {subj}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1 pl-2 border-l border-white/10">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              filterStatus === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            To Submit
          </button>
          <button
            onClick={() => setFilterStatus('marked')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              filterStatus === 'marked' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Marked
          </button>
        </div>
      </div>

      {/* Assignments Cards Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 space-y-3">
          <FileText className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Homework Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You are all caught up! New homework tasks published by your educators will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map(a => {
            const isSubmitted = !!a.submission_id;
            const isMarked = a.submission_status === 'teacher_signed';
            const dueDateObj = new Date(a.due_date);
            const isOverdue = !isSubmitted && dueDateObj < new Date();
            const isQuiz = a.assignment_type === 'quiz' || (a.questions && (typeof a.questions === 'string' ? a.questions.length > 5 : Array.isArray(a.questions)));

            return (
              <div
                key={a.id}
                className="p-5 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/30 transition-all flex flex-col justify-between shadow-xl space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold uppercase tracking-wider border border-brand-500/30">
                        {a.subject}
                      </span>
                      {isQuiz && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span>AI Quiz</span>
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-mono flex items-center gap-1 ${
                      isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      Due {dueDateObj.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">{a.title}</h3>
                    {a.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Educator: <strong>{a.teacher_name} {a.teacher_surname}</strong> • Total Marks: <strong>{a.total_marks}</strong>
                    </p>
                  </div>

                  {/* Attached Educator Worksheet/Brief */}
                  {a.file_url && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-darker border border-white/5 text-xs text-slate-300">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate flex-1 font-medium">{a.file_name || 'Educator Task Brief'}</span>
                      <a
                        href={a.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>Brief</span>
                      </a>
                    </div>
                  )}

                  {/* SUBMISSION & EVALUATION BADGE */}
                  {isMarked ? (
                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Official Marked Score</span>
                        </span>
                        <span className="text-sm font-extrabold font-mono text-emerald-400">
                          {a.teacher_score} / {a.total_marks} ({a.teacher_percentage}%)
                        </span>
                      </div>
                      {a.teacher_feedback && (
                        <p className="text-[11px] text-slate-300 italic">
                          "{a.teacher_feedback}"
                        </p>
                      )}
                    </div>
                  ) : isSubmitted ? (
                    <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Fusion AI Pre-Evaluated</span>
                        </span>
                        <span className="text-xs font-bold font-mono text-cyan-300">
                          Estimated: {a.ai_score} / {a.total_marks} ({a.ai_percentage}%)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Submitted & awaiting educator final sign-off.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={() => isQuiz ? handleOpenQuiz(a) : handleOpenSubmitModal(a)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                      isMarked
                        ? 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30'
                        : isSubmitted
                        ? 'bg-brand-600/30 hover:bg-brand-600 text-cyan-300 hover:text-white'
                        : isQuiz
                        ? 'bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 text-white shadow-glow-cyan'
                        : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white shadow-glow-indigo'
                    }`}
                  >
                    {isQuiz ? <Zap className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>
                      {isMarked
                        ? `View Graded ${isQuiz ? 'Quiz' : 'Work'} (${a.teacher_score}/${a.total_marks})`
                        : isSubmitted
                        ? `View ${isQuiz ? 'Quiz Results' : 'Solution'} (AI: ${a.ai_score}/${a.total_marks})`
                        : isQuiz
                        ? 'Take Multiple Choice Quiz'
                        : 'Submit Homework'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-surface-dark border border-brand-500/30 p-6 md:p-7 shadow-2xl space-y-5 animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{submittingAssignment.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    {submittingAssignment.subject} • Total Marks: {submittingAssignment.total_marks} • Due: {submittingAssignment.due_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubmittingAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Educator Attachment if exists */}
            {submittingAssignment.file_url && (
              <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                  <div>
                    <p className="font-bold text-white">Educator Task Document / Brief</p>
                    <p className="text-[10px] text-slate-400">{submittingAssignment.file_name || 'Worksheet Download'}</p>
                  </div>
                </div>
                <a
                  href={submittingAssignment.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-glow-indigo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Brief</span>
                </a>
              </div>
            )}

            {/* AI Result Card if just evaluated */}
            {activeAIResult && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-surface-darker border border-indigo-500/40 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Fusion AI Subject Evaluator</span>
                  </span>
                  <span className="text-xs font-bold font-mono text-cyan-300">
                    Estimated: {activeAIResult.ai_score} / {submittingAssignment.total_marks} ({activeAIResult.ai_percentage}%)
                  </span>
                </div>
                <p className="text-xs text-slate-200 italic">
                  "{activeAIResult.ai_feedback}"
                </p>
                {activeAIResult.ai_strengths && (
                  <p className="text-[11px] text-emerald-300">
                    <strong>Strengths:</strong> {activeAIResult.ai_strengths}
                  </p>
                )}
                {activeAIResult.ai_areas_for_improvement && (
                  <p className="text-[11px] text-amber-300">
                    <strong>Focus Area:</strong> {activeAIResult.ai_areas_for_improvement}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitSolution} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Upload Completed Homework (PDF, Word DOCX, Image, Text)
                </label>
                <div className="p-4 border-2 border-dashed border-white/15 hover:border-brand-500/40 rounded-2xl bg-surface-darker/60 text-center transition-all">
                  <input
                    type="file"
                    id="learner-homework-upload"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  />
                  <label htmlFor="learner-homework-upload" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                    <UploadCloud className="w-6 h-6 text-brand-400" />
                    <span className="font-bold text-white text-xs">
                      {selectedFile ? selectedFile.name : (submittingAssignment.submission_file_name || 'Click to upload your solution document')}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, Word, or image up to 25MB</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Written Response / Calculations / Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Type your final answers, calculations, or homework notes here..."
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-bold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Evaluating & Submitting...' : 'Submit & Run AI Evaluation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERACTIVE MULTIPLE CHOICE QUIZ MODAL */}
      {takingQuizAssignment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl rounded-3xl bg-surface-dark border border-cyan-500/30 p-6 md:p-8 shadow-2xl space-y-5 animate-fade-in max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-brand-600 p-0.5 shadow-glow-cyan flex items-center justify-center">
                  <div className="w-full h-full bg-[#080D1A] rounded-[14px] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">{takingQuizAssignment.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="cyan" size="sm">{takingQuizAssignment.subject}</Badge>
                    <Badge variant="indigo" size="sm">Grade {takingQuizAssignment.grade}</Badge>
                    <span className="text-xs text-slate-400 font-mono font-bold">
                      {quizQuestionsList.length} Questions • {takingQuizAssignment.total_marks} Total Marks
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setTakingQuizAssignment(null);
                  setQuizEvaluationResult(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-surface-darker transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard / Evaluation Banner if evaluated or marked */}
            {(quizEvaluationResult || takingQuizAssignment.ai_score !== null) && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-surface-darker border border-cyan-500/40 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Fusion AI Auto-Graded Performance</span>
                  </span>
                  <span className="text-sm font-extrabold font-mono text-cyan-300">
                    {quizEvaluationResult?.ai_score ?? takingQuizAssignment.ai_score} / {takingQuizAssignment.total_marks} ({quizEvaluationResult?.ai_percentage ?? takingQuizAssignment.ai_percentage}%)
                  </span>
                </div>

                {takingQuizAssignment.teacher_score !== null && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Educator Final Signed Mark</span>
                      </span>
                      {takingQuizAssignment.teacher_feedback && (
                        <p className="text-[11px] text-slate-200 mt-0.5 italic">"{takingQuizAssignment.teacher_feedback}"</p>
                      )}
                    </div>
                    <span className="text-base font-extrabold font-mono text-emerald-400">
                      {takingQuizAssignment.teacher_score} / {takingQuizAssignment.total_marks} ({takingQuizAssignment.teacher_percentage}%)
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-200 leading-relaxed">
                  {quizEvaluationResult?.ai_feedback ?? takingQuizAssignment.ai_feedback}
                </p>
                {quizEvaluationResult?.ai_areas_for_improvement && (
                  <p className="text-[11px] text-amber-300">
                    <strong>Study Recommendation:</strong> {quizEvaluationResult.ai_areas_for_improvement}
                  </p>
                )}
              </div>
            )}

            {/* Questions Form */}
            {quizQuestionsList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No interactive questions loaded for this quiz.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/5">
                  <span>
                    Select one option per question. Answered: <strong className="text-cyan-400 font-mono">{Object.keys(quizAnswers).length}</strong> of <strong className="text-white font-mono">{quizQuestionsList.length}</strong>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {takingQuizAssignment.submission_status === 'teacher_signed' ? 'Reviewed & Final' : takingQuizAssignment.submission_id ? 'Submitted' : 'In Progress'}
                  </span>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {quizQuestionsList.map((q, qIdx) => {
                    const selectedChoice = quizAnswers[qIdx] || '';
                    const isSubmitted = !!takingQuizAssignment.submission_id;

                    return (
                      <div
                        key={qIdx}
                        className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold text-white text-xs leading-relaxed flex-1">
                            <span className="text-cyan-400 font-mono mr-1.5">Q{qIdx + 1}:</span>
                            {q.question}
                          </p>
                          <Badge variant="indigo" size="sm">{q.marks || 2} Marks</Badge>
                        </div>

                        {/* 4 Choices */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt: string, optIdx: number) => {
                            const isSelected = selectedChoice === opt;
                            const isCorrectAnswer = q.answer && (opt.toLowerCase() === q.answer.toLowerCase() || opt.toLowerCase().includes(q.answer.toLowerCase()));

                            let borderBgClasses = 'bg-surface-dark border-white/5 hover:border-cyan-500/40 text-slate-300';
                            if (isSubmitted) {
                              if (isCorrectAnswer) {
                                borderBgClasses = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold';
                              } else if (isSelected && !isCorrectAnswer) {
                                borderBgClasses = 'bg-rose-500/20 border-rose-500/50 text-rose-200';
                              } else if (isSelected) {
                                borderBgClasses = 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-bold';
                              }
                            } else if (isSelected) {
                              borderBgClasses = 'bg-gradient-to-r from-cyan-600/30 to-brand-600/30 border-cyan-400 text-white font-bold shadow-glow-cyan';
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={takingQuizAssignment.submission_status === 'teacher_signed'}
                                onClick={() => handleSelectQuizOption(qIdx, opt)}
                                className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between gap-2 ${borderBgClasses}`}
                              >
                                <span className="leading-snug">{opt}</span>
                                {isSelected && (
                                  <span className="shrink-0 w-4 h-4 rounded-full bg-cyan-500 text-[#080D1A] flex items-center justify-center font-bold text-[10px]">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Action Strip */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setTakingQuizAssignment(null);
                      setQuizEvaluationResult(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                  >
                    Close
                  </button>

                  {takingQuizAssignment.submission_status !== 'teacher_signed' && (
                    <button
                      type="button"
                      disabled={isSubmittingQuiz}
                      onClick={handleSubmitQuiz}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 text-white font-bold text-xs shadow-glow-cyan transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isSubmittingQuiz ? 'Auto-Grading Quiz...' : takingQuizAssignment.submission_id ? 'Update & Re-Grade Quiz' : 'Submit Quiz for Instant AI Grading'}</span>
                    </button>
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
