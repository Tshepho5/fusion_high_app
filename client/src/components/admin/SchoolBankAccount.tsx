import React, { useEffect, useState } from 'react';
import { schoolRegistrationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

export const SchoolBankAccount: React.FC = () => {
  const { user } = useAuth();
  const { currentSchool, refreshSchools } = useSchool();
  const schoolId = Number(user?.school_id) || (currentSchool?.id > 0 ? currentSchool.id : 0);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountType, setAccountType] = useState('Cheque');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    schoolRegistrationService.getBank(schoolId).then((row) => {
      setBankName(row.bank_name || '');
      setAccountHolder(row.account_holder || '');
      setAccountNumber(row.account_number || '');
      setBranchCode(row.branch_code || '');
      setAccountType(row.account_type || 'Cheque');
    }).catch(() => {});
  }, [schoolId]);

  if (!schoolId) return null;

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await schoolRegistrationService.updateBank(schoolId, {
        bank_name: bankName.trim(),
        account_holder: accountHolder.trim(),
        account_number: accountNumber.replace(/\D/g, ''),
        branch_code: branchCode.replace(/\D/g, ''),
        account_type: accountType,
      });
      await refreshSchools();
      setMessage('Saved. Fee payments can now show this school account. No money is taken until the school records that it arrived.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'The bank account could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-4 sm:p-5 space-y-3">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">School bank account</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Card, instant EFT, bank EFT, and cash stay unpaid until this school’s own account is saved here.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1">
          Bank name
          <input value={bankName} onChange={(event) => setBankName(event.target.value.replace(/\d/g, ''))} className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1">
          Account holder
          <input value={accountHolder} onChange={(event) => setAccountHolder(event.target.value.replace(/\d/g, ''))} className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1">
          Account number
          <input value={accountNumber} inputMode="numeric" onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 16))} className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1">
          Branch code
          <input value={branchCode} inputMode="numeric" onChange={(event) => setBranchCode(event.target.value.replace(/\D/g, '').slice(0, 8))} className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        {message && <p className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">{message}</p>}
        <button type="button" onClick={save} disabled={saving} className="ml-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save bank account'}
        </button>
      </div>
    </section>
  );
};
