import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import { FusionAIIcon } from '../common/FusionAIIcon';
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Building2,
  TrendingUp,
  Sliders,
  DollarSign,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export const LearnerCareerAdvisor: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab inside career advisor: 'overview' | 'universities' | 'simulator' | 'bursaries' | 'grade9-advice'
  const [activeTab, setActiveTab] = useState<'overview' | 'universities' | 'simulator' | 'bursaries' | 'grade9-advice'>('overview');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
  
  // Simulator marks
  const [simulatedMarks, setSimulatedMarks] = useState<Array<{ subject: string; mark: number }>>([]);
  const [simulatedResult, setSimulatedResult] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  useEffect(() => {
    fetchCareerPathway();
  }, []);

  const fetchCareerPathway = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await learnerService.getCareerPathway();
      setData(res);
      const initialSim = (res.subject_marks || []).map((s: any) => ({
        subject: s.subject,
        mark: s.mark || 65
      }));
      setSimulatedMarks(initialSim);
    } catch (err: any) {
      console.error('Error fetching career pathway:', err);
      setError('Could not retrieve career pathway data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await learnerService.simulateAps({ subject_marks: simulatedMarks });
      setSimulatedResult(res);
    } catch (err: any) {
      console.error('Error simulating APS:', err);
    } finally {
      setSimulating(false);
    }
  };

  const updateSimMark = (index: number, newMark: number) => {
    const updated = [...simulatedMarks];
    updated[index].mark = Math.min(100, Math.max(0, newMark));
    setSimulatedMarks(updated);
  };

  if (loading) {
    return <LoadingSpinner text="Analyzing your academic marks and computing Matric APS..." />;
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-surface-dark border border-white/10 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Career Pathway Advisor</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{error || 'No academic mark data found for this learner.'}</p>
        <button
          onClick={fetchCareerPathway}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { aps, isCandidate, grade, stream, learner_name, university_programmes, bursaries, grade9_stream_advice } = data;
  const activeAps = simulatedResult?.aps || aps;
  const activeProgrammes = simulatedResult?.university_programmes || university_programmes;

  const faculties = [
    'all',
    'Health Sciences',
    'Engineering & Built Environment',
    'Science & Computing',
    'Commerce & Management',
    'Law',
    'Education',
    'Humanities & Social Sciences',
    'Management Sciences'
  ];

  const filteredProgrammes = (activeProgrammes?.eligibleProgrammes || []).concat(activeProgrammes?.potentialWithImprovement || [])
    .filter((prog: any) => selectedFaculty === 'all' || prog.faculty.toLowerCase().includes(selectedFaculty.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-surface-dark to-surface-dark border border-brand-500/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" size="sm">Grade {grade} {isCandidate ? 'Matric Candidate' : 'Learner'}</Badge>
              <Badge variant="cyan" size="sm">{stream} Stream</Badge>
              <Badge variant="amber" size="sm">APS Score: {aps.apsWithoutLo} Points</Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
              <Compass className="w-7 h-7 text-cyan-400" />
              <span>Matric APS & University Career Advisor</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl">
              Calculated from your official South African CAPS subject marks. Explore eligible university degrees, bursaries, and career requirements tailored for {isCandidate ? 'Matric Candidates' : 'high school learners'}.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-darker/80 border border-white/10 text-center shrink-0 min-w-[180px]">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Standard APS Score</span>
            <div className="text-4xl font-black text-cyan-300 font-display mt-1">{aps.apsWithoutLo}</div>
            <span className="text-[10px] text-slate-400">Top 6 Subjects (Excl. LO)</span>
            <div className="mt-1 pt-1 border-t border-white/5 text-[11px] text-emerald-400 font-semibold">
              With LO: {aps.apsTotalWithLo} Pts
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-white/10 pt-4 mt-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'overview' ? 'bg-brand-600 text-white shadow-glow-indigo' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            APS & Subject Breakdown
          </button>
          <button
            onClick={() => setActiveTab('universities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'universities' ? 'bg-cyan-600 text-white shadow-glow-cyan' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            University Degrees ({activeProgrammes?.eligibleCount || 0} Eligible)
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'simulator' ? 'bg-purple-600 text-white shadow-glow-purple' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            APS Mark Simulator
          </button>
          <button
            onClick={() => setActiveTab('bursaries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'bursaries' ? 'bg-amber-600 text-white shadow-glow-amber' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Bursaries & Funding ({bursaries?.length || 0})
          </button>
          {grade <= 9 && (
            <button
              onClick={() => setActiveTab('grade9-advice')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'grade9-advice' ? 'bg-emerald-600 text-white shadow-glow-emerald' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Grade 9 Stream Choice
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Overview & Subject Breakdown */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* NSC Pass Endorsement Card */}
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Projected NSC Qualification Status</span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>{aps.nscPassType}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Calculated according to the South African Department of Basic Education (DBE) National Senior Certificate rating scale.
              </p>
            </div>
            <Badge variant="emerald" size="md">Level {Math.round(aps.apsWithoutLo / 6)} Average</Badge>
          </div>

          {/* Subjects Table */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              <span>Learner Subject Performance & NSC Rating Level</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(aps.subjectBreakdown || []).map((subj: any, idx: number) => {
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-surface-darker border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{subj.subject}</span>
                        {subj.isLo && <span className="text-[10px] text-slate-500 font-mono">(LO)</span>}
                      </div>
                      <p className="text-[11px] text-slate-400">{subj.label}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-white">{subj.mark}%</span>
                      <div className="text-[11px] font-bold text-amber-400">Level {subj.level} ({subj.points} pts)</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: University Degree Eligibility */}
      {activeTab === 'universities' && (
        <div className="space-y-6 animate-fade-in">
          {/* Faculty Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Filter Faculty:</span>
            {faculties.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFaculty(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedFaculty === f ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'bg-surface-dark text-slate-300 border border-white/10 hover:bg-white/5'
                }`}
              >
                {f === 'all' ? 'All Faculties' : f}
              </button>
            ))}
          </div>

          {/* Programmes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProgrammes.map((prog: any, idx: number) => {
              const isEligible = prog.isEligible;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl border transition-all space-y-4 ${
                    isEligible
                      ? 'bg-surface-dark border-emerald-500/30 hover:border-emerald-500/60 shadow-xl'
                      : 'bg-surface-darker/60 border-white/10 opacity-90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">{prog.faculty}</span>
                      <h4 className="text-base font-bold text-white">{prog.name}</h4>
                    </div>

                    {isEligible ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" />
                        Eligible
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 shrink-0">
                        Needs +{prog.apsDeficit} Pts
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">{prog.description}</p>

                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Min. Required APS:</span>
                      <strong className="text-white font-mono">{prog.minAps} Points</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Offered at:</span>
                      <span className="text-slate-200 font-medium">{prog.universities?.join(', ')}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Career Outcomes:</span>
                      <span className="text-slate-300 font-semibold">{prog.careerProspects?.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>

                  {!isEligible && prog.missingRequirements?.length > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        Requirements to unlock:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                        {prog.missingRequirements.map((r: string, rIdx: number) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Interactive APS Mark Simulator */}
      {activeTab === 'simulator' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-surface-dark border border-purple-500/20 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <span>Matric Marks & APS Simulator</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-xl">
                  Adjust your projected marks using the sliders below to see how higher scores unlock competitive programmes like Medicine, Engineering, Computer Science, and Law.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSimulate}
                disabled={simulating}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-glow-purple transition-all disabled:opacity-50"
              >
                {simulating ? 'Calculating...' : 'Simulate University Matches'}
              </button>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              {simulatedMarks.map((subj, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{subj.subject}</span>
                    <span className="font-mono text-purple-300 font-bold">{subj.mark}% (Level {Math.min(7, Math.max(1, Math.floor(subj.mark / 10) - 2))})</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={subj.mark}
                    onChange={(e) => updateSimMark(idx, parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-surface-dark rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: South African Bursary Directory */}
      {activeTab === 'bursaries' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(bursaries || []).map((b: any, idx: number) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-amber-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="amber" size="sm">{b.funder}</Badge>
                    <span className="text-[10px] text-amber-300 font-semibold">{b.deadline}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{b.name}</h4>
                  <p className="text-xs text-slate-300">
                    <strong>Coverage:</strong> {b.coverage}
                  </p>
                  <p className="text-xs text-slate-400">
                    <strong>Eligibility:</strong> {b.eligibility}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Streams: {b.priorityStreams?.join(', ')}</span>
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                  >
                    <span>Apply / Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Grade 9 Subject Choice & Stream Recommender */}
      {activeTab === 'grade9-advice' && grade9_stream_advice && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-surface-dark border border-emerald-500/20 shadow-xl space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Diagnostic Stream Recommendation</span>
              <h3 className="text-xl font-bold text-white">{grade9_stream_advice.topRecommendedStream}</h3>
              <p className="text-xs text-slate-300 mt-2">{grade9_stream_advice.teacherGuidance}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              {(grade9_stream_advice.allStreamsRanked || []).map((streamItem: any, sIdx: number) => (
                <div
                  key={sIdx}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    sIdx === 0
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-glow-emerald'
                      : 'bg-surface-darker border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={sIdx === 0 ? 'emerald' : 'slate'} size="sm">Rank #{sIdx + 1}</Badge>
                    <span className="text-xs font-bold text-white">{streamItem.suitability}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{streamItem.stream.split(' (')[0]}</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p><strong>Key Subjects:</strong> {streamItem.keySubjects?.join(', ')}</p>
                    <p><strong>Careers:</strong> {streamItem.targetCareers?.slice(0, 2).join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
