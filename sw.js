const CACHE_NAME = 'gold-land-v2.0';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// تثبيت ملفات الكاش وتفعيل الـ Service Worker فوراً
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// تفعيل وتنظيف الكاش القديم عند وجود تحديث جديد
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('جاري مسح الكاش القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) 
  );
});

// استراتيجية (Network First): جلب الملفات من الإنترنت أولاً لتطبيق التحديثات، وفي حال انقطاع النت يعود للكاش
self.addEventListener('fetch', event => {
  // تخطي الطلبات الخارجية (مثل فايربيس) وعدم تخزينها بالكاش لتجنب الأخطاء
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // إذا نجح الاتصال، قم بتحديث الكاش بالنسخة الجديدة
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // في حال عدم وجود إنترنت، اجلب النسخة المحفوظة في الكاش
        return caches.match(event.request);
      })
  );
});
