import React, { useState } from 'react';
import {
  X,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Award,
  ArrowRight,
  RotateCcw,
  BookOpen,
  BrainCircuit,
  MessageCircleQuestion,
  ChevronRight
} from 'lucide-react';
import { gelezaAiService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface LearnerAIQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialGrade?: number;
}

const CAPS_TOPICS: Record<string, string[]> = {
  'Mathematics': [
    'Quadratic Equations & Trinomials',
    'Arithmetic & Geometric Sequences',
    'Euclidean Circle Geometry',
    'Trigonometry Reduction Identities',
    'Calculus Derivatives & Tangents'
  ],
  'Physical Sciences': [
    'Newton’s Laws of Motion & Net Force',
    'Work, Energy and Power Calculations',
    'Doppler Effect Calculations',
    'Organic Chemistry IUPAC Naming',
    'Chemical Equilibrium & Le Chatelier'
  ],
  'Life Sciences': [
    'DNA Replication & Transcription',
    'Meiosis & Genetic Crosses',
    'Human Endocrine Glands & Hormones',
    'Human Eye & Ear Defect Corrections',
    'Evolution Evidence & Speciation'
  ],
  'Accounting': [
    'Balance Sheet & Notes Analysis',
    'Debtors & Creditors Reconciliations',
    'Bank Reconciliation Statements',
    'Cost Accounting & Break-even Point'
  ]
};

