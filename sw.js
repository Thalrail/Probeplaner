const CACHE = "probeplaner-v2.8";
const BASE = "/Probeplaner/";
const ASSETS = [BASE, BASE+"index.html", BASE+"manifest.json", BASE+"icon-192.png", BASE+"icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}));
  self.skipWaiting();
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function(e){
  var isIndex = e.request.url.endsWith("/Probeplaner/") || e.request.url.endsWith("index.html");
  if(isIndex){
    e.respondWith(
      fetch(e.request).then(function(r){
        caches.open(CACHE).then(function(c){c.put(e.request,r.clone());});
        r.clone().text().then(function(html){
          var m=html.match(/CURRENT_VERSION = '([^']+)'/);
          if(m) self.clients.matchAll().then(function(cls){
            cls.forEach(function(cl){cl.postMessage({type:"VERSION_CHECK",version:m[1]});});
          });
        });
        return r;
      }).catch(function(){ return caches.match(e.request); })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function(r){
        return r || fetch(e.request).then(function(res){
          if(res&&res.status===200) caches.open(CACHE).then(function(c){c.put(e.request,res.clone());});
          return res;
        }).catch(function(){ return caches.match(BASE+"index.html"); });
      })
    );
  }
});
self.addEventListener("message", function(e){
  if(e.data&&e.data.type==="SKIP_WAITING") self.skipWaiting();
});
