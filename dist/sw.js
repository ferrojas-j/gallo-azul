// Gallo Azul PWA Service Worker — v14 (universal force-update)
const CACHE_NAME = 'gallo-azul-v14';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/manifest.json',
];

// Install: pre-cache static shell and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // Activate immediately, do NOT wait for old tabs to close
});

// Activate: delete ALL old caches, claim all clients, broadcast reload signal
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => {
            console.log('[SW v14] Deleting old cache:', k);
            return caches.delete(k);
          })
        )
      )
      .then(() => self.clients.claim()) // Take control of ALL open tabs
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        // Broadcast to every open window/tab so they reload immediately
        // This covers iOS Safari standalone, Android Chrome, desktop — ALL
        clients.forEach((client) => {
          console.log('[SW v14] Sending SW_UPDATED to:', client.url);
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      })
  );
});

// Fetch: NETWORK-FIRST — always try network, cache is only an offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (Supabase, Hostaway API, etc.)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // For navigation requests always go network-first (critical for HTML updates)
  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('/index.html');
        })
      )
  );
});
