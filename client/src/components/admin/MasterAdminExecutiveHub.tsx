import React, { useState, useEffect } from 'react';
import { AdmissionWindowPanel } from './AdmissionWindowPanel';
import { TesterProgrammePanel } from './TesterProgrammePanel';
import { systemControlService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Users,
  Mail,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
  X,
  UserCheck,
  Radio
} from 'lucide-react';

interface TestingUser {
  id: number;
  reference_code?: string;
  email: string;
  full_name: string;
  surname: string;
  phone?: string;
  role_name: string;
  school_id?: number;
  school_name?: string;
  status?: string;
  delivery_status?: string;
  account_state?: string;
  created_at: string;
}

interface MasterAdminExecutiveHubProps {
  onNavigateTab?: (tabId: string, params?: any) => void;
}

export const MasterAdminExecutiveHub: React.FC<MasterAdminExecutiveHubProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();

  // Strict exclusivity verification
  const isMasterAdmin = Boolean(user?.is_superadmin);

  // Portal Controls State
  const [controls, setControls] = useState<Record<string, any>>({
    school_registration: { is_locked: false, locked_reason: '' },
    user_registration: { is_locked: false, locked_reason: '' },
    parent_application: { is_locked: false, locked_reason: '' }
  });
  const [togglingLock, setTogglingLock] = useState<string | null>(null);

  // Testing Users State
  const [testers, setTesters] = useState<TestingUser[]>([]);
  const [programme, setProgramme] = useState<Record<string, number> | null>(null);
  const [testSchoolName, setTestSchoolName] = useState('Geleza SA Tester School');
  const [loadingTesters, setLoadingTesters] = useState(false);
  const [isAddTesterModalOpen, setIsAddTesterModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [selectedTester, setSelectedTester] = useState<TestingUser | null>(null);

  // Form State for Creating Tester
  const [testerForm, setTesterForm] = useState({
    email: '',
    full_name: '',
    surname: '',
    role: 'teacher',
    phone: '',
    send_email: false
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load Portal Controls & Testers
  const fetchData = async () => {
    try {
      const lockRes = await systemControlService.getPortalLocks();
      if (lockRes?.controls) {
        setControls(lockRes.controls);
      }
    } catch (err) {
      console.warn('Could not load portal controls:', err);
    }

    if (isMasterAdmin) {
      setLoadingTesters(true);
      try {
        const testersRes = await systemControlService.getTestingUsers();
        setTesters(testersRes?.testers || []);
        setProgramme(testersRes?.programme || null);
        if (testersRes?.test_school?.name) setTestSchoolName(testersRes.test_school.name);
      } catch (err) {
        console.warn('Could not load testing users:', err);
      } finally {
        setLoadingTesters(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [isMasterAdmin]);

  // If not master admin, do not render this exclusive hub
  if (!isMasterAdmin) {
    return null;
  }

  // Toggle Portal Access Control
  const handleSaveGate = async (controlId: string, payload: { is_locked?: boolean; locked_reason?: string; opens_at?: string | null; closes_at?: string | null }) => {
    setTogglingLock(controlId);
    setActionSuccess(null);
    try {
      const res = await systemControlService.updatePortalLock(controlId, payload);
      setControls(prev => ({
        ...prev,
        [controlId]: res.control || { ...prev[controlId], ...payload }
      }));
      setActionSuccess(res.message || 'Intake updated.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update this intake.');
    } finally {
      setTogglingLock(null);
    }
  };

  // Submit New Testing User
  const handleCreateTester = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormFieldErrors({});

    const errs: Record<string, string> = {};
    if (!testerForm.email || !testerForm.email.includes('@')) {
      errs.email = 'A valid email address is required.';
    }
    if (!testerForm.full_name.trim()) {
      errs.full_name = 'Full name is required.';
    }

    if (Object.keys(errs).length > 0) {
      setFormFieldErrors(errs);
      setFormError('Please resolve the highlighted issues below.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await systemControlService.createTestingUser(testerForm);
      setActionSuccess(res.message || `Testing user invited successfully!`);
      setIsAddTesterModalOpen(false);
      setTesterForm({
        email: '',
        full_name: '',
        surname: '',
        role: 'teacher',
        phone: '',
        send_email: false
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to register testing user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Tester Credentials Email
  const handleResend = async (tester: TestingUser) => {
    if (!window.confirm(`Send the invitation email to ${tester.email}? It will be marked sent only after the mail service accepts it.`)) return;
    try {
      const res = await systemControlService.resendTesterCredentials(tester.id);
      setActionSuccess(res.message || `Credentials re-dispatched to ${tester.email}.`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resend credentials.');
    }
  };

  // Change Tester Role
  const handleUpdateRole = async (newRole: string) => {
    if (!selectedTester) return;
    try {
      const res = await systemControlService.updateTesterRole(selectedTester.id, newRole);
      setActionSuccess(res.message || `Role updated successfully.`);
      setIsEditRoleModalOpen(false);
      setSelectedTester(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role.');
    }
  };

  // Revoke Tester Privileges
  const handleDeleteTester = async (id: number, name: string) => {
    if (!window.confirm(`Revoke testing privileges for "${name}"?`)) return;
    try {
      const legacy = testers.find((tester) => tester.id === id && tester.reference_code === 'LEGACY');
      const res = legacy
        ? await systemControlService.deleteLegacyTester(id)
        : await systemControlService.deleteTestingUser(id);
      setActionSuccess(res.message || `Testing access revoked.`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke testing access.');
    }
  };

  return (
    <div className="space-y-6 mb-8 animate-fade-in">
      {/* Master Admin Header Banner */}
      <div className="rounded-2xl p-6 bg-surface-dark border border-white/10 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono tracking-wider bg-white/10 text-slate-300 border border-white/10">
                Master Administration
              </span>
              <span className="text-xs text-slate-400 font-mono">{user?.email || 'Master administrator'}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black font-display text-white tracking-tight">
              Executive Portal Controls & User Access
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddTesterModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Testing User</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="p-1 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: EXECUTIVE PORTAL GATEKEEPER SWITCHES (TURN OFF / ON)           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-surface-dark border border-white/10 p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Application & Registration Access Gates</h3>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Refresh Lock Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <AdmissionWindowPanel controls={controls} busyId={togglingLock} onSave={handleSaveGate} />
      </div>

      <TesterProgrammePanel programme={programme} testSchoolName={testSchoolName} />

      {/* ========================================================================= */}
      {/* SECTION 2: APP TESTERS MANAGEMENT HUB (CREATE & ASSIGN TESTERS)           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-surface-dark border border-white/10 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <Users className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">Testing Users Roster</h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/10 text-slate-300 border border-white/10">
                  {testers.length} Users
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAddTesterModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Assign New Tester</span>
          </button>
        </div>

        {/* Testers List */}
        {loadingTesters ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
            <span>Loading active testers...</span>
          </div>
        ) : testers.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-2xl p-6">
            <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
            <h4 className="text-xs font-bold text-slate-300">No Testing Users Assigned Yet</h4>
            <button
              onClick={() => setIsAddTesterModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create First Tester</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="pb-3 font-bold">Tester Identity</th>
                  <th className="pb-3 font-bold">Assigned Role</th>
                  <th className="pb-3 font-bold">Test school</th>
                  <th className="pb-3 font-bold">Invitation</th>
                  <th className="pb-3 font-bold">Added On</th>
                  <th className="pb-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {testers.map(t => {
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-darker text-white font-bold flex items-center justify-center text-xs border border-white/10 shrink-0">
                            {t.full_name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <p className="font-bold text-white line-clamp-1">{t.full_name} {t.surname}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{t.reference_code || t.email}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{t.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <button
                          onClick={() => {
                            setSelectedTester(t);
                            setIsEditRoleModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold border border-white/10 font-mono uppercase tracking-wide cursor-pointer hover:bg-white/10 transition-colors bg-white/5 text-slate-200"
                          title="Click to change role"
                        >
                          {t.role_name || 'tester'} ▾
                        </button>
                      </td>

                      <td className="py-3.5">
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate block max-w-[160px]">
                          {t.school_name || 'Geleza SA'}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <span className="text-slate-300 font-medium block">{t.delivery_status || 'not_sent'}</span>
                        <span className="text-[11px] text-slate-500">{t.status || 'draft'} · {t.account_state || 'none'}</span>
                      </td>

                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Active'}
                      </td>

                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleResend(t)}
                            disabled={t.status === 'legacy' || t.reference_code === 'LEGACY'}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-30"
                            title="Send invitation email"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTester(t.id, `${t.full_name} ${t.surname}`)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Revoke tester access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      {/* MODAL 1: ASSIGN / INVITE NEW TESTING USER                                 */}
      {/* ========================================================================= */}
      {isAddTesterModalOpen && (
        <div className="fixed inset-0 z-[80] flex justify-center overflow-y-auto bg-black/80 backdrop-blur-md px-3 pt-16 pb-6 animate-fade-in">
          <div className="w-full max-w-lg h-fit rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assign App Testing User</h3>
              </div>
              <button
                onClick={() => setIsAddTesterModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTester} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Tester First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kagiso"
                    value={testerForm.full_name}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (/\d/.test(raw)) {
                        setFormFieldErrors(prev => ({ ...prev, full_name: 'Numbers are not allowed in this field. Please use letters only.' }));
                        setTesterForm(prev => ({ ...prev, full_name: raw.replace(/\d/g, '') }));
                        return;
                      }
                      setTesterForm(prev => ({ ...prev, full_name: raw }));
                      if (formFieldErrors.full_name) setFormFieldErrors(prev => ({ ...prev, full_name: '' }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400 outline-hidden"
                  />
                  {formFieldErrors.full_name && (
                    <p className="text-[11px] text-rose-400 font-semibold">{formFieldErrors.full_name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Tester Surname</label>
                  <input
                    type="text"
                    placeholder="e.g. Phasha"
                    value={testerForm.surname}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (/\d/.test(raw)) {
                        setFormFieldErrors(prev => ({ ...prev, surname: 'Numbers are not allowed in this field. Please use letters only.' }));
                        setTesterForm(prev => ({ ...prev, surname: raw.replace(/\d/g, '') }));
                        return;
                      }
                      setTesterForm(prev => ({ ...prev, surname: raw }));
                      if (formFieldErrors.surname) setFormFieldErrors(prev => ({ ...prev, surname: '' }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400 outline-hidden"
                  />
                  {formFieldErrors.surname && (
                    <p className="text-[11px] text-rose-400 font-semibold">{formFieldErrors.surname}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Email Address (Login Username) *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="tester@example.com"
                    value={testerForm.email}
                    onChange={(e) => {
                      setTesterForm(prev => ({ ...prev, email: e.target.value }));
                      if (formFieldErrors.email) setFormFieldErrors(prev => ({ ...prev, email: '' }));
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400 outline-hidden"
                  />
                </div>
                {formFieldErrors.email && (
                  <p className="text-[11px] text-rose-400 font-semibold">{formFieldErrors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Assign Testing Role *</label>
                  <select
                    value={testerForm.role}
                    onChange={(e) => setTesterForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 outline-hidden font-semibold"
                  >
                    <option value="teacher">Educator / Teacher (Portal Access)</option>
                    <option value="learner">Student / Learner (Portal Access)</option>
                    <option value="parent">Parent / Guardian (Portal Access)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Test school</label>
                  <p className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200">{testSchoolName}</p>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testerForm.send_email}
                    onChange={(e) => setTesterForm(prev => ({ ...prev, send_email: e.target.checked }))}
                    className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Send the invitation email now. Leave this off to save a draft.</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddTesterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold shadow-glow-cyan transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{submitting ? 'Saving invitation...' : testerForm.send_email ? 'Save and send invitation' : 'Save draft'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHANGE TESTER ROLE                                               */}
      {/* ========================================================================= */}
      {isEditRoleModalOpen && selectedTester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Change Testing Role</h3>
              <button
                onClick={() => {
                  setIsEditRoleModalOpen(false);
                  setSelectedTester(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select new portal role for <strong className="text-white">{selectedTester.full_name} {selectedTester.surname}</strong>:
            </p>

            <div className="space-y-2">
              {[
                { role: 'teacher', label: 'Educator / Teacher', desc: 'Marks entry, classes, attendance, lesson plans' },
                { role: 'learner', label: 'Student / Learner', desc: 'Subjects, reports, homework, timetable' },
                { role: 'parent', label: 'Parent / Legal Guardian', desc: 'Children monitoring, fee balance, consultations' }
              ].map(item => (
                <button
                  key={item.role}
                  onClick={() => handleUpdateRole(item.role)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedTester.role_name === item.role
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950/60 border-white/5 hover:border-white/20 text-slate-300 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
