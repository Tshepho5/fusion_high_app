import React, { useEffect, useState } from 'react';
import { adminService, reportService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Download, FileCheck, GraduationCap } from 'lucide-react';

interface ReportRelease {
  child_id: number;
  child_name: string;
  grade: number | null;
  class_name: string | null;
  academic_year: number | null;
  term: number | null;
  release_status: 'released' | 'not_released';
  download_available: boolean;
  overall_average?: number | null;
  payment_required: boolean;
}

interface ChildRelease {
  child_id: number;
  child_name: string;
  grade: number | null;
  class_name: string | null;
  reports: ReportRelease[];
}

interface ParentReportReleasesProps {
  selectedChildId?: string;
  onOpen: (childId: number, termLabel: string) => void;
}

export const ParentReportReleases: React.FC<ParentReportReleasesProps> = ({ selectedChildId, onOpen }) => {
  const [children, setChildren] = useState<ChildRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    reportService.myReleases()
      .then((res: any) => {
        if (!active) return;
        setChildren(Array.isArray(res?.children) ? res.children : []);
      })
      .catch(() => {
        if (active) setError('Could not load report release status.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const downloadReport = async (report: ReportRelease) => {
    if (!report.download_available || report.payment_required) return;
    const key = `${report.child_id}-${report.term}-${report.academic_year}`;
    setDownloadingId(key);
    try {
      const res = await adminService.downloadLearnerReportPdf(report.child_id, {
        term: report.term || undefined,
        academicYear: report.academic_year || undefined
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GelezaSA_Report_${report.academic_year || 'year'}_${report.child_name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Term${report.term || ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
      setError('The report could not be downloaded.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <LoadingSpinner text="Checking which reports have been released..." />;

  if (!children.length) {
    return (
      <div className="rounded-3xl p-8 text-center border border-dashed border-white/20 bg-surface-dark/40 max-w-2xl mx-auto my-6">
        <GraduationCap className="w-7 h-7 text-teal-400 mx-auto mb-3" />
        <h3 className="text-lg font-extrabold text-white">No linked children</h3>
        <p className="text-xs text-slate-400 mt-1">Link a child before a released report can appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div>
        <h3 className="text-sm font-bold text-white">Released report cards</h3>
        <p className="text-[11px] text-slate-400">A report appears here after the class teacher approves it and the school releases it. No report-access fee applies.</p>
      </div>
      {error && <p className="text-xs text-amber-300">{error}</p>}
      {children.map((child) => (
        <div key={child.child_id} className="rounded-2xl border border-white/10 bg-surface-dark/50 p-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-white">{child.child_name}</p>
            <p className="text-[11px] text-slate-400">Grade {child.grade ?? '-'} · {child.class_name || 'Class not set'}</p>
          </div>
          {child.reports.map((report) => {
            const termLabel = report.term ? `Term ${report.term}${report.academic_year ? ` ${report.academic_year}` : ''}` : 'Not yet released';
            const key = `${report.child_id}-${report.term}-${report.academic_year}`;
            const selected = String(selectedChildId || '') === String(child.child_id);
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-white">{termLabel}</p>
                  <p className="text-[11px] text-slate-400">
                    {report.release_status === 'released' ? 'Released' : 'Waiting for school release'}
                    {report.release_status === 'released' && report.overall_average != null ? ` · ${report.overall_average}%` : ''}
                  </p>
                </div>
                {report.download_available && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(child.child_id, termLabel)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${selected ? 'bg-white/10 text-white' : 'bg-teal-600 text-white'}`}
                    >
                      <FileCheck className="w-3.5 h-3.5 inline mr-1" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadReport(report)}
                      disabled={downloadingId === key}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 text-white disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 inline mr-1" />
                      {downloadingId === key ? 'Downloading' : 'Download'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
