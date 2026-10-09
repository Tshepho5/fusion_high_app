import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  FileCheck,
  AlertTriangle,
  Copy,
  Printer,
  Sparkles,
  Check,
  Download,
  Users,
  Clock,
  Award,
  Layers,
  ChevronRight,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { gelezaAiService, teacherService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface TeacherAICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'lesson' | 'test' | 'risk';
  defaultSubject?: string;
  defaultGrade?: number;
}

const CAPS_TOPIC_SUGGESTIONS: Record<string, string[]> = {
  'Mathematics': [
    'Trinomial Factorisation & Quadratic Equations',
    'Euclidean Geometry & Circle Theorems',
    'Differential Calculus & Curve Sketching',
    'Financial Mathematics & Annuities',
    'Trigonometry Reduction Formulas'
  ],
  'Physical Sciences': [
    'Newton’s 2nd Law of Motion & Momentum',
    'Work, Energy and Power Theorem',
    'Doppler Effect & Waves',
    'Organic Chemistry IUPAC & Functional Groups',
    'Electric Circuits & Internal Resistance'
  ],
  'Life Sciences': [
    'DNA Replication & Protein Synthesis',
    'Meiosis & Chromosomal Mutations',
    'Genetics & Monohybrid Crosses',
    'Human Endocrine System & Homeostasis',
    'Evolution by Natural Selection'
  ],
  'Accounting': [
    'Financial Statements & Balance Sheet',
    'Cash Flow Statements & Analysis',
    'Debtors & Creditors Reconciliations',
    'Cost Accounting & Manufacturing Accounts',
    'Corporate Governance & King IV'
  ],
  'English': [
    'Essay Writing: Discursive & Narrative',
    'Poetry Analysis & Figures of Speech',
    'Direct and Indirect Speech',
    'Transactional Texts: Formal Letters & CVs'
  ]
};

