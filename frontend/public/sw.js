/* Only public static assets enter this cache. /api and private data are excluded. */
const VERSION = 'pilihanku-shell-v1';
self.addEventListener('install', (event) =>
  event.waitUntil(
    (async () => {
      const response = await fetch('/precache.json', { cache: 'no-store' });
      if (!response.ok) return;
      const paths = await response.json();
      const cache = await caches.open(VERSION);
      await cache.addAll(
        paths
      ); /* Activate updates after existing tabs finish; keep old lazy chunks available. */
    })()
  )
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
      await self.clients.claim();
    })()
  )
);
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    return;
  }
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/images/hero-leaves.webp' ||
    url.pathname === '/favicon.svg'
  )
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
