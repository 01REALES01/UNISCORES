// Service Worker — Olimpiadas UNINORTE 2026
// Handles Web Push notifications only — no fetch interception.

self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        // Clean up old caches from legacy PWA
        caches.keys().then(function (names) {
            return Promise.all(names.map(function (n) { return caches.delete(n); }));
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// ─── Push notification received ────────────────────────────────────────────
self.addEventListener('push', function (event) {
    var data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'Olimpiadas UNINORTE', body: event.data ? event.data.text() : '' };
    }

    var title = data.title || 'Olimpiadas UNINORTE';
    var options = {
        body: data.body || '',
        icon: '/uninorte_logo.png',
        badge: '/uninorte_logo.png',
        tag: data.tag || 'default',
        renotify: true,
        data: {
            url: data.url || '/',
        },
        actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click → open/focus the right page ────────────────────────
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    var targetUrl = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If a window with the app is already open, focus it and navigate
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                    return client;
                }
            }
            // Otherwise open a new window
            return self.clients.openWindow(targetUrl);
        })
    );
});
