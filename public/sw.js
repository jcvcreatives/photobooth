/**
 * JCVcreatives Photobooth — Offline-First Kiosk Service Worker
 * Guarantees instant cold-start launch even when the tablet is 100% offline
 * and the app has been force-closed in Android Recents.
 */

const CACHE_NAME = 'jcv-kiosk-offline-v33';

const CORE_PRECACHE_URLS = [
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/assets/aistudio/01_shredded_beef_and_egg_883d5ffc.png',
  '/assets/aistudio/02_tapa_and_garlic_rice_77785a88.png',
  '/assets/aistudio/03_hotdogs_and_scrambled_egg_28f526aa.png',
  '/assets/aistudio/05_diced_hotdogs_and_egg_44d5a234.png',
  '/assets/aistudio/06_beef_and_egg_rice_062af470.png',
  '/assets/aistudio/07_luncheon_meat_rice_8770438d.png',
  '/assets/aistudio/08_beef_and_scrambled_egg_177c915a.png',
  '/assets/aistudio/09_creamy_chicken_and_egg_rice_bfe9e7b2.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of CORE_PRECACHE_URLS) {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res && res.ok) {
            await cache.put(url, res);
          }
        } catch {
          // Ignore individual failures during install
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key.startsWith('jcv-kiosk-offline-')) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          })
        );
      } catch {
        // Ignore
      }
      await self.clients.claim();
    })()
  );
});

async function matchAnyCache(request) {
  const direct = await caches.match(request);
  if (direct) return direct;
  const ignoreSearch = await caches.match(request, { ignoreSearch: true });
  if (ignoreSearch) return ignoreSearch;
  return null;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (
    url.pathname.toLowerCase().endsWith('.apk') ||
    url.pathname.startsWith('/downloads/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@fs/')
  ) {
    return;
  }

  // 1. Navigation requests (HTML app shell when launching/reopening app)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const isOffline = self.navigator && self.navigator.onLine === false;
        if (!isOffline) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const networkRes = await fetch(req, { signal: controller.signal });
            clearTimeout(timer);
            if (networkRes && networkRes.ok) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(req, networkRes.clone()).catch(() => {});
              cache.put('/', networkRes.clone()).catch(() => {});
              cache.put('/index.html', networkRes.clone()).catch(() => {});
              return networkRes;
            }
          } catch {
            // Fall through to offline cache
          }
        }

        const cachedNav =
          (await matchAnyCache(req)) ||
          (await matchAnyCache('/')) ||
          (await matchAnyCache('/index.html'));
        if (cachedNav) return cachedNav;

        return fetch(req);
      })()
    );
    return;
  }

  // 2. Static & module assets (JS, CSS, images, fonts)
  event.respondWith(
    (async () => {
      const isOffline = self.navigator && self.navigator.onLine === false;
      if (isOffline) {
        const cached = await matchAnyCache(req);
        if (cached) return cached;
      }

      try {
        const networkRes = await fetch(req);
        if (networkRes && (networkRes.ok || networkRes.type === 'opaque')) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, networkRes.clone()).catch(() => {});
        }
        return networkRes;
      } catch {
        const fallback = await matchAnyCache(req);
        if (fallback) return fallback;
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
