/* eslint-disable */

// Firebase Cloud Messaging Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAXMcWjFR4F64MN1glT3BP7h_xwKl_dzrY",
  authDomain: "agro-web-87675.firebaseapp.com",
  projectId: "agro-web-87675",
  storageBucket: "agro-web-87675.firebasestorage.app",
  messagingSenderId: "555483201341",
  appId: "1:555483201341:web:96a97b086a2481e94b0f54",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ── FCM Background notification (Android native + FCM web token) ──────────
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Agrolink";
  const body  = payload?.notification?.body  || "";
  const icon  = payload?.notification?.icon  || "/favicon.ico";
  const data  = payload.data || {};

  // FCM data.url varsa kullan, yoksa "/"
  const notifData = { ...data, url: data.url || "/" };

  self.registration.showNotification(title, {
    body,
    icon,
    badge   : "/favicon.ico",
    data    : notifData,
    tag     : data.tag || "agrolink-notif",
    renotify: true,
  });
});

// ── VAPID (web-push) bildirimleri — FCM olmadan tarayıcı push ─────────────
self.addEventListener("push", (event) => {
  // FCM kendi push event'ini zaten handle eder,
  // bu listener sadece VAPID (web-push) paketinden gelen bildirimleri yakalar.
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    return;
  }

  // FCM'den gelen push'ları burada tekrar işleme — onBackgroundMessage halleder
  // VAPID payload'ında "title" doğrudan top-level gelir
  if (!payload.title && !payload.body) return;

  const title = payload.title || "Agrolink";
  const options = {
    body    : payload.body  || "",
    icon    : payload.icon  || "/favicon.ico",
    badge   : "/favicon.ico",
    // url top-level'dan al (server.js'de notifUrl olarak gönderiliyor)
    data    : { url: payload.url || "/" },
    tag     : "agrolink-notif",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Bildirime tıklama — hem FCM hem VAPID için çalışır ───────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // FCM data içinde url gelebilir, VAPID data.url olarak gelir
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        // Açık sekme varsa ona git
        for (const client of clientsArr) {
          if (client.url && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Açık sekme yoksa yeni aç
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});

