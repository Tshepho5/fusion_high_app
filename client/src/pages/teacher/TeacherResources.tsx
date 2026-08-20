import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SubjectPastPapers } from '../../components/subject/SubjectPastPapers';
import {
  FileText,
  Upload,
  BookOpen,
  Download,
  Trash2,
  Search,
  Filter,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Calendar,
  Layers,
  ExternalLink,
  Eye,
  FileCheck,
  Megaphone,
  X
} from 'lucide-react';

interface ResourceItem {
  id: number;
  subject: string;
  grade: number;
  stream?: string;
  resource_type: 'past_paper' | 'textbook' | 'study_guide' | 'worksheet' | 'exam_memo' | string;
  title: string;
  description?: string;
  term?: string;
  year?: number;
  file_name?: string;
  file_size?: string;
  file_path: string;
  upload_date: string;
}

const SUBJECTS_LIST = [
  'Mathematics',
  'Mathematical Literacy',
  'Physical Sciences',
  'Life Sciences',
  'Accounting',
  'Business Studies',
  'Economics',
  'English Home Language',
  'English First Additional Language',
  'Geography',
  'History',
  'Computer Applications Technology',
  'Information Technology',
  'Life Orientation',
  'Tourism'
];

const RESOURCE_TYPES = [
  { id: 'past_paper', label: 'Past Exam Question Paper', icon: FileText, color: 'rose' },
  { id: 'textbook', label: 'CAPS Approved Textbook', icon: BookOpen, color: 'cyan' },
  { id: 'study_guide', label: 'Study Guide & Notes', icon: Layers, color: 'indigo' },
  { id: 'worksheet', label: 'Revision Worksheet', icon: FileCheck, color: 'emerald' },
  { id: 'exam_memo', label: 'Exam Memorandum', icon: CheckCircle2, color: 'amber' },
];

