import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { TeacherQRScannerModal } from '../../components/teacher/TeacherQRScannerModal';
import { 
  CalendarCheck, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  History, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Mail, 
  Check, 
  XCircle, 
  Sparkles,
  Users
} from 'lucide-react';

interface LearnerRecord {
  id: number;
  full_name?: string;
  surname?: string;
  name?: string;
  learner_number: string;
  status: 'present' | 'late' | 'absent';
}

interface AttendanceHistoryRecord {
  record_id: number;
  child_id: number;
  subject_name: string;
  attendance_date: string;
  status: string;
  recorded_at: string;
  learner_name: string;
  learner_surname: string;
  learner_number: string;
  grade: number;
  class_id: string;
  teacher_name?: string;
  teacher_surname?: string;
  parent_email?: string;
  parent_name?: string;
}

export const TeacherAttendance: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'history'>('register');
  const [classes, setClasses] = useState<string[]>(['10A', '10B', '11A', '11B', '12A']);
  const [selectedClass, setSelectedClass] = useState<string>('10A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History Tracker State
  const [historyRecords, setHistoryRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [historyClass, setHistoryClass] = useState<string>('all');
  const [historyStatus, setHistoryStatus] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStats, setHistoryStats] = useState<{ total: number; present: number; late: number; absent: number; rate: number }>({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    rate: 100
  });

  const handleApplyQRAttendance = async (updated: LearnerRecord[]) => {
    setLearners(updated);
    setSaving(true);
    setError(null);
    try {
      await teacherService.saveAttendance({
        class: selectedClass,
        class_id: selectedClass,
        date: selectedDate,
        records: updated.map(l => ({
          id: l.id,
          child_id: l.id,
          learner_id: l.id,
          learner_number: l.learner_number,
          status: l.status || 'present',
        })),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
      if (activeSubTab === 'history') fetchHistory();
    } catch (err: any) {
      console.error('Error saving QR attendance:', err);
      setError(err?.response?.data?.error || 'Could not automatically commit QR attendance to database.');
    } finally {
      setSaving(false);
    }
  };

  // Load teacher classes
  useEffect(() => {
    teacherService.getClassList()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.classes || [];
        if (list.length > 0) {
          const names = list.map((c: any) => (typeof c === 'string' ? c : c.name || c.class_name)).filter(Boolean);
          if (names.length > 0) {
            setClasses(names);
            setSelectedClass(names[0]);
          }
        }
      })
      .catch(() => {
        // Keeps default classes
      });
  }, []);

  // Load learners for selected class from database
  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);
    teacherService.getAttendanceRoster({ class: selectedClass, date: selectedDate })
      .then((res) => {
        const roster = res.roster || (Array.isArray(res) ? res : []);
        setLearners(roster.map((s: any) => ({
          id: s.id || s.child_id,
          full_name: s.full_name || s.learner_name || s.name,
          surname: s.surname || s.learner_surname || '',
          learner_number: s.learner_number || `ID-${s.id}`,
          status: (s.status || 'present').toLowerCase() as 'present' | 'late' | 'absent',
        })));
      })
      .catch((err) => {
        console.error('Error fetching attendance roster:', err);
        setError('Could not load attendance roster from database.');
        setLearners([]);
      })
      .finally(() => setLoading(false));
  }, [selectedClass, selectedDate]);

  // Load Attendance History
  const fetchHistory = () => {
    setHistoryLoading(true);
    const params: any = {};
    if (historyDate) params.date = historyDate;
    if (historyClass && historyClass !== 'all') params.class = historyClass;
    if (historyStatus && historyStatus !== 'all') params.status = historyStatus;

    teacherService.getAttendanceHistory(params)
      .then((res) => {
        if (res && res.records) {
          setHistoryRecords(res.records);
          if (res.stats) setHistoryStats(res.stats);
        } else if (Array.isArray(res)) {
          setHistoryRecords(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load attendance history:', err);
      })
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory();
    }
  }, [activeSubTab, historyDate, historyClass, historyStatus]);

  const toggleStatus = (learnerId: number, status: 'present' | 'late' | 'absent') => {
    setLearners(prev =>
      prev.map(l => (l.id === learnerId ? { ...l, status } : l))
    );
  };

  const markAll = (status: 'present' | 'late' | 'absent') => {
    setLearners(prev => prev.map(l => ({ ...l, status })));
  };

  const handleSave = async () => {
    if (learners.length === 0) return;
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await teacherService.saveAttendance({
        class: selectedClass,
        class_id: selectedClass,
        date: selectedDate,
        records: learners.map(l => ({
          id: l.id,
          child_id: l.id,
          learner_id: l.id,
          learner_number: l.learner_number,
          status: l.status || 'present',
        })),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
      if (activeSubTab === 'history') fetchHistory();
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError(err?.response?.data?.error || 'Failed to save attendance records to database.');
    } finally {
      setSaving(false);
    }
  };

  // Export history to CSV
  const handleExportCSV = () => {
    if (historyRecords.length === 0) return;
    const headers = ['Date', 'Learner Number', 'Full Name', 'Grade', 'Class', 'Subject', 'Status', 'Logged Time', 'Teacher', 'Parent Email'];
    const csvRows = [
      headers.join(','),
      ...historyRecords.map(r => [
        `"${r.attendance_date}"`,
        `"${r.learner_number || ''}"`,
        `"${r.learner_surname || ''} ${r.learner_name || ''}"`,
        `"${r.grade || ''}"`,
        `"${r.class_id || ''}"`,
        `"${r.subject_name || 'General'}"`,
        `"${r.status.toUpperCase()}"`,
        `"${r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString() : ''}"`,
        `"${r.teacher_name || ''} ${r.teacher_surname || ''}"`,
        `"${r.parent_email || ''}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Log_${historyDate || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presentCount = learners.filter(l => l.status === 'present').length;
  const lateCount = learners.filter(l => l.status === 'late').length;
  const absentCount = learners.filter(l => l.status === 'absent').length;

  const filteredHistory = historyRecords.filter(r => {
    const search = historySearch.toLowerCase();
    const name = `${r.learner_name || ''} ${r.learner_surname || ''}`.toLowerCase();
    const id = (r.learner_number || '').toLowerCase();
    return name.includes(search) || id.includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-brand-400" />
            Class Attendance Register & Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Capture live roll-call with holographic QR scanning, send automatic parent confirmations, and track daily records.
          </p>
        </div>

        {/* SubTab Toggle Switch */}
        <div className="flex items-center p-1 rounded-2xl bg-surface-dark border border-white/10 shrink-0">
          <button
            onClick={() => setActiveSubTab('register')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeSubTab === 'register'
                ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Live Roll-Call</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeSubTab === 'history'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Attendance History & Logs</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE ROLL-CALL REGISTER                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'register' && (
        <div className="space-y-6 animate-fade-in">
          {/* Action Controls & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-black text-xs shadow-glow-cyan transition-all transform hover:scale-[1.02]"
              >
                <Camera className="w-4 h-4" />
                <span>Launch QR Camera Scanner</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">LIVE</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {classes.map(c => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || learners.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-glow-indigo transition-all disabled:opacity-50"
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Register & Send Alerts</span>
                </>
              )}
            </button>
          </div>

          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-fade-in shadow-lg">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-extrabold text-white">Attendance Register Saved & Synced!</p>
                  <p className="text-[11px] text-emerald-300">Automated parent confirmation notices and emails dispatched for all marked learners.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                DB SYNCED
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Stats Summary Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Present Learners</span>
                <span className="text-[11px] text-emerald-400 font-mono">Email alerts sent</span>
              </div>
              <Badge variant="emerald" size="md">{presentCount}</Badge>
            </div>
            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Late Learners</span>
                <span className="text-[11px] text-amber-400 font-mono">Warning alerts sent</span>
              </div>
              <Badge variant="amber" size="md">{lateCount}</Badge>
            </div>
            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Absent Learners</span>
                <span className="text-[11px] text-rose-400 font-mono">Absence alerts sent</span>
              </div>
              <Badge variant="rose" size="md">{absentCount}</Badge>
            </div>
          </div>

          {/* Quick Status Modifiers */}
          <div className="flex items-center justify-between bg-surface-darker p-3.5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-slate-300 font-bold">Quick Batch Mark:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => markAll('present')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors"
              >
                All Present
              </button>
              <button
                onClick={() => markAll('late')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-colors"
              >
                All Late
              </button>
              <button
                onClick={() => markAll('absent')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
              >
                All Absent
              </button>
            </div>
          </div>

          {/* Learners Register Table */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl">
            {loading ? (
              <LoadingSpinner text="Fetching class roster from database..." />
            ) : learners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                      <th className="pb-3 px-3">#</th>
                      <th className="pb-3 px-3">Learner ID</th>
                      <th className="pb-3 px-3">Full Name</th>
                      <th className="pb-3 px-3">Attendance Status</th>
                      <th className="pb-3 px-3 text-right">Parent Notice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {learners.map((learner, index) => {
                      const displayName = `${learner.full_name || learner.name || ''} ${learner.surname || ''}`.trim();
                      return (
                        <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-3 text-slate-400 font-mono">{index + 1}</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">{learner.learner_number}</td>
                          <td className="py-3.5 px-3 font-bold text-white text-sm">{displayName}</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => toggleStatus(learner.id, 'present')}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                  learner.status === 'present'
                                    ? 'bg-emerald-600 text-white shadow-glow-cyan'
                                    : 'bg-surface-darker text-slate-400 hover:text-white'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => toggleStatus(learner.id, 'late')}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                  learner.status === 'late'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-surface-darker text-slate-400 hover:text-white'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                onClick={() => toggleStatus(learner.id, 'absent')}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                  learner.status === 'absent'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-surface-darker text-slate-400 hover:text-white'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                              <Mail className="w-3.5 h-3.5" />
                              <span>Auto-Email Ready</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No learners found in class {selectedClass}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY ATTENDANCE LOGS & HISTORY TRACKER                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-6 animate-fade-in">
          {/* History KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold block">Total Logged</span>
              <p className="text-2xl font-extrabold font-mono text-white mt-1">{historyStats.total}</p>
            </div>
            <div className="p-4 rounded-3xl bg-surface-dark border border-emerald-500/20 shadow-lg">
              <span className="text-xs text-emerald-400 font-semibold block">Present</span>
              <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">{historyStats.present}</p>
            </div>
            <div className="p-4 rounded-3xl bg-surface-dark border border-amber-500/20 shadow-lg">
              <span className="text-xs text-amber-400 font-semibold block">Late Arrivals</span>
              <p className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{historyStats.late}</p>
            </div>
            <div className="p-4 rounded-3xl bg-surface-dark border border-rose-500/20 shadow-lg">
              <span className="text-xs text-rose-400 font-semibold block">Absences</span>
              <p className="text-2xl font-extrabold font-mono text-rose-400 mt-1">{historyStats.absent}</p>
            </div>
            <div className="p-4 rounded-3xl bg-surface-dark border border-cyan-500/20 shadow-lg col-span-2 lg:col-span-1">
              <span className="text-xs text-cyan-400 font-semibold block">Attendance Rate</span>
              <p className="text-2xl font-extrabold font-mono text-cyan-300 mt-1">{historyStats.rate}%</p>
            </div>
          </div>

          {/* History Search & Filter Header */}
          <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search learner name or ID..."
                  className="w-full pl-9 pr-3.5 py-2 bg-surface-darker border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>

              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              <select
                value={historyClass}
                onChange={(e) => setHistoryClass(e.target.value)}
                className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>

              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
                className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present Only</option>
                <option value="late">Late Only</option>
                <option value="absent">Absent Only</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={filteredHistory.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs transition-colors shrink-0 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* History Data Table */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl">
            {historyLoading ? (
              <LoadingSpinner text="Retrieving daily attendance history from database..." />
            ) : filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3">Learner ID</th>
                      <th className="pb-3 px-3">Learner Full Name</th>
                      <th className="pb-3 px-3">Class</th>
                      <th className="pb-3 px-3">Subject / Period</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Time Logged</th>
                      <th className="pb-3 px-3">Parent Notice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredHistory.map((rec) => {
                      const st = rec.status.toLowerCase();
                      return (
                        <tr key={rec.record_id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-3 font-mono text-slate-300">{rec.attendance_date}</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">{rec.learner_number || `ID-${rec.child_id}`}</td>
                          <td className="py-3.5 px-3 font-bold text-white">{rec.learner_surname} {rec.learner_name}</td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-mono text-[11px]">
                              {rec.class_id || `Grade ${rec.grade}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-300 font-medium">{rec.subject_name || 'General Registration'}</td>
                          <td className="py-3.5 px-3">
                            {st === 'present' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px]">
                                <Check className="w-3 h-3" />
                                PRESENT
                              </span>
                            )}
                            {st === 'late' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-extrabold text-[11px]">
                                <Clock className="w-3 h-3" />
                                LATE
                              </span>
                            )}
                            {st === 'absent' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 font-extrabold text-[11px]">
                                <XCircle className="w-3 h-3" />
                                ABSENT
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                            {rec.recorded_at ? new Date(rec.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00 AM'}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <Mail className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="truncate max-w-[140px]" title={rec.parent_email || 'Parent Portal'}>
                                {rec.parent_email ? 'Email & In-App' : 'In-App Sent'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-300">No attendance logs found for this filter.</p>
                <p className="text-[11px] text-slate-500 mt-1">Try selecting a different date or class.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera QR Roll-Call Modal */}
      <TeacherQRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        learners={learners}
        selectedClass={selectedClass}
        onApplyAttendance={handleApplyQRAttendance}
      />
    </div>
  );
};
