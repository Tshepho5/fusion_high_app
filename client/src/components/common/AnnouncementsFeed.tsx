import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  CheckCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Inbox,
  Archive,
  ArchiveRestore
} from 'lucide-react';

export const AnnouncementsFeed: React.FC = () => {
  const { role, user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'unread' | 'read' | 'archive' | 'all'>('unread');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  // Local storage persistence for read announcements
  const readStorageKey = `fusion_read_announcements_${user?.id || 'guest'}`;
  const archiveStorageKey = `fusion_archived_announcements_${user?.id || 'guest'}`;

  const [readIds, setReadIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(readStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(archiveStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveReadIds = (ids: number[]) => {
    setReadIds(ids);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(ids));
    } catch (e) {
      console.warn('Could not save read announcements to storage', e);
    }
  };

  const saveArchivedIds = (ids: number[]) => {
    setArchivedIds(ids);
    try {
      localStorage.setItem(archiveStorageKey, JSON.stringify(ids));
    } catch (e) {
      console.warn('Could not save archived announcements to storage', e);
    }
  };

  const fetchAnnouncements = () => {
    setLoading(true);
    adminService.getAnnouncements()
      .then(res => {
        const list = Array.isArray(res) ? res : res.announcements || [];
        // Strip any residual emoji characters from titles or content
        const cleanList = list.map((a: any) => ({
          ...a,
          title: (a.title || '').replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim(),
          content: (a.content || '').replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim()
        }));
        setAnnouncements(cleanList);
      })
      .catch(err => {
        console.error('Failed to load announcements:', err);
        setError('Could not load announcements.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    role_target: 'all',
    grade_target: '',
    stream_target: 'General',
    priority: 'Normal'
  });

  const [sendingDigest, setSendingDigest] = useState<boolean>(false);

  const handleSendSundayDigest = async () => {
    setSendingDigest(true);
    setStatusMessage(null);
    setError(null);
    try {
      const res = await adminService.sendSundayParentDigest();
      setStatusMessage(res.message || 'Weekly Parent Academic Digest dispatched successfully via email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispatch weekly parent digest.');
    } finally {
      setSendingDigest(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await adminService.createAnnouncement({
        ...formData,
        grade_target: formData.grade_target ? parseInt(formData.grade_target, 10) : null,
      });
      setStatusMessage('Official broadcast notice published successfully.');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        content: '',
        role_target: 'all',
        grade_target: '',
        stream_target: 'General',
        priority: 'Normal'
      });
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to publish announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this broadcast notice?')) return;
    try {
      await adminService.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      saveReadIds(readIds.filter(item => item !== id));
      saveArchivedIds(archivedIds.filter(item => item !== id));
      setStatusMessage('Announcement deleted.');
    } catch (err) {
      console.error('Delete announcement error:', err);
    }
  };

  const markAsRead = (id: number) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      saveReadIds(updated);
      setStatusMessage('Notice marked as read.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const markAsUnread = (id: number) => {
    const updated = readIds.filter(item => item !== id);
    saveReadIds(updated);
    setStatusMessage('Notice restored to Unread tab.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const archiveNotice = (id: number) => {
    if (!archivedIds.includes(id)) {
      const updated = [...archivedIds, id];
      saveArchivedIds(updated);
      setStatusMessage('Notice moved to Archive.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const unarchiveNotice = (id: number) => {
    const updated = archivedIds.filter(item => item !== id);
    saveArchivedIds(updated);
    setStatusMessage('Notice restored from Archive.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const markAllAsRead = () => {
    const unarchivedIds = announcements.filter(a => !archivedIds.includes(a.id)).map(a => a.id);
    const updated = Array.from(new Set([...readIds, ...unarchivedIds]));
    saveReadIds(updated);
    setStatusMessage('All active notices marked as read.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const canCreate = role === 'admin' || role === 'teacher';

  // Separate Lists:
  // 1. Archived: In archivedIds
  // 2. Unread: NOT in archivedIds and NOT in readIds
  // 3. Read: In readIds and NOT in archivedIds
  const archivedList = announcements.filter(a => archivedIds.includes(a.id));
  const unarchivedList = announcements.filter(a => !archivedIds.includes(a.id));
  const unreadList = unarchivedList.filter(a => !readIds.includes(a.id));
  const readList = unarchivedList.filter(a => readIds.includes(a.id));

  let listByView = unreadList;
  if (activeView === 'read') listByView = readList;
  else if (activeView === 'archive') listByView = archivedList;
  else if (activeView === 'all') listByView = announcements;

  const filteredList = listByView.filter(a => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'urgent') return a.priority === 'Urgent' || (a.title || '').toLowerCase().includes('urgent');
    if (filterCategory === 'academic') return a.grade_target || a.subject_target || (a.content || '').toLowerCase().includes('exam') || (a.content || '').toLowerCase().includes('assessment');
    return true;
  });

  return (
    <div className="py-6 my-2 space-y-6 animate-fade-in max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-brand-400" />
            School Notices & Broadcasts
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadList.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-dark border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
              title="Mark all active announcements as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark All Read</span>
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={handleSendSundayDigest}
              disabled={sendingDigest}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingDigest ? 'Sending Digests...' : '⚡ Send Weekly Parent Digest'}</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Notice</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Controls: Unread / Read / Archive Tabs + Category Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-surface-dark/80 p-2 rounded-2xl border border-white/10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveView('unread')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeView === 'unread'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Unread</span>
            {unreadList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-500 text-white">
                {unreadList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('read')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeView === 'read'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Read</span>
            {readList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
                {readList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('archive')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeView === 'archive'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
            {archivedList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200">
                {archivedList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('all')}
            className={`flex-1 md:flex-none px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeView === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All ({announcements.length})
          </button>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterCategory === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setFilterCategory('urgent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterCategory === 'urgent' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Urgent Only
          </button>
          <button
            onClick={() => setFilterCategory('academic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterCategory === 'academic' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Academic & Exams
          </button>
        </div>
      </div>

      {/* Announcements Feed Container with Scroll & Padding */}
      <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar py-2">
        {loading ? (
          <LoadingSpinner text="Fetching official notices..." />
        ) : filteredList.length > 0 ? (
          filteredList.map((item) => {
            const isUrgent = item.priority === 'Urgent' || (item.title || '').toLowerCase().includes('urgent');
            const isRead = readIds.includes(item.id);
            const isArchived = archivedIds.includes(item.id);
            const isExpanded = !!expandedIds[item.id];
            const isLong = (item.content || '').length > 220;

            return (
              <div
                key={item.id}
                className={`p-5 md:p-6 rounded-3xl border transition-all space-y-3 relative shadow-md ${
                  isArchived
                    ? 'bg-surface-dark/30 border-white/5 opacity-60 hover:opacity-90'
                    : isRead
                    ? 'bg-surface-dark/50 border-white/5 opacity-80 hover:opacity-100'
                    : isUrgent
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-500/5'
                    : 'bg-surface-dark border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm md:text-base font-bold font-display ${isRead || isArchived ? 'text-slate-300' : 'text-white'}`}>
                      {item.title}
                    </h3>
                    <Badge variant={isUrgent ? 'amber' : isRead ? 'slate' : 'cyan'} size="sm">
                      {item.role_target ? `Audience: ${item.role_target}` : 'Public Notice'}
                    </Badge>
                    {item.grade_target && (
                      <Badge variant="indigo" size="sm">Grade {item.grade_target}</Badge>
                    )}
                    {isArchived ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/40 text-amber-400 border border-amber-500/30">
                        Archived
                      </span>
                    ) : isRead ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                        Read
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono self-start sm:self-auto">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.created_at || Date.now()).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    
                    {role === 'admin' && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors ml-1"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Announcement Content with Read More clamp */}
                <div className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {isLong && !isExpanded ? (
                    <>
                      <p className="line-clamp-3">{item.content}</p>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-semibold mt-1.5 transition-colors"
                      >
                        <span>Read Full Notice</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p>{item.content}</p>
                      {isLong && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 font-semibold mt-1.5 transition-colors"
                        >
                          <span>Show Less</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Footer with Badge & Separate Action Buttons */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                    <span>Official Fusion High Broadcast</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {isArchived ? (
                      <button
                        onClick={() => unarchiveNotice(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-colors"
                        title="Restore this notice to active views"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Restore Notice</span>
                      </button>
                    ) : (
                      <>
                        {!isRead ? (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-emerald-400 font-semibold text-xs border border-white/10 transition-colors"
                            title="Mark notice as read"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Mark Read</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsUnread(item.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs border border-white/5 transition-colors"
                            title="Mark notice as unread"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Mark Unread</span>
                          </button>
                        )}

                        <button
                          onClick={() => archiveNotice(item.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-darker hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 font-medium text-xs border border-white/5 transition-colors"
                          title="Archive notice"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Archive</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 px-6 text-center text-slate-400 rounded-3xl bg-surface-dark/60 border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto border border-brand-500/20">
              {activeView === 'archive' ? (
                <Archive className="w-6 h-6 text-amber-400" />
              ) : activeView === 'unread' ? (
                <CheckCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <Megaphone className="w-6 h-6 text-slate-500" />
              )}
            </div>
            <h4 className="text-sm font-bold text-white">
              {activeView === 'unread'
                ? "You're All Caught Up!"
                : activeView === 'archive'
                ? "No Archived Notices"
                : "No Notices in this View"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeView === 'unread'
                ? "No unread announcements. All notices have been marked as read or moved to archive."
                : activeView === 'archive'
                ? "Notices you archive will be stored here for future reference."
                : "No notices match the selected category filter."}
            </p>
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface-dark border border-white/15 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold font-display text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" />
              Publish Official School Notice
            </h4>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notice Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Term 1 Assessment Timetable Released"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Role</label>
                  <select
                    value={formData.role_target}
                    onChange={(e) => setFormData({ ...formData, role_target: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">Everyone (All Portals)</option>
                    <option value="learner">Learners Only</option>
                    <option value="parent">Parents Only</option>
                    <option value="teacher">Teachers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent / High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Grade (Optional)</label>
                <select
                  value={formData.grade_target}
                  onChange={(e) => setFormData({ ...formData, grade_target: e.target.value })}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All Grades</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notice Body / Message</label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter detailed notice content..."
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-darker text-slate-300 font-bold text-xs hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
