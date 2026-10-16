// Minimal service worker — required by Chrome/Android for PWA installability.
const CACHE_NAME = "kiraya-v1";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

// A fetch handler is required for the browser to treat this as a valid PWA service worker.
// We pass requests straight through to the network so app data always stays fresh.
self.addEventListener("fetch", (event) => {
    event.respondWith(fetch(event.request));
});
