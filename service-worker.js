const STATIC_CACHE_NAME = 'finance-tracker-static-v1';
const DYNAMIC_CACHE_NAME = 'finance-tracker-dynamic-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap'
];

// Install event: cache semua asset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Langsung aktifkan SW baru
  );
});

// Activate event: hapus cache lama dan ambil kendali klien
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.filter(key => key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
              .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event: implementasikan strategi cache
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Misalnya, gunakan network-first untuk endpoint API dinamis (/api/)
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          return caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, res.clone());
              return res;
            });
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Untuk asset statis, gunakan cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          return cachedResponse || fetch(event.request)
            .then((fetchResponse) => {
              return fetchResponse;
            });
        })
    );
  }
});