const CACHE_NAME = 'geleza-sa-cache-v2.4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/offline.html',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/fusion-app-icon.png'
];

// Handle skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install Event: Pre-cache static shell assets (excluding dynamic HTML)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW v2.3] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Some initial assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up all old cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW v2.3] Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-First with Cache Fallback strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // CRITICAL: Always bypass Service Worker caching for all API endpoints and non-GET requests
  if (req.method !== 'GET' || url.pathname.startsWith('/api')) {
    return;
  }

  // Static Assets and Scripts: Cache First with Network Refresh
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Navigation & Page Requests: Network First with offline fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) return offlinePage;
        return caches.match('/');
      })
  );
});

function readPushData(event) {
  const fallback = {
    title: 'Geleza SA',
    body: 'You have a new notification.',
    tag: 'geleza-sa-alert',
    url: '/',
    targetTab: ''
  };
  if (!event.data) return fallback;
  try {
    const data = event.data.json();
    return {
      title: data.title || fallback.title,
      body: data.body || fallback.body,
      tag: data.tag || fallback.tag,
      url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : fallback.url,
      targetTab: data.targetTab || ''
    };
  } catch (_) {
    return fallback;
  }
}

self.addEventListener('push', (event) => {
  const data = readPushData(event);
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: data.tag,
      renotify: true,
      silent: false,
      data: { url: data.url, targetTab: data.targetTab }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'open-notification', url });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
