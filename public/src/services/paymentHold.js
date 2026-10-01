/**
 * Payment choices are recorded, and none of them take money until the
 * school has connected its own bank account. Placeholder accounts are ignored.
 */

const PLACEHOLDER_ACCOUNTS = new Set(['62849102841', '20491823901']);

const METHOD_LABELS = {
  card: 'Card (PayFast)',
  instant_eft: 'Instant EFT (Ozow)',
  eft: 'Bank EFT',
  cash: 'Cash at the school office'
};

function normaliseMethod(raw) {
  const value = String(raw || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (['card', 'payfast', 'visa', 'mastercard', 'instant_online', 'credit_card', 'debit_card'].includes(value)) return 'card';
  if (['instant_eft', 'ozow', 'snapscan', 'instant'].includes(value)) return 'instant_eft';
  if (['cash', 'cash_office', 'school_office'].includes(value)) return 'cash';
  if (['eft', 'bank_transfer', 'bank', 'bank_eft'].includes(value)) return 'eft';
  return 'eft';
}

function realBank(school) {
  if (!school) return null;
  const account = String(school.account_number || '').replace(/\D/g, '');
  const branch = String(school.branch_code || '').replace(/\D/g, '');
  const bankName = String(school.bank_name || '').trim();
  const holder = String(school.account_holder || '').trim();
  if (account.length < 6 || branch.length < 4 || !bankName || !holder) return null;
  if (PLACEHOLDER_ACCOUNTS.has(account)) return null;
  return {
    bank_name: bankName,
    account_holder: holder,
    account_number: account,
    branch_code: branch,
    account_type: school.account_type || 'Cheque / Current'
  };
}

function describe(method, school, amount, reference) {
  const normalised = normaliseMethod(method);
  const label = METHOD_LABELS[normalised];
  const money = Number(amount || 0).toFixed(2);
  const bank = realBank(school);

  if (!bank) {
    return {
      held: true,
      paid: false,
      method: normalised,
      method_label: label,
      status: 'awaiting_bank',
      banking_details: null,
      message: `${label} for R${money} is saved and waiting. No money is taken until this school connects its own bank account.`
    };
  }

  return {
    held: true,
    paid: false,
    method: normalised,
    method_label: label,
    status: 'awaiting_transfer',
    banking_details: {
      ...bank,
      reference: reference || ''
    },
    message: normalised === 'card' || normalised === 'instant_eft'
      ? `${label} for R${money} is waiting. The school bank account is on file, and this channel opens when that account is linked. No money has been taken.`
      : `${label} for R${money} uses the school bank account below. The fee stays unpaid until the school records that the money arrived.`
  };
}

module.exports = {
  METHOD_LABELS,
  normaliseMethod,
  realBank,
  describe
};
