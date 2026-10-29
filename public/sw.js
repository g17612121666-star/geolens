/* Geolens offline support.
 * Pages: network first, so a new deploy is always used when online; the last copy is kept for offline use.
 * Static files are kept after the first visit: hashed build files are served from the cache,
 * others from the cache while a fresh copy is fetched in the background.
 * Nothing from other sites (map tiles, weather, video) is stored. */
const VERSION = "v2";
const PAGES = `geolens-pages-${VERSION}`;
const ASSETS = `geolens-assets-${VERSION}`;
const ASSET_PATH = /^\/(assets|fonts|textures|terrain|photos|models|geo|icons|hdri|maplibre)\//;
const MAX_PAGES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(["/", "/explore"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("geolens-") && key !== PAGES && key !== ASSETS)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

const OFFLINE_HTML = `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Geolens</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07090c;color:#e8eeeb;font:17px/1.6 system-ui,sans-serif;padding:24px}main{max-width:32rem}h1{font:600 2rem Georgia,serif;margin:0 0 .5rem}a{color:#3ee0c6}</style><main><h1>You are offline</h1><p>This page has not been opened on this device yet, so it is not saved for offline use. Labs and pages you have opened before still work without a connection.</p><p><a href="/">Back to the home page</a></p></main></html>`;

async function page(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      trim(PAGES, MAX_PAGES);
    }
    return response;
  } catch {
    const cached =
      (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
    return (
      cached ||
      new Response(OFFLINE_HTML, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
}

// Hashed build files never change; other static files keep their names when updated, so they are
// served from the cache and refreshed in the background.
async function asset(request, immutable) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  if (cached) {
    if (!immutable) refresh.catch(() => undefined);
    return cached;
  }
  return refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(page(request));
    return;
  }
  if (ASSET_PATH.test(url.pathname) && !request.headers.has("range")) {
    event.respondWith(asset(request, url.pathname.startsWith("/assets/")));
  }
});
