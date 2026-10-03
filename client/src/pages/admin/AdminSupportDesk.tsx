import React, { useEffect, useState } from 'react';
import {
  LifeBuoy,
  Search,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  User
} from 'lucide-react';
import { supportService, parentApplicationService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | '';

export const AdminSupportDesk: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus>('open');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [resolution, setResolution] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    parent_email: '',
    parent_phone: '',
    parent_name: '',
    parent_surname: '',
    parent_id_number: '',
    physical_address: '',
    child_first_name: '',
    child_surname: '',
    child_id_number: '',
    child_grade: ''
  });
  const [apps, setApps] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketRes, appRes] = await Promise.all([
        supportService.getAdminTickets(statusFilter ? { status: statusFilter } : undefined),
        parentApplicationService.getAll().catch(() => ({ applications: [] }))
      ]);
      setTickets(ticketRes.tickets || []);
      setApps(appRes.applications || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load support desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const openTicket = (t: any) => {
    setSelected(t);
    setResolution(t.resolution_notes || '');
    setAdminNotes(t.admin_notes || '');
    const matched = apps.find(
      (a) =>
        a.application_number &&
        t.related_application_number &&
        String(a.application_number).toUpperCase() === String(t.related_application_number).toUpperCase()
    ) || apps.find(
      (a) => a.parent_email && t.requester_email &&
        String(a.parent_email).toLowerCase() === String(t.requester_email).toLowerCase()
    );
    setCorrectionForm({
      parent_email: matched?.parent_email || t.requester_email || '',
      parent_phone: matched?.parent_phone || t.requester_phone || '',
      parent_name: matched?.parent_name || '',
      parent_surname: matched?.parent_surname || '',
      parent_id_number: matched?.parent_id_number || '',
      physical_address: matched?.physical_address || '',
      child_first_name: matched?.child_first_name || '',
      child_surname: matched?.child_surname || '',
      child_id_number: matched?.child_id_number || '',
      child_grade: matched?.child_grade != null ? String(matched.child_grade) : ''
    });
    (selected as any)._matchedAppId = matched?.id;
    setSelected({ ...t, _matchedAppId: matched?.id, _matchedAppNumber: matched?.application_number });
  };

  const handleUpdateStatus = async (status: string, extras: Record<string, unknown> = {}) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await supportService.updateTicket(selected.id, {
        status,
        admin_notes: adminNotes || undefined,
        resolution_notes: resolution || undefined,
        ...extras
      });
      setSuccess(res.message || `Ticket marked ${status}.`);
      setSelected(null);
      load();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleCorrectApplication = async () => {
    if (!selected?._matchedAppId) {
      setError('No matching parent application found. Open Users → Parent Applications to correct by reference number.');
      return;
    }
    setCorrecting(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        support_ticket_id: selected.id,
        ticket_status: 'in_progress',
        ticket_resolution: resolution || `Corrected details for ticket ${selected.ticket_number}`
      };
      Object.entries(correctionForm).forEach(([k, v]) => {
        if (String(v || '').trim()) payload[k] = String(v).trim();
      });
      const res = await parentApplicationService.correct(selected._matchedAppId, payload);
      setSuccess(res.message || 'Application corrected.');
      await supportService.updateTicket(selected.id, {
        status: 'resolved',
        resolution_notes: resolution || res.message,
        admin_notes: adminNotes || undefined
      });
      setSelected(null);
      load();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to correct application.');
    } finally {
      setCorrecting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = tickets.filter((t) => {
    if (!q) return true;
    return (
      `${t.ticket_number} ${t.subject} ${t.requester_name} ${t.requester_email} ${t.category_label || t.category} ${t.related_application_number || ''}`
        .toLowerCase()
        .includes(q)
    );
  });

  const statusBadge = (status: string) => {
    if (status === 'resolved' || status === 'closed') return 'emerald';
    if (status === 'in_progress') return 'amber';
    return 'rose';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-cyan-400" />
            User Support Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Assist learners, parents, teachers, and applicants with application mistakes (email, phone, ID)
            and other app issues. Geleza SA and school administrators share this inbox for your school.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, email, application ref…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus)}
          className="px-3 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white focus:outline-none"
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="">All statuses</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface-darker/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
              <th className="pb-3 px-3 pt-3">Ticket</th>
              <th className="pb-3 px-3 pt-3">Requester</th>
              <th className="pb-3 px-3 pt-3">Category</th>
              <th className="pb-3 px-3 pt-3">Subject</th>
              <th className="pb-3 px-3 pt-3">App Ref</th>
              <th className="pb-3 px-3 pt-3">Status</th>
              <th className="pb-3 px-3 pt-3">SLA</th>
              <th className="pb-3 px-3 pt-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-3">
                  <p className="font-mono text-cyan-300 font-bold">{t.ticket_number}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                  </p>
                </td>
                <td className="py-3 px-3">
                  <p className="font-bold text-white">{t.requester_name}</p>
                  <p className="text-slate-400 font-mono text-[11px]">{t.requester_email}</p>
                  {t.requester_role && (
                    <span className="text-[10px] text-slate-500 capitalize">{t.requester_role}</span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-300">{t.category_label || t.category}</td>
                <td className="py-3 px-3 text-slate-200 max-w-[200px] truncate" title={t.subject}>{t.subject}</td>
                <td className="py-3 px-3 font-mono text-amber-300/90 text-[11px]">
                  {t.related_application_number || '—'}
                </td>
                <td className="py-3 px-3">
                  <Badge variant={statusBadge(t.status) as any} size="sm">
                    {String(t.status || '').replace('_', ' ').toUpperCase()}
                  </Badge>
                </td>
                <td className="py-3 px-3">
                  <Badge
                    variant={
                      t.sla_status === 'breached'
                        ? 'rose'
                        : t.sla_status === 'due_soon'
                          ? 'amber'
                          : 'emerald'
                    }
                    size="sm"
                  >
                    {t.sla_status === 'breached'
                      ? 'BREACHED'
                      : t.sla_status === 'due_soon'
                        ? 'DUE SOON'
                        : t.sla_due_at
                          ? 'ON TRACK'
                          : '—'}
                  </Badge>
                  {t.sla_due_at && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Due {new Date(t.sla_due_at).toLocaleString()}
                    </p>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => openTicket(t)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-[11px]"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-xs">
            No support tickets in this view. When parents or staff submit help requests, they appear here.
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Ticket ${selected.ticket_number}` : 'Ticket'}
      >
        {selected && (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <p className="text-slate-400 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Requester</p>
                <p className="font-bold text-white">{selected.requester_name}</p>
                <p className="font-mono text-slate-300 flex items-center gap-1"><Mail className="w-3 h-3" />{selected.requester_email}</p>
                {selected.requester_phone && (
                  <p className="font-mono text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{selected.requester_phone}</p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <p className="text-slate-400 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Request</p>
                <p className="text-cyan-300 font-bold">{selected.category_label || selected.category}</p>
                <p className="text-white font-semibold">{selected.subject}</p>
                <p className="text-amber-300/90 font-mono">
                  App: {selected.related_application_number || selected._matchedAppNumber || 'Not linked'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-darker border border-white/10">
              <p className="text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Description</p>
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{selected.description}</p>
            </div>

            <div className="space-y-2">
              <p className="text-slate-300 font-bold">Correct application / contact details</p>
              <p className="text-[11px] text-slate-500">
                {selected._matchedAppId
                  ? `Matched application #${selected._matchedAppNumber}. Update mistaken fields, then save.`
                  : 'No automatic match — enter the correct details only if you will open Parent Applications separately, or ask the user for their PAR- reference.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {(
                  [
                    ['parent_email', 'Correct email'],
                    ['parent_phone', 'Correct phone'],
                    ['parent_name', 'Parent first name'],
                    ['parent_surname', 'Parent surname'],
                    ['parent_id_number', 'Parent ID number'],
                    ['physical_address', 'Address'],
                    ['child_first_name', 'Learner first name'],
                    ['child_surname', 'Learner surname'],
                    ['child_id_number', 'Learner ID'],
                    ['child_grade', 'Grade']
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
                    <input
                      value={(correctionForm as any)[key]}
                      onChange={(e) => setCorrectionForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-2.5 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/40"
                    />
                  </label>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Internal admin notes</span>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="w-full px-2.5 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Resolution message to user</span>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={2}
                placeholder="e.g. We corrected your email on the application. You can now log in with the new address."
                className="w-full px-2.5 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={!selected._matchedAppId || correcting}
                onClick={handleCorrectApplication}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[11px] disabled:opacity-40"
              >
                {correcting ? 'Saving corrections…' : 'Save corrections & resolve'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleUpdateStatus('in_progress', { claim: true })}
                className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px]"
              >
                Claim & mark in progress
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleUpdateStatus('resolved')}
                className="px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold text-[11px]"
              >
                Resolve (no data change)
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleUpdateStatus('closed')}
                className="px-3 py-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 font-bold text-[11px]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