export const TeacherResources: React.FC<{ onNavigateTab?: (tab: string, params?: any) => void }> = ({ onNavigateTab }) => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');

  // Preview past papers bank modal
  const [previewPaperModal, setPreviewPaperModal] = useState<{ subject: string; grade: number } | null>(null);

  // Upload Form State
  const [formData, setFormData] = useState({
    subject: 'Mathematics',
    grade: '10',
    stream: 'General',
    resource_type: 'past_paper',
    title: '',
    description: '',
    term: 'Term 3',
    year: '2026',
    file: null as File | null,
  });

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teacherService.getMyResources();
      setResources(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load teacher resources:', err);
      setError('Could not retrieve uploaded resources from database.');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      setError('Please select a PDF document to upload.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('file', formData.file);
      data.append('subject', formData.subject);
      data.append('grade', formData.grade);
      data.append('stream', formData.stream);
      data.append('resource_type', formData.resource_type);
      data.append('title', formData.title || `${formData.subject} Grade ${formData.grade} ${formData.resource_type}`);
      data.append('description', formData.description);
      data.append('term', formData.term);
      data.append('year', formData.year);

      const res = await teacherService.uploadResource(data);

      setSuccessMsg(res?.message || 'Resource uploaded successfully! Targeted notifications dispatched to learners.');
      setIsUploadModalOpen(false);
      setFormData({
        subject: 'Mathematics',
        grade: '10',
        stream: 'General',
        resource_type: 'past_paper',
        title: '',
        description: '',
        term: 'Term 3',
        year: '2026',
        file: null,
      });
      fetchResources();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload resource to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await teacherService.deleteResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
      setSuccessMsg(`Resource "${title}" removed successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove resource.');
    }
  };

  const filteredResources = resources.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubjectFilter === 'All' || item.subject?.toLowerCase() === selectedSubjectFilter.toLowerCase();
    const matchesGrade = selectedGradeFilter === 'All' || String(item.grade) === String(selectedGradeFilter);
    const matchesType = selectedTypeFilter === 'All' || item.resource_type === selectedTypeFilter;

    return matchesSearch && matchesSubject && matchesGrade && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'past_paper':
        return <Badge variant="rose" size="sm">Past Exam Paper</Badge>;
      case 'textbook':
        return <Badge variant="cyan" size="sm">CAPS Textbook</Badge>;
      case 'study_guide':
        return <Badge variant="indigo" size="sm">Study Guide</Badge>;
      case 'worksheet':
        return <Badge variant="emerald" size="sm">Worksheet</Badge>;
      case 'exam_memo':
        return <Badge variant="amber" size="sm">Memorandum</Badge>;
      default:
        return <Badge variant="slate" size="sm">Resource</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-surface-dark to-surface-dark border border-cyan-500/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="cyan" size="sm">Educator Resource Studio</Badge>
              <Badge variant="indigo" size="sm">Automated Learner Notifications</Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
              Learning Resources & Past Papers
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
              Upload past question papers, CAPS textbooks, study guides, and worksheets. When you publish, targeted notifications are instantly sent to enrolled learners and parents.
            </p>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 self-start md:self-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-xs tracking-wide shadow-glow-cyan transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Resource</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 rounded-2xl bg-surface-dark border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past papers, textbooks, or syllabus topics..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Subjects</option>
            {SUBJECTS_LIST.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Grades</option>
            {[8, 9, 10, 11, 12].map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-darker border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Types</option>
            {RESOURCE_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" text="Loading educator learning resources..." />
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-3xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 p-5 transition-all flex flex-col justify-between hover:shadow-glow-cyan"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    {item.resource_type === 'past_paper' ? <FileText className="w-5 h-5 text-rose-400" /> : <BookOpen className="w-5 h-5 text-cyan-400" />}
                  </div>
                  {getTypeBadge(item.resource_type)}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-1">
                  {item.title}
                </h3>

                <p className="text-[11px] text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                  {item.description || `CAPS ${item.subject} curriculum study resource for Grade ${item.grade}.`}
                </p>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-surface-darker border border-white/5 text-[10px] text-slate-400 font-mono mb-4">
                  <div>
                    <span className="text-slate-500 block">Subject & Grade:</span>
                    <span className="text-slate-200 font-bold">{item.subject} (Gr {item.grade})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Term / Year:</span>
                    <span className="text-slate-200 font-bold">{item.term || 'Term 3'} {item.year || 2026}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                <div className="flex items-center gap-2">
                  <a
                    href={item.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
                    title="Open Document PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>

                  {item.resource_type === 'past_paper' && (
                    <button
                      onClick={() => setPreviewPaperModal({ subject: item.subject, grade: item.grade })}
                      className="p-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 transition-all"
                      title="Inspect DBE Question Bank"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteResource(item.id, item.title)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Remove resource"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-surface-dark border border-white/10 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto stroke-[1.5]" />
          <h3 className="text-base font-bold text-white">No Resources Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You haven't uploaded any resources matching the selected filters. Click "Upload New Resource" to publish past exam papers or textbooks.
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload First Resource</span>
          </button>
        </div>
      )}

      {/* Upload Resource Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Learning Resource or Past Question Paper"
        maxWidth="2xl"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-start gap-2.5">
            <Megaphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Automated Alert Broadcast:</strong> When you upload this material, all enrolled Grade {formData.grade} learners taking {formData.subject} and their linked parents will receive a live notification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Resource Category *
              </label>
              <select
                value={formData.resource_type}
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {RESOURCE_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Subject *
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {SUBJECTS_LIST.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Grade *
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {[8, 9, 10, 11, 12].map(g => (
                  <option key={g} value={String(g)}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Curriculum Term / Season
              </label>
              <select
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Term 1">Term 1 (Exemplars / Baseline)</option>
                <option value="Term 2">Term 2 (Mid-Year Exam Papers)</option>
                <option value="Term 3">Term 3 (September Trial / Prelim)</option>
                <option value="Term 4">Term 4 (Final NSC Examination)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Resource Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Grade 10 Mathematics 2024 November Paper 1 & Memo"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Description / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide learner instructions, topics covered, or syllabus guidance..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-darker border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* File Upload Zone */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Attach PDF Document *
            </label>
            <div className="relative border-2 border-dashed border-white/15 hover:border-cyan-500/50 rounded-2xl p-6 text-center bg-surface-darker/60 transition-colors">
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              {formData.file ? (
                <div className="text-white font-bold text-xs">
                  Selected: <span className="text-cyan-300">{formData.file.name}</span> ({(formData.file.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-300">
                    Click or drag & drop PDF document here
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports CAPS Past Exam Papers, Memorandums, Textbooks, or PDF Study Notes (up to 50MB)
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-glow-cyan disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Uploading & Dispatching Notifications...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Notify Learners</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-3 rounded-xl bg-surface-darker text-slate-300 hover:text-white font-bold border border-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Past Exam Question Bank Preview Modal */}
      <Modal
        isOpen={!!previewPaperModal}
        onClose={() => setPreviewPaperModal(null)}
        title={`${previewPaperModal?.subject || ''} DBE Past Papers & Question Bank`}
        maxWidth="4xl"
      >
        {previewPaperModal && (
          <div className="max-h-[80vh] overflow-y-auto pr-1">
            <SubjectPastPapers
              subject={previewPaperModal.subject}
              grade={previewPaperModal.grade}
              onSolveWithAI={(prompt) => {
                setPreviewPaperModal(null);
                if (onNavigateTab) {
                  onNavigateTab('ai-tools', { subject: previewPaperModal.subject, grade: previewPaperModal.grade, prompt });
                }
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
