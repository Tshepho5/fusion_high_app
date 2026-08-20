import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CalendarCheck, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

export const LearnerAttendance: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learnerService.getAttendance()
      .then((res) => setData(res))
      .catch((err) => {
        console.error('Failed to load attendance:', err);
        setError('Could not load attendance logs.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading database attendance logs..." />;

  const getStatusBadge = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'present':
        return <Badge variant="emerald" size="sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Present</Badge>;
      case 'late':
        return <Badge variant="amber" size="sm"><Clock className="w-3 h-3 mr-1" /> Late</Badge>;
      case 'absent':
      default:
        return <Badge variant="rose" size="sm"><XCircle className="w-3 h-3 mr-1" /> Absent</Badge>;
    }
  };

  const logs = data?.calendar_logs || data?.records || [];
  const attendanceRate = data?.overall_attendance !== undefined ? `${data.overall_attendance}%` : (data?.rate || '95%');
  const attendedCount = data?.classes_attended ?? (logs.filter((l: any) => l.status === 'present').length);
  const missedCount = data?.classes_missed ?? (logs.filter((l: any) => l.status === 'absent').length);
  const lateCount = logs.filter((l: any) => l.status === 'late').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-emerald-400" />
          Attendance Records
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Direct database logs from the PostgreSQL <span className="font-mono text-emerald-400">attendance</span> table.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={attendanceRate}
          subtitle="Annual Target >= 85%"
          accentColor="emerald"
        />
        <StatCard
          title="Sessions Present"
          value={attendedCount}
          subtitle="Verified by Educators"
          accentColor="indigo"
        />
        <StatCard
          title="Recorded Absences"
          value={missedCount}
          subtitle="Absence Logs"
          accentColor="rose"
        />
        <StatCard
          title="Late Arrivals"
          value={lateCount}
          subtitle="Period 1 Registers"
          accentColor="amber"
        />
      </div>

      {/* Attendance History Table */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl">
        <h3 className="text-sm font-bold font-display text-white mb-4">
          Daily Attendance Logs
        </h3>

        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Subject / Session</th>
                  <th className="pb-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((rec: any, idx: number) => {
                  const dateStr = rec.attendance_date || rec.date || 'Recent';
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-white">
                        {dateStr.includes('T') ? dateStr.split('T')[0] : dateStr}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {rec.subject_name || rec.period || 'General Registration'}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(rec.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No attendance registers recorded yet in database.
          </div>
        )}
      </div>
    </div>
  );
};
