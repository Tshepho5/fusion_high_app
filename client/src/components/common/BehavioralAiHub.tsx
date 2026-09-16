import React, { useState, useEffect } from 'react';
import { behaviorMlService } from '../../services/api';
import {
  Brain,
  Sliders,
  TrendingUp,
  Award,
  Sparkles,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lightbulb
} from 'lucide-react';

interface Persona {
  cluster_id: number;
  rank: number;
  persona_name: string;
  badge: string;
  color: string;
  description: string;
  recommendation: string;
  mean_score: number;
  pass_rate: string;
  avg_visited_resources: number;
  avg_study_hours: number;
  avg_homework_rate: number;
}

export const BehavioralAiHub: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator Inputs
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [grade, setGrade] = useState('Grade 11');
  const [stream, setStream] = useState('Science');
  const [subject, setSubject] = useState('Mathematics');
  const [studyHours, setStudyHours] = useState(14);
  const [homeworkRate, setHomeworkRate] = useState(70);
  const [absenceDays, setAbsenceDays] = useState<'Under-7' | 'Above-7'>('Under-7');
  const [visitedResources, setVisitedResources] = useState(65);
  const [discussions, setDiscussions] = useState(50);
  const [classSize, setClassSize] = useState(35);

  // Simulation Results
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // Fetch personas on mount
  useEffect(() => {
    behaviorMlService.getPersonas()
      .then(data => {
        setPersonas(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load personas:', err);
        setLoading(false);
      });
  }, []);

  // Run simulation whenever sliders change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation();
    }, 250);
    return () => clearTimeout(timer);
  }, [gender, grade, stream, subject, studyHours, homeworkRate, absenceDays, visitedResources, discussions, classSize]);

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const studentPayload = {
        student_id: 'SIMULATOR',
        gender,
        grade,
        stream,
        subject,
        class_size: classSize,
        weekly_study_hours: studyHours,
        absence_days: absenceDays,
        homework_completion_rate: homeworkRate,
        visited_resources: visitedResources,
        discussion_participation: discussions
      };

      const res = await behaviorMlService.simulateWhatIf(studentPayload, {});
      setSimResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const currentScore = simResult?.simulated?.score ?? 65;
  const passProb = simResult?.simulated?.pass_probability ?? 82;
  const currentCaps = simResult?.simulated?.caps_level ?? { level: 5, label: 'Substantial Achievement', color: '#3B82F6' };
  const currentPersona = simResult?.simulated?.persona ?? 'Consistent Striver';

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-3">
            <Brain className="w-4 h-4 text-cyan-300" />
            Hybrid AI (Supervised & Unsupervised Learning)
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Behavioral Pass Rate & Classroom Climate Engine
          </h1>
          <p className="text-indigo-200 mt-2 max-w-3xl text-sm md:text-base leading-relaxed">
            Predicting academic pass rates based on classroom environment, attendance consistency, and learner work ethic across both genders under South African CAPS standards.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Sliders (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg">
              <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Adjust Learner Behavior & Environment
            </div>
            {simulating && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse font-medium">
                Recalculating ML...
              </span>
            )}
          </div>

          {/* Demographics & Classroom Context */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12 (Matric)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Stream</label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Tourism">Tourism</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Physical Sciences">Physical Sciences</option>
                <option value="Life Sciences">Life Sciences</option>
                <option value="Accounting">Accounting</option>
                <option value="English FAL">English FAL</option>
                <option value="Life Orientation">Life Orientation</option>
                <option value="Tourism">Tourism</option>
                <option value="Geography">Geography</option>
              </select>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-5 pt-2">
            
            {/* Weekly Study Hours */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Weekly Self-Directed Study Time:
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{studyHours} hrs / week</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                value={studyHours}
                onChange={(e) => setStudyHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>2 hrs (Minimal)</span>
                <span>14 hrs (DBE Benchmark)</span>
                <span>30 hrs (Intensive)</span>
              </div>
            </div>

            {/* Attendance Days */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Term Absence Pattern:
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  absenceDays === 'Under-7' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                  {absenceDays === 'Under-7' ? 'Healthy (<7 days)' : 'Chronic Absence (>7 days)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setAbsenceDays('Under-7')}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                    absenceDays === 'Under-7'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ✓ Under 7 Absences (Regular)
                </button>
                <button
                  type="button"
                  onClick={() => setAbsenceDays('Above-7')}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                    absenceDays === 'Above-7'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 shadow-sm font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ⚠ Above 7 Absences (Truancy)
                </button>
              </div>
            </div>

            {/* Homework Completion Rate */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  Homework & Assignment Completion:
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{homeworkRate}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={homeworkRate}
                onChange={(e) => setHomeworkRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Digital LMS Resources Visited */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  LMS Study Guides & Past Papers Visited:
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{visitedResources} views</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={visitedResources}
                onChange={(e) => setVisitedResources(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

            {/* Class Size (Environment) */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-500" />
                  Classroom Crowd Density (Class Size):
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{classSize} learners</span>
              </div>
              <input
                type="range"
                min="25"
                max="55"
                value={classSize}
                onChange={(e) => setClassSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>25 (Spacious)</span>
                <span>38 (Average SA Classroom)</span>
                <span>55 (Overcrowded)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: AI Live Predictions & Persona Diagnosis (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Predicted Outcome Gauge */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Live Supervised Prediction
            </h3>

            <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
                {currentScore}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Projected Final Mark in <span className="font-semibold text-slate-700 dark:text-slate-200">{subject}</span>
              </p>

              {/* CAPS Achievement Level Pill */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border" style={{ color: currentCaps.color, borderColor: currentCaps.color }}>
                <Award className="w-3.5 h-3.5" />
                CAPS Level {currentCaps.level} — {currentCaps.label}
              </div>
            </div>

            {/* Pass Probability Meter */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-300">Passing Probability:</span>
                <span className={passProb >= 50 ? 'text-emerald-600' : 'text-red-500'}>{passProb}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    passProb >= 75 ? 'bg-emerald-500' : passProb >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${passProb}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card: Unsupervised Persona Diagnosis */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              Unsupervised Persona Diagnosis
            </h3>

            <div className="p-4 rounded-xl border bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Clustered Archetype:
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  {currentPersona}
                </span>
              </div>

              {simResult?.simulated?.recommendation && (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                  <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>AI Action:</strong> {simResult.simulated.recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Showcase: The 4 Discovered Behavioral Personas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-md border border-slate-200 dark:border-slate-800 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            The 4 Discovered South African Learner Personas
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Unsupervised K-Means clustering naturally grouped 2,000 learners into distinct behavioral archetypes based on revision habits, digital resource engagement, and attendance consistency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {personas.map((p) => (
            <div 
              key={p.cluster_id} 
              className="rounded-xl border p-5 space-y-3 bg-slate-50 dark:bg-slate-800/40 transition hover:shadow-md border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${p.badge}`}>
                  Rank #{p.rank}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {p.pass_rate} Pass
                </span>
              </div>

              <h4 className="font-bold text-slate-800 dark:text-white text-base">
                {p.persona_name}
              </h4>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Average Mark:</span>
                  <span className="font-bold">{p.mean_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Weekly Study:</span>
                  <span className="font-bold">{p.avg_study_hours} hrs/wk</span>
                </div>
                <div className="flex justify-between">
                  <span>Homework Rate:</span>
                  <span className="font-bold">{p.avg_homework_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>LMS Resource Views:</span>
                  <span className="font-bold">{p.avg_visited_resources} views</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <strong>Prescribed Action:</strong> {p.recommendation}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default BehavioralAiHub;
