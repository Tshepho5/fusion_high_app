import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Building2,
  RefreshCw,
  ArrowRight,
  FileCheck2,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { applicationTrackingService } from '../../services/api';

interface ApplicantTrackingPanelProps {
  roleLabel?: 'Parent' | 'Applicant' | 'Learner';
  isRestrictedMode?: boolean;
  onStartRegistration?: (applicationId: number) => void;
}

const DOC_TYPE_OPTIONS = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'learner_id', label: 'Learner ID / Passport' },
  { value: 'parent_id', label: 'Parent / Guardian ID' },
  { value: 'proof_of_residence', label: 'Proof of Residence' },
  { value: 'report_card', label: 'Latest School Report Card' },
  { value: 'transfer_card', label: 'School Transfer Card' },
  { value: 'clinic_card', label: 'Clinic / Immunisation Card' },
  { value: 'medical_certificate', label: 'Medical / Special Needs Document' },
  { value: 'supporting_document', label: 'Other Supporting Document' }
];

function statusStyle(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'approved':
    case 'enrollment_pending':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'enrolled':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
    case 'documents_requested':
    case 'action_required':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'rejected':
    case 'declined':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    default:
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
  }
}

export const ApplicantTrackingPanel: React.FC<ApplicantTrackingPanelProps> = ({
  roleLabel = 'Parent',
  isRestrictedMode = false,
  onStartRegistration
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);

  // Per-application document upload state
  const [uploadingAppId, setUploadingAppId] = useState<number | null>(null);
  const [uploadRequestId, setUploadRequestId] = useState<number | null>(null);
  const [uploadDocType, setUploadDocType] = useState<string>('supporting_document');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await applicationTrackingService.getMyApplications();
      setApplications(Array.isArray(res?.applications) ? res.applications : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load your admission application tracking records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleUploadSubmit = async (e: React.FormEvent, applicationId: number) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadFeedback({ type: 'error', text: 'Select a PDF, JPG, PNG, or WebP file before uploading.' });
      return;
    }
    setUploadBusy(true);
    setUploadFeedback(null);
    try {
      const fd = new FormData();
      fd.append('document', uploadFile);
      fd.append('document_type', uploadDocType);
      if (uploadRequestId) fd.append('request_id', String(uploadRequestId));
      const res = await applicationTrackingService.uploadDocument(applicationId, fd);
      setUploadFeedback({
        type: 'success',
        text: res?.message || 'Document uploaded securely and school reviewers have been notified.'
      });
      setUploadFile(null);
      setUploadingAppId(null);
      setUploadRequestId(null);
      await loadApplications();
    } catch (err: any) {
      setUploadFeedback({
        type: 'error',
        text: err?.response?.data?.error || 'Document upload failed. Check file type (PDF/JPG/PNG/WebP) and size (max 15MB).'
      });
    } finally {
      setUploadBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-slate-200 dark:border-white/10 text-center">
        <RefreshCw className="w-5 h-5 animate-spin text-[#168BFF] mx-auto mb-2" />
        <p className="text-xs text-slate-600 dark:text-slate-300">Loading your real-time application tracking records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <section className="p-5 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-slate-200/90 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#168BFF]/15 text-[#168BFF] border border-[#168BFF]/30">
                <FileText className="w-3.5 h-3.5" />
                {isRestrictedMode ? 'Restricted Applicant Dashboard' : `${roleLabel} Application Tracker`}
              </span>
              {isRestrictedMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Full Learner Modules Unlock After Registration
                </span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
              Admission Application Progress &amp; Documents
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl">
              Track live school review status, view your application reference and assigned Learner Number, upload requested supporting documents securely, and proceed to Learner Registration once approved.
            </p>
          </div>
          <button
            type="button"
            onClick={loadApplications}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Status
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {uploadFeedback && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {uploadFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{uploadFeedback.text}</span>
          </div>
        )}
      </section>

      {applications.length === 0 ? (
        <div className="p-6 rounded-3xl bg-white/85 dark:bg-[#0D1520]/85 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300">
          No admission applications are currently linked to this account. Applications submitted with your email address or ID number appear here automatically.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const openReqs = (app.document_requests || []).filter((r: any) =>
              ['requested', 'rejected'].includes(String(r.status || '').toLowerCase())
            );
            const isUploadOpen = uploadingAppId === app.application_id;
            return (
              <article
                key={app.application_id}
                className="p-5 md:p-6 rounded-3xl bg-white/95 dark:bg-[#0D1520]/95 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4"
              >
                {/* Top Summary */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                        {app.learner_name}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusStyle(app.status)}`}>
                        {app.status_label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                      <Building2 className="w-3.5 h-3.5 text-[#168BFF]" />
                      <strong>{app.school_name}</strong>
                      <span>&bull; Grade {app.grade} ({app.academic_year})</span>
                      {app.stream && <span>&bull; Stream: {app.stream}</span>}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>App Ref: <strong className="text-slate-800 dark:text-slate-200">{app.application_number}</strong></span>
                      {app.learner_number && (
                        <span>
                          Learner No:{' '}
                          <strong className="text-[#168BFF]">{app.learner_number}</strong>
                        </span>
                      )}
                      {app.submitted_at && (
                        <span>Submitted: {new Date(app.submitted_at).toLocaleDateString('en-ZA')}</span>
                      )}
                    </div>
                  </div>

                  {app.requires_registration && onStartRegistration && (
                    <button
                      type="button"
                      onClick={() => onStartRegistration(Number(app.application_id))}
                      className="self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Complete Learner Registration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Next Action / Decision Callout */}
                {app.next_action && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                      app.next_action.code === 'UPLOAD_DOCUMENTS'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                        : app.next_action.code === 'APPLICATION_DECLINED'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
                        : app.next_action.code === 'COMPLETE_REGISTRATION'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-200'
                    }`}
                  >
                    {app.next_action.code === 'APPLICATION_DECLINED' ? (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : app.next_action.code === 'COMPLETE_REGISTRATION' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{app.next_action.label}</p>
                      <p className="mt-0.5 opacity-90">{app.next_action.detail}</p>
                    </div>
                  </div>
                )}

                {/* Outstanding School Documentation Requests */}
                {openReqs.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Outstanding School Documentation Requests ({openReqs.length})
                      </h4>
                    </div>
                    {openReqs.map((req: any) => {
                      const reqDocs = Array.isArray(req.required_documents) ? req.required_documents : [];
                      return (
                        <div key={req.id} className="p-3 rounded-xl bg-white/80 dark:bg-black/20 border border-amber-500/20 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Required: {reqDocs.map((d: any) => d.label || d.document_type || d).join(', ') || req.descriptions}
                            </span>
                            {req.deadline && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-300 font-semibold">
                                <Calendar className="w-3 h-3" />
                                Due {new Date(req.deadline).toLocaleDateString('en-ZA')}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{req.instructions}</p>
                          {req.review_notes && (
                            <p className="text-rose-600 dark:text-rose-300 font-semibold">
                              Reviewer Note: {req.review_notes}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setUploadingAppId(app.application_id);
                              setUploadRequestId(req.id);
                              setUploadDocType(reqDocs[0]?.document_type || 'supporting_document');
                              setUploadFeedback(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#168BFF] hover:bg-[#0878E8] text-white text-xs font-bold cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload Requested Document
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Secure Upload Form */}
                {isUploadOpen && (
                  <form
                    onSubmit={(e) => handleUploadSubmit(e, app.application_id)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-[#168BFF]/40 space-y-3 text-xs"
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white">Upload Supporting Document</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block space-y-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Document Type</span>
                        <select
                          value={uploadDocType}
                          onChange={(e) => setUploadDocType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#09101A] border border-slate-200 dark:border-white/15"
                        >
                          {DOC_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">File (PDF, JPG, PNG, WebP — max 15MB)</span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-[#09101A] border border-slate-200 dark:border-white/15"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={uploadBusy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploadBusy ? 'Uploading...' : 'Submit Document'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadingAppId(null);
                          setUploadRequestId(null);
                          setUploadFile(null);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Submitted Documents & Real Status Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Submitted Documents ({(app.documents || []).length})
                      </h4>
                      {!['enrolled', 'rejected', 'withdrawn', 'cancelled'].includes(app.status) && !isUploadOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setUploadingAppId(app.application_id);
                            setUploadRequestId(openReqs[0]?.id || null);
                            setUploadFeedback(null);
                          }}
                          className="text-[11px] font-bold text-[#168BFF] hover:underline cursor-pointer"
                        >
                          + Upload Document
                        </button>
                      )}
                    </div>
                    {(app.documents || []).length === 0 ? (
                      <p className="text-xs text-slate-500">No documents uploaded yet.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {(app.documents || []).map((doc: any) => (
                          <li key={doc.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{doc.file_name || doc.document_type}</p>
                              <p className="text-[10px] text-slate-500">
                                {doc.document_type} &bull; {doc.review_status || (doc.is_verified ? 'verified' : 'submitted')}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Application Timeline ({(app.timeline || []).length} events)
                    </h4>
                    {(app.timeline || []).length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Submitted on {app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-ZA') : 'record date'}.
                      </p>
                    ) : (
                      <ol className="space-y-2 text-xs">
                        {(app.timeline || []).map((ev: any) => (
                          <li key={ev.id} className="border-l-2 border-[#168BFF]/50 pl-3">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{ev.to_status_label || ev.to_status}</p>
                            {ev.reason && <p className="text-[11px] text-slate-600 dark:text-slate-300">{ev.reason}</p>}
                            <p className="text-[10px] text-slate-400">{new Date(ev.created_at).toLocaleString('en-ZA')}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
