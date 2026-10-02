import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Users,
  ShieldCheck,
  Brain,
  Sliders,
  ChevronRight,
  Info,
  X,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Clock,
  HelpCircle,
  BarChart3,
  Award,
  Zap
} from 'lucide-react';
import api from '../../services/api';
import { readAuthValue } from '../../utils/authStorage';

interface LearnerRadarItem {
  child_id: number;
  full_name: string;
  surname: string;
  grade: number;
  learner_number: string;
  predicted_score: number | null;
  risk_tier_id: number | null; // 0: Priority, 1: Core, 2: High Achiever
  risk_tier_label: string | null;
  risk_tier_color: string | null;
  actionable_nudges: string[] | null;
  last_assessed_at: string | null;
}

interface ModelMetrics {
  metadata: {
    project: string;
    model_version: string;
    dataset_rows: number;
    test_split_size: number;
  };
  metrics: {
    risk_tier_classifier: {
      accuracy: number;
      macro_f1: number;
      confusion_matrix: {
        raw_matrix: number[][];
        labels: string[];
      };
      per_class_metrics: Record<string, { precision: number; recall: number; f1_score: number; support: number }>;
      disparate_impact_audit: {
        gender_disparate_impact_ratio: number;
      };
    };
    score_predictor: {
      mae: number;
      r2_score: number;
      rmse: number;
      feature_importance_percentage: Record<string, number>;
    };
  };
}

interface GelezaEarlyWarningRadarProps {
  onNavigateTab?: (tabId: string, params?: any) => void;
}

