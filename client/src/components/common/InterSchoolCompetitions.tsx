import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Activity,
  Flame,
  Award,
  Sparkles,
  RefreshCw,
  Swords,
  BookOpen,
  Music
} from 'lucide-react';
import { interSchoolService } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface Competition {
  id: number;
  title: string;
  activity_type: string;
  category: string;
  event_date: string;
  venue: string;
  home_score: number;
  away_score: number;
  status: string;
  trophy_title?: string;
  highlights?: string;
  home_school_id: number;
  home_school_name: string;
  home_school_logo: string;
  home_school_color: string;
  home_school_circuit: string;
  away_school_id: number;
  away_school_name: string;
  away_school_logo: string;
  away_school_color: string;
  away_school_circuit: string;
}

interface LeaderboardEntry {
  school_id: number;
  school_name: string;
  school_slug: string;
  circuit: string;
  province: string;
  logo_url: string;
  primary_color: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  score_for: number;
  score_against: number;
  score_diff: number;
  points: number;
  trophies_count: number;
}

export const InterSchoolCompetitions: React.FC = () => {
  const { currentSchool, schoolsList } = useSchool();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'teacher';

  const [activeTab, setActiveTab] = useState<'fixtures' | 'leaderboard'>('fixtures');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal & Form State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    title: '',
    activity_type: 'Soccer',
    category: 'sports',
    home_school_id: currentSchool?.id || 1,
    away_school_id: 2,
    event_date: '',
    venue: '',
    trophy_title: '',
    highlights: ''
  });

  const [scoreForm, setScoreForm] = useState({
    home_score: 0,
    away_score: 0,
    status: 'completed',
    highlights: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, leadRes] = await Promise.all([
        interSchoolService.getCompetitions({ category: selectedCategory }),
        interSchoolService.getLeaderboard({ category: selectedCategory })
      ]);
      if (compRes.success) setCompetitions(compRes.competitions || []);
      if (leadRes.success) setLeaderboard(leadRes.leaderboard || []);
    } catch (err: any) {
      console.error('Failed to load inter-school competitions:', err);
      setError(err.response?.data?.error || err.message || 'Failed to retrieve competitions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await interSchoolService.createCompetition(form);
      if (res.success) {
        setActionSuccess(res.message || 'Competition fixture scheduled successfully!');
        setIsCreateModalOpen(false);
        setForm({
          title: '',
          activity_type: 'Soccer',
          category: 'sports',
          home_school_id: currentSchool?.id || 1,
          away_school_id: 2,
          event_date: '',
          venue: '',
          trophy_title: '',
          highlights: ''
        });
        fetchData();
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error('Error creating competition:', err);
      setError(err.response?.data?.error || err.message || 'Failed to schedule competition.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetition) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await interSchoolService.updateScoreAndStatus(selectedCompetition.id, scoreForm);
      if (res.success) {
        setActionSuccess('Match scores and highlights updated successfully!');
        setIsScoreModalOpen(false);
        setSelectedCompetition(null);
        fetchData();
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error('Error updating score:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update score.');
    } finally {
      setSubmitting(false);
    }
  };

  const openScoreModal = (comp: Competition) => {
    setSelectedCompetition(comp);
    setScoreForm({
      home_score: comp.home_score || 0,
      away_score: comp.away_score || 0,
      status: comp.status || 'completed',
      highlights: comp.highlights || ''
    });
    setIsScoreModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              Inter-School Collaboration & League
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2 mt-1">
            <Swords className="w-6 h-6 text-brand-400" />
            Inter-School Derbies & Academic Olympiads
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connecting high schools across Mankweng and Pretoria for inter-school sports matches, math quizzes, debates, and championships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 text-white font-bold text-xs shadow-glow-amber transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Schedule Derby / Olympiad</span>
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
            title="Refresh Fixtures"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Main View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('fixtures')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'fixtures'
                ? 'bg-brand-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Match Day & Fixtures ({competitions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-amber-600 text-white shadow-glow-amber'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Championship Leaderboard</span>
          </button>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'sports', label: '⚽ Sports & Athletics' },
            { id: 'academics', label: '📐 Academic Olympiads' },
            { id: 'cultural', label: '🎭 Debates & Arts' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner text="Retrieving inter-school fixtures & standings from PostgreSQL..." />
      ) : activeTab === 'fixtures' ? (
        /* Fixtures Grid */
        <div className="space-y-4">
          {competitions.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 text-slate-400 text-xs">
              <Swords className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="font-bold text-white text-sm">No Inter-School Fixtures Scheduled</p>
              <p className="mt-1">Use the "+ Schedule Derby / Olympiad" button above to plan an inter-school match or academic competition.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {competitions.map((comp) => {
                const isLive = comp.status === 'in_progress';
                const isDone = comp.status === 'completed';
                return (
                  <div
                    key={comp.id}
                    className="p-5 rounded-3xl bg-surface-dark border border-white/10 shadow-xl relative overflow-hidden transition-all hover:border-white/20"
                  >
                    {/* Header: Activity Type & Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-300 text-[10px] font-bold uppercase tracking-wider border border-brand-500/20">
                          {comp.activity_type}
                        </span>
                        <h4 className="font-bold text-white text-sm">{comp.title}</h4>
                      </div>

                      <Badge
                        variant={isLive ? 'rose' : isDone ? 'emerald' : 'indigo'}
                        size="sm"
                      >
                        {isLive ? '● LIVE IN PROGRESS' : isDone ? 'FINAL SCORE' : 'SCHEDULED'}
                      </Badge>
                    </div>

                    {/* Matchup Scoreboard Box */}
                    <div className="grid grid-cols-7 items-center gap-2 py-3">
                      {/* Home School */}
                      <div className="col-span-3 text-center space-y-1">
                        {comp.home_school_logo ? (
                          <img
                            src={comp.home_school_logo}
                            alt={comp.home_school_name}
                            className="w-12 h-12 rounded-2xl object-contain bg-white/5 p-1 border border-white/10 mx-auto"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white mx-auto text-lg"
                            style={{ backgroundColor: comp.home_school_color || '#3b82f6' }}
                          >
                            {comp.home_school_name.charAt(0)}
                          </div>
                        )}
                        <p className="font-extrabold text-white text-xs line-clamp-1">{comp.home_school_name}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">{comp.home_school_circuit}</span>
                      </div>

                      {/* Score / VS Center */}
                      <div className="col-span-1 text-center">
                        {isDone || isLive ? (
                          <div className="font-mono text-xl md:text-2xl font-extrabold text-white flex items-center justify-center gap-1">
                            <span className={comp.home_score > comp.away_score ? 'text-emerald-400' : ''}>{comp.home_score}</span>
                            <span className="text-slate-500 text-sm">-</span>
                            <span className={comp.away_score > comp.home_score ? 'text-emerald-400' : ''}>{comp.away_score}</span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-extrabold text-slate-300 font-mono">
                            VS
                          </span>
                        )}
                      </div>

                      {/* Away School */}
                      <div className="col-span-3 text-center space-y-1">
                        {comp.away_school_logo ? (
                          <img
                            src={comp.away_school_logo}
                            alt={comp.away_school_name}
                            className="w-12 h-12 rounded-2xl object-contain bg-white/5 p-1 border border-white/10 mx-auto"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white mx-auto text-lg"
                            style={{ backgroundColor: comp.away_school_color || '#10b981' }}
                          >
                            {comp.away_school_name.charAt(0)}
                          </div>
                        )}
                        <p className="font-extrabold text-white text-xs line-clamp-1">{comp.away_school_name}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">{comp.away_school_circuit}</span>
                      </div>
                    </div>

                    {/* Trophy & Match Highlights */}
                    {comp.trophy_title && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold">Prize Trophy: {comp.trophy_title}</span>
                      </div>
                    )}

                    {comp.highlights && (
                      <p className="text-[11px] text-slate-300 mt-2 bg-white/5 p-2 rounded-xl">
                        <strong>Match Summary:</strong> {comp.highlights}
                      </p>
                    )}

                    {/* Footer Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(comp.event_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {comp.venue || 'Host Grounds'}
                        </span>
                      </div>

                      {canManage && (
                        <button
                          onClick={() => openScoreModal(comp)}
                          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] transition-colors"
                        >
                          Update Score & Result
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Leaderboard Table */
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3 text-center">Rank</th>
                  <th className="pb-3 px-3">School Institution</th>
                  <th className="pb-3 px-3">Circuit / Province</th>
                  <th className="pb-3 px-3 text-center font-mono">P</th>
                  <th className="pb-3 px-3 text-center font-mono">W</th>
                  <th className="pb-3 px-3 text-center font-mono">D</th>
                  <th className="pb-3 px-3 text-center font-mono">L</th>
                  <th className="pb-3 px-3 text-center font-mono">Diff</th>
                  <th className="pb-3 px-3 text-center font-mono">Trophies</th>
                  <th className="pb-3 px-3 text-right font-mono font-bold text-white">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.school_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3 text-center">
                      <span className={`font-mono font-extrabold text-sm ${
                        idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {entry.logo_url ? (
                          <img
                            src={entry.logo_url}
                            alt={entry.school_name}
                            className="w-7 h-7 rounded-lg object-contain bg-white/5 p-0.5 border border-white/10"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                            style={{ backgroundColor: entry.primary_color || '#3b82f6' }}
                          >
                            {entry.school_name.charAt(0)}
                          </div>
                        )}
                        <span className="font-extrabold text-white text-sm">{entry.school_name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-300">
                      <span>{entry.circuit || 'Circuit'}</span>
                      <span className="text-slate-500 block text-[10px]">{entry.province || 'Limpopo'}</span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono text-slate-300">{entry.played}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-emerald-400 font-bold">{entry.won}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400">{entry.drawn}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-rose-400">{entry.lost}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                      {entry.score_diff > 0 ? `+${entry.score_diff}` : entry.score_diff}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {entry.trophies_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold font-mono text-[10px] border border-amber-500/20 inline-flex items-center gap-1">
                          <Trophy className="w-2.5 h-2.5 text-amber-400" />
                          {entry.trophies_count}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <span className="font-mono font-extrabold text-brand-400 text-base">{entry.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCHEDULE FIXTURE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule Inter-School Derby / Academic Competition"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Competition Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Mankweng Circuit Derby Finals"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="sports">Sports & Athletics</option>
                <option value="academics">Academic Olympiads</option>
                <option value="cultural">Cultural & Arts</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Specific Sport / Activity Type *</label>
              <input
                type="text"
                required
                value={form.activity_type}
                onChange={(e) => setForm(prev => ({ ...prev, activity_type: e.target.value }))}
                placeholder="e.g. Soccer, Netball, Mathematics Quiz, Debate"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Event Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={form.event_date}
                onChange={(e) => setForm(prev => ({ ...prev, event_date: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Host School (Home) *</label>
              <select
                value={form.home_school_id}
                onChange={(e) => setForm(prev => ({ ...prev, home_school_id: Number(e.target.value) }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              >
                {schoolsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.circuit})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Challenger School (Away) *</label>
              <select
                value={form.away_school_id}
                onChange={(e) => setForm(prev => ({ ...prev, away_school_id: Number(e.target.value) }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              >
                {schoolsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.circuit})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Venue / Grounds</label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="e.g. Fusion High Main Sports Stadium"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Trophy / Prize Title</label>
              <input
                type="text"
                value={form.trophy_title}
                onChange={(e) => setForm(prev => ({ ...prev, trophy_title: e.target.value }))}
                placeholder="e.g. 2026 Mankweng Circuit Gold Cup"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 text-white font-extrabold shadow-glow-amber transition-all disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Confirm & Schedule Fixture'}
            </button>
          </div>
        </form>
      </Modal>

      {/* UPDATE SCORES MODAL */}
      {selectedCompetition && (
        <Modal
          isOpen={isScoreModalOpen}
          onClose={() => setIsScoreModalOpen(false)}
          title={`Update Match Results: ${selectedCompetition.title}`}
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateScore} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-darker border border-white/10 text-center">
              <div>
                <p className="font-bold text-white mb-1.5">{selectedCompetition.home_school_name}</p>
                <input
                  type="number"
                  min="0"
                  value={scoreForm.home_score}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, home_score: Number(e.target.value) }))}
                  className="w-20 text-center mx-auto text-xl font-extrabold font-mono rounded-xl bg-surface-dark border border-white/20 py-2 text-emerald-400"
                />
              </div>
              <div>
                <p className="font-bold text-white mb-1.5">{selectedCompetition.away_school_name}</p>
                <input
                  type="number"
                  min="0"
                  value={scoreForm.away_score}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, away_score: Number(e.target.value) }))}
                  className="w-20 text-center mx-auto text-xl font-extrabold font-mono rounded-xl bg-surface-dark border border-white/20 py-2 text-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Fixture Status</label>
              <select
                value={scoreForm.status}
                onChange={(e) => setScoreForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500 font-bold"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress (Live)</option>
                <option value="completed">Completed (Final Result)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Match Summary & Key Highlights</label>
              <textarea
                rows={3}
                value={scoreForm.highlights}
                onChange={(e) => setScoreForm(prev => ({ ...prev, highlights: e.target.value }))}
                placeholder="e.g. Fusion High clinched victory in extra time with an outstanding penalty save."
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsScoreModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Match Results'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default InterSchoolCompetitions;
