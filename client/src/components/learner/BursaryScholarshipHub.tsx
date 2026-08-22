import React, { useState, useEffect } from 'react';
import { bursaryService } from '../../services/api';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  GraduationCap, 
  Award, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  BookOpen, 
  Building2, 
  DollarSign, 
  Calendar, 
  ShieldCheck, 
  Filter, 
  Search, 
  Bookmark, 
  FileCheck, 
  CheckSquare, 
  Square,
  HelpCircle,
  TrendingUp,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BursaryScholarshipHubProps {
  childId?: number | string;
  isParentView?: boolean;
}

export const BursaryScholarshipHub: React.FC<BursaryScholarshipHubProps> = ({
  childId,
  isParentView = false
}) => {
  const [bursaries, setBursaries] = useState<any[]>([]);
  const [learnerData, setLearnerData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Bursary Modal State
  const [selectedBursary, setSelectedBursary] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [appStatus, setAppStatus] = useState<string>('bookmarked');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await bursaryService.getLearnerMatches(childId);
      setLearnerData(data.learner || null);
      setBursaries(Array.isArray(data.matches) ? data.matches : []);
    } catch (err) {
      console.error('Error fetching bursary matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [childId]);

  const handleOpenDetail = (bursary: any) => {
    setSelectedBursary(bursary);
    setChecklist(bursary.tracking_data?.checklist_progress || {});
    setAppStatus(bursary.tracking_data?.status || 'bookmarked');
    setIsDetailModalOpen(true);
  };

  const handleToggleChecklist = (docName: string) => {
    setChecklist(prev => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  const handleSaveTracking = async () => {
    if (!selectedBursary) return;
    setIsSaving(true);
    try {
      await bursaryService.trackBursary({
        bursaryId: selectedBursary.id,
        status: appStatus as any,
        checklistProgress: checklist,
        learnerId: childId || learnerData?.id
      });
      if (appStatus === 'applied' || appStatus === 'awarded') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
      setIsDetailModalOpen(false);
      fetchMatches();
    } catch (err: any) {
      alert('Failed to save tracking: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBursaries = bursaries.filter(b => {
    const matchesCat = selectedCategory === 'all' || b.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = !searchQuery || 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.target_fields && b.target_fields.some((f: string) => f.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner size="lg" text="Calculating AI & CAPS Bursary Matching Opportunities..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-glow-indigo">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold font-display text-white">
                NSFAS & Tertiary Bursary Matching Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono text-amber-300 font-bold">
                South African Higher Education
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated matching based on CAPS subject performance, calculated APS, and career streams.
            </p>
          </div>
        </div>

        {/* Academic Profile Snippet */}
        {learnerData && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-darker border border-white/5">
            <div className="text-center px-2 border-r border-white/10">
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Simulated APS</p>
              <p className="text-xl font-black text-cyan-400 font-mono">{learnerData.calculated_aps}</p>
            </div>
            <div className="text-center px-2 border-r border-white/10">
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Academic Avg</p>
              <p className="text-xl font-black text-emerald-400 font-mono">{learnerData.academic_average}%</p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Stream</p>
              <p className="text-xs font-bold text-amber-300">{learnerData.stream || 'Science'} (Gr {learnerData.grade || 12})</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Opportunities' },
            { id: 'STEM', label: 'STEM & Engineering' },
            { id: 'Commerce', label: 'Commerce & Finance' },
            { id: 'Teaching', label: 'Teaching & Education' },
            { id: 'Technology', label: 'Technology & ICT' },
            { id: 'General', label: 'General / NSFAS' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sponsor, degree, or field..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl bg-surface-dark border border-white/10 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Bursary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredBursaries.map((bursary) => {
          const matchScore = bursary.match_score || 85;
          const isHighMatch = matchScore >= 80;
          const isTracked = bursary.is_tracked;

          return (
            <div
              key={bursary.id}
              className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group"
            >
              {/* Top Bar: Sponsor & Match Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      {bursary.category}
                    </span>
                    {isTracked && (
                      <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        ✓ {bursary.tracking_data?.status?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors">
                    {bursary.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{bursary.sponsor}</span>
                  </p>
                </div>

                {/* Match Score Circular / Badge */}
                <div className="text-right shrink-0">
                  <div className={`px-2.5 py-1 rounded-2xl border font-mono font-extrabold text-xs flex items-center gap-1 ${
                    isHighMatch
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    <span>{matchScore}% Match</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Min APS: <strong>{bursary.min_aps}</strong>
                  </p>
                </div>
              </div>

              {/* Target Fields */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono font-bold uppercase text-slate-400">Target Study Fields:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(bursary.target_fields || []).slice(0, 3).map((field: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-surface-darker border border-white/5 text-[11px] text-slate-300">
                      {field}
                    </span>
                  ))}
                  {(bursary.target_fields || []).length > 3 && (
                    <span className="px-2 py-0.5 rounded-lg bg-surface-darker text-[10px] text-slate-500">
                      +{(bursary.target_fields || []).length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Coverage Pills */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono font-bold uppercase text-slate-400">Funding Coverage:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(bursary.coverage_details || []).slice(0, 3).map((cov: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-300">
                      ✓ {cov}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: Annual Value, Deadline & Action */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Estimated Value</p>
                  <p className="font-extrabold text-white font-mono text-sm">
                    ~ R {parseFloat(bursary.estimated_annual_value || 120000).toLocaleString('en-ZA')}/yr
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDetail(bursary)}
                    className="px-3.5 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Checklist</span>
                  </button>

                  <a
                    href={bursary.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>Apply</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail & Document Checklist Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedBursary?.name || 'Bursary Details & Checklist'}
        maxWidth="2xl"
      >
        {selectedBursary && (
          <div className="space-y-6 text-xs text-white">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-mono font-bold uppercase">{selectedBursary.sponsor}</span>
                <span className="font-mono text-emerald-400 font-bold">~ R {parseFloat(selectedBursary.estimated_annual_value || 120000).toLocaleString('en-ZA')}/yr</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{selectedBursary.eligibility_criteria}</p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 text-[11px] font-mono text-slate-400">
                <span>Min APS: <strong className="text-white">{selectedBursary.min_aps}</strong></span>
                <span>•</span>
                <span>Min Aggregate: <strong className="text-white">{selectedBursary.min_aggregate_percentage}%</strong></span>
                <span>•</span>
                <span>Income Cap: <strong className="text-amber-300">{selectedBursary.household_income_cap || 'Open'}</strong></span>
                <span>•</span>
                <span>Deadline: <strong className="text-rose-300">{selectedBursary.deadline_date || 'Open Throughout Year'}</strong></span>
              </div>
            </div>

            {/* Required Certified Documents Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span>Required Certified Documents Checklist</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {Object.values(checklist).filter(Boolean).length} of {(selectedBursary.required_documents || []).length} Prepared
                </span>
              </div>

              <div className="space-y-2">
                {(selectedBursary.required_documents || [
                  'Certified Copy of Learner Smart ID / Birth Certificate',
                  'Certified Copy of Parent/Guardian ID Document',
                  'Proof of Household Income / SASSA Letter / 3-Month Salary Slips',
                  'Official Grade 11 Final & Grade 12 Term 1/2 Academic Reports',
                  'Motivational Essay / Academic Reference Letter'
                ]).map((doc: string, idx: number) => {
                  const isChecked = !!checklist[doc];
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handleToggleChecklist(doc)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-surface-darker border-white/5 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs font-medium">{doc}</span>
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Application Status Selector */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-300">Update Application Tracking Status:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'bookmarked', label: '📌 Bookmarked' },
                  { id: 'in_progress', label: '✍️ In Progress' },
                  { id: 'applied', label: '🚀 Applied' },
                  { id: 'awarded', label: '🎉 Awarded' }
                ].map(st => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setAppStatus(st.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      appStatus === st.id
                        ? 'bg-amber-500/30 border-amber-400 text-white'
                        : 'bg-surface-darker border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <a
                href={selectedBursary.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold flex items-center gap-1.5"
              >
                <span>Visit Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleSaveTracking}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-extrabold shadow-md transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Checklist & Status'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
