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
  ArchiveRestore,
  Pin,
  PinOff,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface TrashRecord {
  id: number;
  deletedAt: string; // ISO date string
}

export const AnnouncementsFeed: React.FC = () => {
  const { role, user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'unread' | 'read' | 'archive' | 'trash' | 'all'>('unread');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  // Multi-select bulk state
  const [selectedNoticeIds, setSelectedNoticeIds] = useState<number[]>([]);

  // Confirmation modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    noticeId?: number;
    isBulk?: boolean;
    isPermanent?: boolean;
  }>({ isOpen: false });

  // Local storage persistence keys
  const userKey = user?.id || 'guest';
  const readStorageKey = `fusion_read_announcements_${userKey}`;
  const archiveStorageKey = `fusion_archived_announcements_${userKey}`;
  const pinnedStorageKey = `fusion_pinned_announcements_${userKey}`;
  const trashStorageKey = `fusion_trash_announcements_${userKey}`;

  // 1. Read State
  const [readIds, setReadIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(readStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Archived State
  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(archiveStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 3. Pinned State
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(pinnedStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 4. Trash State with 30-day auto-purge policy
  const [trashRecords, setTrashRecords] = useState<TrashRecord[]>(() => {
    try {
      const saved = localStorage.getItem(trashStorageKey);
      if (!saved) return [];
      const parsed: TrashRecord[] = JSON.parse(saved);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      // Auto-purge items deleted more than 30 days ago
      const valid = parsed.filter(item => {
        const time = new Date(item.deletedAt).getTime();
        return !isNaN(time) && time > thirtyDaysAgo;
      });
      return valid;
    } catch {
      return [];
    }
  });

  const saveReadIds = (ids: number[]) => {
    setReadIds(ids);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(ids));
    } catch (e) {
      console.warn('Could not save read announcements', e);
    }
  };

  const saveArchivedIds = (ids: number[]) => {
    setArchivedIds(ids);
    try {
      localStorage.setItem(archiveStorageKey, JSON.stringify(ids));
    } catch (e) {
      console.warn('Could not save archived announcements', e);
    }
  };

  const savePinnedIds = (ids: number[]) => {
    setPinnedIds(ids);
    try {
      localStorage.setItem(pinnedStorageKey, JSON.stringify(ids));
    } catch (e) {
      console.warn('Could not save pinned announcements', e);
    }
  };

  const saveTrashRecords = (records: TrashRecord[]) => {
    setTrashRecords(records);
    try {
      localStorage.setItem(trashStorageKey, JSON.stringify(records));
    } catch (e) {
      console.warn('Could not save trash announcements', e);
    }
  };

  const trashedIds = trashRecords.map(t => t.id);

  const fetchAnnouncements = () => {
    setLoading(true);
    adminService.getAnnouncements()
      .then(res => {
        const list = Array.isArray(res) ? res : res.announcements || [];
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

  // ==========================================
  // PIN / UNPIN FUNCTIONALITY
  // ==========================================
  const togglePin = (id: number) => {
    if (pinnedIds.includes(id)) {
      const updated = pinnedIds.filter(item => item !== id);
      savePinnedIds(updated);
      setStatusMessage('Notice unpinned.');
    } else {
      const updated = [...pinnedIds, id];
      savePinnedIds(updated);
      setStatusMessage('Notice pinned to top of feed.');
    }
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // ==========================================
  // READ / UNREAD ACTIONS
  // ==========================================
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

  const markAllAsRead = () => {
    const unarchivedActiveIds = announcements
      .filter(a => !trashedIds.includes(a.id) && !archivedIds.includes(a.id))
      .map(a => a.id);
    const updated = Array.from(new Set([...readIds, ...unarchivedActiveIds]));
    saveReadIds(updated);
    setStatusMessage('All active notices marked as read.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // ==========================================
  // ARCHIVE / UNARCHIVE ACTIONS
  // ==========================================
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

  // ==========================================
  // DELETE & TRASH CONFIRMATION MODAL & ACTIONS
  // ==========================================
  const openDeleteModal = (id: number, isPermanent = false) => {
    setDeleteModalState({ isOpen: true, noticeId: id, isBulk: false, isPermanent });
  };

  const openBulkDeleteModal = (isPermanent = false) => {
    if (selectedNoticeIds.length === 0) return;
    setDeleteModalState({ isOpen: true, isBulk: true, isPermanent });
  };

  const closeDeleteModal = () => {
    setDeleteModalState({ isOpen: false });
  };

  const executeDelete = async () => {
    const { noticeId, isBulk, isPermanent } = deleteModalState;
    closeDeleteModal();

    if (isBulk) {
      const targetIds = [...selectedNoticeIds];
      if (isPermanent) {
        if (role === 'admin') {
          await Promise.allSettled(targetIds.map(id => adminService.deleteAnnouncement(id)));
        }
        setAnnouncements(prev => prev.filter(a => !targetIds.includes(a.id)));
        saveTrashRecords(trashRecords.filter(t => !targetIds.includes(t.id)));
        saveReadIds(readIds.filter(id => !targetIds.includes(id)));
        saveArchivedIds(archivedIds.filter(id => !targetIds.includes(id)));
        savePinnedIds(pinnedIds.filter(id => !targetIds.includes(id)));
        setStatusMessage(`${targetIds.length} notice(s) permanently deleted.`);
      } else {
        const now = new Date().toISOString();
        const newRecords: TrashRecord[] = targetIds.map(id => ({ id, deletedAt: now }));
        const updatedTrash = [...trashRecords.filter(t => !targetIds.includes(t.id)), ...newRecords];
        saveTrashRecords(updatedTrash);
        savePinnedIds(pinnedIds.filter(id => !targetIds.includes(id)));
        setStatusMessage(`${targetIds.length} notice(s) moved to Trash.`);
      }
      setSelectedNoticeIds([]);
    } else if (noticeId !== undefined) {
      if (isPermanent) {
        if (role === 'admin') {
          try {
            await adminService.deleteAnnouncement(noticeId);
          } catch (err) {
            console.error('Delete announcement error:', err);
          }
        }
        setAnnouncements(prev => prev.filter(a => a.id !== noticeId));
        saveTrashRecords(trashRecords.filter(t => t.id !== noticeId));
        saveReadIds(readIds.filter(item => item !== noticeId));
        saveArchivedIds(archivedIds.filter(item => item !== noticeId));
        savePinnedIds(pinnedIds.filter(item => item !== noticeId));
        setStatusMessage('Notice permanently deleted.');
      } else {
        const now = new Date().toISOString();
        const updatedTrash = [...trashRecords.filter(t => t.id !== noticeId), { id: noticeId, deletedAt: now }];
        saveTrashRecords(updatedTrash);
        savePinnedIds(pinnedIds.filter(item => item !== noticeId));
        setStatusMessage('Notice moved to Trash.');
      }
    }
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const restoreFromTrash = (id: number) => {
    saveTrashRecords(trashRecords.filter(t => t.id !== id));
    setStatusMessage('Notice restored from Trash to active feed.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const restoreAllSelectedFromTrash = () => {
    saveTrashRecords(trashRecords.filter(t => !selectedNoticeIds.includes(t.id)));
    setStatusMessage(`${selectedNoticeIds.length} notice(s) restored from Trash.`);
    setSelectedNoticeIds([]);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // ==========================================
  // BULK SELECTION ACTIONS
  // ==========================================
  const toggleSelectNotice = (id: number) => {
    setSelectedNoticeIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllVisible = (items: any[]) => {
    const itemIds = items.map(a => a.id);
    const allSelected = itemIds.every(id => selectedNoticeIds.includes(id));
    if (allSelected) {
      setSelectedNoticeIds(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedNoticeIds(Array.from(new Set([...selectedNoticeIds, ...itemIds])));
    }
  };

  const handleBulkPin = () => {
    const allPinned = selectedNoticeIds.every(id => pinnedIds.includes(id));
    if (allPinned) {
      const updated = pinnedIds.filter(id => !selectedNoticeIds.includes(id));
      savePinnedIds(updated);
      setStatusMessage(`${selectedNoticeIds.length} notice(s) unpinned.`);
    } else {
      const updated = Array.from(new Set([...pinnedIds, ...selectedNoticeIds]));
      savePinnedIds(updated);
      setStatusMessage(`${selectedNoticeIds.length} notice(s) pinned to top.`);
    }
    setSelectedNoticeIds([]);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleBulkMarkRead = () => {
    const updated = Array.from(new Set([...readIds, ...selectedNoticeIds]));
    saveReadIds(updated);
    setStatusMessage(`${selectedNoticeIds.length} notice(s) marked as read.`);
    setSelectedNoticeIds([]);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleBulkArchive = () => {
    const updated = Array.from(new Set([...archivedIds, ...selectedNoticeIds]));
    saveArchivedIds(updated);
    setStatusMessage(`${selectedNoticeIds.length} notice(s) moved to Archive.`);
    setSelectedNoticeIds([]);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const canCreate = role === 'admin' || role === 'teacher';

  // ==========================================
  // LIST FILTERING & TAB MANAGEMENT
  // ==========================================
  // Active notices exclude trashed notices
  const activeNotices = announcements.filter(a => !trashedIds.includes(a.id));
  const trashedNotices = announcements.filter(a => trashedIds.includes(a.id));

  // Active sub-lists:
  const archivedList = activeNotices.filter(a => archivedIds.includes(a.id));
  const unarchivedList = activeNotices.filter(a => !archivedIds.includes(a.id));
  const unreadList = unarchivedList.filter(a => !readIds.includes(a.id));
  const readList = unarchivedList.filter(a => readIds.includes(a.id));

  let currentViewList: any[] = [];
  if (activeView === 'unread') currentViewList = unreadList;
  else if (activeView === 'read') currentViewList = readList;
  else if (activeView === 'archive') currentViewList = archivedList;
  else if (activeView === 'trash') currentViewList = trashedNotices;
  else if (activeView === 'all') currentViewList = activeNotices;

  // Filter by category
  const filteredViewList = currentViewList.filter(a => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'urgent') return a.priority === 'Urgent' || (a.title || '').toLowerCase().includes('urgent');
    if (filterCategory === 'academic') return a.grade_target || a.subject_target || (a.content || '').toLowerCase().includes('exam') || (a.content || '').toLowerCase().includes('assessment');
    return true;
  });

  // Separate pinned items vs regular items in active views
  // Requirement: Pinned notices must lock to top under dedicated "Pinned Notices" sub-header across active view filters
  const isTrashView = activeView === 'trash';
  const pinnedItems = !isTrashView ? filteredViewList.filter(a => pinnedIds.includes(a.id)) : [];
  const regularItems = !isTrashView ? filteredViewList.filter(a => !pinnedIds.includes(a.id)) : filteredViewList;

  // Helper renderer for a single notice card
  const renderNoticeCard = (item: any, isPinnedSection = false) => {
    const isUrgent = item.priority === 'Urgent' || (item.title || '').toLowerCase().includes('urgent');
    const isRead = readIds.includes(item.id);
    const isArchived = archivedIds.includes(item.id);
    const isPinned = pinnedIds.includes(item.id);
    const isSelected = selectedNoticeIds.includes(item.id);
    const isExpanded = !!expandedIds[item.id];
    const isLong = (item.content || '').length > 220;

    return (
      <div
        key={item.id}
        className={`p-5 md:p-6 rounded-3xl border transition-all space-y-3.5 relative shadow-md ${
          isSelected
            ? 'ring-2 ring-brand-400 bg-brand-500/10 border-brand-400/40'
            : isPinned
            ? 'bg-gradient-to-br from-surface-dark via-surface-dark to-amber-950/20 border-amber-500/40 shadow-amber-500/10 ring-1 ring-amber-500/20'
            : isArchived
            ? 'bg-surface-dark/30 border-white/5 opacity-70 hover:opacity-95'
            : isRead
            ? 'bg-surface-dark/50 border-white/5 opacity-85 hover:opacity-100'
            : isUrgent
            ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-500/5'
            : 'bg-surface-dark border-white/10 hover:border-white/20'
        }`}
      >
        {/* Card Header: Selection Checkbox + Title + Badges + Date/Pin/Delete */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1">
            {/* Multi-select checkbox */}
            <button
              type="button"
              onClick={() => toggleSelectNotice(item.id)}
              className="mt-1 text-slate-400 hover:text-white transition-colors shrink-0"
              title={isSelected ? 'Deselect Notice' : 'Select Notice'}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-brand-400 fill-brand-400/20" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
              )}
            </button>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`text-sm md:text-base font-bold font-display ${isRead || isArchived ? 'text-slate-300' : 'text-white'}`}>
                  {item.title}
                </h3>

                {/* Pinned Visual Indicator */}
                {isPinned && !isTrashView && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-fade-in">
                    <Pin className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>Pinned</span>
                  </span>
                )}

                <Badge variant={isUrgent ? 'amber' : isRead ? 'slate' : 'cyan'} size="sm">
                  {item.role_target ? `Audience: ${item.role_target}` : 'Public Notice'}
                </Badge>

                {item.grade_target && (
                  <Badge variant="indigo" size="sm">Grade {item.grade_target}</Badge>
                )}

                {isTrashView ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-950/40 text-rose-300 border border-rose-500/30">
                    Trash
                  </span>
                ) : isArchived ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/40 text-amber-400 border border-amber-500/30">
                    Archived
                  </span>
                ) : isRead ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                    Read
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Header Metadata & Quick Header Action */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono self-start sm:self-auto shrink-0 pl-6 sm:pl-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(item.created_at || Date.now()).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>

            {/* Quick Pin Toggle in Header */}
            {!isTrashView && (
              <button
                type="button"
                onClick={() => togglePin(item.id)}
                className={`p-1.5 rounded-lg transition-colors ml-1 ${
                  isPinned
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'hover:bg-white/10 text-slate-400 hover:text-amber-300'
                }`}
                title={isPinned ? 'Unpin notice' : 'Pin notice to top'}
              >
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Admin Permanent Delete or Trash Delete */}
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => openDeleteModal(item.id, isTrashView)}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                title={isTrashView ? 'Delete Permanently' : 'Move to Trash'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notice Content with Read More Clamp */}
        <div className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-6 sm:pl-6">
          {isLong && !isExpanded ? (
            <>
              <p className="line-clamp-3">{item.content}</p>
              <button
                type="button"
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
                  type="button"
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

        {/* Standardized Bottom Action Bar: [ Pin ] [ Mark Read ] [ Archive ] [ Delete ] */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span>Official Fusion High Broadcast</span>
          </span>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {isTrashView ? (
              // Actions in Trash view: Restore & Permanent Delete
              <>
                <button
                  type="button"
                  onClick={() => restoreFromTrash(item.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 font-semibold text-xs border border-white/10 transition-colors"
                  title="Restore notice from Trash to feed"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Restore</span>
                </button>

                <button
                  type="button"
                  onClick={() => openDeleteModal(item.id, true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-colors"
                  title="Permanently remove notice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </>
            ) : (
              // Standardized Active Action Bar: [ Pin ] [ Mark Read ] [ Archive ] [ Delete ]
              <>
                {/* 1. Pin / Unpin Action */}
                <button
                  type="button"
                  onClick={() => togglePin(item.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    isPinned
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-amber-300 border-white/10'
                  }`}
                  title={isPinned ? 'Unpin notice from top' : 'Pin notice to top'}
                >
                  {isPinned ? (
                    <>
                      <PinOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Unpin</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5" />
                      <span>Pin</span>
                    </>
                  )}
                </button>

                {/* 2. Mark Read / Unread Action */}
                {!isRead ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-emerald-400 font-semibold text-xs border border-white/10 transition-colors"
                    title="Mark notice as read"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Read</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => markAsUnread(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs border border-white/5 transition-colors"
                    title="Mark notice as unread"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Mark Unread</span>
                  </button>
                )}

                {/* 3. Archive / Restore Action */}
                {isArchived ? (
                  <button
                    type="button"
                    onClick={() => unarchiveNotice(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-colors"
                    title="Restore this notice to active views"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => archiveNotice(item.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-darker hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 font-medium text-xs border border-white/5 transition-colors"
                    title="Archive notice"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                )}

                {/* 4. Delete Action (Moves to Trash with confirmation) */}
                <button
                  type="button"
                  onClick={() => openDeleteModal(item.id, false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-darker hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 font-medium text-xs border border-white/5 transition-colors"
                  title="Move notice to Trash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-6 my-2 space-y-6 animate-fade-in max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header with Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-brand-400" />
            <span>School Notices & Broadcasts</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Official announcements, term circulars, and high-priority administrative alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadList.length > 0 && (
            <button
              type="button"
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
              type="button"
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
              type="button"
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

      {/* Floating / Sticky Bulk Action Bar when items are selected */}
      {selectedNoticeIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-brand-950/90 border border-brand-500/40 shadow-glow-indigo flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-brand-500/30 text-white text-xs font-bold font-mono">
              {selectedNoticeIds.length} Selected
            </span>
            <button
              type="button"
              onClick={() => selectAllVisible(filteredViewList)}
              className="text-xs text-slate-300 hover:text-white underline transition-colors"
            >
              {selectedNoticeIds.length === filteredViewList.length ? 'Deselect All' : 'Select All in View'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isTrashView ? (
              <>
                <button
                  type="button"
                  onClick={handleBulkPin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-dark hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Bulk Pin / Unpin</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkMarkRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-dark hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Bulk Mark Read</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-dark hover:bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-500/30 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Bulk Archive</span>
                </button>

                <button
                  type="button"
                  onClick={() => openBulkDeleteModal(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bulk Delete</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={restoreAllSelectedFromTrash}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Selected</span>
                </button>

                <button
                  type="button"
                  onClick={() => openBulkDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete Selected</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedNoticeIds([])}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs: Unread / Read / Archive / Trash / All */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-surface-dark/80 p-2 rounded-2xl border border-white/10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
            onClick={() => setActiveView('trash')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeView === 'trash'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash</span>
            {trashedNotices.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/30 text-rose-200">
                {trashedNotices.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`flex-1 md:flex-none px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeView === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All ({activeNotices.length})
          </button>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterCategory === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Categories
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('urgent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterCategory === 'urgent' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Urgent Only
          </button>
          <button
            type="button"
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
      <div className="space-y-5 max-h-[720px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar py-2">
        {loading ? (
          <LoadingSpinner text="Fetching official notices..." />
        ) : isTrashView ? (
          /* =================================================== */
          /* TRASH VIEW: Deleted Items with 30-day purge warning */
          /* =================================================== */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  Items in Trash are retained for <strong>30 days</strong> before permanent automated purge. You can restore or permanently remove notices anytime.
                </span>
              </div>
              {trashedNotices.length > 0 && (
                <button
                  type="button"
                  onClick={() => openBulkDeleteModal(true)}
                  className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Empty Trash
                </button>
              )}
            </div>

            {filteredViewList.length > 0 ? (
              filteredViewList.map(item => renderNoticeCard(item, false))
            ) : (
              <div className="py-16 px-6 text-center text-slate-400 rounded-3xl bg-surface-dark/60 border border-white/10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Trash is Empty</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No deleted notices found. Notices you delete will be moved here for 30 days before being purged.
                </p>
              </div>
            )}
          </div>
        ) : filteredViewList.length > 0 ? (
          <div className="space-y-6">
            {/* 1. DEDICATED PINNED NOTICES SECTION */}
            {pinnedItems.length > 0 && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Pin className="w-3.5 h-3.5 fill-amber-400" />
                    </div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 font-display">
                      Pinned Notices ({pinnedItems.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-amber-400/80 font-mono">Locked to top of feed</span>
                </div>

                <div className="space-y-3">
                  {pinnedItems.map(item => renderNoticeCard(item, true))}
                </div>
              </div>
            )}

            {/* 2. REGULAR NOTICES FEED */}
            {regularItems.length > 0 && (
              <div className="space-y-3.5">
                {pinnedItems.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 pb-1 border-b border-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                      Recent Notices & Bulletins ({regularItems.length})
                    </h3>
                  </div>
                )}
                <div className="space-y-3">
                  {regularItems.map(item => renderNoticeCard(item, false))}
                </div>
              </div>
            )}
          </div>
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

      {/* ========================================== */}
      {/* LIGHTWEIGHT CONFIRMATION MODAL BEFORE DELETION */}
      {/* ========================================== */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/15 p-6 shadow-2xl space-y-4 text-white animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-display text-white">
                  {deleteModalState.isPermanent ? 'Permanent Deletion' : 'Delete Notice'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {deleteModalState.isBulk
                    ? `Action will apply to ${selectedNoticeIds.length} selected notice(s).`
                    : 'Notice clean-up confirmation'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-surface-darker p-3.5 rounded-2xl border border-white/5">
              {deleteModalState.isPermanent
                ? 'Are you sure you want to permanently delete this notice? This action is irreversible.'
                : 'Are you sure you want to delete this notice? It will be removed from active views and moved to the Trash tab (retained for 30 days).'}
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 py-2.5 rounded-xl bg-surface-darker text-slate-300 font-bold text-xs hover:bg-white/5 transition-all border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteModalState.isPermanent ? 'Delete Forever' : 'Move to Trash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* CREATE ANNOUNCEMENT MODAL (ADMIN/TEACHER) */}
      {/* ========================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface-dark border border-white/15 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold font-display text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" />
              <span>Publish Official School Notice</span>
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
