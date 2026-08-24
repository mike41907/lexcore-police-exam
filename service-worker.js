const CACHE_NAME = "lexcore-v3.2.1";
const SCOPE_URL = self.registration.scope;
const INDEX_URL = new URL("index.html", SCOPE_URL).href;
const MANIFEST_URL = new URL("manifest.webmanifest", SCOPE_URL).href;
const ICON_URL = new URL("icon.svg", SCOPE_URL).href;
const SHELL_URLS = [new URL("./", SCOPE_URL).href, INDEX_URL, MANIFEST_URL, ICON_URL];

function cacheKey(request) {
  const url = new URL(request.url);
  url.search = "";
  return new Request(url.href, {method: "GET"});
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("lexcore-") && key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const key = cacheKey(event.request);
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(INDEX_URL, response.clone())));
        return response;
      }).catch(() => caches.match(INDEX_URL).then(cached => cached || caches.match(SCOPE_URL)))
    );
    return;
  }

  const isRuntimeData = /\/(data|config)\//.test(url.pathname) || /\.(json|csv)$/.test(url.pathname);
  if (isRuntimeData) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(key, response.clone())));
        return response;
      }).catch(() => caches.match(key).then(cached => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(key).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok && response.type === "basic") event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(key, response.clone())));
      return response;
    }))
  );
});
