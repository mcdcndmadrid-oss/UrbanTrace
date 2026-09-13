/* UrbanTrace — service worker v20
   Estrategia: network-first para la app y sus recursos base (siempre la última
   versión desplegada, con respaldo en caché para funcionar sin conexión);
   cache-first para el resto (teselas de mapa, etc.). */
var CACHE = 'urbantrace-v20';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192-v2.png', './icon-512-v2.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

function isCore(req) {
  if (req.mode === 'navigate') return true;
  var p = new URL(req.url).pathname;
  return /(index\.html|manifest\.webmanifest|icon-\d+(-v\d+)?\.png|\/)$/.test(p) &&
         new URL(req.url).origin === self.location.origin;
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (isCore(e.request)) {
    /* network-first: la actualización llega al primer recargo */
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }
  /* cache-first para recursos externos (teselas, etc.) */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
