/* Garde une copie des pages de l'app pour qu'elles s'ouvrent vite et même sans réseau.
 * Toujours la version en ligne d'abord (les mises à jour arrivent tout de suite), la copie si pas de réseau.
 * Les appels aux Google Sheets ne passent pas par ici. */
var CACHE = 'borderouge-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var c = r.clone(); caches.open(CACHE).then(function (k) { k.put(e.request, c); });
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
