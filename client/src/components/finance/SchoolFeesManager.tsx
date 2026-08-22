import React, { useState, useEffect } from 'react';
import { financeService } from '../../services/api';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  CreditCard, 
  Receipt, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowUpRight, 
  ShieldCheck, 
  Wallet, 
  FileText, 
  Calendar, 
  User, 
  Layers, 
  Search,
  Plus,
  Zap,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SchoolFeesManagerProps {
  userRole: 'parent' | 'learner' | 'admin';
  childId?: number | string;
  learnerName?: string;
}

export const SchoolFeesManager: React.FC<SchoolFeesManagerProps> = ({
  userRole,
  childId,
  learnerName
}) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'overview'>('invoices');

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PayFast');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);

  // Admin Create Invoice Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    learner_id: '',
    title: '',
    description: '',
    category: 'Tuition',
    term: 'Term 3 2026',
    amount: '',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invData, recData] = await Promise.all([
        financeService.getInvoices({ childId }),
        financeService.getReceipts()
      ]);
      setInvoices(Array.isArray(invData) ? invData : []);
      setReceipts(Array.isArray(recData) ? recData : []);

      if (userRole === 'admin') {
        const ovData = await financeService.getFinanceOverview();
        setOverview(ovData);
      }
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [childId]);

  const handleOpenPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance || invoice.amount);
    setPaymentSuccessData(null);
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setIsProcessingPayment(true);
    try {
      const res = await financeService.payInvoice({
        invoiceId: selectedInvoice.id,
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod,
        notes: `Online Settlement for ${selectedInvoice.invoice_number}`
      });

      setPaymentSuccessData(res);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      fetchData();
    } catch (err: any) {
      alert('Payment processing failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Calculate quick summary
  const totalBilled = invoices.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const totalPaid = invoices.reduce((acc, curr) => acc + parseFloat(curr.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((acc, curr) => acc + parseFloat(curr.balance || 0), 0);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading School Fee Statements & Payment Gateway..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-glow-indigo">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold font-display text-white">
                School Fees & Online Payments
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 font-bold">
                South African Gateway Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {learnerName ? `Fee Statements & Receipts for ${learnerName}` : 'Digital Tuition Invoicing, Instant EFT & PDF Receipts'}
            </p>
          </div>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Fee Invoice</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-2 shadow-lg">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Total Billed</p>
          <h3 className="text-2xl font-extrabold text-white font-mono">
            R {totalBilled.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400">{invoices.length} Total Statement Records</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface-dark border border-emerald-500/20 space-y-2 shadow-lg">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">Total Settled / Paid</p>
          <h3 className="text-2xl font-extrabold text-emerald-400 font-mono">
            R {totalPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-emerald-300/80">Verified Gateway Receipts</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface-dark border border-amber-500/20 space-y-2 shadow-lg">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">Outstanding Balance</p>
          <h3 className="text-2xl font-extrabold text-amber-300 font-mono">
            R {totalOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-amber-300/80">
            {totalOutstanding <= 0 ? '✓ Account Fully Settled' : 'Payable via PayFast / Ozow'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'invoices' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Fee Invoices & Statements ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'receipts' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Payment Receipts ({receipts.length})</span>
        </button>

        {userRole === 'admin' && overview && (
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>School-Wide Finance Analytics</span>
          </button>
        )}
      </div>

      {/* TAB 1: INVOICES & STATEMENTS */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 text-slate-400 text-xs">
              No fee invoices found for this account.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {invoices.map((inv) => {
                const isPaid = inv.status === 'paid' || parseFloat(inv.balance) <= 0;
                const breakdown = Array.isArray(inv.itemized_breakdown) ? inv.itemized_breakdown : [];

                return (
                  <div
                    key={inv.id}
                    className={`p-6 rounded-3xl bg-surface-dark border transition-all ${
                      isPaid ? 'border-emerald-500/30' : 'border-white/10 hover:border-brand-500/40 shadow-xl'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs text-brand-300 font-bold">{inv.invoice_number}</span>
                          <Badge
                            variant={isPaid ? 'emerald' : inv.status === 'partial' ? 'amber' : 'rose'}
                            size="sm"
                          >
                            {inv.status?.toUpperCase()}
                          </Badge>
                          <span className="text-[11px] font-semibold text-slate-400">&bull; {inv.term}</span>
                        </div>
                        <h4 className="text-base font-bold text-white">{inv.title}</h4>
                        <p className="text-xs text-slate-400">
                          Learner: <strong className="text-slate-200">{inv.learner_name} {inv.learner_surname}</strong> (Grade {inv.learner_grade}) &bull; Due Date: {new Date(inv.due_date).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Amounts & Pay Action */}
                      <div className="flex flex-wrap items-center gap-4 lg:text-right">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Invoice Total</p>
                          <p className="text-base font-bold text-white font-mono">
                            R {parseFloat(inv.amount).toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-bold text-amber-400 font-mono">Outstanding</p>
                          <p className="text-lg font-black text-amber-300 font-mono">
                            R {parseFloat(inv.balance).toFixed(2)}
                          </p>
                        </div>

                        {!isPaid && userRole !== 'learner' && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-glow-emerald transition-all flex items-center gap-2"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Online (Instant EFT / Card)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Itemized Breakdown Accordion/Cards */}
                    {breakdown.length > 0 && (
                      <div className="mt-4 pt-2">
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Itemized Levy Breakdown:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {breakdown.map((item: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-surface-darker border border-white/5 flex items-center justify-between text-xs">
                              <span className="text-slate-300 text-[11px] truncate pr-2">{item.item}</span>
                              <span className="font-mono font-bold text-white text-[11px]">
                                R {parseFloat(item.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          {receipts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10 text-slate-400 text-xs">
              No payment receipts recorded yet.
            </div>
          ) : (
            <div className="rounded-3xl bg-surface-dark border border-white/10 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="bg-surface-darker border-b border-white/10 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Invoice Reference</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 font-mono">Amount Paid</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {receipts.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{rec.receipt_number}</td>
                      <td className="py-3 px-4 font-mono text-brand-300">{rec.invoice_number || rec.payment_reference}</td>
                      <td className="py-3 px-4 font-medium text-white">{rec.learner_name} {rec.learner_surname}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-mono text-slate-300">
                          {rec.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        R {parseFloat(rec.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="emerald" size="sm">CONFIRMED</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMIN FINANCE ANALYTICS */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Collection Rate</p>
              <h3 className="text-3xl font-extrabold text-cyan-400 font-mono">
                {overview.summary.collection_rate_percent}%
              </h3>
              <p className="text-[11px] text-slate-400">Of Total Invoiced School Fees</p>
            </div>

            <div className="p-5 rounded-3xl bg-surface-dark border border-emerald-500/20 space-y-1">
              <p className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Fully Paid Accounts</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 font-mono">
                {overview.summary.paid_count}
              </h3>
              <p className="text-[11px] text-slate-400">Settled In Full</p>
            </div>

            <div className="p-5 rounded-3xl bg-surface-dark border border-amber-500/20 space-y-1">
              <p className="text-[10px] uppercase font-bold text-amber-400 font-mono">Partial Payment Plans</p>
              <h3 className="text-3xl font-extrabold text-amber-300 font-mono">
                {overview.summary.partial_count}
              </h3>
              <p className="text-[11px] text-slate-400">Paying in installments</p>
            </div>

            <div className="p-5 rounded-3xl bg-surface-dark border border-rose-500/20 space-y-1">
              <p className="text-[10px] uppercase font-bold text-rose-400 font-mono">Pending / In Arrears</p>
              <h3 className="text-3xl font-extrabold text-rose-400 font-mono">
                {overview.summary.pending_count}
              </h3>
              <p className="text-[11px] text-slate-400">Requires follow-up</p>
            </div>
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`South African Payment Gateway — ${selectedInvoice?.invoice_number || 'Invoice'}`}
        maxWidth="2xl"
      >
        {paymentSuccessData ? (
          <div className="p-6 text-center space-y-4 text-white">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow-emerald">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold font-display">Payment Successful!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Your settlement has been verified and applied to invoice <strong>{selectedInvoice?.invoice_number}</strong>.
            </p>
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 font-mono text-xs space-y-1 text-left max-w-sm mx-auto">
              <div className="flex justify-between"><span>Receipt No:</span><strong className="text-emerald-400">{paymentSuccessData.payment?.receipt_number}</strong></div>
              <div className="flex justify-between"><span>Amount Paid:</span><strong className="text-white">R {parseFloat(paymentSuccessData.payment?.amount).toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Remaining Balance:</span><strong className="text-cyan-400">R {parseFloat(paymentSuccessData.invoice?.balance || 0).toFixed(2)}</strong></div>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleExecutePayment} className="space-y-5 text-xs text-white">
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Invoice Reference</p>
                <p className="font-bold text-white text-sm">{selectedInvoice?.title}</p>
                <p className="text-[11px] text-slate-400">{selectedInvoice?.learner_name} {selectedInvoice?.learner_surname} &bull; {selectedInvoice?.term}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Remaining Balance</p>
                <p className="text-lg font-black text-amber-300 font-mono">R {parseFloat(selectedInvoice?.balance || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-bold">Select South African Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'PayFast', label: 'PayFast', sub: 'Instant Credit/Debit' },
                  { id: 'Ozow', label: 'Ozow', sub: 'Instant EFT Bank' },
                  { id: 'SnapScan', label: 'SnapScan', sub: 'QR Code Mobile' },
                  { id: 'Card', label: 'Visa / Master', sub: 'Secure 3D Card' }
                ].map((method) => (
                  <button
                    type="button"
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === method.id
                        ? 'bg-brand-600/30 border-cyan-500 shadow-glow-indigo text-white'
                        : 'bg-surface-darker border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold text-xs text-white">{method.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{method.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold">Payment Amount (ZAR - South African Rand)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">R</span>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice?.balance || 50000}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-2xl bg-surface-darker border border-white/10 pl-8 pr-4 py-3 text-white font-mono font-bold text-base focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>256-Bit SSL Encrypted & POPIA Compliant Payment Processing. Instant digital receipt will be generated.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isProcessingPayment ? 'Connecting Gateway...' : `Authorize R ${parseFloat(String(paymentAmount || 0)).toFixed(2)}`}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
