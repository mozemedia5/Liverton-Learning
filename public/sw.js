const CACHE_NAME = 'liverton-learning-v1';
const STATIC_CACHE = 'liverton-learning-static-v1';

// Files to cache on install
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
        // Cache static assets
        const cache = await caches.open(STATIC_CACHE);
        console.log('[SW] Caching static assets');
        
        // Try to cache files, but don't fail on errors
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(asset);
            console.log('[SW] Cached:', asset);
          } catch (err) {
            console.warn('[SW] Could not cache:', asset, err);
          }
        }
      } catch (err) {
        console.error('[SW] Install error:', err);
      }
    })()
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const validCaches = [CACHE_NAME, STATIC_CACHE];
        
        await Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
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
  
  // Claim any existing clients
  return self.clients.claim();
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
