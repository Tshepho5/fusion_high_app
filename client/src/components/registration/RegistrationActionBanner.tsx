import React, { useEffect, useState } from 'react';
import { FileCheck2, ArrowRight, Download, Clock } from 'lucide-react';
import { learnerRegistrationService, applicationTrackingService } from '../../services/api';

interface RegistrationActionBannerProps {
  onOpenRegistration: (applicationId?: number) => void;
}

export const RegistrationActionBanner: React.FC<RegistrationActionBannerProps> = ({
  onOpenRegistration
}) => {
  const [summary, setSummary] = useState<{
    pendingApps: any[];
    docRequestApps: any[];
    trackedApps: any[];
    openDeregs: number;
    hasAny: boolean;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      learnerRegistrationService.getMyRegistrations(),
      applicationTrackingService.getMyApplications()
    ])
      .then(([regRes, trackRes]) => {
        if (!active) return;
        const regData = regRes.status === 'fulfilled' ? regRes.value : null;
        const trackData = trackRes.status === 'fulfilled' ? trackRes.value : null;
        const apps = Array.isArray(regData?.applications) ? regData.applications : [];
        const pendingApps = apps.filter((a: any) => a.requires_registration);
        const trackedApps = Array.isArray(trackData?.applications) ? trackData.applications : [];
        const docRequestApps = trackedApps.filter(
          (a: any) => Number(a.outstanding_document_requests_count || 0) > 0 || a.status === 'documents_requested'
        );
        const deregs = Array.isArray(regData?.deregistration_requests) ? regData.deregistration_requests : [];
        const openDeregs = deregs.filter((r: any) =>
          ['pending_teacher_review', 'pending_admin_approval'].includes(String(r.status || '').toLowerCase())
        ).length;
        const activeNonEnrolled = trackedApps.filter((a: any) => !['enrolled', 'withdrawn', 'cancelled'].includes(a.status));
        setSummary({
          pendingApps,
          docRequestApps,
          trackedApps: activeNonEnrolled,
          openDeregs,
          hasAny: pendingApps.length > 0 || docRequestApps.length > 0 || activeNonEnrolled.length > 0 || openDeregs > 0
        });
      })
      .catch(() => {
        // Silent if unauthenticated or no records
      });
    return () => {
      active = false;
    };
  }, []);

  if (!summary || !summary.hasAny) return null;

  const primaryPending = summary.pendingApps[0] || null;
  const primaryDocReq = !primaryPending ? (summary.docRequestApps[0] || null) : null;
  const primaryTracked = !primaryPending && !primaryDocReq ? (summary.trackedApps[0] || null) : null;

  const handleDownload = async () => {
    if (!primaryPending) return;
    setDownloading(true);
    try {
      const blob = await learnerRegistrationService.downloadAcceptanceLetterBlob(primaryPending.application_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Acceptance_Letter_${primaryPending.application_number || primaryPending.application_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (_) {
      // Fall back to opening the registration screen
      onOpenRegistration(primaryPending.application_id);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="p-4 md:p-5 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-[#168BFF]/40 shadow-sm backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-[#168BFF]/15 text-[#168BFF] border border-[#168BFF]/30 shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                {primaryPending
                  ? 'Admission Approved — Complete Learner Registration'
                  : primaryDocReq
                  ? 'Additional Documentation Requested by School'
                  : primaryTracked
                  ? `Admission Application In Progress (${primaryTracked.status_label})`
                  : 'Controlled Deregistration / Transfer In Progress'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Clock className="w-3 h-3" />
                {primaryPending || primaryDocReq ? 'Action Required' : 'Live Status'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {primaryPending
                ? `${primaryPending.learner_name}${primaryPending.learner_number ? ` (Learner No: ${primaryPending.learner_number})` : ''} was accepted at ${primaryPending.school_name} for Grade ${primaryPending.grade} (${primaryPending.academic_year}). Select subjects, review class allocation, and accept the registration terms inside your dashboard.`
                : primaryDocReq
                ? `${primaryDocReq.school_name} requested additional documents for ${primaryDocReq.learner_name} (Ref: ${primaryDocReq.application_number}). Upload the requested files securely in your application tracker.`
                : primaryTracked
                ? `${primaryTracked.learner_name} — ${primaryTracked.school_name} Grade ${primaryTracked.grade} (${primaryTracked.academic_year}), Ref: ${primaryTracked.application_number}.`
                : `You have ${summary.openDeregs} active deregistration or transfer request(s) awaiting school review.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {primaryPending && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Preparing PDF...' : 'Acceptance Letter'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenRegistration((primaryPending || primaryDocReq || primaryTracked)?.application_id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#168BFF] hover:bg-[#0878E8] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            <span>{primaryPending ? 'Complete Registration' : primaryDocReq ? 'Upload Documents' : 'Track Application'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
