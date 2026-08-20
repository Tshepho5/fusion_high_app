import React, { useState } from 'react';
import { learnerService } from '../../services/api';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  FileCheck,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  Zap
} from 'lucide-react';

const PRESET_PRACTICE_QUESTIONS: { [subject: string]: { topic: string; question: string; marks: number; sampleAnswer: string }[] } = {
  'Mathematics': [
    {
      topic: 'Quadratic Equations & Inequalities',
      question: 'Solve for x: 2x² - 5x - 3 = 0. Show all factorization and working steps clearly.',
      marks: 4,
      sampleAnswer: '2x² - 5x - 3 = 0\n(2x + 1)(x - 3) = 0\n2x + 1 = 0 or x - 3 = 0\n2x = -1 or x = 3\nx = -1/2 or x = 3'
    },
    {
      topic: 'Differential Calculus',
      question: 'Determine the derivative f\'(x) from first principles if f(x) = 3x² - 2x.',
      marks: 6,
      sampleAnswer: 'f(x) = 3x² - 2x\nf(x+h) = 3(x+h)² - 2(x+h) = 3(x² + 2xh + h²) - 2x - 2h = 3x² + 6xh + 3h² - 2x - 2h\nf\'(x) = lim(h->0) [f(x+h) - f(x)] / h\n= lim(h->0) [3x² + 6xh + 3h² - 2x - 2h - (3x² - 2x)] / h\n= lim(h->0) [6xh + 3h² - 2h] / h\n= lim(h->0) [h(6x + 3h - 2)] / h\n= lim(h->0) (6x + 3h - 2)\n= 6x - 2'
    }
  ],
  'Physical Sciences': [
    {
      topic: 'Newton\'s Laws of Motion',
      question: 'A 5 kg crate rests on a rough horizontal surface. A horizontal force of 25 N is applied. If the coefficient of kinetic friction is 0.2, calculate the acceleration of the crate. (Take g = 9.8 m/s²)',
      marks: 5,
      sampleAnswer: 'm = 5 kg, F_app = 25 N, μ_k = 0.2, g = 9.8 m/s²\nNormal force N = m*g = 5 * 9.8 = 49 N\nFrictional force f_k = μ_k * N = 0.2 * 49 = 9.8 N\nF_net = F_app - f_k = 25 - 9.8 = 15.2 N\nF_net = m * a\n15.2 = 5 * a\na = 15.2 / 5 = 3.04 m/s² to the right'
    }
  ],
  'Life Sciences': [
    {
      topic: 'DNA: Code of Life',
      question: 'Describe the process of DNA transcription that occurs inside the nucleus of a cell.',
      marks: 6,
      sampleAnswer: '1. The DNA double helix unwinds and unzips as hydrogen bonds break.\n2. One DNA strand acts as a template.\n3. Free RNA nucleotides in the nucleoplasm attach to their complementary bases on the DNA template (A with U, G with C).\n4. RNA polymerase joins the nucleotides to form messenger RNA (mRNA).\n5. The single-stranded mRNA moves out of the nucleus through a nuclear pore into the cytoplasm to attach to a ribosome for translation.'
    }
  ]
};

