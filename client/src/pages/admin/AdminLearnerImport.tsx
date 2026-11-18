import React, { useMemo, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Download
} from 'lucide-react';
import { adminService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';

type FieldDef = { key: string; label: string; required: boolean };

type PreviewRow = {
  row_index: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  row: Record<string, any>;
};

/**
 * Admin → Import learners from SA-SAMS Excel/CSV (Menu 16.3 Learner Info).
 */
export const AdminLearnerImport: React.FC = () => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [stats, setStats] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [defaultPassword, setDefaultPassword] = useState('Learner@2026');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const readyCount = useMemo(() => previewRows.filter((r) => r.ok).length, [previewRows]);

  const onFile = async (file: File | null) => {
    setError(null);
    setSuccess(null);
    setResult(null);
    setPreviewRows([]);
    setStats(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      setError(
        'Please open the SA-SAMS Excel export in Excel/Google Sheets and Save As → CSV (.csv), then upload that file here.'
      );
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    setCsvText(text);
    await runPreview(text, undefined);
  };

  const runPreview = async (text: string, map?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.previewLearnerImport({
        csv_text: text,
        mapping: map
      });
      setHeaders(res.headers || []);
      setFields(res.fields || []);
      setMapping(res.mapping || {});
      setPreviewRows(res.preview || res.rows?.slice(0, 25) || []);
      setStats({
        total: res.total_rows || 0,
        valid: res.valid_rows || 0,
        invalid: res.invalid_rows || 0
      });
      if (res.required_missing?.length) {
        setError(
          `Map required columns first: ${res.required_missing.join(', ')}. SA-SAMS headers are auto-detected when possible.`
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to parse CSV.');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = async (fieldKey: string, header: string) => {
    const next = { ...mapping };
    if (!header) delete next[fieldKey];
    else next[fieldKey] = header;
    setMapping(next);
    if (csvText) await runPreview(csvText, next);
  };

  const handleImport = async () => {
    if (!csvText) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    try {
      // Re-preview to get full validated row set (up to 500)
      const preview = await adminService.previewLearnerImport({ csv_text: csvText, mapping });
      const learners = (preview.rows || [])
        .filter((r: PreviewRow) => r.ok)
        .map((r: PreviewRow) => r.row);
      if (!learners.length) {
        setError('No valid learner rows to import. Fix mapping or CSV data first.');
        return;
      }
      const res = await adminService.commitLearnerImport({
        learners,
        default_password: defaultPassword,
        skip_duplicates: skipDuplicates
      });
      setResult(res);
      setSuccess(res.message);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const sampleCsv = `First Name,Surname,ID Number,Admission No,Grade,Class,Gender,Date of Birth
Lerato,Walters,0001015009087,GSA-MKG-101,10,10A,Female,2009-03-12
Thabo,Mokoena,0002025009088,GSA-MKG-102,10,10A,Male,2009-05-01`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            Import Learners (SA-SAMS CSV)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Ask the school to export from SA-SAMS <strong className="text-slate-300">Menu 16.3 → Export Data Fields → Learner Info</strong>,
            save as CSV, then upload here. Geleza maps common SA-SAMS column names automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'geleza-learner-import-sample.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5" />
          Sample CSV
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
        <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <p className="text-sm text-white font-semibold">Upload SA-SAMS learner CSV</p>
        <p className="text-[11px] text-slate-400 mt-1 mb-4">
          .csv only (Excel → Save As CSV). Max 500 learners per import.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer">
          Choose file
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
        {fileName && (
          <p className="mt-3 text-[11px] text-slate-400 font-mono">{fileName}</p>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {!!headers.length && !loading && (
        <>
          <div className="rounded-2xl border border-white/10 bg-surface-darker/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h3 className="text-sm font-bold text-white">Column mapping</h3>
              {stats && (
                <div className="flex gap-2 text-[11px]">
                  <Badge variant="cyan" size="sm">{stats.total} rows</Badge>
                  <Badge variant="emerald" size="sm">{stats.valid} valid</Badge>
                  <Badge variant="rose" size="sm">{stats.invalid} invalid</Badge>
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {fields.map((f) => (
                <label key={f.key} className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    {f.label}
                    {f.required ? ' *' : ''}
                  </span>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) => updateMapping(f.key, e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/40"
                  >
                    <option value="">— not mapped —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <label className="flex-1 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Default password for new accounts</span>
                <input
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs font-mono"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 sm:pt-5">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-white/20"
                />
                Skip duplicates (learner number / ID / email)
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface-darker/40">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="px-3 py-3">Row</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Learner #</th>
                  <th className="px-3 py-3">Grade / Class</th>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {previewRows.map((r) => (
                  <tr key={r.row_index} className="hover:bg-white/5">
                    <td className="px-3 py-2.5 text-slate-500">{r.row_index}</td>
                    <td className="px-3 py-2.5 text-white font-semibold">
                      {r.row.full_name} {r.row.surname}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-cyan-300/90">{r.row.learner_number || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {r.row.grade || '—'} {r.row.class_name ? `/ ${r.row.class_name}` : ''}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-400">{r.row.id_number || '—'}</td>
                    <td className="px-3 py-2.5">
                      {r.ok ? (
                        <Badge variant="emerald" size="sm">OK</Badge>
                      ) : (
                        <span className="text-rose-300" title={r.errors.join('; ')}>
                          {r.errors[0] || 'Invalid'}
                        </span>
                      )}
                      {r.warnings?.length > 0 && (
                        <p className="text-[10px] text-amber-400/90 mt-0.5">{r.warnings[0]}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={importing || readyCount === 0}
              onClick={handleImport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold disabled:opacity-40"
            >
              {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {importing ? 'Importing…' : `Import ${readyCount} valid learner${readyCount === 1 ? '' : 's'}`}
            </button>
            <button
              type="button"
              disabled={loading || !csvText}
              onClick={() => runPreview(csvText, mapping)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-preview
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="rounded-2xl border border-white/10 bg-surface-darker/50 p-4 space-y-2 text-xs">
          <p className="text-white font-bold">Import result</p>
          <p className="text-slate-300">
            Created: <span className="text-emerald-300 font-bold">{result.created_count}</span>
            {' · '}
            Skipped: <span className="text-amber-300 font-bold">{result.skipped_count}</span>
            {' · '}
            Failed: <span className="text-rose-300 font-bold">{result.failed_count}</span>
          </p>
          <p className="text-slate-500">
            Default password for new accounts: <span className="font-mono text-slate-300">{result.default_password}</span>
          </p>
          {result.skipped?.slice(0, 5).map((s: any, idx: number) => (
            <p key={idx} className="text-amber-400/90">Skipped row {s.row}: {s.reason}</p>
          ))}
          {result.failed?.slice(0, 5).map((f: any, idx: number) => (
            <p key={idx} className="text-rose-300">Failed row {f.row}: {(f.errors || []).join('; ')}</p>
          ))}
        </div>
      )}
    </div>
  );
};
