// MNI Assist — Progressive Web Application Service Worker
const VERSION = 'mni-assist-v1';
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_DYNAMIC = `${VERSION}-dynamic`;
const CACHE_PAGES = `${VERSION}-pages`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/brand/mni-assist-icon.png',
  '/brand/mni-assist-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  '/vendor/syncfusion/syncfusion.css?v=35.1.37',
];

// Install: precache critical app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Precache skipped for ${url}:`, err);
          }),
        ),
      );
    }),
  );
});

// Activate: clean up outdated caches and claim existing clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Message handler for immediate updates and client control
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});

function isBypassedUrl(url) {
  const p = url.pathname;
  return (
    p.startsWith('/api/') ||
    p.startsWith('/connect/') ||
    p.startsWith('/signalr/') ||
    p.startsWith('/hubs/') ||
    p.startsWith('/_configuration') ||
    p.startsWith('/signin-') ||
    p.startsWith('/signout-') ||
    p.includes('/api-definition')
  );
}

// Fetch handler: caching strategies tailored for SPA shell and static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore non-http(s) schemes like chrome-extension://
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Bypass API, OAuth, and SignalR traffic
  if (url.origin === self.location.origin && isBypassedUrl(url)) {
    return;
  }

  // 1. Navigation requests (HTML pages) -> Network-First with cached SPA shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_PAGES).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const pagesCache = await caches.open(CACHE_PAGES);
          const cachedRoute = await pagesCache.match(request);
          if (cachedRoute) return cachedRoute;

          // Fallback to cached index.html or root app shell
          const root =
            (await pagesCache.match('/index.html')) ||
            (await pagesCache.match('/')) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/'));

          return root || Response.error();
        }),
    );
    return;
  }

  // 2. Google Fonts & CDNs -> Stale-While-Revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_DYNAMIC).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // 3. Static application assets (JS, CSS, fonts, workers)
  const isStaticAsset =
    ['script', 'style', 'font'].includes(request.destination) ||
    /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname);

  if (isStaticAsset && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_DYNAMIC).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        // Stale-While-Revalidate: return cache if ready, refresh in background
        return cached || (await fetchPromise) || (await caches.match(request));
      }),
    );
    return;
  }

  // 4. Images, icons, and media -> Cache-First
  const isImage =
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname);

  if (isImage && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cached;
        }
      }),
    );
    return;
  }
});

// Optional Web Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'MNI Assist Notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/favicon-32x32.png',
      data: data.data || { url: '/' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('MNI Assist', {
        body: text,
        icon: '/icons/icon-192x192.png',
      }),
    );
  }
});

// Notification click handler: focus or open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }),
  );
});
