import React, { useEffect, useState } from 'react';
import { systemControlService } from '../../services/api';

type Programme = Record<string, number>;

const COUNTS: Array<[string, string]> = [
  ['parent_testers_invited', 'Parent testers invited'],
  ['teacher_testers_invited', 'Teacher testers invited'],
  ['learner_testers_invited', 'Learner testers invited'],
  ['invitations_pending', 'Invitations pending'],
  ['invitations_accepted', 'Invitations accepted'],
  ['accounts_activated', 'Accounts activated'],
  ['active_testers', 'Active testers'],
  ['suspended_or_revoked', 'Suspended or revoked'],
  ['dashboards_tested', 'Dashboards tested'],
  ['modules_tested', 'Modules tested'],
  ['passed_tests', 'Passed tests'],
  ['failed_tests', 'Failed tests'],
  ['outstanding_issues', 'Outstanding issues'],
  ['critical_issues', 'Critical issues'],
  ['awaiting_retest', 'Awaiting retest'],
  ['legacy_testers_outside_programme', 'Older testers still to close']
];

const STATUSES = ['open', 'under_investigation', 'confirmed', 'in_progress', 'fixed', 'ready_for_retesting', 'verified', 'rejected'];

export const TesterProgrammePanel: React.FC<{ programme: Programme | null; testSchoolName?: string }> = ({ programme, testSchoolName }) => {
  const [filters, setFilters] = useState({ role: '', dashboard: '', module: '', status: '', severity: '', from: '', to: '' });
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async (next = filters) => {
    const params: Record<string, string> = {};
    Object.entries(next).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    try {
      const result = await systemControlService.getTesterReports(params);
      setReports(result.reports || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Testing reports could not be loaded.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: number, status: string) => {
    try {
      await systemControlService.updateTesterReport(id, { status });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The report status could not be updated.');
    }
  };

  return (
    <div className="rounded-2xl bg-surface-dark border border-white/10 p-6 shadow-lg space-y-5">
      <div>
        <h3 className="text-sm font-extrabold text-white">Testing programme</h3>
        <p className="text-[11px] text-slate-400 mt-1">
          Counts come from tester invitation and report records{testSchoolName ? ` for ${testSchoolName}` : ''}.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        {COUNTS.map(([key, label]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-xl font-black text-white mt-1">{programme ? programme[key] ?? 0 : '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(['role', 'dashboard', 'module', 'status', 'severity', 'from', 'to'] as const).map((key) => (
          key === 'status' || key === 'severity' || key === 'role' ? (
            <select key={key} value={filters[key]} onChange={(event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))} className="rounded-xl bg-slate-950 border border-slate-700 text-white text-xs px-2 py-2">
              <option value="">{key}</option>
              {(key === 'role' ? ['parent', 'teacher', 'learner'] : key === 'severity' ? ['low', 'medium', 'high', 'critical'] : STATUSES).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input key={key} type={key === 'from' || key === 'to' ? 'date' : 'text'} placeholder={key} value={filters[key]} onChange={(event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))} className="rounded-xl bg-slate-950 border border-slate-700 text-white text-xs px-2 py-2" />
          )
        ))}
        <button type="button" onClick={() => load()} className="rounded-xl bg-brand-600 text-white text-xs font-bold px-3 py-2">Apply filters</button>
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-white/10">
              <th className="py-2">Reference</th>
              <th>Role</th>
              <th>Dashboard</th>
              <th>Module</th>
              <th>Kind</th>
              <th>Result</th>
              <th>Severity</th>
              <th>Status</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan={9} className="py-6 text-slate-500">No testing reports match these filters.</td></tr>
            ) : reports.map((report) => (
              <tr key={report.id} className="border-b border-white/5 align-top">
                <td className="py-2 font-mono text-[11px]">
                  <div>{report.reference_code}</div>
                  <div className="text-slate-400 max-w-[220px]">{report.description}</div>
                </td>
                <td>{report.role_name}</td>
                <td>{report.dashboard}</td>
                <td>{report.module}</td>
                <td>{report.kind}</td>
                <td>{report.result || '—'}</td>
                <td>{report.severity || '—'}</td>
                <td>
                  {report.kind === 'issue' ? (
                    <select value={report.status} onChange={(event) => setStatus(report.id, event.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-1 py-1">
                      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  ) : report.status}
                </td>
                <td className="font-mono text-[11px]">{report.created_at ? new Date(report.created_at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
