/* ========================================================
   Vodafone Egypt Interactive Hub - Service Worker (PWA)
   Version: 1.0.1
   Features: 100% Offline-First, Auto-Update & Stale-While-Revalidate
   ======================================================== */

const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `voda-hub-${CACHE_VERSION}`;

// Core assets to pre-cache for offline capability
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './vodafone-logo.png',
  './vodafone-guide.pdf',
  './version.json'
];

// Install: Cache all core assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become active
      return self.skipWaiting();
    })
  );
});

// Activate: Clean up old caches and take control of all open tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('voda-hub-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[ServiceWorker] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Ensure the service worker controls all active clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch: Network-First for version.json, Stale-While-Revalidate for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always fetch version.json fresh from the network to detect updates
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For all other resources: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Network failure is fine; cachedResponse will serve offline
        return cachedResponse;
      });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for messages from client tabs
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
