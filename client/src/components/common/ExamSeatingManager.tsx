import React, { useState, useEffect } from 'react';
import { examSeatingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { Badge } from './Badge';
import {
  Grid,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Play,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  X,
  FileText
} from 'lucide-react';

export const ExamSeatingManager: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'admin' || role === 'teacher';

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any | null>(null);
  const [mySeats, setMySeats] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal: Create Session
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [sessionForm, setSessionForm] = useState({
    title: 'Trial Examination Paper 1',
    subject: 'Mathematics',
    grade: 12,
    stream: 'All',
    term: 'Term 3 2026',
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '12:00',
    venue: 'Main Examination Hall',
    total_rows: 8,
    total_cols: 6
  });
  const [allocating, setAllocating] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isStaff) {
        const sessList = await examSeatingService.getSessions();
        setSessions(sessList || []);
        if (sessList && sessList.length > 0) {
          loadSessionSeating(sessList[0].id);
        }
      } else {
        const learnerSeats = await examSeatingService.getMySeats();
        setMySeats(learnerSeats);
      }
    } catch (err: any) {
      console.error('Error fetching exam seating data:', err);
      setError('Could not load examination seating.');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionSeating = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    try {
      const data = await examSeatingService.getSessionSeating(sessionId);
      setSessionDetails(data);
    } catch (err: any) {
      console.error('Error loading session details:', err);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await examSeatingService.createSession(sessionForm);
      setSuccess('Exam session created.');
      setIsModalOpen(false);
      const sessList = await examSeatingService.getSessions();
      setSessions(sessList || []);
      if (res.session?.id) loadSessionSeating(res.session.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create exam session.');
    }
  };

  const handleRunSeatingAllocation = async () => {
    if (!selectedSessionId) return;
    setAllocating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await examSeatingService.generateSeating(selectedSessionId);
      setSuccess(res.message || 'Seating allocated successfully.');
      loadSessionSeating(selectedSessionId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to allocate seating.');
    } finally {
      setAllocating(false);
    }
  };

  const handlePrintSlips = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner text="Loading examination seating plans..." />;
  }

  // Learner / Candidate View
  if (!isStaff) {
    const isCandidate = mySeats?.isCandidate;
    const examList = mySeats?.exam_seats || [];

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-brand-900 via-surface-dark to-surface-dark border border-brand-500/20 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="indigo" size="sm">Grade {mySeats?.learner?.grade} {isCandidate ? 'Matric Candidate' : 'Learner'}</Badge>
            <Badge variant="cyan" size="sm">Official Examination Desk Slips</Badge>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-2">
            <Grid className="w-6 h-6 text-brand-400" />
            <span>Examination Seating & Candidate Admission Card</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            View your allocated exam halls, desk numbers, and candidate identification numbers. Please arrive at your designated venue 30 minutes before commencement.
          </p>
        </div>

        {examList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examList.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl transition-all space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">{item.subject || 'National Assessment'}</span>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400">{item.term}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Desk No.</span>
                    <span className="text-2xl font-black text-brand-300 font-display">{item.desk_number}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400"><Calendar className="w-3.5 h-3.5 text-brand-400" /> Exam Date:</span>
                    <strong className="text-white">{new Date(item.exam_date).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400"><Clock className="w-3.5 h-3.5 text-cyan-400" /> Session Time:</span>
                    <strong className="text-cyan-300">{item.start_time} - {item.end_time}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400"><MapPin className="w-3.5 h-3.5 text-amber-400" /> Venue:</span>
                    <span className="text-white font-medium">{item.venue} (Row {item.row_num}, Column {item.col_num})</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
                    <span className="text-slate-400">Candidate No:</span>
                    <span className="font-mono text-emerald-400 font-bold">{item.candidate_number}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-surface-dark border border-white/5 text-center text-xs text-slate-400">
            No upcoming examination seating allocated yet for this term.
          </div>
        )}
      </div>
    );
  }

  // Admin & Teacher View
  const currentSession = sessionDetails?.session;
  const allocations = sessionDetails?.allocations || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Grid className="w-6 h-6 text-brand-400" />
            <span>Examination Seating & Candidate Allocation Planner</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure examination hall layouts, generate automated desk allocations with candidate IDs, and print official exam hall plans.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Exam Session</span>
          </button>
          {allocations.length > 0 && (
            <button
              onClick={handlePrintSlips}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all border border-white/10"
            >
              <Printer className="w-4 h-4" />
              <span>Print Hall Plan</span>
            </button>
          )}
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

      {/* Session Selector */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-semibold shrink-0">Sessions:</span>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSessionSeating(s.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                selectedSessionId === s.id
                  ? 'bg-brand-600 text-white shadow-glow-indigo'
                  : 'bg-surface-dark text-slate-300 border border-white/10 hover:bg-white/5'
              }`}
            >
              <span>{s.title} (Gr {s.grade})</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/30 text-[10px]">{s.allocated_count || 0} Desks</span>
            </button>
          ))}
        </div>
      )}

      {currentSession && (
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="indigo" size="sm">Grade {currentSession.grade}</Badge>
                <Badge variant="cyan" size="sm">{currentSession.subject || 'All Subjects'}</Badge>
                <Badge variant="emerald" size="sm">{currentSession.venue}</Badge>
              </div>
              <h3 className="text-lg font-bold text-white">{currentSession.title}</h3>
              <p className="text-xs text-slate-400">
                {new Date(currentSession.exam_date).toLocaleDateString('en-ZA')} | {currentSession.start_time} - {currentSession.end_time} | Hall Dimensions: {currentSession.total_rows} Rows × {currentSession.total_cols} Columns ({currentSession.total_desks} Max Capacity)
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunSeatingAllocation}
              disabled={allocating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-glow-emerald transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{allocating ? 'Allocating Desks...' : allocations.length > 0 ? 'Re-Generate Seating' : 'Run Auto-Seating Algorithm'}</span>
            </button>
          </div>

          {/* Visual Hall Seating Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                <span>Visual Examination Hall Seating Layout ({allocations.length} Candidates Seated)</span>
              </h4>
              <span className="text-[11px] text-slate-400">Front of Examination Hall (Invigilator Desk)</span>
            </div>

            {/* Invigilator Podium Indicator */}
            <div className="w-full py-1.5 rounded-xl bg-surface-darker text-center text-[10px] uppercase tracking-widest text-slate-400 font-bold border border-dashed border-white/10">
              === INVIGILATOR PODIUM & ENTRANCE ===
            </div>

            {allocations.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
                {allocations.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-2xl bg-surface-darker border border-white/5 hover:border-cyan-500/50 transition-all space-y-1 group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 text-xs font-mono">{a.desk_number}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        a.attendance_status === 'present' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {a.attendance_status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate" title={`${a.learner_name} ${a.learner_surname}`}>
                      {a.learner_name} {a.learner_surname}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {a.candidate_number}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-surface-darker text-center text-xs text-slate-400 border border-white/5">
                No candidate desks allocated yet. Click "Run Auto-Seating Algorithm" above to distribute learners.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Exam Session */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white">Create Examination Session</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={sessionForm.subject}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Grade *</label>
                  <select
                    value={sessionForm.grade}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, grade: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={8}>Grade 8</option>
                    <option value={9}>Grade 9</option>
                    <option value={10}>Grade 10</option>
                    <option value={11}>Grade 11</option>
                    <option value={12}>Grade 12 (Matric Candidates)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Exam Date *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.exam_date}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, exam_date: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Venue *</label>
                  <input
                    type="text"
                    required
                    value={sessionForm.venue}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, venue: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.start_time}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.end_time}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Hall Rows</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={sessionForm.total_rows}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, total_rows: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Hall Columns</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={sessionForm.total_cols}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, total_cols: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow-indigo transition-all"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
