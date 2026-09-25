import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  DollarSign,
  TrendingUp,
  Award,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  MapPin,
  FileCheck,
  XCircle,
  CheckCircle,
  Clock,
  Sparkles,
  Mail,
  FileText,
  Phone,
  BookOpen,
  Lock,
  Unlock,
  Key,
  ShieldAlert
} from 'lucide-react';
import { commandCenterService, schoolRegistrationService, systemControlService } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';

interface SchoolStat {
  id: number;
  name: string;
  slug: string;
  circuit: string;
  district: string;
  province: string;
  emis_number: string;
  principal_name: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  motto: string;
  learners_count: number;
  staff_count: number;
  classes_count: number;
  parents_count: number;
  total_invoiced: string;
  total_collected: string;
  avg_attendance_pct: string;
  subadmins: Array<{ id: number; name: string; email: string; phone: string }>;
}

interface MacroTotals {
  total_schools: number;
  total_learners: number;
  total_staff: number;
  total_classes: number;
  total_invoiced: number;
  total_collected: number;
  collection_rate_pct: number;
}

export const MultiSchoolCommandCenter: React.FC = () => {
  const { currentSchool, setSchoolBySlug } = useSchool();
  const [macroTotals, setMacroTotals] = useState<MacroTotals | null>(null);
  const [schools, setSchools] = useState<SchoolStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCircuit, setSelectedCircuit] = useState<string>('all');

  // Sub-navigation: Registered Campuses vs Accreditation Applications vs Executive Gatekeeper
  const [activeSubView, setActiveSubView] = useState<'campuses' | 'applications' | 'gatekeeper'>('campuses');
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState<boolean>(false);
  const [appFilterStatus, setAppFilterStatus] = useState<string>('all');
  
  // Executive Portal Control / Gatekeeper State
  const [portalControls, setPortalControls] = useState<Record<string, any>>({});
  const [loadingControls, setLoadingControls] = useState<boolean>(false);
  const [updatingControlId, setUpdatingControlId] = useState<string | null>(null);
  const [controlSuccessMsg, setControlSuccessMsg] = useState<string | null>(null);
  const [lockReasonInputs, setLockReasonInputs] = useState<Record<string, string>>({
    school_registration: 'School onboarding window is currently closed. Controlled by Geleza SA Executives.',
    user_registration: 'User registration is temporarily closed by Geleza SA Administrators.',
    parent_application: 'Application intake is currently closed by Geleza SA Administrators.'
  });

  // Review Decision Modal State
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'decline' | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Discrepancy in DBE EMIS or SACE Accreditation records');
  const [executiveNotes, setExecutiveNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commandCenterService.getCommandCenterStats();
      if (res.success) {
        setMacroTotals(res.macro_totals);
        setSchools(res.schools || []);
      }
    } catch (err: any) {
      console.error('Failed to load multi-school command center:', err);
      setError(err.response?.data?.error || err.message || 'Failed to retrieve multi-school analytics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const res = await schoolRegistrationService.getAllApplications();
      if (res.success) {
        setApplications(res.applications || []);
      }
    } catch (err: any) {
      console.error('Failed to load school applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchPortalControls = async () => {
    setLoadingControls(true);
    try {
      const res = await systemControlService.getPortalLocks();
      if (res.success && res.controls) {
        setPortalControls(res.controls);
        // Sync default reasons if present
        setLockReasonInputs(prev => ({
          ...prev,
          school_registration: res.controls.school_registration?.locked_reason || prev.school_registration,
          user_registration: res.controls.user_registration?.locked_reason || prev.user_registration,
          parent_application: res.controls.parent_application?.locked_reason || prev.parent_application
        }));
      }
    } catch (err: any) {
      console.error('Failed to fetch portal access controls:', err);
    } finally {
      setLoadingControls(false);
    }
  };

  const handleToggleLock = async (controlId: string, currentLocked: boolean) => {
    setUpdatingControlId(controlId);
    setControlSuccessMsg(null);
    try {
      const nextLockedState = !currentLocked;
      const customReason = lockReasonInputs[controlId] || undefined;
      const res = await systemControlService.updatePortalLock(controlId, nextLockedState, customReason);
      if (res.success && res.control) {
        setPortalControls(prev => ({
          ...prev,
          [controlId]: res.control
        }));
        setControlSuccessMsg(`Successfully ${nextLockedState ? 'LOCKED' : 'UNLOCKED'} "${res.control.name}".`);
        setTimeout(() => setControlSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to toggle portal lock:', err);
      alert(err.response?.data?.error || 'Failed to toggle portal control.');
    } finally {
      setUpdatingControlId(null);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchApplications();
    fetchPortalControls();
  }, []);

  const handleDecisionSubmit = async () => {
    if (!selectedApp || !reviewAction) return;
    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);
    try {
      const res = await schoolRegistrationService.reviewApplication(
        selectedApp.id,
        reviewAction,
        reviewAction === 'decline' ? declineReason : undefined,
        executiveNotes
      );
      if (res.success) {
        setReviewSuccessMsg(
          reviewAction === 'approve'
            ? `Accreditation approved for ${selectedApp.school_name}! School campus created and Principal credentials dispatched.`
            : `Application for ${selectedApp.school_name} has been declined. Advisory email dispatched.`
        );
        setSelectedApp(null);
        setReviewAction(null);
        setExecutiveNotes('');
        await fetchApplications();
        if (reviewAction === 'approve') {
          await fetchStats();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to submit accreditation decision.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const circuits = Array.from(new Set(schools.map(s => s.circuit).filter(Boolean)));

  const filteredSchools = schools.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.circuit || '').toLowerCase().includes(q) ||
      (s.district || '').toLowerCase().includes(q) ||
      (s.province || '').toLowerCase().includes(q) ||
      (s.principal_name || '').toLowerCase().includes(q);
    const matchesCircuit = selectedCircuit === 'all' || s.circuit === selectedCircuit;
    return matchesSearch && matchesCircuit;
  });

  const pendingAppsCount = applications.filter(a => a.status === 'pending').length;

  const filteredApplications = applications.filter(a => {
    if (appFilterStatus !== 'all' && a.status !== appFilterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (a.school_name || '').toLowerCase().includes(q) ||
        (a.emis_number || '').toLowerCase().includes(q) ||
        (a.principal_name || '').toLowerCase().includes(q) ||
        (a.province || '').toLowerCase().includes(q) ||
        (a.district || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider border border-purple-500/30 flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-400" />
              Main Executive Admin Hub
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2 mt-1">
            <Building2 className="w-6 h-6 text-brand-400" />
            Multi-School Command Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time comparative oversight across all 12 registered high schools in Limpopo & Gauteng provinces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {/* Sub-View Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-white/5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView('campuses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'campuses'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Registered Campuses ({schools.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubView('applications');
              fetchApplications();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubView === 'applications'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <span>Institutional Accreditation Queue</span>
            {pendingAppsCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                {pendingAppsCount} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveSubView('gatekeeper');
              fetchPortalControls();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubView === 'gatekeeper'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Executive Gatekeeper & Portal Controls</span>
            {portalControls.school_registration?.is_locked && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white">
                School Locked
              </span>
            )}
          </button>
        </div>

        {(reviewSuccessMsg || controlSuccessMsg) && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{reviewSuccessMsg || controlSuccessMsg}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: REGISTERED CAMPUSES & COMPARATIVE METRICS                         */}
      {/* ========================================================================= */}
      {activeSubView === 'campuses' && (
        <div className="space-y-6">
          {/* Macro System Overview Cards */}
          {macroTotals && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 via-surface-dark to-surface-dark border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300">Registered Institutions</span>
                  <Building2 className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-2xl font-extrabold font-mono text-white mt-2">{macroTotals.total_schools}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">Active DBE-compliant campuses</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/30 via-surface-dark to-surface-dark border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-300">Total Enrolled Learners</span>
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-2xl font-extrabold font-mono text-white mt-2">{macroTotals.total_learners}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">Verified student profiles</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-900/30 via-surface-dark to-surface-dark border border-brand-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-brand-300">Total Academic Staff</span>
                  <Briefcase className="w-4 h-4 text-brand-400" />
                </div>
                <p className="text-2xl font-extrabold font-mono text-white mt-2">{macroTotals.total_staff}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">Educators & staff profiles</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/30 via-surface-dark to-surface-dark border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">Total Fee Collections</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-extrabold font-mono text-white mt-2">
                  R{Number(macroTotals.total_collected).toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-400/80 mt-1 block">
                  {macroTotals.collection_rate_pct}% collection efficiency
                </span>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCircuit('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCircuit === 'all'
                    ? 'bg-purple-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All Circuits ({schools.length})
              </button>
              {circuits.map(circuit => (
                <button
                  key={circuit}
                  onClick={() => setSelectedCircuit(circuit)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCircuit === circuit
                      ? 'bg-purple-600 text-white shadow-glow-indigo'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {circuit}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by school name, district, principal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Comparative Schools Table */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl">
            {loading ? (
              <LoadingSpinner text="Retrieving multi-school analytics from PostgreSQL..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                      <th className="pb-3 px-3">School Institution</th>
                      <th className="pb-3 px-3">Circuit / District</th>
                      <th className="pb-3 px-3 text-center">Learners</th>
                      <th className="pb-3 px-3 text-center">Staff</th>
                      <th className="pb-3 px-3 text-center">Classes</th>
                      <th className="pb-3 px-3 text-center">Avg Attendance</th>
                      <th className="pb-3 px-3">Fee Status (Collected / Invoiced)</th>
                      <th className="pb-3 px-3">Appointed SubAdmins</th>
                      <th className="pb-3 px-3 text-right">Jurisdiction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSchools.map((sch) => {
                      const isCurrent = currentSchool?.id === sch.id;
                      return (
                        <tr
                          key={sch.id}
                          className={`hover:bg-white/5 transition-colors ${
                            isCurrent ? 'bg-purple-500/5' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              {sch.logo_url ? (
                                <img
                                  src={sch.logo_url}
                                  alt={sch.name}
                                  className="w-8 h-8 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shrink-0"
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                                  style={{ backgroundColor: sch.primary_color || '#3b82f6' }}
                                >
                                  {sch.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-extrabold text-white text-sm flex items-center gap-1.5">
                                  {sch.name}
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                                      Current View
                                    </span>
                                  )}
                                </p>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  EMIS: {sch.emis_number || 'Pending'} • Principal: {sch.principal_name || 'Acting'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-200">{sch.circuit || 'Circuit'}</span>
                            <span className="text-slate-500 block text-[10px]">
                              {sch.district || 'District'}, {sch.province || 'Limpopo'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span className="font-mono font-bold text-cyan-400 text-sm">{sch.learners_count}</span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span className="font-mono font-bold text-brand-400 text-sm">{sch.staff_count}</span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span className="font-mono text-slate-300">{sch.classes_count}</span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <Badge
                              variant={
                                Number(sch.avg_attendance_pct) >= 90
                                  ? 'emerald'
                                  : Number(sch.avg_attendance_pct) >= 80
                                  ? 'cyan'
                                  : 'amber'
                              }
                              size="sm"
                            >
                              {sch.avg_attendance_pct}%
                            </Badge>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-mono text-[11px]">
                              <span className="text-emerald-400 font-bold">
                                R{Number(sch.total_collected).toLocaleString()}
                              </span>
                              <span className="text-slate-500"> / R{Number(sch.total_invoiced).toLocaleString()}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            {sch.subadmins && sch.subadmins.length > 0 ? (
                              <div className="space-y-0.5">
                                {sch.subadmins.map(adm => (
                                  <div key={adm.id} className="text-[11px] text-purple-300 font-medium flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-purple-400 shrink-0" />
                                    <span>{adm.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                Awaiting SubAdmin Appointment
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={() => setSchoolBySlug(sch.slug)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all border border-white/10 flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <span>Manage</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: INSTITUTIONAL ACCREDITATION QUEUE & ONBOARDING APPLICATIONS       */}
      {/* ========================================================================= */}
      {activeSubView === 'applications' && (
        <div className="space-y-6">
          {/* Applications Status Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending Evaluation</span>
                <p className="text-2xl font-black font-mono text-white mt-1">{pendingAppsCount}</p>
                <span className="text-[10px] text-slate-400">Awaiting EMIS & SACE review</span>
              </div>
              <Clock className="w-8 h-8 text-amber-400/50" />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Accredited & Active</span>
                <p className="text-2xl font-black font-mono text-white mt-1">
                  {applications.filter(a => a.status === 'approved').length}
                </p>
                <span className="text-[10px] text-slate-400">Campuses provisioned on Geleza SA</span>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400/50" />
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Declined / Incomplete</span>
                <p className="text-2xl font-black font-mono text-white mt-1">
                  {applications.filter(a => a.status === 'declined').length}
                </p>
                <span className="text-[10px] text-slate-400">Advisory notice dispatched</span>
              </div>
              <XCircle className="w-8 h-8 text-rose-400/50" />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: `All Applications (${applications.length})` },
                { id: 'pending', label: `Pending (${pendingAppsCount})` },
                { id: 'approved', label: 'Approved' },
                { id: 'declined', label: 'Declined' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAppFilterStatus(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    appFilterStatus === f.id
                      ? 'bg-purple-600 text-white shadow-glow-indigo'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by school, EMIS, or principal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Applications Table */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl">
            {loadingApps ? (
              <LoadingSpinner text="Retrieving institutional accreditation requests..." />
            ) : filteredApplications.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <FileCheck className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-white">No accreditation requests match criteria</p>
                <p className="text-xs text-slate-400">Schools registering via the portal will appear here in real time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                      <th className="pb-3 px-3">School & EMIS</th>
                      <th className="pb-3 px-3">Location & Circuit</th>
                      <th className="pb-3 px-3">Principal & SACE</th>
                      <th className="pb-3 px-3">Streams & Languages</th>
                      <th className="pb-3 px-3">Fees Cleared</th>
                      <th className="pb-3 px-3 text-center">Status</th>
                      <th className="pb-3 px-3 text-right">Accreditation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-3">
                          <div className="space-y-1">
                            <p className="font-extrabold text-white text-sm">{app.school_name}</p>
                            <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-400">
                              <Shield className="w-3 h-3" />
                              <span>EMIS: {app.emis_number}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              Applied on {new Date(app.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-3">
                          <p className="font-bold text-slate-200">{app.circuit || 'Central Circuit'}</p>
                          <p className="text-slate-400 text-[11px]">{app.district}, {app.province}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{app.physical_address}</p>
                        </td>

                        <td className="py-4 px-3">
                          <p className="font-bold text-white">{app.principal_name} {app.principal_surname}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-mono">
                            <span>SACE: {app.principal_sace}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {app.principal_email}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {app.principal_phone}
                          </p>
                        </td>

                        <td className="py-4 px-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {(app.offered_streams || ['General Stream']).map((st: string) => (
                                <span key={st} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-300">
                                  {st}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Languages: {(app.offered_languages || ['English', 'Sepedi']).join(', ')}
                            </p>
                          </div>
                        </td>

                        <td className="py-4 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>App Fee: R{app.application_fee_amount || 450}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Reg Fee: R{app.registration_fee_amount || 1500}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 border ${
                              app.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : app.status === 'declined'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {app.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                            {app.status === 'declined' && <XCircle className="w-3 h-3" />}
                            {app.status === 'pending' && <Clock className="w-3 h-3" />}
                            {app.status}
                          </span>
                        </td>

                        <td className="py-4 px-3 text-right">
                          {app.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setReviewAction('approve');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1 shadow-md shadow-emerald-900/30 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Accredit</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setReviewAction('decline');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-all border border-rose-500/30 cursor-pointer"
                              >
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              Reviewed on {new Date(app.reviewed_at || app.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: EXECUTIVE GATEKEEPER & PORTAL ACCESS CONTROLS                     */}
      {/* ========================================================================= */}
      {activeSubView === 'gatekeeper' && (
        <div className="space-y-6 animate-fade-in">
          {/* Gatekeeper Strategic Overview Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/30 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                    Geleza SA Executive Governance
                  </span>
                  <span className="text-xs text-slate-400">• Dynamic API & UI Gatekeeper</span>
                </div>
                <h3 className="text-xl font-black font-display text-white tracking-tight flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  Executive Portal Access & Gatekeeper Controls
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Geleza SA Executives hold the unilateral authority to lock or unlock the <strong className="text-cyan-300 font-semibold">"Register School"</strong> button, preventing unauthorized public onboarding. Admins additionally govern learner & parent registration and application intake windows.
                </p>
              </div>

              <button
                onClick={fetchPortalControls}
                disabled={loadingControls}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all border border-white/15 self-start md:self-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingControls ? 'animate-spin' : ''}`} />
                <span>Sync Lock Status</span>
              </button>
            </div>
          </div>

          {/* Core System Invariant: Login Always Accessible */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">Login Portal (`/login`)</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Always Active & Unlocked
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  The Login button is a permanent core platform invariant (24/7/365). All registered learners, teachers, parents, and administrative staff can sign in anytime without interruption.
                </p>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono shrink-0">
              IMMUTABLE OPEN
            </div>
          </div>

          {/* 3 Executive / Admin Gatekeeper Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. School Registration Gatekeeper */}
            {(() => {
              const ctrl = portalControls.school_registration || { is_locked: false, name: 'School Registration Portal' };
              const isLocked = Boolean(ctrl.is_locked);
              const isBusy = updatingControlId === 'school_registration';

              return (
                <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                  isLocked 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/30' 
                    : 'bg-slate-900/90 border-slate-800 shadow-slate-950/50'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Executive Authority Only
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                        isLocked
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {isLocked ? <Lock className="w-3 h-3 text-rose-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                        {isLocked ? 'LOCKED' : 'UNLOCKED'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        "Register School" Button
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Controls institutional school onboarding. When locked, principals cannot submit applications and see an executive advisory notice.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Advisory Reason (Shown to public):
                      </label>
                      <input
                        type="text"
                        value={lockReasonInputs.school_registration || ''}
                        onChange={(e) => setLockReasonInputs(prev => ({ ...prev, school_registration: e.target.value }))}
                        placeholder="e.g. School registration is locked by Geleza SA Executives."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    {ctrl.updated_at && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Last toggled: {new Date(ctrl.updated_at).toLocaleString()} by {ctrl.updated_by_email || 'Executive'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleLock('school_registration', isLocked)}
                    disabled={isBusy}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                      isLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                    }`}
                  >
                    {isBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isLocked ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>{isLocked ? 'Unlock "Register School" Button' : 'Lock "Register School" Button'}</span>
                  </button>
                </div>
              );
            })()}

            {/* 2. User Registration Gatekeeper */}
            {(() => {
              const ctrl = portalControls.user_registration || { is_locked: false, name: 'User Registration Portal' };
              const isLocked = Boolean(ctrl.is_locked);
              const isBusy = updatingControlId === 'user_registration';

              return (
                <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                  isLocked 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/30' 
                    : 'bg-slate-900/90 border-slate-800 shadow-slate-950/50'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        Admin / Executive Authority
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                        isLocked
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {isLocked ? <Lock className="w-3 h-3 text-rose-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                        {isLocked ? 'LOCKED' : 'UNLOCKED'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        "Registration" Button
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Governs self-registration of parents & learners on `/register`. When locked, direct registration is halted while highlighting Login.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Advisory Reason (Shown to public):
                      </label>
                      <input
                        type="text"
                        value={lockReasonInputs.user_registration || ''}
                        onChange={(e) => setLockReasonInputs(prev => ({ ...prev, user_registration: e.target.value }))}
                        placeholder="e.g. Registration is closed by Geleza SA Admins."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    {ctrl.updated_at && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Last toggled: {new Date(ctrl.updated_at).toLocaleString()} by {ctrl.updated_by_email || 'Admin'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleLock('user_registration', isLocked)}
                    disabled={isBusy}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                      isLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                    }`}
                  >
                    {isBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isLocked ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>{isLocked ? 'Unlock "Registration" Button' : 'Lock "Registration" Button'}</span>
                  </button>
                </div>
              );
            })()}

            {/* 3. Application Intake Gatekeeper */}
            {(() => {
              const ctrl = portalControls.parent_application || { is_locked: false, name: 'Admissions & Applications' };
              const isLocked = Boolean(ctrl.is_locked);
              const isBusy = updatingControlId === 'parent_application';

              return (
                <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                  isLocked 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/30' 
                    : 'bg-slate-900/90 border-slate-800 shadow-slate-950/50'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        Admin / Executive Authority
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                        isLocked
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {isLocked ? <Lock className="w-3 h-3 text-rose-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                        {isLocked ? 'LOCKED' : 'UNLOCKED'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-cyan-400" />
                        "Application" Button
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Controls intake of 2026 admissions and parent portal applications. When locked, prospective applicants are guided to check back during open windows.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Advisory Reason (Shown to public):
                      </label>
                      <input
                        type="text"
                        value={lockReasonInputs.parent_application || ''}
                        onChange={(e) => setLockReasonInputs(prev => ({ ...prev, parent_application: e.target.value }))}
                        placeholder="e.g. Applications are currently closed by Geleza SA Admins."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    {ctrl.updated_at && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Last toggled: {new Date(ctrl.updated_at).toLocaleString()} by {ctrl.updated_by_email || 'Admin'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleLock('parent_application', isLocked)}
                    disabled={isBusy}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                      isLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                    }`}
                  >
                    {isBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isLocked ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>{isLocked ? 'Unlock "Application" Button' : 'Lock "Application" Button'}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVIEW & ACCREDITATION DECISION MODAL                                     */}
      {/* ========================================================================= */}
      {selectedApp && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  Executive Action: {reviewAction === 'approve' ? 'Accreditation Approval' : 'Application Decline'}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedApp.school_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  EMIS #{selectedApp.emis_number} • Principal {selectedApp.principal_name} {selectedApp.principal_surname}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedApp(null);
                  setReviewAction(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reviewAction === 'approve' ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs text-emerald-300">
                <p className="font-bold flex items-center gap-1.5 text-sm text-emerald-200">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  What happens next upon approval?
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                  <li>Creates official school campus tenant with assigned streams & subjects.</li>
                  <li>Provisions the Principal administrative account with secure credentials.</li>
                  <li>Dispatches official welcome email and onboarding guide to <span className="font-mono text-cyan-300">{selectedApp.principal_email}</span>.</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  <p className="font-bold text-rose-200">Decline Application Advisory</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    An official advisory notice with the selected reason will be emailed to the Principal to rectify requirements.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Decline Reason Code
                  </label>
                  <select
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Discrepancy in DBE EMIS or SACE Accreditation records">Discrepancy in DBE EMIS or SACE Accreditation records</option>
                    <option value="Principal credentials could not be verified with SACE">Principal credentials could not be verified with SACE</option>
                    <option value="Incomplete curriculum stream documentation">Incomplete curriculum stream documentation</option>
                    <option value="Fees payment verification pending or failed">Fees payment verification pending or failed</option>
                    <option value="School address outside approved provincial districts">School address outside approved provincial districts</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Executive Notes & Feedback (Included in Email)
              </label>
              <textarea
                value={executiveNotes}
                onChange={(e) => setExecutiveNotes(e.target.value)}
                rows={3}
                placeholder={reviewAction === 'approve' ? 'Optional welcome note to the Principal...' : 'Provide specific instructions for what the applicant needs to correct...'}
                className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedApp(null);
                  setReviewAction(null);
                }}
                disabled={isSubmittingReview}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDecisionSubmit}
                disabled={isSubmittingReview}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
                }`}
              >
                {isSubmittingReview ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing & Dispatching Email...</span>
                  </>
                ) : (
                  <>
                    {reviewAction === 'approve' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Confirm {reviewAction === 'approve' ? 'Accreditation' : 'Decline'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSchoolCommandCenter;
