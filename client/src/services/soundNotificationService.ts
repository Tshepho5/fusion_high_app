/**
 * Phone notification service for Geleza SA.
 * Message Hub and announcement alerts use the phone's own notification sound
 * and still appear when the app is closed.
 */
import { userService, notificationService } from './api';
import { db as firestoreDb } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type NotificationListener = (counts: { messages: number; announcements: number }) => void;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

class SoundNotificationService {
  private unreadMessages: number = 0;
  private unreadAnnouncements: number = 0;
  private prevMessages: number | null = null;
  private prevAnnouncements: number | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private pollInterval: any = null;
  private isInitialized: boolean = false;
  private currentUserId: string | number | null = null;
  private pushSubscribed: boolean = false;
  private recentAlerts: Map<string, number> = new Map();

  /**
   * Initializes notification audio context & permission check
   */
  public async init(userId?: string | number) {
    if (userId) {
      this.currentUserId = userId;
    }
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.ensurePhoneNotifications();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const url = event.data?.url;
        if (event.data?.type === 'open-notification' && typeof url === 'string' && url.startsWith('/')) {
          if (window.location.pathname + window.location.search !== url) {
            window.location.assign(url);
          }
        }
        if (event.data?.type === 'device-alert') {
          this.showSystemNotification(event.data.title || 'Geleza SA', {
            body: event.data.body || 'You have a new message.',
            tag: event.data.tag,
            type: event.data.targetTab === 'announcements' ? 'announcement' : 'message',
            targetTab: event.data.targetTab,
          });
        }
      });
    }
    window.addEventListener('online', () => this.checkNow());

    // Start background sync
    this.checkNow();
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.checkNow(), 9000);

    // If Firestore is available and user is logged in, attach real-time snapshot
    this.attachFirestoreListeners();
  }

  public setUserId(userId: string | number | null) {
    this.currentUserId = userId;
    if (userId) {
      this.checkNow();
      this.attachFirestoreListeners();
    }
  }

  public requestPermission() {
    this.ensurePhoneNotifications();
  }

  public async release() {
    this.pushSubscribed = false;
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) return;
      await notificationService.unsubscribePush(subscription.endpoint).catch(() => {});
      await subscription.unsubscribe();
    } catch (_) {}
  }

  private async ensurePhoneNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (_) {
        return;
      }
    }
    if (permission !== 'granted') return;
    try {
      await this.subscribePhone(false);
      this.pushSubscribed = true;
    } catch (_) {
      try {
        await this.subscribePhone(true);
        this.pushSubscribed = true;
      } catch (_) {
        this.pushSubscribed = false;
      }
    }
  }

  private async subscribePhone(replaceExisting: boolean) {
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await notificationService.getPushPublicKey();
    if (!keyRes?.publicKey) throw new Error('Missing push key');
    if (replaceExisting) {
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
    }
    let subscription = replaceExisting ? null : await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
      });
    }
    await notificationService.subscribePush(subscription.toJSON());
  }

  /**
   * Shows a phone notification using the device's own notification sound.
   * When the phone is already subscribed, the server delivers this while the app is closed.
   */
  public showSystemNotification(
    title: string,
    options: {
      body: string;
      tag?: string;
      type?: 'message' | 'announcement' | 'email';
      targetTab?: string;
    }
  ) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && this.pushSubscribed) return;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;
    const bucket = options.type || 'message';
    const now = Date.now();
    if (now - (this.recentAlerts.get(bucket) || 0) < 8000) return;
    this.recentAlerts.set(bucket, now);
    const tab = options.targetTab || (options.type === 'announcement' ? 'announcements' : 'messages');
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const dashboard = ['learner', 'teacher', 'parent', 'admin'].includes(role) ? role : '';
    const url = dashboard ? `/dashboard/${dashboard}?tab=${tab}` : `/?tab=${tab}`;
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body: options.body,
        icon: '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        tag: options.tag || `geleza-${tab}`,
        renotify: true,
        silent: false,
        data: { url, targetTab: tab },
      } as NotificationOptions);
    }).catch(() => {});
  }

  /**
   * Checks unread counts for both Messages and Announcements
   */
  public async checkNow() {
    try {
      // 1. Check unread chat messages from Message Hub
      const msgRes = await userService.getUnreadCount().catch(() => null);
      if (msgRes && (msgRes.count !== undefined || msgRes.unreadCount !== undefined)) {
        const newMsgCount = Number(msgRes.count ?? msgRes.unreadCount ?? 0);
        if (this.prevMessages !== null && newMsgCount > this.prevMessages) {
          const delta = newMsgCount - this.prevMessages;
          this.showSystemNotification('New Message Received - Message Hub', {
            body: delta === 1 ? 'You have received a new message in your Message Hub.' : `You have ${delta} new messages waiting in your Message Hub.`,
            type: 'message',
            targetTab: 'messages',
            tag: 'chat-message-alert'
          });
        }
        this.prevMessages = newMsgCount;
        this.unreadMessages = newMsgCount;
      }

      // 2. Check unread official announcements & school notices (reserved for bell)
      const notifRes = await notificationService.getUnreadCount().catch(() => null);
      if (notifRes && notifRes.unreadCount !== undefined) {
        const newNotifCount = Number(notifRes.unreadCount);
        if (this.prevAnnouncements !== null && newNotifCount > this.prevAnnouncements) {
          this.showSystemNotification('Official School Announcement', {
            body: 'A new important notice from the school executive or teachers has been posted.',
            type: 'announcement',
            targetTab: 'announcements',
            tag: 'school-announcement-alert'
          });
        }
        this.prevAnnouncements = newNotifCount;
        this.unreadAnnouncements = newNotifCount;
      }

      this.notifyListeners();
    } catch (_) {
      // Quiet fail on network polling
    }
  }

  private attachFirestoreListeners() {
    if (!this.currentUserId || !firestoreDb) return;
    try {
      // Real-time listener for school announcements
      const notifQ = query(
        collection(firestoreDb, 'notifications'),
        where('user_id', '==', Number(this.currentUserId))
      );
      onSnapshot(notifQ, (snapshot) => {
        const unreadDocs = snapshot.docs.filter((doc) => {
          const data = doc.data();
          const type = String(data.type || '').toLowerCase();
          const title = String(data.title || '').toLowerCase();
          return !data.is_read && type !== 'chat' && type !== 'message' && type !== 'security' && !title.startsWith('password reset');
        });
        const currentUnread = unreadDocs.length;
        if (this.prevAnnouncements !== null && currentUnread > this.prevAnnouncements) {
          this.showSystemNotification('Official School Announcement', {
            body: 'A new important notice from the school administration has been posted.',
            type: 'announcement',
            targetTab: 'announcements',
            tag: 'school-announcement-alert'
          });
        }
        this.prevAnnouncements = currentUnread;
        this.unreadAnnouncements = currentUnread;
        this.notifyListeners();
      }, () => {});
    } catch (_) {}
  }

  public getCounts() {
    return {
      messages: this.unreadMessages,
      announcements: this.unreadAnnouncements
    };
  }

  public setUnreadMessages(count: number) {
    this.unreadMessages = Math.max(0, count);
    this.prevMessages = this.unreadMessages;
    this.notifyListeners();
  }

  public setUnreadAnnouncements(count: number) {
    this.unreadAnnouncements = Math.max(0, count);
    this.prevAnnouncements = this.unreadAnnouncements;
    this.notifyListeners();
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener({ messages: this.unreadMessages, announcements: this.unreadAnnouncements });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const data = { messages: this.unreadMessages, announcements: this.unreadAnnouncements };
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (_) {}
    });
  }
}

export const soundNotificationService = new SoundNotificationService();
