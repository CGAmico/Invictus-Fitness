// SW minimale: attivo subito e prendo il controllo
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Cache semplice per asset statici (opzionale ma utile)
const CACHE = 'invictus-static-v1';
const ASSETS = [
  '/', '/favicon.ico', '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Cache-first per statici
  if (req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || req.url.endsWith('/')) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached)
      )
    );
  }
});
