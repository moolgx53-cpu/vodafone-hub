/* ========================================================
   Vodafone Egypt Interactive Hub - Service Worker (PWA)
   Version: 1.0.30
   Features: 100% Offline-First, Auto-Update & Network-First for Pages
   ======================================================== */

const CACHE_VERSION = 'v1.0.30';
const CACHE_NAME = `voda-hub-${CACHE_VERSION}`;

// Core assets to pre-cache for offline capability
const CORE_ASSETS = [
  './',
  './index.html',
  './note.html',
  './manifest.json',
  './vodafone-logo.png',
  './vodafone-guide.pdf',
  './docs/day2-prepaid-vmt.pdf',
  './docs/day3-red-dsl.pdf',
  './docs/day4-enterprise-cash.pdf',
  './docs/vodafone-guide.pdf',
  './version.json'
];

// Install: Cache all core assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[ServiceWorker] Could not pre-cache asset:', asset, err);
        }
      }
    }).then(() => {
      // Force the waiting service worker to become active immediately
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
          .filter((name) => name !== CACHE_NAME)
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

// Fetch: Network-First for HTML pages & version.json, Cache-First/Stale-While-Revalidate for other static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Always fetch version.json fresh from network to detect updates instantly
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

  // 2. Network-First for HTML navigation & page requests so code changes reflect immediately online
  const isHtml = event.request.mode === 'navigate' ||
                 (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('./index.html') || caches.match('./')))
    );
    return;
  }

  // 3. For other assets (PDFs, icons, images): Stale-While-Revalidate
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
        return cachedResponse;
      });

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
