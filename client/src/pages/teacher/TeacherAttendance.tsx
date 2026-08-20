import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { TeacherQRScannerModal } from '../../components/teacher/TeacherQRScannerModal';
import { CalendarCheck, Save, CheckCircle2, AlertCircle, Camera, QrCode, Smartphone, Send } from 'lucide-react';

interface LearnerRecord {
  id: number;
  full_name?: string;
  surname?: string;
  name?: string;
  learner_number: string;
  status: 'present' | 'late' | 'absent';
}

export const TeacherAttendance: React.FC = () => {
  const [classes, setClasses] = useState<string[]>(['10A', '10B', '11A', '11B', '12A']);
  const [selectedClass, setSelectedClass] = useState<string>('10A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyQRAttendance = async (updated: LearnerRecord[], notifyParents: boolean) => {
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
          status: l.status,
        })),
      });
      setSavedSuccess(true);
      setLearners(prev => prev.map(l => ({ ...l, status: undefined as any })));
      setTimeout(() => setSavedSuccess(false), 5000);
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
      // Reset attendance statuses to no color after publishing
      setLearners(prev => prev.map(l => ({ ...l, status: undefined as any })));
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError(err?.response?.data?.error || 'Failed to save attendance records to database.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = learners.filter(l => l.status === 'present').length;
  const lateCount = learners.filter(l => l.status === 'late').length;
  const absentCount = learners.filter(l => l.status === 'absent').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-brand-400" />
            Class Attendance Register
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Capture daily period presence, track late arrivals, and sync compliance logs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 font-bold text-xs shadow-glow-cyan transition-all"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Camera QR Roll-Call</span>
          </button>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl bg-surface-dark border border-white/10 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {classes.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl bg-surface-dark border border-white/10 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <button
            onClick={handleSave}
            disabled={saving || learners.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50"
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Register</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Attendance register saved to database successfully!</span>
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
        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">Present</span>
          <Badge variant="emerald" size="md">{presentCount}</Badge>
        </div>
        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">Late</span>
          <Badge variant="amber" size="md">{lateCount}</Badge>
        </div>
        <div className="p-4 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">Absent</span>
          <Badge variant="rose" size="md">{absentCount}</Badge>
        </div>
      </div>

      {/* Quick Status Modifiers */}
      <div className="flex items-center justify-between bg-surface-darker p-3 rounded-2xl border border-white/5">
        <span className="text-xs text-slate-400 font-medium">Quick Batch Mark:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => markAll('present')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold transition-colors"
          >
            All Present
          </button>
          <button
            onClick={() => markAll('late')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-semibold transition-colors"
          >
            All Late
          </button>
          <button
            onClick={() => markAll('absent')}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition-colors"
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
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {learners.map((learner, index) => {
                  const displayName = `${learner.full_name || learner.name || ''} ${learner.surname || ''}`.trim();
                  return (
                    <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400">{index + 1}</td>
                      <td className="py-3.5 px-3 font-mono font-medium text-brand-400">{learner.learner_number}</td>
                      <td className="py-3.5 px-3 font-bold text-white">{displayName}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleStatus(learner.id, 'present')}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              learner.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-sm'
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
