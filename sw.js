const CACHE = "probeplaner-v1.0";
const BASE = "/Probeplaner/";
const ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.json",
  BASE + "icon-192.png",
  BASE + "icon-512.png"
];

// Install: cache all assets
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first for index.html (to detect updates), cache for rest
self.addEventListener("fetch", function(e) {
  var url = e.request.url;
  var isIndex = url.endsWith("/Probeplaner/") || url.endsWith("index.html");

  if (isIndex) {
    // Network first — if newer version available, update cache
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
          // Check if version changed
          response.clone().text().then(function(html) {
            var match = html.match(/name="app-version" content="([^"]+)"/);
            if (match) {
              var newVersion = match[1];
              self.clients.matchAll().then(function(clients) {
                clients.forEach(function(client) {
                  client.postMessage({ type: "VERSION_CHECK", version: newVersion });
                });
              });
            }
          });
        }
        return response;
      }).catch(function() {
        // Offline: serve from cache
        return caches.match(e.request);
      })
    );
  } else {
    // Cache first for assets
    e.respondWith(
      caches.match(e.request).then(function(r) {
        return r || fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
          }
          return response;
        }).catch(function() { return caches.match(BASE + "index.html"); });
      })
    );
  }
});

// When a new SW version takes over: notify clients to reload
self.addEventListener("message", function(e) {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