export const LearnerAIQuizModal: React.FC<LearnerAIQuizModalProps> = ({
  isOpen,
  onClose,
  initialSubject = 'Mathematics',
  initialGrade = 10
}) => {
  // Setup state
  const [subject, setSubject] = useState(initialSubject);
  const [grade, setGrade] = useState(initialGrade);
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Quiz execution state
  const [step, setStep] = useState<'setup' | 'quiz' | 'summary'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Per-question interactive state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [mistakeExplanation, setMistakeExplanation] = useState<string | null>(null);
  const [explainingMistake, setExplainingMistake] = useState(false);

  if (!isOpen) return null;

  const handleLaunchQuiz = async () => {
    if (!topic.trim()) {
      setError('Please choose or enter a CAPS topic.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await gelezaAiService.generateQuiz({
        subject,
        grade,
        topic: topic.trim(),
        questionCount,
        difficulty
      });
      const qList = res.quiz?.questions || res.questions || [];
      if (qList.length === 0) {
        throw new Error('No questions returned by Geleza AI.');
      }
      setQuestions(qList);
      setCurrentIndex(0);
      setScore(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setShowHint(false);
      setMistakeExplanation(null);
      setStep('quiz');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleSubmitAnswer = () => {
    if (!selectedOption || !currentQ) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption.trim().toLowerCase() === String(currentQ.answer || currentQ.correctAnswer).trim().toLowerCase() ||
      selectedOption.startsWith(String(currentQ.answer || currentQ.correctAnswer));

    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleExplainMistake = async () => {
    if (!currentQ || !selectedOption) return;
    setExplainingMistake(true);
    try {
      const res = await gelezaAiService.explainMistake({
        subject,
        grade,
        question: currentQ.question,
        studentAnswer: selectedOption,
        correctAnswer: currentQ.answer || currentQ.correctAnswer
      });
      setMistakeExplanation(res.explanation || res.feedback || 'Review the core formula and retry.');
    } catch (_) {
      setMistakeExplanation(`Correct Answer: ${currentQ.answer}. Always verify step-by-step arithmetic and units.`);
    } finally {
      setExplainingMistake(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setShowHint(false);
      setMistakeExplanation(null);
    } else {
      setStep('summary');
    }
  };

  const handleReset = () => {
    setStep('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setShowHint(false);
    setMistakeExplanation(null);
  };

  const topicPresets = CAPS_TOPICS[subject] || CAPS_TOPICS['Mathematics'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Geleza AI Practice Quiz
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800">
                  Instant Feedback
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CAPS interactive questions with Socratic hints and step-by-step mistake diagnostics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: SETUP */}
          {step === 'setup' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physical Sciences">Physical Sciences</option>
                    <option value="Life Sciences">Life Sciences</option>
                    <option value="Accounting">Accounting</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value={10}>Grade 10</option>
                    <option value={11}>Grade 11</option>
                    <option value={12}>Grade 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Questions</label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value={3}>3 Quick Practice Questions</option>
                    <option value={5}>5 Standard Questions</option>
                    <option value={10}>10 Full Mastery Questions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">CAPS Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Euclidean Circle Theorems or Newton's Laws"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">
                  Suggested CAPS Topics:
                </span>
                <div className="flex flex-wrap gap-2">
                  {topicPresets.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        topic === t
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLaunchQuiz}
                disabled={loading || !topic.trim()}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                <span>Launch Geleza AI Practice Quiz</span>
              </button>
            </div>
          )}

          {/* STEP 2: ACTIVE QUIZ */}
          {step === 'quiz' && currentQ && (
            <div className="space-y-5 animate-fade-in">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                  <span>Score: {score} / {currentIndex + (isAnswerSubmitted ? 1 : 0)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {currentQ.question}
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shrink-0">
                    {currentQ.marks || 2} Marks
                  </span>
                </div>

                {/* Socratic Hint Button */}
                {currentQ.hint && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowHint(prev => !prev)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>{showHint ? 'Hide Concept Hint' : '💡 Need a Hint?'}</span>
                    </button>
                    {showHint && (
                      <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 animate-fade-in">
                        {currentQ.hint}
                      </div>
                    )}
                  </div>
                )}

                {/* Options */}
                {currentQ.options && Array.isArray(currentQ.options) ? (
                  <div className="space-y-2.5 pt-2">
                    {currentQ.options.map((opt: string, optIdx: number) => {
                      const isSelected = selectedOption === opt;
                      const isCorrect = opt.trim().toLowerCase() === String(currentQ.answer || currentQ.correctAnswer).trim().toLowerCase() ||
                        opt.startsWith(String(currentQ.answer || currentQ.correctAnswer));

                      let btnStyle = 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200';
                      if (isAnswerSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold';
                        }
                      } else if (isSelected) {
                        btnStyle = 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-semibold';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isAnswerSubmitted}
                          onClick={() => setSelectedOption(opt)}
                          className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {isAnswerSubmitted && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                          {isAnswerSubmitted && isSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      disabled={isAnswerSubmitted}
                      placeholder="Type your final answer..."
                      value={selectedOption || ''}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Feedback & Actions */}
              {!isAnswerSubmitted ? (
                <button
                  type="button"
                  disabled={!selectedOption}
                  onClick={handleSubmitAnswer}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all disabled:opacity-40"
                >
                  Submit Answer
                </button>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  {/* Mistake Diagnostic Trigger */}
                  {selectedOption && selectedOption.trim().toLowerCase() !== String(currentQ.answer || currentQ.correctAnswer).trim().toLowerCase() && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                          Incorrect. Correct answer: <span className="font-bold">{currentQ.answer || currentQ.correctAnswer}</span>
                        </span>
                        {!mistakeExplanation && (
                          <button
                            type="button"
                            onClick={handleExplainMistake}
                            disabled={explainingMistake}
                            className="text-xs px-2.5 py-1 rounded-lg bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold hover:bg-rose-300 transition-all flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{explainingMistake ? 'Analyzing...' : 'Explain My Mistake'}</span>
                          </button>
                        )}
                      </div>

                      {mistakeExplanation && (
                        <div className="pt-2 border-t border-rose-200 dark:border-rose-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {mistakeExplanation}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View Quiz Results'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SUMMARY */}
          {step === 'summary' && (
            <div className="text-center py-6 space-y-6 animate-fade-in">
              <div className="inline-flex p-4 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 text-white shadow-xl shadow-indigo-500/20">
                <Award className="w-12 h-12" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Quiz Completed!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {subject} • {topic} (Grade {grade})
                </p>
              </div>

              <div className="inline-block p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="block text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {score} / {questions.length}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mt-1">
                  {Math.round((score / questions.length) * 100)}% Mastery Score
                </span>
                <div className="mt-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                    (score / questions.length) >= 0.8
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : (score / questions.length) >= 0.5
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {(score / questions.length) >= 0.8 ? '🌟 Distinction Ready' : (score / questions.length) >= 0.5 ? '👍 On Track' : '⚠️ Remedial Revision Needed'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Another Topic</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