export const LearnerAutoGrader: React.FC = () => {
  const [subject, setSubject] = useState<string>('Mathematics');
  const [grade, setGrade] = useState<number>(11);
  const [topic, setTopic] = useState<string>('Quadratic Equations & Inequalities');
  const [questionText, setQuestionText] = useState<string>(PRESET_PRACTICE_QUESTIONS['Mathematics'][0].question);
  const [learnerAnswer, setLearnerAnswer] = useState<string>('');
  const [totalMarks, setTotalMarks] = useState<number>(4);

  const [loading, setLoading] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const presets = PRESET_PRACTICE_QUESTIONS[subject] || [];

  const handleSelectPreset = (preset: any) => {
    setTopic(preset.topic);
    setQuestionText(preset.question);
    setTotalMarks(preset.marks);
    setLearnerAnswer(preset.sampleAnswer);
    setAssessment(null);
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !learnerAnswer.trim()) return;

    setLoading(true);
    setError(null);
    setAssessment(null);
    setXpEarned(null);

    try {
      const res = await learnerService.gradeSubmission({
        subject,
        grade,
        topic,
        question_text: questionText,
        learner_answer: learnerAnswer,
        total_marks: totalMarks
      });

      if (res.assessment) {
        setAssessment(res.assessment);
        setXpEarned(res.xp_earned || 50);
      }
    } catch (err: any) {
      console.error('Auto grader error:', err);
      setError('AI Senior Marker is assessing via offline CAPS rubric.');
    } finally {
      setLoading(false);
    }
  };

  const getLevelVariant = (level: number) => {
    if (level >= 7) return 'indigo';
    if (level >= 6) return 'cyan';
    if (level >= 5) return 'emerald';
    if (level >= 4) return 'amber';
    return 'rose';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-brand-600 text-white shadow-glow-cyan">
              <FileCheck className="w-5 h-5" />
            </div>
            AI Homework & Test Auto-Grader
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit your written solutions for instant CAPS mark allocation, method checks, and examiner feedback.
          </p>
        </div>
      </div>

      {xpEarned && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-brand-500/15 to-emerald-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shadow-glow-amber animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 fill-amber-400 text-amber-400 animate-pulse" />
            <span className="font-extrabold text-sm">+{xpEarned} Academic XP Awarded!</span>
          </div>
          <Badge variant="amber" size="sm">Study Streak Boost Active</Badge>
        </div>
      )}

      {/* Grid: Submission Form vs AI Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display">Assignment Submission</h3>
            <Badge variant="cyan" size="sm">CAPS Rubric Active</Badge>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => {
                    const newSub = e.target.value;
                    setSubject(newSub);
                    const defaultP = PRESET_PRACTICE_QUESTIONS[newSub]?.[0];
                    if (defaultP) handleSelectPreset(defaultP);
                  }}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physical Sciences">Physical Sciences</option>
                  <option value="Life Sciences">Life Sciences</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={10}>Grade 10</option>
                  <option value={11}>Grade 11</option>
                  <option value={12}>Grade 12</option>
                </select>
              </div>
            </div>

            {/* Quick Exemplar Question Chips */}
            {presets.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Try Exemplar Practice Questions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-surface-darker border border-white/5 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all text-left"
                    >
                      {p.topic} ({p.marks}M)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Question / Problem Statement
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
                required
                className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
                placeholder="Paste exam question or homework prompt..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Your Submitted Solution / Working
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Max Marks: {totalMarks}</span>
              </div>
              <textarea
                value={learnerAnswer}
                onChange={(e) => setLearnerAnswer(e.target.value)}
                rows={6}
                required
                className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono leading-relaxed"
                placeholder="Type your step-by-step working, formulas, and final answer..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 text-white font-bold text-xs shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Evaluate with AI Senior Marker</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: AI Assessment Breakdown (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl flex flex-col min-h-[580px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="cyan" size="sm">Senior Marker AI Evaluation</Badge>
              {assessment && (
                <Badge variant={getLevelVariant(assessment.caps_level)} size="sm">
                  CAPS Level {assessment.caps_level} ({assessment.percentage}%)
                </Badge>
              )}
            </div>

            {assessment && (
              <div className="text-right font-mono font-extrabold text-sm text-cyan-300">
                Score: {assessment.score} / {assessment.total_marks} Marks
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 text-xs space-y-4">
            {loading ? (
              <LoadingSpinner size="md" text="Analyzing formula syntax, method marks, and accuracy..." />
            ) : assessment ? (
              <div className="space-y-4">
                {/* Overall Feedback Banner */}
                <div className={`p-4 rounded-2xl border ${
                  assessment.is_pass
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Examiner's General Feedback</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-200">{assessment.overall_comment}</p>
                </div>

                {/* Mark Breakdown */}
                {assessment.mark_breakdown && (
                  <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2">
                    <p className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>Step-by-Step Mark Allocation:</span>
                    </p>
                    <ul className="space-y-1.5 pl-1">
                      {assessment.mark_breakdown.map((item: string, idx: number) => (
                        <li key={idx} className="p-2.5 rounded-xl bg-surface-dark border border-white/5 text-slate-300 text-xs font-mono">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Verified Ideal Solution */}
                {assessment.correct_step_by_step && (
                  <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2">
                    <p className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>Verified CAPS Model Solution:</span>
                    </p>
                    <pre className="p-3 rounded-xl bg-surface-dark text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed border border-white/5">
                      {assessment.correct_step_by_step}
                    </pre>
                  </div>
                )}

                {/* Golden Exam Rule */}
                {assessment.key_takeaway && (
                  <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-bold text-white text-[11px] block">Key Examination Rule to Remember:</span>
                      <p className="text-xs text-slate-300 mt-0.5">{assessment.key_takeaway}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <FileCheck className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-xs max-w-sm">
                  Select an exemplar problem or type your homework solution on the left to receive instant rubric evaluation and marks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