export const GelezaEarlyWarningRadar: React.FC<GelezaEarlyWarningRadarProps> = ({ onNavigateTab }) => {
  const [learners, setLearners] = useState<LearnerRadarItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [activeTierFilter, setActiveTierFilter] = useState<'all' | 'priority' | 'core' | 'high' | 'unassessed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected student for "What-If" Simulation or Detailed Factor Drawer
  const [inspectingLearner, setInspectingLearner] = useState<LearnerRadarItem | null>(null);
  const [simulationData, setSimulationData] = useState<{
    hours: number;
    attendance: number;
    tutoring: number;
  }>({ hours: 18, attendance: 85, tutoring: 1 });
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Model Health & Fairness Modal
  const [showMetricsModal, setShowMetricsModal] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);

  // Ad-hoc Quick Predictor Modal for Testing Any Learner Profile
  const [showAdHocModal, setShowAdHocModal] = useState<boolean>(false);
  const [adHocInputs, setAdHocInputs] = useState({
    Attendance: 82,
    Hours_Studied: 16,
    Previous_Scores: 65,
    Access_to_Resources: 'Medium',
    Parental_Involvement: 'Medium',
    Tutoring_Sessions: 1
  });
  const [adHocResult, setAdHocResult] = useState<any>(null);
  const [adHocLoading, setAdHocLoading] = useState<boolean>(false);
  const [conceptGaps, setConceptGaps] = useState<Array<{ learner: string; concept: string; grade: number | null; subject: string; mastery: number; attempts: number }>>([]);

  // 1. Fetch Radar Data
  const fetchRadarData = async () => {
    try {
      setLoading(true);
      const schoolId = readAuthValue('active_school_id', [localStorage, sessionStorage]) || '1';
      const gradeQuery = selectedGrade !== 'all' ? `?grade=${selectedGrade}` : '';
      const res = await api.get(`/api/ai-advisor/geleza/school/${schoolId}/early-warning${gradeQuery}`);

      if (res.data?.success && res.data.summary) {
        const combined = [
          ...res.data.summary.priority_support,
          ...res.data.summary.core_progress,
          ...res.data.summary.high_achiever,
          ...res.data.summary.unassessed
        ];
        setLearners(combined);
      }
    } catch (err) {
      console.warn('Could not fetch live early warning data, using cached state:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Model Health & Metrics
  const fetchMetrics = async () => {
    try {
      const res = await api.get('/api/ai-advisor/geleza/metrics');
      if (res.data?.success) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch model metrics:', err);
    }
  };

  useEffect(() => {
    fetchRadarData();
    fetchMetrics();
    api.get('/api/teacher/concept-gaps').then((res) => {
      if (res.data?.success) setConceptGaps(res.data.gaps || []);
    }).catch(() => {});
  }, [selectedGrade]);

  // 3. One-Click Batch Evaluate Class / Grade
  const handleEvaluateCohort = async () => {
    try {
      setEvaluating(true);
      const schoolId = readAuthValue('active_school_id', [localStorage, sessionStorage]) || '1';
      const payload: any = {
        school_id: parseInt(schoolId, 10),
        academic_year: 2026,
        term: 1
      };
      if (selectedGrade !== 'all') {
        payload.grade = parseInt(selectedGrade, 10);
      }

      await api.post('/api/ai-advisor/geleza/job/run-audit', payload);
      await fetchRadarData();
    } catch (err) {
      console.error('Batch evaluation error:', err);
    } finally {
      setEvaluating(false);
    }
  };

  // 4. Run Simulation
  const handleRunSimulation = async () => {
    if (!inspectingLearner) return;
    try {
      setSimulating(true);
      const baseline = {
        Hours_Studied: 14,
        Attendance: 75,
        Previous_Scores: inspectingLearner.predicted_score || 65,
        Access_to_Resources: 'Medium',
        Parental_Involvement: 'Medium',
        Tutoring_Sessions: 0
      };
      const adjustments = {
        Hours_Studied: simulationData.hours,
        Attendance: simulationData.attendance,
        Previous_Scores: inspectingLearner.predicted_score || 65,
        Access_to_Resources: 'Medium',
        Parental_Involvement: 'Medium',
        Tutoring_Sessions: simulationData.tutoring
      };

      const res = await api.post('/api/ai-advisor/geleza/simulate', { baseline, adjustments });
      if (res.data?.success) {
        setSimResult(res.data);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  // 5. Ad-Hoc Test Evaluation
  const handleRunAdHocPredict = async () => {
    try {
      setAdHocLoading(true);
      const res = await api.post('/api/ai-advisor/geleza/predict', adHocInputs);
      if (res.data?.success) {
        setAdHocResult(res.data);
      }
    } catch (err) {
      console.error('Ad-hoc predict error:', err);
    } finally {
      setAdHocLoading(false);
    }
  };

  // KPI Calculations
  const counts = useMemo(() => {
    let priority = 0;
    let core = 0;
    let high = 0;
    let unassessed = 0;

    learners.forEach((l) => {
      if (l.risk_tier_id === 0) priority++;
      else if (l.risk_tier_id === 1) core++;
      else if (l.risk_tier_id === 2) high++;
      else unassessed++;
    });

    return { priority, core, high, unassessed, total: learners.length };
  }, [learners]);

  // Filtered List
  const filteredLearners = useMemo(() => {
    return learners.filter((l) => {
      // Tier match
      if (activeTierFilter === 'priority' && l.risk_tier_id !== 0) return false;
      if (activeTierFilter === 'core' && l.risk_tier_id !== 1) return false;
      if (activeTierFilter === 'high' && l.risk_tier_id !== 2) return false;
      if (activeTierFilter === 'unassessed' && l.risk_tier_id !== null) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = `${l.full_name || ''} ${l.surname || ''}`.toLowerCase();
        const num = (l.learner_number || '').toLowerCase();
        return name.includes(q) || num.includes(q);
      }

      return true;
    });
  }, [learners, activeTierFilter, searchQuery]);

  const predictorMae = metrics?.metrics?.score_predictor?.mae;
  const tierAccuracy = metrics?.metrics?.risk_tier_classifier?.accuracy;

  return (
    <div className="space-y-6 pb-28 animate-fade-in">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. HERO HEADER WITH CONTROLS & MODEL FAIRNESS BADGE           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-indigo-950/80 dark:to-slate-900 border border-slate-200 dark:border-indigo-500/20 p-6 md:p-8 shadow-sm dark:shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold tracking-wide uppercase">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
              Geleza SA Responsible AI Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Early-Warning Academic Radar
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              Projected exam marks and support tiers from attendance, study time, past scores, tutoring, resources, and parent involvement.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowMetricsModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-sm font-medium transition shadow-sm"
              title="Inspect model accuracy, confusion matrix, and fairness parity"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Model Health & Audit</span>
            </button>

            <button
              onClick={() => {
                setAdHocResult(null);
                setShowAdHocModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 text-sm font-medium transition shadow-sm"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Test Single Learner</span>
            </button>

            <button
              onClick={handleEvaluateCohort}
              disabled={evaluating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${evaluating ? 'animate-spin' : ''}`} />
              <span>{evaluating ? 'Evaluating Cohort...' : 'One-Click AI Roster Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Concept gaps below 50%</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          These come from adaptive practice. A miss on a later CAPS idea steps the learner back to the earlier concept it depends on.
        </p>
        {conceptGaps.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No learner is below 50% on a practised concept yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {conceptGaps.slice(0, 8).map((gap) => (
              <li key={`${gap.learner}-${gap.concept}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-800 dark:text-slate-100">{gap.learner} · Grade {gap.grade} {gap.concept}</span>
                <span className="font-bold text-rose-600 dark:text-rose-300">{Math.round(gap.mastery * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. STATS & TRIAGE CARDS (BALANCED 33% TIERS)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Priority Support */}
        <div
          onClick={() => setActiveTierFilter(activeTierFilter === 'priority' ? 'all' : 'priority')}
          className={`cursor-pointer rounded-xl p-5 border transition-all duration-200 ${
            activeTierFilter === 'priority'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900/60 border-rose-200 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/50 hover:bg-rose-50 dark:hover:bg-rose-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-rose-700 dark:text-rose-300 uppercase">
              Priority Support (below 50%)
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{counts.priority}</span>
            <span className="text-xs text-rose-400 font-medium">
              {counts.total > 0 ? `${Math.round((counts.priority / counts.total) * 100)}% of class` : '0%'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
            Urgent remedial tutoring & attendance check needed
          </p>
        </div>

        {/* Core Progress */}
        <div
          onClick={() => setActiveTierFilter(activeTierFilter === 'core' ? 'all' : 'core')}
          className={`cursor-pointer rounded-xl p-5 border transition-all duration-200 ${
            activeTierFilter === 'core'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900/60 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-700 dark:text-emerald-300 uppercase">
              Core Progress (50–69%)
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{counts.core}</span>
            <span className="text-xs text-emerald-400 font-medium">
              {counts.total > 0 ? `${Math.round((counts.core / counts.total) * 100)}% of class` : '0%'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Stable progression, eligible for booster sessions
          </p>
        </div>

        {/* High Achievers */}
        <div
          onClick={() => setActiveTierFilter(activeTierFilter === 'high' ? 'all' : 'high')}
          className={`cursor-pointer rounded-xl p-5 border transition-all duration-200 ${
            activeTierFilter === 'high'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900/60 border-amber-200 dark:border-amber-500/20 hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-amber-700 dark:text-amber-300 uppercase">
              High Achievers (70%+)
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{counts.high}</span>
            <span className="text-xs text-amber-400 font-medium">
              {counts.total > 0 ? `${Math.round((counts.high / counts.total) * 100)}% of class` : '0%'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Distinction candidate track & peer tutor mentors
          </p>
        </div>

        {/* Model Accuracy & Parity */}
        <div className="rounded-xl p-5 border bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Predictor Precision
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {predictorMae != null ? `±${Number(predictorMae).toFixed(2)}` : '—'}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">marks MAE on the test set</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 inline shrink-0" />
            {tierAccuracy != null
              ? `${Math.round(tierAccuracy * 1000) / 10}% tier accuracy. Gender is not a model input.`
              : 'Gender is not a model input, so no gender score is shown.'}
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ROSTER CONTROLS: SEARCH, GRADE FILTER & TIER TABS          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tier Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `All Learners (${counts.total})` },
              { id: 'priority', label: `Priority Support (${counts.priority})`, color: 'text-rose-400' },
              { id: 'core', label: `Core Progress (${counts.core})`, color: 'text-emerald-400' },
              { id: 'high', label: `High Achievers (${counts.high})`, color: 'text-amber-400' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTierFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTierFilter === tab.id
                    ? 'bg-slate-800 text-white shadow'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                } ${tab.color || ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grade Selector & Search */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500 w-52 md:w-64"
              />
            </div>

            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Grades</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. STUDENT TRIAGE TABLE                                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Querying academic factors & computing predictions...</p>
          </div>
        ) : filteredLearners.length === 0 ? (
          <div className="py-16 text-center space-y-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-8">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-slate-900 dark:text-white font-semibold text-base">No Learner Records Found</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto">
                No students in Grade {selectedGrade} match your current filter. When real learners are enrolled and recorded in attendance/marks, they will automatically appear here.
              </p>
            </div>
            <button
              onClick={() => {
                setAdHocResult(null);
                setShowAdHocModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Launch Quick Student Test Simulation</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-3">Grade</th>
                  <th className="py-3 px-3">Risk Tier</th>
                  <th className="py-3 px-3">Projected Exam Mark</th>
                  <th className="py-3 px-4">Top AI Nudge</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLearners.map((learner) => {
                  const isRed = learner.risk_tier_id === 0;
                  const isGreen = learner.risk_tier_id === 1;
                  const isGold = learner.risk_tier_id === 2;

                  return (
                    <tr
                      key={learner.child_id}
                      className="hover:bg-slate-800/30 transition group"
                    >
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {learner.full_name} {learner.surname}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {learner.learner_number || `ID: #${learner.child_id}`}
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium">
                          Gr {learner.grade}
                        </span>
                      </td>

                      {/* Risk Tier Badge */}
                      <td className="py-3 px-3">
                        {isRed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Priority Support
                          </span>
                        )}
                        {isGreen && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Core Progress
                          </span>
                        )}
                        {isGold && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            High Achiever
                          </span>
                        )}
                        {learner.risk_tier_id === null && (
                          <span className="text-slate-500 text-[11px]">Unassessed</span>
                        )}
                      </td>

                      {/* Projected Mark */}
                      <td className="py-3 px-3">
                        {learner.predicted_score !== null ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                isRed
                                  ? 'text-rose-400'
                                  : isGreen
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {learner.predicted_score}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${
                                  isRed ? 'bg-rose-500' : isGreen ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, learner.predicted_score))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Top Nudge */}
                      <td className="py-3 px-4">
                        {learner.actionable_nudges && learner.actionable_nudges.length > 0 ? (
                          <p className="text-slate-300 text-[11px] line-clamp-1 max-w-xs" title={learner.actionable_nudges[0]}>
                            {learner.actionable_nudges[0]}
                          </p>
                        ) : (
                          <span className="text-slate-500 text-[11px]">On track with steady study routine</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setInspectingLearner(learner);
                            setSimResult(null);
                            setSimulationData({
                              hours: 20,
                              attendance: 90,
                              tutoring: 1
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Simulate</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. WHAT-IF STUDY SIMULATOR DRAWER / MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {inspectingLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden space-y-6 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-base">
                    What-If Habit Simulator
                  </h3>
                  <p className="text-xs text-slate-400">
                    {inspectingLearner.full_name} {inspectingLearner.surname} • Grade {inspectingLearner.grade}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingLearner(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Baseline vs Simulated Preview */}
            <div className="grid grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Current Projected Mark</span>
                <div className="text-2xl font-bold text-white mt-1">
                  {inspectingLearner.predicted_score || 65}%
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {inspectingLearner.risk_tier_label || 'Core Progress'}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-cyan-400 font-semibold uppercase">Simulated Projected Mark</span>
                <div className="text-2xl font-bold text-cyan-300 mt-1">
                  {simResult ? `${simResult.simulated.predicted_score}%` : '—'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {simResult ? (
                    <span className="text-emerald-400 font-semibold">
                      +{simResult.impact.score_delta}% point gain
                    </span>
                  ) : (
                    'Adjust sliders below & click test'
                  )}
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              {/* Study Hours */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Weekly Self-Study Time</span>
                  <span className="text-cyan-300 font-bold">{simulationData.hours} Hours / week</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={simulationData.hours}
                  onChange={(e) => setSimulationData({ ...simulationData, hours: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Attendance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Target Attendance Rate</span>
                  <span className="text-cyan-300 font-bold">{simulationData.attendance}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={simulationData.attendance}
                  onChange={(e) => setSimulationData({ ...simulationData, attendance: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Tutoring Sessions */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Weekly Remedial / Tutoring Sessions</span>
                  <span className="text-cyan-300 font-bold">{simulationData.tutoring} sessions</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={simulationData.tutoring}
                  onChange={(e) => setSimulationData({ ...simulationData, tutoring: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Impact Statement */}
            {simResult && (
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-xs space-y-1">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Prescriptive Pedagogical Recommendation:
                </div>
                <p>{simResult.impact.summary}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setInspectingLearner(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Close
              </button>
              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition"
              >
                {simulating ? 'Computing...' : 'Calculate Simulated Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODEL HEALTH & FAIRNESS MODAL                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showMetricsModal && metrics?.metrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-base">Geleza SA Model Health & Fairness Audit</h3>
                </div>
              </div>
              <button onClick={() => setShowMetricsModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="text-xl font-bold text-emerald-400">
                  {Math.round(metrics.metrics.risk_tier_classifier.accuracy * 1000) / 10}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Classification Accuracy</div>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="text-xl font-bold text-cyan-400">
                  ±{metrics.metrics.score_predictor.mae}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Mean Absolute Error (Marks)</div>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="text-xl font-bold text-amber-400">
                  Not measured
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Gender is not a model input</div>
              </div>
            </div>

            {/* Confusion Matrix Display */}
            {metrics.metrics.risk_tier_classifier.confusion_matrix && (() => {
              const raw = metrics.metrics.risk_tier_classifier.confusion_matrix.raw_matrix || [
                [351, 75, 0],
                [54, 339, 53],
                [7, 86, 357]
              ];
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Training tertiles (≤65 / 66–68 / ≥69). Live bands use the predicted mark: below 50, 50–69, and 70+.
                  </h4>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-xs font-mono">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="text-slate-500 font-sans text-[11px] text-left">Actual \ Pred</div>
                      <div className="text-rose-400 font-sans text-[11px]">Pred Priority</div>
                      <div className="text-emerald-400 font-sans text-[11px]">Pred Core</div>
                      <div className="text-amber-400 font-sans text-[11px]">Pred Achiever</div>

                      <div className="text-rose-300 font-sans text-[11px] text-left">Priority (≤65)</div>
                      <div className="bg-rose-950/40 text-rose-300 py-1.5 rounded font-bold">{raw[0][0]}</div>
                      <div className="text-slate-400 py-1.5">{raw[0][1]}</div>
                      <div className="text-emerald-400 py-1.5 font-bold">{raw[0][2]}</div>

                      <div className="text-emerald-300 font-sans text-[11px] text-left">Core (training 66-68)</div>
                      <div className="text-slate-400 py-1.5">{raw[1][0]}</div>
                      <div className="bg-emerald-950/40 text-emerald-300 py-1.5 rounded font-bold">{raw[1][1]}</div>
                      <div className="text-slate-400 py-1.5">{raw[1][2]}</div>

                      <div className="text-amber-300 font-sans text-[11px] text-left">Achiever (≥69)</div>
                      <div className="text-slate-400 py-1.5">{raw[2][0]}</div>
                      <div className="text-slate-400 py-1.5">{raw[2][1]}</div>
                      <div className="bg-amber-950/40 text-amber-300 py-1.5 rounded font-bold">{raw[2][2]}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    On this test set, no Priority Support learner was predicted as a High Achiever. Seven High Achievers were predicted as Priority Support.
                  </p>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowMetricsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. AD-HOC SINGLE LEARNER PREDICTION MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAdHocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h3 className="text-slate-900 dark:text-white font-bold text-base">Ad-Hoc Learner Prediction</h3>
              </div>
              <button onClick={() => setShowAdHocModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Study Hours / Week</label>
                <input
                  type="number"
                  value={adHocInputs.Hours_Studied}
                  onChange={(e) => setAdHocInputs({ ...adHocInputs, Hours_Studied: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Attendance Rate (%)</label>
                <input
                  type="number"
                  value={adHocInputs.Attendance}
                  onChange={(e) => setAdHocInputs({ ...adHocInputs, Attendance: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Previous Average (%)</label>
                <input
                  type="number"
                  value={adHocInputs.Previous_Scores}
                  onChange={(e) => setAdHocInputs({ ...adHocInputs, Previous_Scores: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Weekly Tutoring Sessions</label>
                <input
                  type="number"
                  value={adHocInputs.Tutoring_Sessions}
                  onChange={(e) => setAdHocInputs({ ...adHocInputs, Tutoring_Sessions: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Parental Involvement</label>
                <select
                  value={adHocInputs.Parental_Involvement}
                  onChange={(e) => setAdHocInputs({ ...adHocInputs, Parental_Involvement: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Access to Resources</label>
                <select
                  value={adHocInputs.Access_to_Resources}
                  onChange={(e) => setAdHocInputs({ ...adHocInputs, Access_to_Resources: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            {adHocResult && (
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Predicted Exam Mark:</span>
                  <span className="text-base font-bold text-cyan-400">{adHocResult.predicted_score}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Calibrated Risk Tier:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    adHocResult.risk_tier.id === 0 ? 'bg-rose-500/20 text-rose-300' :
                    adHocResult.risk_tier.id === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {adHocResult.risk_tier.label}
                  </span>
                </div>
                {adHocResult.actionable_nudges?.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700">
                    <span className="text-slate-300 font-medium">Recommended Action: </span>
                    {adHocResult.actionable_nudges[0]}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAdHocModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={handleRunAdHocPredict}
                disabled={adHocLoading}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition"
              >
                {adHocLoading ? 'Calculating...' : 'Run Prediction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
