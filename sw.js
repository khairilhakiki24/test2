const CACHE_NAME = 'kasirsync-v5';

// Daftar asset yang akan di-cache saat instalasi
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/lucide@latest'
];

// Event Install: Membuat cache dan menyimpan asset dasar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Membuka cache dan menyimpan asset statis');
      // Menggunakan addAll secara selektif agar jika satu gagal, yang lain tetap tersimpan
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Event Activate: Membersihkan cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Event Fetch: Strategi Cache First, then Network
self.addEventListener('fetch', event => {
  // Hanya proses request GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Cek jika response valid
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone response untuk disimpan di cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          // Jangan cache request selain http/https (misal chrome-extension)
          if (event.request.url.startsWith('http')) {
            cache.put(event.request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
        // Jika offline dan tidak ada di cache, bisa diarahkan ke halaman offline jika ada
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});