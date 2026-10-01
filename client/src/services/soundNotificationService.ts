/**
 * Sound & Background Notification Service for Geleza SA
 * Handles real-time audio chimes for messages & announcements,
 * system OS notifications when the user is away or the app is minimized,
 * and tracks unread message & announcement counts globally.
 */
import { userService, notificationService } from './api';
import { db as firestoreDb } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type NotificationListener = (counts: { messages: number; announcements: number }) => void;

class SoundNotificationService {
  private audioCtx: AudioContext | null = null;
  private unreadMessages: number = 0;
  private unreadAnnouncements: number = 0;
  private prevMessages: number | null = null;
  private prevAnnouncements: number | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private pollInterval: any = null;
  private isInitialized: boolean = false;
  private currentUserId: string | number | null = null;

  constructor() {
    // Unlock AudioContext on first user interaction anywhere
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            if (!this.audioCtx) {
              this.audioCtx = new AudioContextClass();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
              this.audioCtx.resume();
            }
          }
        } catch (_) {}
      };

      window.addEventListener('click', unlockAudio, { once: false, passive: true });
      window.addEventListener('keydown', unlockAudio, { once: false, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: false, passive: true });
    }
  }

  /**
   * Initializes notification audio context & permission check
   */
  public async init(userId?: string | number) {
    if (userId) {
      this.currentUserId = userId;
    }
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Gracefully request notification permission if not yet decided
    this.requestPermission();

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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }

  /**
   * Synthesize a crisp melodic double-tone chime for incoming chat messages (E5 -> B5)
   */
  public playMessageSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = this.audioCtx || new AudioContextClass();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      // Tone 1: E5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.09, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.13);

      // Tone 2: B5 (higher pitch chime)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.1);
      gain2.gain.setValueAtTime(0.12, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (_) {}
  }

  /**
   * Synthesize a resonant 3-tone chime for important school announcements (C5 -> G5 -> C6)
   */
  public playAnnouncementSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = this.audioCtx || new AudioContextClass();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.28); // C6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (_) {}
  }

  /**
   * Triggers an operating system desktop / mobile notification when user is in another tab or background
   */
  public showSystemNotification(
    title: string,
    options: {
      body: string;
      tag?: string;
      type?: 'message' | 'announcement';
      targetTab?: string;
    }
  ) {
    // Play sound always
    if (options.type === 'announcement') {
      this.playAnnouncementSound();
    } else {
      this.playMessageSound();
    }

    // If browser supports notifications & user granted permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: options.body,
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          tag: options.tag || 'geleza-sa-alert',
          silent: false, // Ensure system sound/vibrate triggers
          // @ts-ignore
          vibrate: [200, 100, 200]
        });

        notif.onclick = () => {
          window.focus();
          if (options.targetTab) {
            window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: options.targetTab } }));
          }
          notif.close();
        };
      } catch (err) {
        // Fallback to service worker notification if direct Notification constructor fails on mobile
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body: options.body,
              icon: '/assets/icon-192.png',
              badge: '/assets/icon-192.png',
              tag: options.tag || 'geleza-sa-alert',
              // @ts-ignore
              vibrate: [200, 100, 200],
              data: { targetTab: options.targetTab }
            });
          }).catch(() => {});
        }
      }
    }
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
          return !data.is_read && data.type !== 'chat' && data.type !== 'message';
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
