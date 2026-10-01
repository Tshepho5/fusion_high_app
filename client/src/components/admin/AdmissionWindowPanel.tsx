import React, { useEffect, useState } from 'react';
import { Building2, GraduationCap, Users, UserPlus, BookOpen, Briefcase } from 'lucide-react';

export interface PortalControl {
  id?: string;
  is_locked?: boolean;
  switch_locked?: boolean;
  effectively_closed?: boolean;
  locked_reason?: string;
  public_reason?: string;
  opens_at?: string | null;
  closes_at?: string | null;
  closure?: string;
}

interface AdmissionWindowPanelProps {
  controls: Record<string, PortalControl>;
  busyId?: string | null;
  onSave: (id: string, payload: { is_locked?: boolean; locked_reason?: string; opens_at?: string | null; closes_at?: string | null }) => Promise<void>;
}

const GATES = [
  {
    id: 'school_registration',
    eyebrow: 'Principals',
    title: 'School registration',
    detail: 'The period when a principal can submit their school into Geleza SA.',
    icon: Building2,
  },
  {
    id: 'parent_application',
    eyebrow: 'Scenario 1',
    title: 'New family applications',
    detail: 'The Apply button for a parent and learner who are both new.',
    icon: GraduationCap,
  },
  {
    id: 'sibling_enrollment',
    eyebrow: 'Scenario 2',
    title: 'Sibling enrollment',
    detail: 'A parent already on the system enrolls a learner who is not yet enrolled.',
    icon: Users,
  },
  {
    id: 'parent_registration',
    eyebrow: 'Scenario 3',
    title: 'Parent registration',
    detail: 'A new parent registers and links a learner who is already enrolled.',
    icon: UserPlus,
  },
  {
    id: 'learner_registration',
    eyebrow: 'Learners',
    title: 'Learner registration',
    detail: 'A learner creates their own portal account.',
    icon: BookOpen,
  },
  {
    id: 'teacher_registration',
    eyebrow: 'Teachers',
    title: 'Teacher registration',
    detail: 'An invited educator applies and finishes registration.',
    icon: Briefcase,
  },
];

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusLine(control?: PortalControl) {
  if (!control) return 'Loading this gate.';
  if (control.switch_locked ?? control.is_locked) return 'The switch is off.';
  if (control.closure === 'before_window') return control.public_reason || 'The period has not opened.';
  if (control.closure === 'after_window') return control.public_reason || 'The period has closed.';
  if (control.opens_at || control.closes_at) {
    const opens = control.opens_at ? new Date(control.opens_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'now';
    const closes = control.closes_at ? new Date(control.closes_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'until you turn it off';
    return `Open from ${opens} to ${closes}.`;
  }
  return 'Open until you turn the switch off.';
}

export const AdmissionWindowPanel: React.FC<AdmissionWindowPanelProps> = ({ controls, busyId, onSave }) => {
  const [drafts, setDrafts] = useState<Record<string, { opens: string; closes: string }>>({});

  useEffect(() => {
    const next: Record<string, { opens: string; closes: string }> = {};
    GATES.forEach((gate) => {
      const control = controls[gate.id];
      next[gate.id] = {
        opens: toLocalInput(control?.opens_at),
        closes: toLocalInput(control?.closes_at),
      };
    });
    setDrafts(next);
  }, [controls]);

  return (
    <div className="space-y-3">
      {GATES.map((gate) => {
        const control = controls[gate.id];
        const switchedOff = Boolean(control?.switch_locked ?? control?.is_locked);
        const closed = Boolean(control?.effectively_closed ?? switchedOff);
        const busy = busyId === gate.id;
        const Icon = gate.icon;
        const draft = drafts[gate.id] || { opens: '', closes: '' };

        return (
          <div key={gate.id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 p-4 shadow-sm">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="flex items-start gap-3 min-w-0 xl:w-[340px]">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-slate-700 dark:text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{gate.eyebrow}</p>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{gate.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{gate.detail}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2 flex-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex-1">
                  Opens
                  <input
                    type="datetime-local"
                    value={draft.opens}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [gate.id]: { ...draft, opens: event.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex-1">
                  Closes
                  <input
                    type="datetime-local"
                    value={draft.closes}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [gate.id]: { ...draft, closes: event.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSave(gate.id, {
                    opens_at: fromLocalInput(draft.opens),
                    closes_at: fromLocalInput(draft.closes),
                  })}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Save period
                </button>
              </div>

              <div className="flex items-center justify-between xl:justify-end gap-3 xl:w-[220px]">
                <div className="text-right">
                  <p className={`text-xs font-extrabold ${closed ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {closed ? 'Closed' : 'Open'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[140px]">{statusLine(control)}</p>
                </div>
                <button
                  type="button"
                  disabled={busy || !control}
                  onClick={() => onSave(gate.id, {
                    is_locked: !switchedOff,
                    locked_reason: control?.locked_reason,
                  })}
                  className={`relative h-8 w-14 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${switchedOff ? 'bg-slate-300 dark:bg-slate-700' : 'bg-emerald-500'}`}
                  aria-pressed={!switchedOff}
                  title={switchedOff ? 'Turn on' : 'Turn off'}
                >
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${switchedOff ? 'left-1' : 'left-7'}`} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
