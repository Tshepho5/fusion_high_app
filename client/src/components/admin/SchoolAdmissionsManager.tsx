import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
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
  Shield,
  CreditCard,
  Eye,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
  Award
} from 'lucide-react';
import { schoolRegistrationService, commandCenterService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';

export interface SchoolApplication {
  id: number;
  application_number: string;
  status: string;
  school_name: string;
  emis_number: string;
  province: string;
  district: string;
  circuit?: string;
  physical_address: string;
  contact_email: string;
  contact_phone: string;
  curriculum_type?: string;
  grade_range?: string;
  offered_streams?: string[];
  offered_languages?: string[];
  offered_subjects?: string[];
  principal_first_name: string;
  principal_surname: string;
  principal_name?: string;
  principal_id_number?: string;
  principal_sace_number?: string;
  principal_sace?: string;
  principal_email: string;
  principal_phone: string;
  motto?: string;
  primary_color?: string;
  secondary_color?: string;
  application_fee_paid?: string | number;
  registration_fee_paid?: string | number;
  payment_status?: string;
  payment_reference?: string;
  executive_notes?: string;
  declined_reason?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_school_id?: number;
  created_at: string;
  updated_at?: string;
}

interface SchoolAdmissionsManagerProps {
  onNavigateTab?: (tabId: string, params?: any) => void;
}

export const SchoolAdmissionsManager: React.FC<SchoolAdmissionsManagerProps> = ({ onNavigateTab }) => {
  const [applications, setApplications] = useState<SchoolApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');

  // Decision Modal State
  const [selectedApp, setSelectedApp] = useState<SchoolApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'decline' | null>(null);
  const [customPassword, setCustomPassword] = useState<string>('');
  const [declineReason, setDeclineReason] = useState<string>('Discrepancy in DBE EMIS or SACE Accreditation records');
  const [executiveNotes, setExecutiveNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Full Dossier Modal State
  const [dossierApp, setDossierApp] = useState<SchoolApplication | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await schoolRegistrationService.getAllApplications();
      const rows = Array.isArray(res) ? res : (res.applications || []);
      setApplications(rows);
    } catch (err: any) {
      console.error('Failed to load school applications:', err);
      setError(err.response?.data?.error || err.message || 'Failed to retrieve school admission applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const isPending = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'pending_review' || s === 'under_review' || s === 'awaiting_review';
  };

  const pendingCount = useMemo(() => applications.filter(a => isPending(a.status)).length, [applications]);
  const approvedCount = useMemo(() => applications.filter(a => a.status === 'approved').length, [applications]);
  const declinedCount = useMemo(() => applications.filter(a => a.status === 'declined').length, [applications]);

  const provinces = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => {
      if (a.province) set.add(a.province);
    });
    return Array.from(set).sort();
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Status category filter
      if (statusTab === 'pending' && !isPending(app.status)) return false;
      if (statusTab === 'approved' && app.status !== 'approved') return false;
      if (statusTab === 'declined' && app.status !== 'declined') return false;

      // Province filter
      if (selectedProvince !== 'all' && app.province !== selectedProvince) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const principalFull = `${app.principal_first_name || app.principal_name || ''} ${app.principal_surname || ''}`.toLowerCase();
        const schoolName = (app.school_name || '').toLowerCase();
        const emis = (app.emis_number || '').toLowerCase();
        const appNo = (app.application_number || '').toLowerCase();
        const district = (app.district || '').toLowerCase();
        const email = (app.principal_email || '').toLowerCase();
        const sace = (app.principal_sace_number || app.principal_sace || '').toLowerCase();

        return (
          schoolName.includes(q) ||
          emis.includes(q) ||
          appNo.includes(q) ||
          principalFull.includes(q) ||
          district.includes(q) ||
          email.includes(q) ||
          sace.includes(q)
        );
      }

      return true;
    });
  }, [applications, statusTab, selectedProvince, searchQuery]);

  const handleOpenDecision = (app: SchoolApplication, action: 'approve' | 'decline') => {
    setSelectedApp(app);
    setReviewAction(action);
    setCustomPassword(`Geleza@${app.emis_number || '2026'}`);
    setExecutiveNotes('');
    setDeclineReason('Discrepancy in DBE EMIS or SACE Accreditation records');
  };

  const handleDecisionSubmit = async () => {
    if (!selectedApp || !reviewAction) return;
    setIsSubmitting(true);
    setActionSuccessMsg(null);
    try {
      const res = await schoolRegistrationService.reviewApplication(
        selectedApp.id,
        reviewAction,
        reviewAction === 'decline' ? declineReason : undefined,
        executiveNotes,
        reviewAction === 'approve' ? (customPassword.trim() || undefined) : undefined
      );

      if (res.success || res.status) {
        setActionSuccessMsg(
          reviewAction === 'approve'
            ? `Successfully admitted "${selectedApp.school_name}"! Campus created and Principal account activated.`
            : `Application for "${selectedApp.school_name}" has been declined with formal notice.`
        );
        setSelectedApp(null);
        setReviewAction(null);
        await fetchApplications();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to submit admission decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-20">
      {/* Top Banner Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] shadow-sm relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Institutional Governance
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300">• Principal Registrations</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              School Admissions & Campus Registrations
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Review, verify, and admit school registrations submitted by Principals. When an application is approved, the system automatically registers the official campus and provisions administrator credentials for the Principal.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchApplications}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all border border-slate-200/80 dark:border-white/10 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Global Action Banner */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button
              onClick={() => setActionSuccessMsg(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusTab === 'all'
              ? 'bg-blue-500/10 border-blue-500/40 dark:bg-blue-900/20 shadow-sm'
              : 'bg-white dark:bg-[#0F1A24] border-slate-200/90 dark:border-[#1B2E3D] hover:border-blue-400/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total Submissions</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1.5">{applications.length}</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">All recorded applications</span>
        </div>

        <div
          onClick={() => setStatusTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-900/20 shadow-sm'
              : 'bg-white dark:bg-[#0F1A24] border-slate-200/90 dark:border-[#1B2E3D] hover:border-amber-400/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Awaiting Admission</span>
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-300 mt-1.5">{pendingCount}</p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">Requires Admin action</span>
        </div>

        <div
          onClick={() => setStatusTab('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusTab === 'approved'
              ? 'bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-900/20 shadow-sm'
              : 'bg-white dark:bg-[#0F1A24] border-slate-200/90 dark:border-[#1B2E3D] hover:border-emerald-400/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Admitted Campuses</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-300 mt-1.5">{approvedCount}</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Active school tenants</span>
        </div>

        <div
          onClick={() => setStatusTab('declined')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusTab === 'declined'
              ? 'bg-rose-500/10 border-rose-500/40 dark:bg-rose-900/20 shadow-sm'
              : 'bg-white dark:bg-[#0F1A24] border-slate-200/90 dark:border-[#1B2E3D] hover:border-rose-400/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Declined / Needs Info</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-300 mt-1.5">{declinedCount}</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Advisory notice sent</span>
        </div>
      </div>

      {/* Categorized Filter Tabs and Search Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0A121A] rounded-2xl border border-slate-200/90 dark:border-[#1B2E3D] shrink-0">
            <button
              onClick={() => setStatusTab('pending')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
              {pendingCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusTab === 'pending' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusTab('approved')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Admitted ({approvedCount})</span>
            </button>

            <button
              onClick={() => setStatusTab('declined')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'declined'
                  ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Declined ({declinedCount})</span>
            </button>

            <button
              onClick={() => setStatusTab('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'all'
                  ? 'bg-cyan-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>All ({applications.length})</span>
            </button>
          </div>

          {/* Search & Province Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 md:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search school, EMIS, Principal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200/90 dark:border-[#1B2E3D] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {provinces.length > 0 && (
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200/90 dark:border-[#1B2E3D] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-all"
                >
                  <option value="all">All Provinces</option>
                  {provinces.map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Applications List / Table */}
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Retrieving school admission applications..." />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="py-16 text-center space-y-3 rounded-2xl bg-slate-50 dark:bg-[#0A121A]/50 border border-dashed border-slate-200 dark:border-[#1B2E3D]">
            <Building2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {statusTab === 'pending'
                ? 'No Pending Applications'
                : `No Applications in "${statusTab}" Category`}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {statusTab === 'pending'
                ? 'All submitted school registrations have been reviewed. When a new Principal registers their school, it will appear here immediately.'
                : 'Try adjusting your search criteria or switching to the "All Applications" tab.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-[#1B2E3D]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0A121A] border-b border-slate-200/90 dark:border-[#1B2E3D] text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">School & EMIS</th>
                  <th className="py-3 px-3.5">Location & Circuit</th>
                  <th className="py-3 px-3.5">Principal In-Charge</th>
                  <th className="py-3 px-3.5">Academic Streams</th>
                  <th className="py-3 px-3.5">Registration Fees</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Admission Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-[#1B2E3D]/80">
                {filteredApplications.map((app) => {
                  const waiting = isPending(app.status);
                  const principalFullName = `${app.principal_first_name || app.principal_name || 'Principal'} ${app.principal_surname || ''}`;
                  const saceNum = app.principal_sace_number || app.principal_sace;

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* School & EMIS */}
                      <td className="py-4 px-3.5">
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {app.school_name}
                          </p>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                            <Shield className="w-3 h-3 shrink-0" />
                            <span>EMIS: {app.emis_number}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            App #{app.application_number} • {new Date(app.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {app.circuit || 'Circuit District'}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          {app.district}, {app.province}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[170px]" title={app.physical_address}>
                          {app.physical_address}
                        </p>
                      </td>

                      {/* Principal Contact */}
                      <td className="py-4 px-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {principalFullName}
                        </p>
                        {saceNum && (
                          <span className="inline-block text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-300">
                            SACE: {saceNum}
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate max-w-[150px]">{app.principal_email}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                          <span>{app.principal_phone}</span>
                        </p>
                      </td>

                      {/* Streams */}
                      <td className="py-4 px-3.5">
                        <div className="space-y-1 max-w-[180px]">
                          <div className="flex flex-wrap gap-1">
                            {(app.offered_streams || ['General Stream']).slice(0, 3).map((st) => (
                              <span
                                key={st}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] text-slate-700 dark:text-slate-300"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate" title={(app.offered_languages || []).join(', ')}>
                            Lang: {(app.offered_languages || ['English FAL']).join(', ')}
                          </p>
                        </div>
                      </td>

                      {/* Registration Fees */}
                      <td className="py-4 px-3.5">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            app.payment_status === 'paid'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {app.payment_status === 'paid' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {app.payment_status === 'paid' ? 'Fees Cleared' : 'Pending Bank'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Ref: {app.payment_reference || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 border ${
                            app.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : app.status === 'declined'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {app.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {app.status === 'declined' && <XCircle className="w-3 h-3" />}
                          {waiting && <Clock className="w-3 h-3 animate-pulse" />}
                          {waiting ? 'Pending Review' : app.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDossierApp(app)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="View Full Application Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {waiting ? (
                            <>
                              <button
                                onClick={() => handleOpenDecision(app, 'approve')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Admit</span>
                              </button>

                              <button
                                onClick={() => handleOpenDecision(app, 'decline')}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all border border-rose-500/30 cursor-pointer"
                              >
                                <span>Decline</span>
                              </button>
                            </>
                          ) : app.status === 'approved' ? (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Admitted
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Declined
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADMISSION DECISION MODAL                                                  */}
      {/* ========================================================================= */}
      {selectedApp && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0F1A24] border border-slate-200 dark:border-[#1B2E3D] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}>
                  Executive Action: {reviewAction === 'approve' ? 'Accept & Admit School' : 'Decline Application'}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {selectedApp.school_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  EMIS #{selectedApp.emis_number} • Principal {selectedApp.principal_first_name || selectedApp.principal_name} {selectedApp.principal_surname}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedApp(null);
                  setReviewAction(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reviewAction === 'approve' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <p className="font-bold flex items-center gap-1.5 text-sm text-emerald-800 dark:text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    What happens upon admission?
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li>Creates the official school tenant with assigned curriculum streams and classes.</li>
                    <li>Provisions the Principal user account with Admin governance permissions.</li>
                    <li>Dispatches the official welcome email with login credentials to <strong className="text-cyan-600 dark:text-cyan-400">{selectedApp.principal_email}</strong>.</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Principal Initial Password (Used to Log In)
                  </label>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="e.g. Geleza@923987654"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200 dark:border-[#1B2E3D] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    The Principal will be asked to change this password on initial login.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-bold text-rose-800 dark:text-rose-200">Decline Application Advisory</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    A formal notification explaining the reasons for declining will be sent to the Principal email.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Decline Reason Code
                  </label>
                  <select
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200 dark:border-[#1B2E3D] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Executive Notes & Feedback (Included in Official Notice)
              </label>
              <textarea
                value={executiveNotes}
                onChange={(e) => setExecutiveNotes(e.target.value)}
                rows={3}
                placeholder={reviewAction === 'approve' ? 'Welcome message from the Executive Admin Board...' : 'Specify requirements that must be corrected before re-applying...'}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200 dark:border-[#1B2E3D] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedApp(null);
                  setReviewAction(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDecisionSubmit}
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing & Creating Campus...</span>
                  </>
                ) : (
                  <>
                    {reviewAction === 'approve' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Confirm {reviewAction === 'approve' ? 'Admission & Provisioning' : 'Decline'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL APPLICATION DOSSIER MODAL                                            */}
      {/* ========================================================================= */}
      {dossierApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0F1A24] border border-slate-200 dark:border-[#1B2E3D] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-[#1B2E3D] pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  Application Dossier #{dossierApp.application_number}
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {dossierApp.school_name}
                </h2>
                <p className="text-xs text-slate-500">
                  Submitted on {new Date(dossierApp.created_at).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setDossierApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Institutional Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200/80 dark:border-[#1B2E3D] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                  School Campus Profile
                </h4>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <p><strong className="text-slate-900 dark:text-white">EMIS Number:</strong> {dossierApp.emis_number}</p>
                  <p><strong className="text-slate-900 dark:text-white">Province:</strong> {dossierApp.province}</p>
                  <p><strong className="text-slate-900 dark:text-white">District:</strong> {dossierApp.district}</p>
                  <p><strong className="text-slate-900 dark:text-white">Circuit:</strong> {dossierApp.circuit || 'Not specified'}</p>
                  <p><strong className="text-slate-900 dark:text-white">Address:</strong> {dossierApp.physical_address}</p>
                  <p><strong className="text-slate-900 dark:text-white">School Email:</strong> {dossierApp.contact_email || dossierApp.principal_email}</p>
                  <p><strong className="text-slate-900 dark:text-white">School Phone:</strong> {dossierApp.contact_phone || dossierApp.principal_phone}</p>
                </div>
              </div>

              {/* Principal Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200/80 dark:border-[#1B2E3D] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  Principal Credentials
                </h4>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <p><strong className="text-slate-900 dark:text-white">Full Name:</strong> {dossierApp.principal_first_name || dossierApp.principal_name} {dossierApp.principal_surname}</p>
                  <p><strong className="text-slate-900 dark:text-white">National ID:</strong> {dossierApp.principal_id_number || 'On file'}</p>
                  <p><strong className="text-slate-900 dark:text-white">SACE Number:</strong> {dossierApp.principal_sace_number || dossierApp.principal_sace || 'Pending check'}</p>
                  <p><strong className="text-slate-900 dark:text-white">Work Email:</strong> {dossierApp.principal_email}</p>
                  <p><strong className="text-slate-900 dark:text-white">Cellphone:</strong> {dossierApp.principal_phone}</p>
                </div>
              </div>

              {/* Academic Curricula */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200/80 dark:border-[#1B2E3D] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  Academic Offering
                </h4>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <p><strong className="text-slate-900 dark:text-white">Curriculum:</strong> {dossierApp.curriculum_type || 'CAPS (DBE)'}</p>
                  <p><strong className="text-slate-900 dark:text-white">Grade Range:</strong> {dossierApp.grade_range || '8-12'}</p>
                  <p><strong className="text-slate-900 dark:text-white">Streams:</strong> {(dossierApp.offered_streams || []).join(', ') || 'General'}</p>
                  <p><strong className="text-slate-900 dark:text-white">Languages:</strong> {(dossierApp.offered_languages || []).join(', ') || 'English FAL'}</p>
                </div>
              </div>

              {/* Financial Intake */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0A121A] border border-slate-200/80 dark:border-[#1B2E3D] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                  Fee Clearing & Status
                </h4>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <p><strong className="text-slate-900 dark:text-white">Payment Status:</strong> {dossierApp.payment_status || 'Pending'}</p>
                  <p><strong className="text-slate-900 dark:text-white">Reference:</strong> {dossierApp.payment_reference || 'N/A'}</p>
                  <p><strong className="text-slate-900 dark:text-white">Application Fee:</strong> R{Number(dossierApp.application_fee_paid || 450).toFixed(2)}</p>
                  <p><strong className="text-slate-900 dark:text-white">Registration Fee:</strong> R{Number(dossierApp.registration_fee_paid || 1500).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Actions in Dossier */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1B2E3D]">
              <button
                type="button"
                onClick={() => setDossierApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Dossier
              </button>

              {isPending(dossierApp.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = dossierApp;
                      setDossierApp(null);
                      handleOpenDecision(target, 'decline');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = dossierApp;
                      setDossierApp(null);
                      handleOpenDecision(target, 'approve');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
                  >
                    Accept & Admit School
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolAdmissionsManager;
