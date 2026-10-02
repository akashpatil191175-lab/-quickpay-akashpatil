const CACHE_NAME = "quickpay-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo-192.png",
  "./logo-512.png"
];


// ================================
// INSTALL
// ================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});


// ================================
// ACTIVATE
// ================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});


// ================================
// FETCH / OFFLINE CACHE
// ================================
self.addEventListener("fetch", (event) => {

  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // फक्त आपल्या website चे files cache करा
  if (url.origin === self.location.origin) {

    event.respondWith(

      caches.match(event.request).then((cachedResponse) => {

        // Cache मध्ये file असेल तर ती वापरा
        if (cachedResponse) {
          return cachedResponse;
        }

        // नाहीतर network मधून घ्या
        return fetch(event.request).then((response) => {

          // Response योग्य असेल तर cache मध्ये save करा
          if (response && response.ok) {

            const responseClone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });

          }

          return response;

        }).catch(() => {

          // Internet नसल्यास index.html दाखवा
          return caches.match("./index.html");

        });

      })

    );
  }
});


// ================================
// PUSH NOTIFICATION
// ================================
self.addEventListener("push", (event) => {

  let data = {};

  try {

    data = event.data
      ? event.data.json()
      : {};

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

    icon: data.icon || "./logo-192.png",

    badge: data.badge || "./logo-192.png",

    tag: data.tag || "quickpay-notification",

    renotify: true,

    data: {
      url: data.url || "./"
    }

  };


  event.waitUntil(

    self.registration.showNotification(
      title,
      options
    )

  );

});


// ================================
// NOTIFICATION CLICK
// ================================
self.addEventListener("notificationclick", (event) => {

  event.notification.close();


  const targetUrl =
    event.notification &&
    event.notification.data &&
    event.notification.data.url
      ? event.notification.data.url
      : "./";


  event.waitUntil(

    clients.matchAll({

      type: "window",

      includeUncontrolled: true

    }).then((clientList) => {


      // Website आधीपासून open असेल
      for (const client of clientList) {

        if ("focus" in client) {

          return client.focus();

        }

      }


      // Website open नसेल तर नवीन window उघडा
      if (clients.openWindow) {

        return clients.openWindow(targetUrl);

      }

    })

  );

});
