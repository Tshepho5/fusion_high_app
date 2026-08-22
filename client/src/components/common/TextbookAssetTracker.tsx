import React, { useState, useEffect } from 'react';
import { textbookService, adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { Badge } from './Badge';
import {
  BookOpen,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  Barcode,
  Calendar,
  X
} from 'lucide-react';

export const TextbookAssetTracker: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'admin' || role === 'teacher';

  const [inventory, setInventory] = useState<any[]>([]);
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [selectedAllocationId, setSelectedAllocationId] = useState<number | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    title: '',
    subject: 'Mathematics',
    grade: 12,
    publisher: 'CAPS Publisher',
    isbn: '',
    barcode: '',
    total_copies: 60,
    unit_cost_zar: 280.00
  });

  const [issueForm, setIssueForm] = useState({
    child_id: '',
    condition_on_issue: 'Good'
  });

  const [returnForm, setReturnForm] = useState({
    condition_on_return: 'Good',
    replacement_fee: 0
  });

  useEffect(() => {
    fetchData();
  }, [selectedGrade]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isStaff) {
        const [invData, lData] = await Promise.allSettled([
          textbookService.getInventory(selectedGrade !== 'all' ? { grade: parseInt(selectedGrade, 10) } : undefined),
          adminService.getLearners()
        ]);
        if (invData.status === 'fulfilled') {
          const invList = Array.isArray(invData.value)
            ? invData.value
            : (invData.value?.inventory || invData.value?.textbooks || []);
          setInventory(invList);
        }
        if (lData.status === 'fulfilled') {
          const lList = Array.isArray(lData.value)
            ? lData.value
            : (lData.value?.learners || []);
          setLearners(lList);
          if (lList.length > 0) {
            const firstId = lList[0]?.id ?? lList[0]?.learner_id;
            if (firstId !== undefined && firstId !== null) {
              setIssueForm(prev => ({ ...prev, child_id: firstId.toString() }));
            }
          }
        }
      } else {
        const books = await textbookService.getMyBooks();
        const bookList = Array.isArray(books)
          ? books
          : (books?.textbooks || books?.allocations || []);
        setMyBooks(bookList);
      }
    } catch (err: any) {
      console.error('Error fetching textbooks:', err);
      setError('Could not load textbook inventory.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTextbook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await textbookService.addInventory(addForm);
      setSuccess('Textbook added to school catalog.');
      setIsAddModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add textbook.');
    }
  };

  const handleIssueTextbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !issueForm.child_id) return;
    try {
      const res = await textbookService.issueTextbook({
        inventory_id: selectedBook.id,
        child_id: parseInt(issueForm.child_id, 10),
        condition_on_issue: issueForm.condition_on_issue
      });
      setSuccess(res.message || 'Textbook issued successfully.');
      setIsIssueModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to issue textbook.');
    }
  };

  const handleReturnTextbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocationId) return;
    try {
      const res = await textbookService.returnTextbook(selectedAllocationId, returnForm);
      setSuccess(res.message || 'Textbook return logged.');
      setIsReturnModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to log return.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading textbook inventory and learning assets..." />;
  }

  // Learner / Parent View
  if (!isStaff) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-brand-900 via-surface-dark to-surface-dark border border-brand-500/20 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="indigo" size="sm">Learning Asset Management</Badge>
            <Badge variant="emerald" size="sm">{myBooks.filter(b => b.status === 'issued').length} Issued</Badge>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-400" />
            <span>My Issued Textbooks</span>
          </h2>
        </div>

        {myBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBooks.map((book: any) => (
              <div
                key={book.id}
                className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">{book.subject} (Grade {book.grade})</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{book.title}</h3>
                    <p className="text-xs text-slate-400">{book.publisher}</p>
                  </div>
                  <Badge variant={book.status === 'issued' ? 'emerald' : 'slate'} size="sm">
                    {book.status === 'issued' ? 'In Possession' : book.status}
                  </Badge>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Barcode / ISBN:</span>
                    <span className="font-mono text-white">{book.barcode || book.isbn || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Issued Date:</span>
                    <span>{new Date(book.issued_date).toLocaleDateString('en-ZA')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Condition on Issue:</span>
                    <span className="font-semibold text-emerald-400">{book.condition_on_issue}</span>
                  </div>
                  {book.replacement_fee > 0 && (
                    <div className="flex items-center justify-between text-rose-400 pt-1 border-t border-white/5 font-bold">
                      <span>Fee Due:</span>
                      <span>R{parseFloat(book.replacement_fee).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-surface-dark border border-white/5 text-center text-xs text-slate-400">
            No textbooks currently recorded under your learner profile.
          </div>
        )}
      </div>
    );
  }

  // Admin & Teacher View
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const filteredInventory = safeInventory.filter(i => {
    if (!i) return false;
    const title = (i.title || '').toString().toLowerCase();
    const subject = (i.subject || '').toString().toLowerCase();
    const barcode = (i.barcode || '').toString().toLowerCase();
    const isbn = (i.isbn || '').toString().toLowerCase();
    const query = (searchQuery || '').toLowerCase();
    return title.includes(query) || subject.includes(query) || barcode.includes(query) || isbn.includes(query);
  });

  const [scanningOverdue, setScanningOverdue] = useState<boolean>(false);

  const handleAutoBillOverdue = async () => {
    setScanningOverdue(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await textbookService.autoBillOverdue();
      setSuccess(res.message || 'Overdue scan completed and replacement fees billed to parents.');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to auto-bill overdue textbooks.');
    } finally {
      setScanningOverdue(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-400" />
            <span>Textbook Inventory</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAutoBillOverdue}
            disabled={scanningOverdue}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Barcode className="w-4 h-4" />
            <span>{scanningOverdue ? 'Scanning & Invoicing...' : '⚡ 1-Click Overdue Scan & Loss Invoicing'}</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Textbook</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, subject, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Grade:</span>
          {['all', '8', '9', '10', '11', '12'].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedGrade === g ? 'bg-brand-600 text-white' : 'bg-surface-dark text-slate-300 border border-white/10'
              }`}
            >
              {g === 'all' ? 'All' : `Gr ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item) => {
          const available = item.available_copies || 0;
          const total = item.total_copies || 0;
          const issued = total - available;

          return (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="indigo" size="sm">Grade {item.grade}</Badge>
                  <span className="text-xs font-bold font-mono text-emerald-400">{available} in Stock</span>
                </div>

                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-400">{item.subject} | {item.publisher}</p>

                <div className="pt-2 border-t border-white/5 space-y-1 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Barcode:</span>
                    <span className="font-mono text-cyan-300">{item.barcode || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Issued to Learners:</span>
                    <span>{issued} Copies</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Replacement Cost:</span>
                    <span className="font-semibold text-white">R{parseFloat(item.unit_cost_zar || 250).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5">
                <button
                  type="button"
                  disabled={available <= 0}
                  onClick={() => {
                    setSelectedBook(item);
                    setIsIssueModalOpen(true);
                  }}
                  className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Issue Copy to Learner</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Textbook */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white">Catalog New Textbook</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTextbook} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Textbook Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mind Action Series Mathematics Grade 12"
                  value={addForm.title}
                  onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={addForm.subject}
                    onChange={(e) => setAddForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Grade *</label>
                  <select
                    value={addForm.grade}
                    onChange={(e) => setAddForm(prev => ({ ...prev, grade: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={8}>Grade 8</option>
                    <option value={9}>Grade 9</option>
                    <option value={10}>Grade 10</option>
                    <option value={11}>Grade 11</option>
                    <option value={12}>Grade 12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Barcode / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MATH-12-001"
                    value={addForm.barcode}
                    onChange={(e) => setAddForm(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total Copies</label>
                  <input
                    type="number"
                    min={1}
                    value={addForm.total_copies}
                    onChange={(e) => setAddForm(prev => ({ ...prev, total_copies: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-brand-600 text-white font-bold">
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Textbook */}
      {isIssueModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white">Issue Textbook Copy</h3>
                <p className="text-xs text-slate-400">{selectedBook.title} (Gr {selectedBook.grade})</p>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueTextbook} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Select Learner *</label>
                <select
                  value={issueForm.child_id}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, child_id: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  {learners.map((l: any, idx: number) => {
                    const lId = l.id ?? l.learner_id ?? idx;
                    return (
                      <option key={lId} value={lId}>
                        {l.full_name || l.name || 'Learner'} {l.surname || ''} (Grade {l.grade || 10}{l.stream ? ` - ${l.stream}` : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Condition on Issue</label>
                <select
                  value={issueForm.condition_on_issue}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, condition_on_issue: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsIssueModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-brand-600 text-white font-bold">
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
