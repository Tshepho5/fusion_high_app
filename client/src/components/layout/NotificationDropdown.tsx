import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/api';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../../firebase';
import {
  Bell,
  CheckCheck,
  BookOpen,
  FileText,
  Megaphone,
  MessageSquare,
  Sparkles,
  Award,
  Calendar,
  ShieldAlert,
  ExternalLink,
  Clock,
  Inbox
} from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  target_tab: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

import { soundNotificationService } from '../../services/soundNotificationService';

export const NotificationDropdown: React.FC = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationService.getNotifications(1);
      if (res && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (_) {}
  };

  // Sync with global sound and notification service
  useEffect(() => {
    if (user?.id) {
      soundNotificationService.init(user.id);
    }
    const unsubscribe = soundNotificationService.subscribe(({ announcements }) => {
      setUnreadCount(announcements);
    });
    return () => unsubscribe();
  }, [user?.id]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(35);
      if (res && Array.isArray(res.notifications)) {
        // Reserve Bell exclusively for announcements, alerts, and circulars (exclude chat messages)
        const announcementsOnly = res.notifications.filter((n: NotificationItem) => {
          const type = (n.type || '').toLowerCase();
          const title = (n.title || '').toLowerCase();
          return type !== 'chat' && type !== 'message' && type !== 'security' && !title.startsWith('password reset');
        });
        setNotifications(announcementsOnly);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time notification updates via Firebase Cloud Firestore
  useEffect(() => {
    if (!user?.id || !firestoreDb) return;
    try {
      const q = query(
        collection(firestoreDb, 'notifications'),
        where('user_id', '==', Number(user.id))
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const unreadDocs = snapshot.docs.filter(doc => !doc.data().is_read);
        const currentUnread = unreadDocs.length;
        prevCountRef.current = currentUnread;
        setUnreadCount(currentUnread);
      }, (err) => {
        // Silently fallback to REST polling if Firestore rules or offline
        console.debug('[FIREBASE NOTIFICATION LISTENER NOTICE]:', err.message);
      });
      return () => unsubscribe();
    } catch (_) {
      // Fallback to REST polling
    }
  }, [user?.id]);

  // Poll unread count every 15 seconds (secondary fallback)
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full list when opening dropdown
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const resolveAlertDestination = (notif: NotificationItem) => {
    const userRole = (role || 'learner').toLowerCase();
    const type = (notif.type || '').toLowerCase();
    let tab = notif.target_tab || 'overview';
    let meta: any = notif.metadata || {};
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }

    if (userRole === 'parent') {
      if (type === 'attendance') tab = 'attendance';
      else if (type === 'assignment' || tab === 'subjects') tab = 'children';
      else if (type === 'grade' || type === 'marks' || tab === 'academics') tab = 'marks';
      else if (type === 'merit' || type === 'disciplinary') tab = 'children';
      else if (tab === 'calendar' && type === 'attendance') tab = 'attendance';
    } else if (userRole === 'learner') {
      if (type === 'assignment' || tab === 'subjects') tab = 'assignments';
      else if (type === 'grade' || type === 'marks' || tab === 'academics') tab = 'reports';
    }

    return { userRole, tab, meta };
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }

    setIsOpen(false);

    const { userRole, tab, meta } = resolveAlertDestination(notif);
    const params = new URLSearchParams({ tab });
    const childId = meta.child_id || meta.childId || meta.child;
    if (childId) params.set('child', String(childId));
    if (meta.subject) params.set('subject', String(meta.subject));
    if (meta.grade) params.set('grade', String(meta.grade));
    if (meta.assignment_id) params.set('assignment', String(meta.assignment_id));

    navigate(`/dashboard/${userRole}?${params.toString()}`);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'past_paper':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'resource':
      case 'textbook':
        return <BookOpen className="w-4 h-4 text-cyan-400" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-400" />;
      case 'assignment':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'attendance':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'report':
        return <Award className="w-4 h-4 text-yellow-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger (Strictly for Official School Announcements & Circulars) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all ${
          isOpen
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-amber'
            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
        }`}
        title="Official School Announcements & Circulars"
        aria-label="Announcements & Notices"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-400 animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-extrabold text-slate-950 ring-2 ring-surface-darker shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Announcements Flyout Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-surface-dark border border-white/10 p-4 shadow-2xl z-50 animate-fade-in text-xs space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Megaphone className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  Announcements & Notices
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400">Official circulars from Admin, Principal & Teachers</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 hover:underline transition-all"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-darker border border-white/5">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                filter === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                filter === 'unread'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
                <span className="text-[11px]">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    notif.is_read
                      ? 'bg-surface-darker/60 border-white/5 hover:border-white/15 text-slate-400 hover:text-slate-200'
                      : 'bg-gradient-to-r from-brand-950/40 via-surface-darker to-surface-darker border-brand-500/30 hover:border-brand-500/60 text-white shadow-sm'
                  }`}
                >
                  {/* Type Icon Container */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      notif.is_read
                        ? 'bg-white/5 border-white/5'
                        : 'bg-brand-500/20 border-brand-500/40 shadow-sm'
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-bold truncate ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                      <span className="text-[10px] font-bold text-brand-400 group-hover:underline flex items-center gap-1">
                        <span>Go to {resolveAlertDestination(notif).tab}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>

                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          title="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread Accent Dot */}
                  {!notif.is_read && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-400 ring-2 ring-brand-500/20 shadow-glow-cyan" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Inbox className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                <p className="text-xs font-medium">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[10px] text-slate-600 max-w-[200px]">
                  Alerts from educators, past question papers, and school announcements will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
