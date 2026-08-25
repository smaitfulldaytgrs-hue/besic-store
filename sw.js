// ============================================================
// BESIC STORE — Service Worker
// Cuma nge-cache "app shell" (HTML/CSS/JS/icon) biar app bisa
// dibuka (Add to Home Screen) & tetap muncul walau internet lemot.
// DATA (jualan/modal/dst) SELALU diambil langsung dari Apps Script
// lewat fetch() biasa — TIDAK pernah di-cache di sini, supaya data
// yang ditampilkan selalu yang paling baru dari spreadsheet.
// ============================================================

var CACHE_NAME = 'besic-store-shell-v7';
var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Cuma tangani GET. POST (semua panggilan ke Apps Script) dan
  // request lain dibiarkan lewat apa adanya — jangan pernah dicache.
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Jangan cache panggilan ke backend Apps Script sama sekali,
  // walaupun suatu saat ada yang lewat GET juga.
  if (url.hostname.indexOf('script.google.com') !== -1 || url.hostname.indexOf('script.googleusercontent.com') !== -1) {
    return;
  }

  // App shell (HTML/CSS/JS/icon sendiri): coba jaringan dulu biar versi
  // terbaru selalu kepakai kalau online, fallback ke cache kalau offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) { return cached || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Resource eksternal (font, Chart.js dari CDN): cache-first biar
  // hemat kuota & tetap jalan offline, asal pernah kebuka online sekali.
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      });
    })
  );
});
