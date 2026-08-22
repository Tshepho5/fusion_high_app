import React, { useState, useEffect } from 'react';
import { matricAnalyticsService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import {
  GraduationCap,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Printer,
  Sparkles,
  BookOpen,
  HelpCircle,
  Activity,
  Layers
} from 'lucide-react';

export const MatricPassRateProjector: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await matricAnalyticsService.getProjectorStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching matric analytics:', err);
      setError('Could not compute Grade 12 Matric candidate predictive pass rates.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Computing Grade 12 Matric Candidate Pass Rate projections..." />;
  }

  if (error || !stats) {
    return (
      <div className="p-8 rounded-3xl bg-surface-dark border border-white/10 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-sm text-rose-300">{error || 'Failed to load predictive analytics.'}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-glow-indigo"
        >
          Retry Calculation
        </button>
      </div>
    );
  }

  const candidates = stats.candidates || [];
  const filteredCandidates = candidates.filter((c: any) => {
    const matchSearch =
      c.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.candidate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.stream.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.home_language.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'bachelor') return c.projected_pass === "Bachelor's Degree Pass";
    if (selectedFilter === 'diploma') return c.projected_pass === 'Diploma Pass';
    if (selectedFilter === 'higher_cert') return c.projected_pass === 'Higher Certificate Pass';
    if (selectedFilter === 'at_risk') return c.is_at_risk;
    return true;
  });

  const [routing, setRouting] = useState<boolean>(false);
  const [routeSuccess, setRouteSuccess] = useState<string | null>(null);

  const handleAutoRouteRemedial = async () => {
    setRouting(true);
    setRouteSuccess(null);
    try {
      const res = await matricAnalyticsService.autoRouteRemedial();
      setRouteSuccess(res.message || 'At-Risk candidates routed to Saturday/Afternoon clinics.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to auto-route remedial clinics.');
    } finally {
      setRouting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-brand-900 via-surface-dark to-surface-dark border border-brand-500/20 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="indigo" size="sm">Grade 12 National Senior Certificate (NSC)</Badge>
              <Badge variant="cyan" size="sm">Predictive Pass Rate Engine</Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-2 mt-1">
              <GraduationCap className="w-7 h-7 text-brand-400" />
              <span>Candidate Pass Rate</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAutoRouteRemedial}
              disabled={routing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{routing ? 'Enrolling & Emailing...' : '⚡ Auto-Route At-Risk to Remedial Clinics'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Print NSC Report</span>
            </button>
          </div>
        </div>

        {routeSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{routeSuccess}</span>
          </div>
        )}

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-surface-darker/90 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Candidates</span>
            <span className="text-2xl font-black text-white font-display">{stats.totalCandidates}</span>
            <span className="text-[10px] text-slate-400 block">Grade 12 Cohort</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-darker/90 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Projected Pass %</span>
            <span className="text-2xl font-black text-emerald-300 font-display">{stats.projectedPassRate}%</span>
            <span className="text-[10px] text-emerald-400 block">{stats.totalCandidates - stats.counts.atRisk} Passing</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-darker/90 border border-brand-500/30 space-y-1">
            <span className="text-[10px] text-brand-300 font-bold uppercase tracking-wider block">Bachelor's Pass</span>
            <span className="text-2xl font-black text-brand-300 font-display">{stats.bachelorRate}%</span>
            <span className="text-[10px] text-slate-400 block">{stats.counts.bachelors} Candidates</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-darker/90 border border-cyan-500/30 space-y-1">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Diploma Pass</span>
            <span className="text-2xl font-black text-cyan-300 font-display">{stats.diplomaRate}%</span>
            <span className="text-[10px] text-slate-400 block">{stats.counts.diploma} Candidates</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-darker/90 border border-purple-500/30 space-y-1">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Higher Certificate</span>
            <span className="text-2xl font-black text-purple-300 font-display">{stats.higherCertRate}%</span>
            <span className="text-[10px] text-slate-400 block">{stats.counts.higherCert} Candidates</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-darker/90 border border-rose-500/30 space-y-1">
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">At-Risk Rate</span>
            <span className="text-2xl font-black text-rose-400 font-display">{stats.atRiskRate}%</span>
            <span className="text-[10px] text-rose-400 block">{stats.counts.atRisk} Need Support</span>
          </div>
        </div>
      </div>

      {/* Gateway Subject Health Diagnostics */}
      <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span>Gateway Subject Examination Health Diagnostics</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(stats.gatewayStats || []).map((gw: any, i: number) => (
            <div key={i} className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2">
              <span className="text-xs font-bold text-white block truncate">{gw.subject}</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-emerald-400">{gw.pass_percentage}%</span>
                <span className="text-[11px] text-slate-400 font-mono">Avg: {gw.avg_score}%</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${gw.pass_percentage}%` }} />
              </div>
              <span className="text-[10px] text-rose-400 font-medium block">
                {gw.at_risk_count} Candidates &lt; 40%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate-Level Diagnostic Roster */}
      <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-400" />
              <span>Candidate-Level Examination Readiness Roster</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual Grade 12 candidate performance, projected endorsement levels, and targeted academic action plans.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'bachelor', label: 'Bachelor' },
                { id: 'diploma', label: 'Diploma' },
                { id: 'higher_cert', label: 'Higher Cert' },
                { id: 'at_risk', label: 'At-Risk' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedFilter === f.id ? 'bg-brand-600 text-white' : 'bg-surface-darker text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-darker text-[11px] text-slate-400 font-bold uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Candidate Details</th>
                <th className="py-3 px-4">Stream & Language</th>
                <th className="py-3 px-4">APS Score</th>
                <th className="py-3 px-4">NSC Pass Level</th>
                <th className="py-3 px-4">Gateway Risk Status</th>
                <th className="py-3 px-4">Recommended Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCandidates.map((cand: any) => (
                <tr key={cand.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{cand.candidate_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{cand.candidate_number}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{cand.stream}</div>
                    <div className="text-[11px] text-slate-400">{cand.home_language} HL</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-xl bg-brand-500/20 text-brand-300 font-extrabold font-mono text-sm border border-brand-500/30">
                      {cand.aps_score} Pts
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        cand.projected_pass === "Bachelor's Degree Pass"
                          ? 'emerald'
                          : cand.projected_pass === 'Diploma Pass'
                          ? 'cyan'
                          : cand.projected_pass === 'Higher Certificate Pass'
                          ? 'indigo'
                          : 'rose'
                      }
                      size="sm"
                    >
                      {cand.projected_pass}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4">
                    {cand.failed_gateways.length > 0 ? (
                      <div className="space-y-1">
                        {cand.failed_gateways.map((fg: string, i: number) => (
                          <span key={i} className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 mr-1 mb-1">
                            {fg}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Clear in Gateways
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-[11px] text-slate-300 line-clamp-2">
                      {cand.interventions[0] || 'Standard revision program.'}
                    </p>
                  </td>
                </tr>
              ))}

              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No Grade 12 candidates found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