export const TeacherAICopilotModal: React.FC<TeacherAICopilotModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'lesson',
  defaultSubject = 'Mathematics',
  defaultGrade = 10
}) => {
  const [activeTab, setActiveTab] = useState<'lesson' | 'test' | 'risk'>(initialTab);

  // Lesson Planner inputs
  const [subject, setSubject] = useState(defaultSubject);
  const [grade, setGrade] = useState(defaultGrade);
  const [topic, setTopic] = useState('');
  const [term, setTerm] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Assessment generator inputs
  const [testMarks, setTestMarks] = useState(30);

  // Class Risk Briefing inputs
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | string>('');

  // Execution states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonResult, setLessonResult] = useState<any | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [riskResult, setRiskResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'paper' | 'memo'>('paper');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      teacherService.getClasses()
        .then(res => {
          const list = Array.isArray(res) ? res : res?.classes || [];
          setClasses(list);
          if (list.length > 0 && !selectedClassId) {
            setSelectedClassId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateLessonPlan = async () => {
    if (!topic.trim()) {
      setError('Please specify a CAPS topic for the lesson plan.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await gelezaAiService.generateLessonPlan({
        subject,
        grade,
        topic: topic.trim(),
        term,
        durationMinutes
      });
      setLessonResult(res.lessonPlan || res);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate lesson plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssessment = async () => {
    if (!topic.trim()) {
      setError('Please specify a topic for the assessment paper.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await gelezaAiService.generateAssessment({
        subject,
        grade,
        topic: topic.trim(),
        totalMarks: testMarks
      });
      setTestResult(res.assessment || res);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate assessment paper. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchClassRisk = async () => {
    if (!selectedClassId) {
      setError('Please select a class to synthesize risk telemetry.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await gelezaAiService.getClassRiskBriefing(selectedClassId);
      setRiskResult(res.briefing || res);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load class risk briefing.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestions = CAPS_TOPIC_SUGGESTIONS[subject] || CAPS_TOPIC_SUGGESTIONS['Mathematics'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Geleza AI Teacher Copilot
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
                  DBE CAPS Aligned
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instructional assistant for lesson preparation, cognitive assessment design, and learner risk briefings
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
          <button
            onClick={() => { setActiveTab('lesson'); setError(null); }}
            className={`flex items-center space-x-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'lesson'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>CAPS Lesson Planner</span>
          </button>
          <button
            onClick={() => { setActiveTab('test'); setError(null); }}
            className={`flex items-center space-x-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'test'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Bloom's Test & Memo</span>
          </button>
          <button
            onClick={() => { setActiveTab('risk'); setError(null); }}
            className={`flex items-center space-x-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'risk'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Class Risk Briefing</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CAPS LESSON PLANNER */}
          {activeTab === 'lesson' && (
            <div className="space-y-6">
              {!lessonResult ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physical Sciences">Physical Sciences</option>
                        <option value="Life Sciences">Life Sciences</option>
                        <option value="Accounting">Accounting</option>
                        <option value="English">English FAL / HL</option>
                        <option value="Business Studies">Business Studies</option>
                        <option value="Geography">Geography</option>
                        <option value="History">History</option>
                        <option value="Tourism">Tourism</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Grade</label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={10}>Grade 10</option>
                        <option value={11}>Grade 11</option>
                        <option value={12}>Grade 12</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Term</label>
                      <select
                        value={term}
                        onChange={(e) => setTerm(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>Term 1</option>
                        <option value={2}>Term 2</option>
                        <option value={3}>Term 3</option>
                        <option value={4}>Term 4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                      <select
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={45}>45 Minutes</option>
                        <option value={60}>60 Minutes</option>
                        <option value={90}>90 Minutes (Double)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">CAPS Topic / Subtopic</label>
                    <input
                      type="text"
                      placeholder="e.g. Trinomial Factorisation or Newton's Laws"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Quick Topic Chips */}
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">
                      Quick CAPS Topic Presets:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTopic(s)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            topic === s
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-semibold'
                              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateLessonPlan}
                    disabled={loading || !topic.trim()}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate Official CAPS Lesson Plan</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {lessonResult.topic || topic}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {subject} • Grade {grade} • Term {term} • {durationMinutes} Mins
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(JSON.stringify(lessonResult, null, 2))}
                        className="p-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="p-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => setLessonResult(null)}
                        className="p-2 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                      >
                        New Plan
                      </button>
                    </div>
                  </div>

                  {/* Objectives */}
                  {lessonResult.objectives && (
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2">
                        Lesson Objectives & Outcomes
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        {Array.isArray(lessonResult.objectives)
                          ? lessonResult.objectives.map((o: string, idx: number) => <li key={idx}>{o}</li>)
                          : <li>{lessonResult.objectives}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Phases */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Phase 1: Introduction & Prior Knowledge</span>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {lessonResult.introduction || lessonResult.phase1 || 'Review prerequisite vocabulary and hook learners with a real-world scenario.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Phase 2: Teaching & Concept Delivery</span>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {lessonResult.teachingPhase || lessonResult.coreContent || lessonResult.phase2 || 'Direct instruction, step-by-step worked example demonstrations on board.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Phase 3: Class Activity & Practice</span>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {lessonResult.classActivity || lessonResult.practice || lessonResult.phase3 || 'Structured guided practice in pairs, teacher circulating for formative feedback.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Phase 4: Summary & Homework</span>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {lessonResult.conclusion || lessonResult.homework || lessonResult.phase4 || 'Quick exit ticket to gauge concept mastery, consolidation exercises for home.'}
                      </p>
                    </div>
                  </div>

                  {/* Remedial / Differentiation */}
                  {lessonResult.differentiation && (
                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-amber-800 dark:text-amber-400 block mb-1">Differentiation & Remedial Support:</span>
                      <p>{lessonResult.differentiation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BLOOM'S TAXONOMY TEST & MEMO */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              {!testResult ? (
                <div className="space-y-5">
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
                        <option value="Geography">Geography</option>
                        <option value="History">History</option>
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
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Marks</label>
                      <select
                        value={testMarks}
                        onChange={(e) => setTestMarks(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value={20}>20 Marks (Class Quiz)</option>
                        <option value={30}>30 Marks (Standard Test)</option>
                        <option value={50}>50 Marks (Formal Controlled Test)</option>
                        <option value={75}>75 Marks (Mid-Year Paper)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessment Topic</label>
                    <input
                      type="text"
                      placeholder="e.g. Quadratic Inequalities and Functions"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Cognitive Distribution Info */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      DBE Bloom's Cognitive Weighting Guaranteed:
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                        <span className="block font-bold text-blue-700 dark:text-blue-300">Level 1 (20%)</span>
                        <span className="text-slate-500">Knowledge</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                        <span className="block font-bold text-emerald-700 dark:text-emerald-300">Level 2 (35%)</span>
                        <span className="text-slate-500">Routine</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                        <span className="block font-bold text-amber-700 dark:text-amber-300">Level 3 (30%)</span>
                        <span className="text-slate-500">Complex</span>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900">
                        <span className="block font-bold text-purple-700 dark:text-purple-300">Level 4 (15%)</span>
                        <span className="text-slate-500">Problem Solving</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAssessment}
                    disabled={loading || !topic.trim()}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate Assessment Paper & Memorandum</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {testResult.title || `${subject} Controlled Assessment`}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Grade {grade} • Total: {testMarks} Marks • CAPS Compliant
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
                        <button
                          onClick={() => setViewMode('paper')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'paper'
                              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Question Paper
                        </button>
                        <button
                          onClick={() => setViewMode('memo')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'memo'
                              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Marking Memo
                        </button>
                      </div>

                      <button
                        onClick={() => handleCopy(viewMode === 'paper' ? (testResult.paperText || JSON.stringify(testResult.questions)) : (testResult.memoText || JSON.stringify(testResult.memorandum)))}
                        className="p-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => setTestResult(null)}
                        className="p-2 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      >
                        New Paper
                      </button>
                    </div>
                  </div>

                  {/* Question Paper View */}
                  {viewMode === 'paper' && (
                    <div className="space-y-4">
                      {testResult.questions && Array.isArray(testResult.questions) ? (
                        testResult.questions.map((q: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                Question {idx + 1}
                              </span>
                              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                                [{q.marks || 5} Marks] • {q.cognitiveLevel || 'Routine'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                              {q.question || q.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm whitespace-pre-line leading-relaxed font-mono">
                          {testResult.paperText || testResult.content || JSON.stringify(testResult, null, 2)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Marking Memo View */}
                  {viewMode === 'memo' && (
                    <div className="space-y-4">
                      {testResult.memorandum && Array.isArray(testResult.memorandum) ? (
                        testResult.memorandum.map((m: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm text-emerald-900 dark:text-emerald-300">
                                Question {idx + 1} Memo
                              </span>
                              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                Total: {m.marks || 5} Marks
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                              {m.solution || m.answer || m.memo}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-sm whitespace-pre-line leading-relaxed font-mono">
                          {testResult.memoText || testResult.memo || 'Marking memorandum generated.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLASS RISK BRIEFING */}
          {activeTab === 'risk' && (
            <div className="space-y-6">
              {!riskResult ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select Target Class for Early Warning Synthesis
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose a Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || `Class ${c.grade}`} {c.stream ? `(${c.stream})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Continuous Academic Risk Auditing
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Aggregates term test marks, LightGBM exam marks projection, and 30-day attendance rates
                      against official DBE policy to surface priority students and tailored pedagogical intervention steps.
                    </p>
                  </div>

                  <button
                    onClick={handleFetchClassRisk}
                    disabled={loading || !selectedClassId}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                    <span>Synthesize Class Risk Briefing</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {riskResult.class_name || 'Class'} Early-Warning Briefing
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total Enrolled: {riskResult.total_students || 0} Learners
                      </p>
                    </div>
                    <button
                      onClick={() => setRiskResult(null)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      Change Class
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center">
                      <span className="block text-2xl font-black text-rose-600 dark:text-rose-400">
                        {riskResult.priority_support_count || 0}
                      </span>
                      <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                        Priority Support (&le;65% / &lt;75% Att)
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center">
                      <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">
                        {riskResult.core_progress_count || 0}
                      </span>
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Core Progress (66%–79%)
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-center">
                      <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {riskResult.high_achiever_count || 0}
                      </span>
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        High Achievers (&ge;80%)
                      </span>
                    </div>
                  </div>

                  {/* AI Pedagogical Plan */}
                  {riskResult.ai_pedagogical_plan && (
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-2">
                        💡 Geleza AI Pedagogical Action Plan:
                      </span>
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {riskResult.ai_pedagogical_plan}
                      </p>
                    </div>
                  )}

                  {/* Flagged Students Table */}
                  {riskResult.priority_students && riskResult.priority_students.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Learners Requiring Intervention ({riskResult.priority_students.length})
                      </h4>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                            <tr>
                              <th className="p-3">Learner</th>
                              <th className="p-3">Projected Exam</th>
                              <th className="p-3">Attendance</th>
                              <th className="p-3">Recommended Nudge</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {riskResult.priority_students.map((s: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-3 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-md font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60">
                                    {s.predicted_score}%
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-md font-bold ${
                                    s.attendance_pct < 80
                                      ? 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60'
                                      : 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60'
                                  }`}>
                                    {s.attendance_pct}%
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">{s.nudge}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
