const CACHE_NAME = 'gold-land-v4.2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './i18n.js',
  './manifest.json',
  './logo.png',
  './favicon.ico',
  './favicon-32x32.png',
  './favicon-16x16.png',
  './apple-touch-icon.png',
  './icon-192x192.png',
  './icon-512x512.png',
  './icon-maskable-192x192.png',
  './icon-maskable-512x512.png'
];

const CDN_RULES = [
  { host: 'cdnjs.cloudflare.com' },
  { host: 'cdn.jsdelivr.net' },
  { host: 'www.gstatic.com', path: '/firebasejs/' }
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(urlsToCache.map(url => cache.add(url)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
    return;
  }
  if (CDN_RULES.some(r => url.hostname === r.host && (!r.path || url.pathname.startsWith(r.path)))) {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req);
    if (res && res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}
