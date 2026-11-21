import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileCheck2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  GraduationCap,
  BookOpen,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Clock,
  RefreshCw,
  LogOut,
  FileText,
  XCircle,
  Lock
} from 'lucide-react';
import { learnerRegistrationService } from '../../services/api';
import { ApplicantTrackingPanel } from '../applications/ApplicantTrackingPanel';

interface LearnerRegistrationPanelProps {
  initialApplicationId?: string | number | null;
  roleLabel?: 'Parent' | 'Learner';
  onRegistrationCompleted?: () => void;
}

export const LearnerRegistrationPanel: React.FC<LearnerRegistrationPanelProps> = ({
  initialApplicationId = null,
  roleLabel = 'Parent',
  onRegistrationCompleted
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    applications: any[];
    pending_count: number;
    active_enrollments: any[];
    deregistration_requests: any[];
  }>({
    applications: [],
    pending_count: 0,
    active_enrollments: [],
    deregistration_requests: []
  });

  // Active registration context
  const [selectedAppId, setSelectedAppId] = useState<number | null>(
    initialApplicationId ? Number(initialApplicationId) : null
  );
  const [contextLoading, setContextLoading] = useState(false);
  const [context, setContext] = useState<any | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  // Registration form state
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [homeLanguage, setHomeLanguage] = useState<string>('');
  const [firstAdditionalLanguage, setFirstAdditionalLanguage] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false); // STRICTLY UNCHECKED BY DEFAULT
  const [showReviewStep, setShowReviewStep] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Deregistration / Transfer form state
  const [deregChildId, setDeregChildId] = useState<number | null>(null);
  const [deregType, setDeregType] = useState<'deregistration' | 'transfer'>('deregistration');
  const [deregTargetSchool, setDeregTargetSchool] = useState<string>('');
  const [deregReason, setDeregReason] = useState<string>('');
  const [deregSubmitting, setDeregSubmitting] = useState<boolean>(false);
  const [deregMessage, setDeregMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadMyRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await learnerRegistrationService.getMyRegistrations();
      const normalized = {
        applications: Array.isArray(res?.applications) ? res.applications : [],
        pending_count: Number(res?.pending_count || 0),
        active_enrollments: Array.isArray(res?.active_enrollments) ? res.active_enrollments : [],
        deregistration_requests: Array.isArray(res?.deregistration_requests) ? res.deregistration_requests : []
      };
      setData(normalized);

      if (!selectedAppId && initialApplicationId) {
        setSelectedAppId(Number(initialApplicationId));
      } else if (!selectedAppId) {
        const firstPending = normalized.applications.find((a: any) => a.requires_registration);
        if (firstPending) {
          setSelectedAppId(Number(firstPending.application_id));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load learner registration records.');
    } finally {
      setLoading(false);
    }
  }, [initialApplicationId, selectedAppId]);

  useEffect(() => {
    loadMyRegistrations();
  }, [loadMyRegistrations]);

  const loadContext = useCallback(async (appId: number) => {
    setContextLoading(true);
    setContextError(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setShowReviewStep(false);
    setTermsAccepted(false); // Always reset checkbox to unchecked on open!
    try {
      const ctx = await learnerRegistrationService.getRegistrationContext(appId);
      setContext(ctx);

      // Initialize subjects strictly from school's real configured required subjects or existing selection
      const existingSelected = Array.isArray(ctx?.existing_registration?.selected_subjects)
        ? ctx.existing_registration.selected_subjects
        : [];
      const offerings = Array.isArray(ctx?.subject_configuration?.offerings)
        ? ctx.subject_configuration.offerings
        : [];
      const requiredNames = offerings
        .filter((o: any) => o.is_required)
        .map((o: any) => o.subject_name);

      setSelectedSubjects(existingSelected.length > 0 ? existingSelected : requiredNames);
      setHomeLanguage(ctx?.application?.home_language || '');
      setFirstAdditionalLanguage(ctx?.application?.first_additional_language || '');

      const streams = Array.isArray(ctx?.subject_configuration?.streams)
        ? ctx.subject_configuration.streams
        : [];
      setSelectedStreamId(streams.length === 1 ? Number(streams[0].id) : null);
    } catch (err: any) {
      setContext(null);
      setContextError(err?.response?.data?.error || 'Could not load registration details for this application.');
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAppId && Number.isFinite(selectedAppId)) {
      loadContext(selectedAppId);
    }
  }, [selectedAppId, loadContext]);

  const handleDownloadLetter = async (applicationId: number, appNumber?: string) => {
    setDownloadingId(applicationId);
    try {
      const blob = await learnerRegistrationService.downloadAcceptanceLetterBlob(applicationId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Acceptance_Letter_${String(appNumber || applicationId).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to download the official acceptance letter PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const offerings = useMemo(
    () => (Array.isArray(context?.subject_configuration?.offerings) ? context.subject_configuration.offerings : []),
    [context]
  );
  const streams = useMemo(
    () => (Array.isArray(context?.subject_configuration?.streams) ? context.subject_configuration.streams : []),
    [context]
  );
  const fallbackOffered = useMemo(
    () => (Array.isArray(context?.subject_configuration?.fallback_offered_subjects) ? context.subject_configuration.fallback_offered_subjects : []),
    [context]
  );

  const selectedStreamObj = useMemo(
    () => streams.find((s: any) => Number(s.id) === Number(selectedStreamId)) || null,
    [streams, selectedStreamId]
  );

  const languageOfferings = useMemo(
    () => offerings.filter((o: any) => String(o.category || '').toLowerCase() === 'language'),
    [offerings]
  );

  const toggleSubject = (subjectName: string, isRequired = false) => {
    if (isRequired) return;
    setSelectedSubjects((prev) => {
      if (prev.includes(subjectName)) {
        return prev.filter((s) => s !== subjectName);
      }
      // Prevent selecting both Mathematics and Mathematical Literacy simultaneously
      const lower = subjectName.toLowerCase();
      let next = [...prev];
      if (lower === 'mathematics') {
        next = next.filter((s) => s.toLowerCase() !== 'mathematical literacy');
      } else if (lower === 'mathematical literacy') {
        next = next.filter((s) => s.toLowerCase() !== 'mathematics');
      }
      return [...next, subjectName];
    });
  };

  const handleApplyStream = (streamIdVal: number | null) => {
    setSelectedStreamId(streamIdVal);
    const stream = streams.find((s: any) => Number(s.id) === Number(streamIdVal));
    if (!stream) return;
    const reqNames = offerings.filter((o: any) => o.is_required).map((o: any) => o.subject_name);
    const streamSubjects = [
      ...reqNames,
      stream.mathematics_option,
      ...(Array.isArray(stream.electives) ? stream.electives.slice(0, 3) : [])
    ].filter(Boolean);
    setSelectedSubjects(Array.from(new Set(streamSubjects)));
  };

  const handleSubmitRegistration = async () => {
    if (!selectedAppId || !context) return;
    if (!termsAccepted) {
      setSubmitError('You must tick the Terms & Conditions box before confirming learner registration.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const finalSubjects = Array.from(
        new Set([
          ...selectedSubjects,
          ...(homeLanguage ? [homeLanguage] : []),
          ...(firstAdditionalLanguage ? [firstAdditionalLanguage] : [])
        ].filter(Boolean))
      );

      const res = await learnerRegistrationService.completeRegistration(selectedAppId, {
        school_id: context.school?.id,
        grade: context.application?.grade,
        academic_year: context.application?.academic_year,
        academic_stream_id: selectedStreamId || undefined,
        home_language: homeLanguage || undefined,
        first_additional_language: firstAdditionalLanguage || undefined,
        selected_subjects: finalSubjects,
        terms_accepted: true,
        terms_version: context.terms?.version
      });

      setSubmitSuccess(res?.message || 'Learner registration completed successfully.');
      setShowReviewStep(false);
      await loadMyRegistrations();
      await loadContext(selectedAppId);
      if (onRegistrationCompleted) onRegistrationCompleted();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || 'Could not complete learner registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDeregistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deregChildId) return;
    if (deregReason.trim().length < 5) {
      setDeregMessage({ type: 'error', text: 'Please enter a clear reason (at least 5 characters).' });
      return;
    }
    setDeregSubmitting(true);
    setDeregMessage(null);
    try {
      const res = await learnerRegistrationService.createDeregistration({
        child_id: deregChildId,
        request_type: deregType,
        reason: deregReason.trim(),
        target_school_name: deregType === 'transfer' && deregTargetSchool.trim() ? deregTargetSchool.trim() : undefined
      });
      setDeregMessage({
        type: 'success',
        text: res?.message || 'Deregistration request submitted for Class Teacher review and Principal approval.'
      });
      setDeregReason('');
      setDeregTargetSchool('');
      setDeregChildId(null);
      await loadMyRegistrations();
    } catch (err: any) {
      setDeregMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to submit deregistration request.'
      });
    } finally {
      setDeregSubmitting(false);
    }
  };

  const formatDeregStatus = (status: string) => {
    switch (String(status || '').toLowerCase()) {
      case 'pending_teacher_review':
        return { label: 'Pending Class Teacher Review', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
      case 'pending_admin_approval':
        return { label: 'Pending Principal / Admin Approval', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' };
      case 'approved':
        return { label: 'Approved (Historical Records Preserved)', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
      case 'rejected':
        return { label: 'Declined (Enrollment Active)', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' };
      default:
        return { label: status, cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' };
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-white/85 dark:bg-[#0D1520]/85 border border-slate-200 dark:border-white/10 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#168BFF] mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading your school acceptance &amp; registration records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-slate-900 dark:text-slate-100">
      {/* Header Summary Card */}
      <section className="p-5 md:p-6 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <FileCheck2 className="w-3.5 h-3.5" />
                Integrated {roleLabel} Registration
              </span>
              {data.pending_count > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3" />
                  {data.pending_count} Awaiting Registration
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
              School Acceptance, Learner Registration &amp; Transfers
            </h2>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              Download official acceptance letters, complete learner registration with your accepting school&apos;s real subject offerings and allocated class, or submit a controlled deregistration/transfer request.
            </p>
          </div>
          <button
            type="button"
            onClick={loadMyRegistrations}
            className="self-start md:self-center inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Full Application Tracking & Documentation Uploads Across All Statuses */}
      <ApplicantTrackingPanel
        roleLabel={roleLabel}
        onStartRegistration={(appId) => setSelectedAppId(Number(appId))}
      />

      {/* Accepted Applications Cards */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          Accepted School Applications ({data.applications.length})
        </h3>
        {data.applications.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#0D1520]/80 border border-slate-200/90 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300">
            No approved admission applications awaiting registration were found on your account. Once a school approves your application, it will appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.applications.map((app) => {
              const isSelected = Number(selectedAppId) === Number(app.application_id);
              const isCompleted = app.registration_status === 'completed';
              return (
                <div
                  key={app.application_id}
                  className={`p-5 rounded-3xl border transition-all backdrop-blur-md ${
                    isSelected
                      ? 'bg-white dark:bg-[#101B29] border-[#168BFF] ring-2 ring-[#168BFF]/20 shadow-md'
                      : 'bg-white/85 dark:bg-[#0D1520]/85 border-slate-200/90 dark:border-white/10 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          {app.learner_name}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isCompleted ? 'Registration Completed' : 'Registration Required'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#168BFF]" />
                        <strong>{app.school_name}</strong>
                        <span>&bull; Grade {app.grade} ({app.academic_year})</span>
                      </p>
                      <p className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        App Ref: {app.application_number}
                        {app.learner_number ? ` • Learner No: ${app.learner_number}` : ''}
                        {` • Letter Ref: ${app.acceptance_reference}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Class Allocation:{' '}
                        {app.class_name ? (
                          <strong className="text-emerald-700 dark:text-emerald-300">
                            {app.class_name}
                            {app.class_teacher_name ? ` (Class Teacher: ${app.class_teacher_name})` : ''}
                          </strong>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">
                            Pending school administration
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadLetter(app.application_id, app.application_number)}
                      disabled={downloadingId === app.application_id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {downloadingId === app.application_id ? 'Preparing PDF...' : 'Acceptance Letter (PDF)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAppId(Number(app.application_id))}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#168BFF] hover:bg-[#0878E8] text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      <span>{isCompleted ? 'View Confirmation' : 'Complete Learner Registration'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Registration Workflow Form */}
      {selectedAppId && (
        <section className="p-5 md:p-6 rounded-3xl bg-white/95 dark:bg-[#0D1520]/95 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
          {contextLoading ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-5 h-5 animate-spin text-[#168BFF] mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifying school offerings, class allocation, and registration eligibility...</p>
            </div>
          ) : contextError ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{contextError}</span>
            </div>
          ) : context ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Learner Registration &mdash; {context.learner?.full_name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {context.school?.name} &bull; Grade {context.application?.grade} &bull; {context.application?.academic_year} Academic Year
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadLetter(context.application.id, context.application.application_number)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Acceptance Letter
                </button>
              </div>

              {submitSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {submitError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Eligibility Blocking Banner (Conflict / Pending Class / Unconfigured Subjects / Already Completed) */}
              {!context.eligibility?.eligible && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-medium flex items-start gap-2.5 ${
                    context.eligibility?.alreadyRegistered
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {context.eligibility?.alreadyRegistered ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">
                      {context.eligibility?.alreadyRegistered
                        ? 'Registration Confirmed & Active'
                        : 'Registration Action Blocked'}
                    </p>
                    <p>{context.eligibility?.reason}</p>
                  </div>
                </div>
              )}

              {/* 1. Read-only Verified Identity & School Lock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Lock className="w-3.5 h-3.5 text-[#168BFF]" />
                    Verified Learner &amp; Guardian Details
                  </div>
                  <dl className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <div><dt className="inline font-semibold">Learner:</dt> <dd className="inline">{context.learner?.full_name}</dd></div>
                    {context.learner?.id_number_masked && (
                      <div><dt className="inline font-semibold">ID Reference:</dt> <dd className="inline font-mono">{context.learner.id_number_masked}</dd></div>
                    )}
                    <div><dt className="inline font-semibold">Guardian:</dt> <dd className="inline">{context.learner?.guardian_name}</dd></div>
                    {context.learner?.guardian_email && (
                      <div><dt className="inline font-semibold">Guardian Email:</dt> <dd className="inline">{context.learner.guardian_email}</dd></div>
                    )}
                  </dl>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    Accepting School &amp; Class Allocation (Locked)
                  </div>
                  <dl className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <div><dt className="inline font-semibold">School:</dt> <dd className="inline">{context.school?.name}</dd></div>
                    <div><dt className="inline font-semibold">Grade &amp; Year:</dt> <dd className="inline">Grade {context.application?.grade} &bull; {context.application?.academic_year}</dd></div>
                    <div>
                      <dt className="inline font-semibold">Allocated Class:</dt>{' '}
                      <dd className="inline">
                        {context.class_allocation?.assigned
                          ? context.class_allocation.class_name
                          : 'Class allocation pending school administration'}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Assigned Class Teacher:</dt>{' '}
                      <dd className="inline">
                        {context.class_allocation?.assigned
                          ? (context.class_allocation.class_teacher_name || 'Assigned by School Administration')
                          : 'Pending school administration'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 2. Dynamic Subject Selection (Driven Strictly by Real School Configuration) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#168BFF]" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Subject Selection ({context.school?.name} &mdash; Grade {context.application?.grade})
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Selected: {selectedSubjects.length} subject{selectedSubjects.length === 1 ? '' : 's'}
                  </span>
                </div>

                {!context.subject_configuration?.configured ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
                    Subject offerings have not yet been configured by {context.school?.name} for Grade {context.application?.grade} ({context.application?.academic_year}). Please contact school administration.
                  </div>
                ) : context.eligibility?.alreadyRegistered ? (
                  <div className="flex flex-wrap gap-2">
                    {(context.existing_registration?.selected_subjects || []).map((subj: string) => (
                      <span
                        key={subj}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      >
                        {subj}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Published Streams selector when configured */}
                    {streams.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Academic Stream
                          </label>
                          <select
                            value={selectedStreamId ?? ''}
                            onChange={(e) => handleApplyStream(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="">Choose school stream...</option>
                            {streams.map((st: any) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.mathematics_option})
                              </option>
                            ))}
                          </select>
                        </div>

                        {languageOfferings.length > 0 && (
                          <>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                Home Language
                              </label>
                              <select
                                value={homeLanguage}
                                onChange={(e) => setHomeLanguage(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                              >
                                <option value="">Select Home Language...</option>
                                {languageOfferings.map((l: any) => (
                                  <option key={l.subject_name} value={l.subject_name}>{l.subject_name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                First Additional Language
                              </label>
                              <select
                                value={firstAdditionalLanguage}
                                onChange={(e) => setFirstAdditionalLanguage(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                              >
                                <option value="">Select First Additional Language...</option>
                                {languageOfferings
                                  .filter((l: any) => l.subject_name !== homeLanguage)
                                  .map((l: any) => (
                                    <option key={l.subject_name} value={l.subject_name}>{l.subject_name}</option>
                                  ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Real School Offerings Checkboxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {(offerings.length > 0
                        ? offerings
                        : fallbackOffered.map((name: string) => ({
                            subject_name: name,
                            category: 'offered',
                            is_required: name.toLowerCase() === 'life orientation'
                          }))
                      ).map((item: any) => {
                        const checked = selectedSubjects.includes(item.subject_name);
                        const isRequired = Boolean(item.is_required);
                        return (
                          <label
                            key={item.subject_name}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#168BFF]/10 border-[#168BFF]/50 text-slate-900 dark:text-white'
                                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isRequired}
                              onChange={() => toggleSubject(item.subject_name, isRequired)}
                              className="rounded border-slate-300 text-[#168BFF] focus:ring-[#168BFF]"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold block truncate">{item.subject_name}</span>
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {isRequired ? 'Compulsory' : (item.category || 'School Offered')}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Explicit Terms & Conditions (STRICTLY UNCHECKED BY DEFAULT) */}
              {context.eligibility?.eligible && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Learner Registration Terms &amp; Conditions
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Version: {context.terms?.version}
                    </span>
                  </div>

                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {(context.terms?.clauses || []).map((clause: string, idx: number) => (
                      <li key={idx}>{clause}</li>
                    ))}
                  </ol>

                  <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      I have read, understood, and explicitly accept the Learner Registration Terms &amp; Conditions ({context.terms?.version}).
                    </span>
                  </label>
                </div>
              )}

              {/* 4. Review Summary & Submit Controls */}
              {context.eligibility?.eligible && (
                <div className="space-y-3">
                  {showReviewStep && (
                    <div className="p-4 rounded-2xl bg-[#168BFF]/10 border border-[#168BFF]/30 text-xs space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        Registration Confirmation Summary
                      </p>
                      <p className="text-slate-700 dark:text-slate-200">
                        <strong>{context.learner?.full_name}</strong> will be officially registered at{' '}
                        <strong>{context.school?.name}</strong> in{' '}
                        <strong>Grade {context.application?.grade} ({context.class_allocation?.class_name})</strong>
                        {selectedStreamObj ? ` (${selectedStreamObj.name})` : ''} with{' '}
                        <strong>{selectedSubjects.length} selected subject(s)</strong>.
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Subjects: {Array.from(new Set([...selectedSubjects, homeLanguage, firstAdditionalLanguage].filter(Boolean))).join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {!showReviewStep ? (
                      <button
                        type="button"
                        disabled={!termsAccepted || selectedSubjects.length === 0}
                        onClick={() => setShowReviewStep(true)}
                        className="px-5 py-2.5 rounded-xl bg-[#168BFF] hover:bg-[#0878E8] disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        Review Registration Summary
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowReviewStep(false)}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                        >
                          Edit Selection
                        </button>
                        <button
                          type="button"
                          disabled={submitting || !termsAccepted}
                          onClick={handleSubmitRegistration}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {submitting ? 'Confirming Registration...' : 'Confirm & Complete Learner Registration'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}

      {/* Controlled Deregistration & School Transfer Section */}
      <section className="p-5 md:p-6 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LogOut className="w-4 h-4 text-amber-500" />
              Controlled Deregistration &amp; School Transfer
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              A learner may hold only one active school registration per academic year. Deregistration requires Class Teacher review and Principal approval; all historical marks, attendance, and report cards remain permanently preserved.
            </p>
          </div>
        </div>

        {deregMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
              deregMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {deregMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span>{deregMessage.text}</span>
          </div>
        )}

        {/* Active Enrollments Eligible for Controlled Deregistration */}
        {data.active_enrollments.filter((c) => c.is_active !== false).length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.active_enrollments
                .filter((c) => c.is_active !== false)
                .map((child) => {
                  const hasOpenRequest = data.deregistration_requests.some(
                    (r) =>
                      Number(r.child_id) === Number(child.child_id) &&
                      ['pending_teacher_review', 'pending_admin_approval'].includes(String(r.status).toLowerCase())
                  );
                  return (
                    <div
                      key={child.child_id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {child.full_name} {child.surname}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {child.school_name || 'Current School'} &bull; Grade {child.grade}
                          {child.class_name ? ` (${child.class_name})` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={hasOpenRequest}
                        onClick={() => setDeregChildId(Number(child.child_id))}
                        className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-50 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                      >
                        {hasOpenRequest ? 'Request Pending' : 'Request Deregistration'}
                      </button>
                    </div>
                  );
                })}
            </div>

            {deregChildId && (
              <form
                onSubmit={handleSubmitDeregistration}
                className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Submit Controlled Deregistration / Transfer Request
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeregChildId(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Request Type
                    </label>
                    <select
                      value={deregType}
                      onChange={(e) => setDeregType(e.target.value as 'deregistration' | 'transfer')}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="deregistration">Formal Deregistration</option>
                      <option value="transfer">School Transfer</option>
                    </select>
                  </div>
                  {deregType === 'transfer' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Destination School (Optional)
                      </label>
                      <input
                        type="text"
                        value={deregTargetSchool}
                        onChange={(e) => setDeregTargetSchool(e.target.value)}
                        placeholder="Name of receiving school"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Reason for Deregistration / Transfer *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={deregReason}
                    onChange={(e) => setDeregReason(e.target.value)}
                    placeholder="Provide the reason for leaving or transferring schools..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={deregSubmitting}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {deregSubmitting ? 'Submitting...' : 'Submit Request for Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Deregistration History & Status Tracker */}
        {data.deregistration_requests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Deregistration &amp; Transfer Requests
            </h4>
            {data.deregistration_requests.map((req) => {
              const badge = formatDeregStatus(req.status);
              return (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {req.learner_first_name} {req.learner_surname} &bull; {req.school_name}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Type: <span className="capitalize font-semibold">{req.request_type}</span> &bull; Reason: {req.reason}
                    </p>
                    {req.admin_decision_notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Principal/Admin Note: {req.admin_decision_notes}
                      </p>
                    )}
                  </div>
                  <span className={`self-start sm:self-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
