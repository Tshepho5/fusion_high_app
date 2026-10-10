import React, { useEffect, useState } from 'react';
import { schoolRegistrationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { Building2, CheckCircle2, ChevronDown } from 'lucide-react';

export const SA_MAJOR_BANKS: { name: string; branchCode: string }[] = [
  { name: 'Standard Bank', branchCode: '051001' },
  { name: 'First National Bank (FNB)', branchCode: '250655' },
  { name: 'Absa Bank', branchCode: '632005' },
  { name: 'Nedbank', branchCode: '198765' },
  { name: 'Capitec Bank', branchCode: '470010' },
  { name: 'Discovery Bank', branchCode: '679000' },
  { name: 'Investec Bank', branchCode: '580105' },
  { name: 'African Bank', branchCode: '430000' },
  { name: 'TymeBank', branchCode: '678910' },
  { name: 'Bidvest Bank', branchCode: '462005' },
  { name: 'Sasfin Bank', branchCode: '683000' },
  { name: 'Bank Zero', branchCode: '888000' },
  { name: 'Al Baraka Bank', branchCode: '800000' },
  { name: 'Habib Overseas Bank', branchCode: '700001' },
];

export const SchoolBankAccount: React.FC = () => {
  const { user } = useAuth();
  const { currentSchool, refreshSchools } = useSchool();
  const schoolId = Number(user?.school_id) || (currentSchool?.id > 0 ? currentSchool.id : 0);
  const [bankName, setBankName] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountType, setAccountType] = useState('Cheque');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    schoolRegistrationService.getBank(schoolId).then((row) => {
      const fetchedBankName = row.bank_name || '';
      setAccountHolder(row.account_holder || '');
      setAccountNumber(row.account_number || '');
      setBranchCode(row.branch_code || '');
      setAccountType(row.account_type || 'Cheque');

      if (fetchedBankName) {
        const found = SA_MAJOR_BANKS.find(
          (b) => b.name.toLowerCase() === fetchedBankName.toLowerCase()
        );
        if (found) {
          setBankName(found.name);
          setIsCustomBank(false);
        } else {
          setBankName('Other');
          setCustomBankName(fetchedBankName);
          setIsCustomBank(true);
        }
      }
    }).catch(() => {});
  }, [schoolId]);

  if (!schoolId) return null;

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setBankName(selected);
    if (selected === 'Other') {
      setIsCustomBank(true);
    } else {
      setIsCustomBank(false);
      const match = SA_MAJOR_BANKS.find((b) => b.name === selected);
      if (match) {
        setBranchCode(match.branchCode);
      }
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const finalBankName = isCustomBank ? customBankName.trim() : bankName.trim();

    try {
      await schoolRegistrationService.updateBank(schoolId, {
        bank_name: finalBankName,
        account_holder: accountHolder.trim(),
        account_number: accountNumber.replace(/\D/g, ''),
        branch_code: branchCode.replace(/\D/g, ''),
        account_type: accountType,
      });
      await refreshSchools();
      setMessage('School bank details saved successfully. Universal branch code linked to official account.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'The bank account could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>Official School Bank Account</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure the verified institutional bank account for fee invoices, EFT transfers, and parent receipts.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          Auto Branch Code Sync
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bank Name Dropdown */}
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1.5">
          <span>Bank Name *</span>
          <div className="relative">
            <select
              value={bankName}
              onChange={handleBankSelect}
              className="w-full appearance-none rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="">-- Select Major South African Bank --</option>
              {SA_MAJOR_BANKS.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.branchCode})
                </option>
              ))}
              <option value="Other">Other / Custom Financial Institution</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </label>

        {/* Branch Code (Auto-populated) */}
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Branch Code *</span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">Auto-populated</span>
          </div>
          <input
            value={branchCode}
            inputMode="numeric"
            placeholder="e.g. 250655"
            onChange={(event) => setBranchCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </label>

        {/* Custom Bank Name Input if "Other" is chosen */}
        {isCustomBank && (
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1.5 sm:col-span-2">
            <span>Specify Custom Bank / Institution Name *</span>
            <input
              value={customBankName}
              placeholder="e.g. Mutual Bank or Credit Union Name"
              onChange={(event) => setCustomBankName(event.target.value)}
              className="w-full rounded-xl border border-cyan-500/40 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </label>
        )}

        {/* Account Holder */}
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1.5">
          <span>Account Holder (School / Institutional Name) *</span>
          <input
            value={accountHolder}
            placeholder="e.g. Fusion High School Operating Account"
            onChange={(event) => setAccountHolder(event.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </label>

        {/* Account Number */}
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1.5">
          <span>Account Number *</span>
          <input
            value={accountNumber}
            inputMode="numeric"
            placeholder="e.g. 62891045231"
            onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 16))}
            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </label>

        {/* Account Type */}
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1.5">
          <span>Account Type</span>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="Cheque">Cheque / Current Account</option>
            <option value="Savings">Savings Account</option>
            <option value="Transmission">Transmission Account</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
        {message && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="ml-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
        >
          {saving ? 'Saving Bank Details...' : 'Save Bank Account Details'}
        </button>
      </div>
    </section>
  );
};
