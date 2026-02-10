const CACHE_NAME = 'liverton-learning-v1';
const STATIC_CACHE = 'liverton-learning-static-v1';
const RUNTIME_CACHE = 'liverton-learning-runtime-v1';

// Files to cache on install - minimal set to avoid install failures
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  // Don't block on cache failures during install
  self.skipWaiting();
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('[SW] Caching static assets');
        
        // Cache files individually without failing on errors
        await Promise.allSettled(
          STATIC_ASSETS.map(asset => 
            cache.add(asset).catch(err => {
              console.warn('[SW] Could not cache:', asset, err.message);
            })
          )
        );
      } catch (err) {
        console.error('[SW] Install error:', err.message);
      }
    })()
  );
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

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle same-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Try to fetch from network first
        const networkResponse = await fetch(request);
        
        // If successful (200-299), cache it and return
        if (networkResponse.ok) {
          try {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
          } catch (cacheErr) {
            console.warn('[SW] Could not cache response:', cacheErr.message);
          }
          return networkResponse;
        }
        
        // If not ok but got a response, try cache
        throw new Error(`Network response not ok: ${networkResponse.status}`);
      } catch (networkError) {
        // Network failed, try cache
        try {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
          }
        } catch (cacheErr) {
          console.warn('[SW] Cache lookup failed:', cacheErr.message);
        }
        
        // Both network and cache failed
        console.log('[SW] No network or cache for:', request.url);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html').catch(() => {
            return new Response('Offline', { status: 503 });
          });
        }
        
        // For other requests, return offline response
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});
