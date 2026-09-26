// M2: the field app's service worker. It only makes /field open without signal:
//  - the /field page itself: network first, falling back to the last copy that loaded;
//  - the app's scripts, styles, fonts and icons requested from /field: served from cache, refreshed in the background.
// API calls are never cached here; the app keeps its own copy of today's jobs and an outbox in IndexedDB.
const VERSION = 'field-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function fromField(request) {
  try {
    return new URL(request.referrer || '', self.location.origin).pathname.startsWith('/field');
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    if (!url.pathname.startsWith('/field')) return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((c) => c.put('/field', copy));
          return response;
        })
        .catch(() =>
          caches
            .open(SHELL)
            .then((c) => c.match('/field'))
            .then((r) => r || Response.error()),
        ),
    );
    return;
  }

  if (!fromField(request) && url.pathname !== '/field.webmanifest') return;
  if (!['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)) return;

  event.respondWith(
    caches.open(ASSETS).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
