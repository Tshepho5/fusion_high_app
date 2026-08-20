import React, { useState, useEffect } from 'react';
import { conductService, teacherService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import {
  Award,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Plus,
  Heart,
  Trophy,
  Calendar,
  Flame,
  X
} from 'lucide-react';

export const TeacherConduct: React.FC = () => {
  const [logs, setLogs] = useState<{ merits: any[]; incidents: any[] }>({ merits: [], incidents: [] });
  const [learners, setLearners] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isMeritModalOpen, setIsMeritModalOpen] = useState<boolean>(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);

  // Merit Form
  const [meritForm, setMeritForm] = useState({
    child_id: '',
    category: 'Academic Excellence',
    title: '',
    description: '',
    points: 15,
    badge_icon: 'trophy'
  });

  // Incident Form
  const [incidentForm, setIncidentForm] = useState({
    child_id: '',
    category: 'Late Coming',
    severity: 'Minor',
    description: '',
    action_taken: 'Verbal Warning & Demerit Logged',
    detention_date: ''
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsData, learnersData] = await Promise.allSettled([
        conductService.getTeacherConductLogs(),
        teacherService.getMyLearners()
      ]);

      if (logsData.status === 'fulfilled') setLogs(logsData.value || { merits: [], incidents: [] });
      if (learnersData.status === 'fulfilled') {
        const lList = Array.isArray(learnersData.value) ? learnersData.value : learnersData.value.learners || [];
        setLearners(lList);
        if (lList.length > 0) {
          setMeritForm(prev => ({ ...prev, child_id: lList[0].id.toString() }));
          setIncidentForm(prev => ({ ...prev, child_id: lList[0].id.toString() }));
        }
      }
    } catch (err: any) {
      console.error('Error fetching conduct data:', err);
      setError('Failed to load conduct management logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleAwardMerit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meritForm.child_id || !meritForm.title.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await conductService.awardMerit({
        child_id: parseInt(meritForm.child_id, 10),
        category: meritForm.category,
        title: meritForm.title.trim(),
        description: meritForm.description.trim(),
        points: Number(meritForm.points) || 10,
        badge_icon: meritForm.badge_icon
      });
      setSuccess(res.message || 'Merit awarded successfully!');
      setIsMeritModalOpen(false);
      setMeritForm(prev => ({ ...prev, title: '', description: '' }));
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to award merit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.child_id || !incidentForm.description.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await conductService.recordIncident({
        child_id: parseInt(incidentForm.child_id, 10),
        category: incidentForm.category,
        severity: incidentForm.severity,
        description: incidentForm.description.trim(),
        action_taken: incidentForm.action_taken.trim(),
        detention_date: incidentForm.detention_date || undefined
      });
      setSuccess(res.message || 'Disciplinary incident recorded. Parent notified.');
      setIsIncidentModalOpen(false);
      setIncidentForm(prev => ({ ...prev, description: '', detention_date: '' }));
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record disciplinary incident.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading learner conduct and merit logs..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-400" />
            <span>Merit & Disciplinary Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reward positive learner achievements with merit badges & XP, or record disciplinary incident notices with automatic parent notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMeritModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald transition-all"
          >
            <Trophy className="w-4 h-4" />
            <span>Award Positive Merit</span>
          </button>
          <button
            onClick={() => setIsIncidentModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Record Incident</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Section: Merits vs Disciplinary Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Merits Column */}
        <div className="rounded-3xl bg-surface-dark border border-emerald-500/20 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <span>Recent Merits Awarded ({logs.merits?.length || 0})</span>
            </h3>
            <Badge variant="emerald" size="sm">Positive Recognition</Badge>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {(logs.merits || []).map((m: any) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-surface-darker border border-emerald-500/10 hover:border-emerald-500/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    {m.learner_name} {m.learner_surname} (Grade {m.learner_grade})
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">+{m.points} Pts</span>
                </div>
                <div className="text-xs text-amber-300 font-semibold">{m.title}</div>
                {m.description && <p className="text-[11px] text-slate-400">{m.description}</p>}
                <div className="text-[10px] text-slate-500 pt-1 border-t border-white/5 flex items-center justify-between">
                  <span>Category: {m.category}</span>
                  <span>{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {(!logs.merits || logs.merits.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">No merits awarded yet.</p>
            )}
          </div>
        </div>

        {/* Disciplinary Incidents Column */}
        <div className="rounded-3xl bg-surface-dark border border-rose-500/20 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Disciplinary Incident Notices ({logs.incidents?.length || 0})</span>
            </h3>
            <Badge variant="rose" size="sm">Demerit Records</Badge>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {(logs.incidents || []).map((d: any) => (
              <div
                key={d.id}
                className="p-4 rounded-2xl bg-surface-darker border border-rose-500/10 hover:border-rose-500/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    {d.learner_name} {d.learner_surname} (Grade {d.learner_grade})
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    d.severity === 'Severe' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {d.severity}
                  </span>
                </div>
                <div className="text-xs text-slate-300"><strong>Infraction:</strong> {d.category}</div>
                <p className="text-[11px] text-slate-400">{d.description}</p>
                {d.action_taken && <p className="text-[11px] text-amber-300"><strong>Action:</strong> {d.action_taken}</p>}
                <div className="text-[10px] text-slate-500 pt-1 border-t border-white/5 flex items-center justify-between">
                  <span>Parent Notified: Yes</span>
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {(!logs.incidents || logs.incidents.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">No disciplinary incidents logged.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Award Merit */}
      {isMeritModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <span>Award Positive Merit Badge</span>
              </h3>
              <button onClick={() => setIsMeritModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAwardMerit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Select Learner *</label>
                <select
                  value={meritForm.child_id}
                  onChange={(e) => setMeritForm(prev => ({ ...prev, child_id: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  {learners.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.full_name || l.name} {l.surname || ''} (Grade {l.grade || 10})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Merit Category *</label>
                <select
                  value={meritForm.category}
                  onChange={(e) => setMeritForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Academic Excellence">Academic Excellence</option>
                  <option value="Leadership & Prefect">Leadership & Prefect</option>
                  <option value="Sports & Athletics">Sports & Athletics</option>
                  <option value="Peer Mentorship">Peer Mentorship</option>
                  <option value="Community Service">Community Service</option>
                  <option value="Cultural Achievement">Cultural Achievement</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Badge Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Top Math Test Performer / Outstanding Class Leader"
                  value={meritForm.title}
                  onChange={(e) => setMeritForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Commendation Description</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this learner is receiving this recognition..."
                  value={meritForm.description}
                  onChange={(e) => setMeritForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMeritModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-glow-emerald transition-all disabled:opacity-50"
                >
                  {submitting ? 'Awarding...' : 'Award Merit (+15 Pts)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Incident */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Record Disciplinary Incident</span>
              </h3>
              <button onClick={() => setIsIncidentModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordIncident} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Select Learner *</label>
                <select
                  value={incidentForm.child_id}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, child_id: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  {learners.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.full_name || l.name} {l.surname || ''} (Grade {l.grade || 10})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Infraction Category *</label>
                  <select
                    value={incidentForm.category}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Late Coming">Late Coming</option>
                    <option value="Uniform Infraction">Uniform Infraction</option>
                    <option value="Incomplete Work">Incomplete Work</option>
                    <option value="Disruptive Conduct">Disruptive Conduct</option>
                    <option value="Truancy">Truancy (Class Bunking)</option>
                    <option value="Dishonesty / Plagiarism">Dishonesty / Plagiarism</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Severity *</label>
                  <select
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Minor">Minor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Incident Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specific details of the infraction observed..."
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Corrective Action Taken</label>
                <input
                  type="text"
                  placeholder="e.g. Verbal warning issued / Detention scheduled"
                  value={incidentForm.action_taken}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, action_taken: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Incident & Notify Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
