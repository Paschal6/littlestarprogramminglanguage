// 🌟 Littlestar Service Worker v2
const CACHE_NAME = 'littlestar-v2';   // ← bumped version wipes old caches!

const FILES = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico'
];

// Files that should ALWAYS be fetched fresh (never cached)
const NEVER_CACHE = [
  'sitemap.xml',
  'robots.txt',
  'google',            // Google verification files
  '.xml',              // Any XML file
  '.txt'               // Any text file (robots.txt, etc.)
];

// ── INSTALL ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// ── ACTIVATE (wipe old caches) ──────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ── FETCH ───────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1) SKIP anything Google/Bing crawlers or SEO files need fresh
  if (NEVER_CACHE.some(part => url.includes(part))) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 404 })));
    return;
  }

  // 2) Only cache HTTP(S) GET requests
  if (event.request.method !== 'GET' || !url.startsWith('http')) return;

  // 3) NETWORK FIRST, fall back to cache (better for updates)
  event.respondWith(
    fetch(event.request)
      .then(fetchResponse => {
        // Don't cache errors (like 404)
        if (!fetchResponse || fetchResponse.status !== 200) {
          return fetchResponse;
        }
        // Save fresh copy to cache
        const clone = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return fetchResponse;
      })
      .catch(() =>
        // Offline? Try cache
        caches.match(event.request).then(cached => cached || caches.match('./app.html'))
      )
  );
});
