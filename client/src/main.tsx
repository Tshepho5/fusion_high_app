import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Global handler for Vite dynamic chunk preload errors across deployments
window.addEventListener('vite:preloadError', async (event) => {
  console.warn('[Vite Preload Error] Outdated chunk bundle detected on deployment. Purging caches and reloading...', event);
  const reloaded = sessionStorage.getItem('vite_preload_reloaded');
  if (!reloaded) {
    sessionStorage.setItem('vite_preload_reloaded', 'true');
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      } catch (_) {}
    }
    window.location.reload();
  }
});

// Clear preload retry flag once app loads successfully
window.addEventListener('load', () => {
  setTimeout(() => {
    sessionStorage.removeItem('vite_preload_reloaded');
  }, 3000);
});

// Register PWA Service Worker for offline capability & caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
        // If an update is waiting, prompt it to take over
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version installed; sending SKIP_WAITING');
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
