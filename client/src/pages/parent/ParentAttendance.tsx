import React, { useState, useEffect } from 'react';
import { parentService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  User,
  Calendar,
  Sparkles,
  Award
} from 'lucide-react';

interface ParentAttendanceProps {
  onNavigateTab?: (tab: string, childId?: string | number) => void;
  childId?: string | number | null;
}

export const ParentAttendance: React.FC<ParentAttendanceProps> = ({ onNavigateTab, childId }) => {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [attendanceData, setAttendanceData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTerm, setSelectedTerm] = useState<string>('All Terms');

  useEffect(() => {
    setLoading(true);
    setError(null);
    parentService.getChildren()
      .then(res => {
        const list = Array.isArray(res) ? res : res.children || [];
        setChildren(list);
        if (list.length > 0) {
          const match = childId ? list.find((c: any) => String(c.id) === String(childId)) : null;
          setSelectedChild(match || list[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load children for attendance:', err);
        setError('Could not load linked learners.');
      })
      .finally(() => setLoading(false));
  }, [childId]);

  useEffect(() => {
    if (!selectedChild) return;
    setLoadingAttendance(true);
    parentService.getChildAttendance(selectedChild.id)
      .then(res => {
        setAttendanceData(res);
      })
      .catch(err => {
        console.error('Error fetching child attendance:', err);
        setAttendanceData(null);
      })
      .finally(() => setLoadingAttendance(false));
  }, [selectedChild]);

  if (loading) return <LoadingSpinner text="Loading children attendance profiles..." />;

  if (!children || children.length === 0) {
    return (
      <div className="rounded-3xl p-12 text-center border border-dashed border-white/20 bg-surface-dark/40 max-w-2xl mx-auto my-8 space-y-5 animate-fade-in shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <CalendarCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-white font-display tracking-tight">
            No Linked Children Found
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            You do not have any registered learners linked to your parent account yet. Link a child in settings to view their daily attendance, arrival times, and absentee logs.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => onNavigateTab ? onNavigateTab('settings') : (window.location.hash = '#settings')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-brand-600 hover:from-emerald-400 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <User className="w-4 h-4" />
            <span>Link a Child in Settings</span>
          </button>
        </div>
      </div>
    );
  }

  // DBE South Africa Term Date Classifier
  const getTermForDate = (dateStr?: string): string => {
    if (!dateStr) return 'Term 1';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Term 1';
    const month = d.getMonth() + 1;
    if (month <= 3) return 'Term 1';
    if (month <= 6) return 'Term 2';
    if (month <= 9) return 'Term 3';
    return 'Term 4';
  };

  const rawRecords: any[] = attendanceData?.all_records || attendanceData?.records || attendanceData?.recent_attendance_records || attendanceData?.recent || [];

  // Filter records by selected term
  const filteredRecords = selectedTerm === 'All Terms'
    ? rawRecords
    : rawRecords.filter((r: any) => (r.term || getTermForDate(r.date || r.attendance_date)) === selectedTerm);

  const presentDays = filteredRecords.filter((r: any) => (r.status || '').toLowerCase() === 'present').length;
  const absentDays = filteredRecords.filter((r: any) => (r.status || '').toLowerCase() === 'absent').length;
  const lateDays = filteredRecords.filter((r: any) => (r.status || '').toLowerCase() === 'late').length;
  const totalDays = filteredRecords.length;
  const attendedCount = presentDays + lateDays;

  // Strict 0% attendance calculation: if learner hasn't attended any class or has no records, show 0 (not 100%)
  const attendanceRate = totalDays > 0 && attendedCount > 0
    ? Math.round((attendedCount / totalDays) * 100)
    : 0;

  const stats = {
    present_days: presentDays,
    absent_days: absentDays,
    late_days: lateDays,
    attendance_rate: attendanceRate
  };

  const availableTerms = ['All Terms', 'Term 1', 'Term 2', 'Term 3', 'Term 4'] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-emerald-400" />
          Child Attendance & Punctuality Records
        </h2>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
        </div>
      )}

      {/* Child Selector Tabs */}
      {children.length > 1 && (
        <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto">
          {children.map((child) => {
            const isSelected = selectedChild?.id === child.id;
            return (
              <button
                key={child.id}
                onClick={() => {
                  setSelectedChild(child);
                  onNavigateTab?.('attendance', child.id);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-600 to-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {`${child.full_name || ''} ${child.surname || ''}`.trim()}
              </button>
            );
          })}
        </div>
      )}

      {selectedChild && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Rate</span>
              <div className={`text-2xl font-black font-display ${stats.attendance_rate === 0 ? 'text-slate-400' : 'text-emerald-400'}`}>
                {stats.attendance_rate}%
              </div>
              <p className="text-[10px] text-slate-500">
                {totalDays === 0
                  ? 'No attendance records logged'
                  : stats.attendance_rate === 0
                  ? 'No classes attended'
                  : stats.attendance_rate >= 90
                  ? 'Above provincial 90% benchmark'
                  : 'Below provincial 90% benchmark'}
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Present</span>
              <div className="text-2xl font-black font-display text-white">
                {stats.present_days}
              </div>
              <p className="text-[10px] text-emerald-400">
                {stats.present_days === 0 ? '0 days attended' : 'Active class participation'}
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Absent</span>
              <div className="text-2xl font-black font-display text-rose-400">
                {stats.absent_days}
              </div>
              <p className="text-[10px] text-slate-500">Documented leave / excused</p>
            </div>

            <div className="p-4 rounded-3xl bg-surface-dark border border-white/10 shadow-lg space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late Arrivals</span>
              <div className="text-2xl font-black font-display text-amber-400">
                {stats.late_days}
              </div>
              <p className="text-[10px] text-slate-500">Recorded by gate registers</p>
            </div>
          </div>

          {/* Detailed Attendance Log */}
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Recent Daily Presence History ({selectedChild.full_name})
              </h3>
              
              {/* Term Selector Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Choose Term:</span>
                {availableTerms.map(termOption => {
                  const isSelected = selectedTerm === termOption;
                  return (
                    <button
                      key={termOption}
                      onClick={() => setSelectedTerm(termOption)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-500 to-brand-600 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {termOption}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingAttendance ? (
              <LoadingSpinner text="Fetching attendance history..." />
            ) : filteredRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Term</th>
                      <th className="pb-3">Subject / Period</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Recorded By</th>
                      <th className="pb-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRecords.map((r: any, idx: number) => {
                      const isPresent = (r.status || '').toLowerCase() === 'present';
                      const isLate = (r.status || '').toLowerCase() === 'late';
                      const termTag = r.term || getTermForDate(r.date || r.attendance_date);
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 font-mono text-white">
                            {r.date || new Date().toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                              {termTag}
                            </span>
                          </td>
                          <td className="py-3 text-slate-300 font-semibold">
                            {r.subject_name || r.subject || 'All Day Register'}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={isPresent ? 'emerald' : isLate ? 'amber' : 'rose'}
                              size="sm"
                            >
                              {r.status || 'Present'}
                            </Badge>
                          </td>
                          <td className="py-3 text-slate-400">
                            {r.teacher_name || r.recorded_by || 'Class Educator'}
                          </td>
                          <td className="py-3 text-slate-500 italic">
                            {r.remarks || r.notes || 'Normal attendance'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                {rawRecords.length === 0
                  ? `No attendance records logged for ${selectedChild.full_name} yet.`
                  : `No attendance records found for ${selectedTerm} for ${selectedChild.full_name}.`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
