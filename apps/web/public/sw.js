const VERSION = 'colo-v5-5-6';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const CORE = ['/', '/offline.html', '/manifest.webmanifest', '/brand/logo-oficial-branca.png', '/icons/icon-192.png', '/icons/icon-512.png', '/favicon.svg', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

const fetchWithTimeout = (request, timeout = 12_000) => Promise.race([
  fetch(request),
  new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), timeout)),
]);

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') || request.headers.has('authorization')) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.origin === location.origin && request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request)
        .then((response) => {
          if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/offline.html'))),
    );
    return;
  }

  if (/\.(?:png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(fetchWithTimeout(request).then((response) => {
      if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});
