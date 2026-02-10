const CACHE_NAME = 'liverton-learning-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('[SW] Caching essential assets');
        // Cache important files, but don't fail if some aren't available yet
        await cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some assets could not be cached during install:', err);
        });
      } catch (err) {
        console.error('[SW] Install error:', err);
      }
    })()
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      } catch (err) {
        console.error('[SW] Activation error:', err);
      }
    })()
  );
  self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip requests to external domains (APIs, etc.) - let them go through normally
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // If successful, cache it
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.log('[SW] Fetch failed, trying cache for:', request.url);
        // Fall back to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return a basic offline response
        return new Response('Offline - content not available', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      }
    })()
  );
});
