/*
 * Uruz service worker.
 *
 * Responsibilities:
 *   1. Cache the app shell so Uruz opens instantly and works offline (e.g. in a
 *      gym basement with no signal).
 *   2. Serve navigations network-first with a cached fallback, and static
 *      assets cache-first.
 *
 * The offline *set-logging* queue is deliberately NOT here: iOS Safari has no
 * Background Sync, so the queue lives in IndexedDB on the client and is flushed
 * by the app when connectivity returns (see src/lib/offline/*). Keeping the SW
 * focused on caching makes offline behaviour predictable across platforms.
 */

const VERSION = "uruz-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  "/",
  "/train",
  "/stats",
  "/valhal",
  "/me",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never cache mutations

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API/auth calls — they must hit the network (or fail loudly).
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    // Network-first for pages, falling back to cached shell / offline page.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match("/offline")) || (await caches.match("/"));
        }),
    );
    return;
  }

  if (isStaticAsset(url)) {
    // Cache-first for immutable static assets.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
  }
});

// Allow the app to trigger an immediate activation after an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/*
 * ---- Push notifications (Huginn & Muninn) -------------------------------
 *
 * The ravens reach the user even when Uruz is closed — which is the whole
 * point of a reminder. Payloads are small JSON blobs sent by the server.
 */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Uruz ᚢ", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Uruz ᚢ";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "uruz",
    // Replace an earlier reminder rather than stacking several of them.
    renotify: false,
    data: { url: data.url || "/train" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/train";

  // Focus an already-open Uruz window if there is one, rather than opening
  // a second copy of the app.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
