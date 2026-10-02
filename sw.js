const CACHE_NAME = "quickpay-v5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled(
          APP_SHELL.map((url) => cache.add(url))
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Only handle same-origin files
  if (url.origin !== self.location.origin) return;

  // HTML navigation - Network first
  if (
    event.request.mode === "navigate" ||
    event.request.destination === "document"
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put("./index.html", copy);
          });

          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  // Other files - Cache first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }

        return response;
      });
    })
  );
});


// ==========================================
// PUSH NOTIFICATION
// ==========================================

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: "QuickPay",
      body: event.data
        ? event.data.text()
        : "You have a new notification."
    };
  }

  const title = data.title || "QuickPay";

  const options = {
    body: data.body || "You have a new notification.",

    icon: data.icon || "./icon-192.png",

    badge: data.badge || "./icon-192.png",

    tag: data.tag || "quickpay-notification",

    renotify: true,

    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


// ==========================================
// NOTIFICATION CLICK
// ==========================================

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url || "./";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then((clientList) => {

        for (const client of clientList) {

          if ("focus" in client) {

            if (
              "navigate" in client &&
              client.url !== targetUrl
            ) {
              client.navigate(targetUrl).catch(() => {});
            }

            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

      })
  );
});
