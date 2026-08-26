const VERSION = 'colo-v7-2-5';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const CORE = ['/', '/offline.html', '/manifest.webmanifest', '/brand/logo-oficial-branca.png', '/icons/icon-192.png', '/icons/icon-512.png', '/favicon.svg', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(CORE);
    const html = await (await fetch('/', { cache: 'no-store' })).text();
    const shellAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
    const manifest = await (await fetch('/asset-manifest.json', { cache: 'no-store' })).json();
    const buildAssets = Object.values(manifest).flatMap((entry) => [entry.file, ...(entry.css || []), ...(entry.assets || [])]).filter(Boolean).map((asset) => `/${asset}`);
    await cache.addAll([...new Set([...shellAssets, ...buildAssets])]);
  })());
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
    return;
  }

  if (url.origin === location.origin && request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request)
        .then(async (response) => {
          if (response.ok) await (await caches.open(RUNTIME_CACHE)).put(request, response.clone());
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/offline.html'))),
    );
    return;
  }

  if (/\.(?:png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
      if (response.ok) await (await caches.open(RUNTIME_CACHE)).put(request, response.clone());
      return response;
    })));
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(fetchWithTimeout(request).then(async (response) => {
      if (response.ok) await (await caches.open(RUNTIME_CACHE)).put(request, response.clone());
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
