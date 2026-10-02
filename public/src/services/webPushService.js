const db = require('../../../db/db');
const webpush = require('web-push');

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@gelezasa.co.za';

let vapidReady = null;

function alertKind(type, targetTab) {
  const kind = String(type || '').toLowerCase();
  const tab = String(targetTab || '').toLowerCase();
  if (kind === 'chat' || kind === 'message' || tab === 'messages') return 'message';
  if (kind === 'announcement' || tab === 'announcements') return 'announcement';
  return null;
}

function dashboardRole(roleName) {
  const role = String(roleName || '').toLowerCase();
  if (role.includes('parent')) return 'parent';
  if (role.includes('learner') || role.includes('student')) return 'learner';
  if (role.includes('teacher') || role.includes('educator')) return 'teacher';
  if (role.includes('admin')) return 'admin';
  return '';
}

function isPushEndpoint(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (_) {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname;
  return host === 'fcm.googleapis.com'
    || host === 'android.googleapis.com'
    || host.endsWith('.googleapis.com')
    || host.endsWith('.push.services.mozilla.com')
    || host.endsWith('.notify.windows.com')
    || host === 'web.push.apple.com'
    || host.endsWith('.push.apple.com');
}

class WebPushService {
  static async init() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS push_vapid (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        public_key TEXT NOT NULL,
        private_key TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key ON push_subscriptions (endpoint);
      CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
    `);
    await this.ensureVapid();
    console.log('[WEB PUSH] Phone notifications ready.');
  }

  static async ensureVapid() {
    if (!vapidReady) vapidReady = this.loadVapid();
    return vapidReady;
  }

  static async loadVapid() {
    const envPublic = String(process.env.VAPID_PUBLIC_KEY || '').trim();
    const envPrivate = String(process.env.VAPID_PRIVATE_KEY || '').trim();
    let publicKey = envPublic;
    let privateKey = envPrivate;

    if (!publicKey || !privateKey) {
      const existing = await db.query('SELECT public_key, private_key FROM push_vapid WHERE id = 1');
      if (existing.rows[0]) {
        publicKey = existing.rows[0].public_key;
        privateKey = existing.rows[0].private_key;
      } else {
        const generated = webpush.generateVAPIDKeys();
        publicKey = generated.publicKey;
        privateKey = generated.privateKey;
        await db.query(
          `INSERT INTO push_vapid (id, public_key, private_key)
           VALUES (1, $1, $2)
           ON CONFLICT (id) DO NOTHING`,
          [publicKey, privateKey]
        );
        const stored = await db.query('SELECT public_key, private_key FROM push_vapid WHERE id = 1');
        publicKey = stored.rows[0].public_key;
        privateKey = stored.rows[0].private_key;
      }
    }

    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    return publicKey;
  }

  static async getPublicKey() {
    return this.ensureVapid();
  }

  static async saveSubscription(userId, subscription, userAgent) {
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!isPushEndpoint(endpoint) || !p256dh || !auth) {
      throw new Error('Invalid push subscription');
    }
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           updated_at = NOW()`,
      [userId, endpoint, p256dh, auth, String(userAgent || '').slice(0, 300)]
    );
  }

  static async removeSubscription(userId, endpoint) {
    if (!endpoint) {
      await db.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
      return;
    }
    await db.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
  }

  static async notifyUsers({ userIds, notificationIds = [], title, message, type, targetTab }) {
    const kind = alertKind(type, targetTab);
    if (!kind || !userIds || userIds.length === 0) return;

    try {
      await this.ensureVapid();
    } catch (err) {
      console.warn('[WEB PUSH] Keys unavailable:', err.message);
      return;
    }

    const ids = [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (ids.length === 0) return;

    const subs = await db.query(
      `SELECT s.user_id, s.endpoint, s.p256dh, s.auth, LOWER(COALESCE(r.name, '')) AS role_name
       FROM push_subscriptions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN roles r ON (u.role_id = r.id OR u.role_id::text = r.name)
       WHERE s.user_id = ANY($1::int[])`,
      [ids]
    );
    if (subs.rows.length === 0) return;

    const idByUser = new Map();
    ids.forEach((userId, index) => {
      if (notificationIds[index]) idByUser.set(userId, notificationIds[index]);
    });

    const body = String(message || '').trim().slice(0, 180) || 'Open Geleza SA to read it.';
    const heading = String(title || (kind === 'message' ? 'New message' : 'School announcement')).slice(0, 120);
    const tab = kind === 'message' ? 'messages' : 'announcements';

    const queue = subs.rows.slice();
    const workers = Array.from({ length: Math.min(12, queue.length) }, async () => {
      while (queue.length) {
        const row = queue.shift();
        const role = dashboardRole(row.role_name);
        const url = role ? `/dashboard/${role}?tab=${tab}` : `/?tab=${tab}`;
        const notifId = idByUser.get(Number(row.user_id)) || Date.now();
        const payload = JSON.stringify({
          title: heading,
          body,
          tag: `geleza-${kind}-${notifId}`,
          targetTab: tab,
          url,
        });
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payload,
            { TTL: 60 * 60 * 24, urgency: 'high' }
          );
        } catch (err) {
          const status = err && (err.statusCode || err.status);
          if (status === 404 || status === 410) {
            await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]).catch(() => {});
          } else {
            console.warn('[WEB PUSH] Delivery skipped:', err.message);
          }
        }
      }
    });
    await Promise.all(workers);
  }
}

module.exports = WebPushService;
