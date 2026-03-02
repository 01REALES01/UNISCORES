// Kill-switch service worker
// Replaces any stale PWA service worker, clears all caches, and self-destructs.
// This ensures users who installed the old PWA get a clean slate automatically.

self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    console.log('[SW Kill-Switch] Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(function () {
            console.log('[SW Kill-Switch] All caches cleared. Unregistering...');
            return self.clients.claim();
        }).then(function () {
            return self.registration.unregister();
        }).then(function () {
            console.log('[SW Kill-Switch] Service worker unregistered. Clean slate!');
        })
    );
});

// Pass through all fetch requests directly to network (no caching)
self.addEventListener('fetch', function (event) {
    event.respondWith(fetch(event.request));
});
