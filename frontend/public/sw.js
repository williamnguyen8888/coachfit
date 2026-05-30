/**
 * CoachFit Service Worker — Baseline PWA Shell
 *
 * Strategy:
 *  - App shell (HTML, JS, CSS) → Cache-first with network fallback
 *  - API requests (/api/*, backend) → Network-only (always fresh data)
 *  - Static assets (images, fonts) → Cache-first with network fallback
 *  - Offline fallback page for navigation requests when offline
 *
 * Cache names are versioned — bump CACHE_VERSION on each deploy.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `coachfit-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `coachfit-static-${CACHE_VERSION}`;

/** Resources to pre-cache on install (app shell) */
const SHELL_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

/** Patterns that should never be served from cache */
const NETWORK_ONLY_PATTERNS = [
  /\/api\//,
  /localhost:8080/,
  /api\.coachfit\.app/,
  /_next\/webpack-hmr/,
  /chrome-extension/,
];

/* ─── Install ──────────────────────────────────────────────────────────────── */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate ─────────────────────────────────────────────────────────────── */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch ────────────────────────────────────────────────────────────────── */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip network-only patterns
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(request.url))) return;

  // Navigation requests → stale-while-revalidate with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of the page
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Offline: serve cached page or root shell
          caches
            .match(request)
            .then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // _next/static assets → cache-first (immutable, content-hashed filenames)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Everything else → network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
