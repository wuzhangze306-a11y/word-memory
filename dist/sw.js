const CACHE = 'vocab-memo-v2';
const ASSETS = [
  '.',
  'index.html',
  'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(err => console.log('SW install cache error:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only handle navigation and same-origin requests
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin && e.request.mode !== 'navigate') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Return cached response if valid, otherwise fetch from network
      const fetchAndCache = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(err => {
        // Network failed; return cached response if available
        if (cached) return cached;
        // Return offline fallback for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        throw err;
      });

      // If we have a valid cached response, serve it immediately (cache-first)
      // but still update cache in background
      if (cached && cached.ok) {
        // Background refresh — don't block response
        fetchAndCache.catch(() => {});
        return cached;
      }
      return fetchAndCache;
    })
  );
});
