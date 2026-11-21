// AgroLink Upload Service Worker v1
// Arka planda upload ilerleme bildirimleri gönderir

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Mesaj kanalı: CreatePostPage → SW → Notification
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "UPLOAD_PROGRESS") {
    const { pct, stage } = payload;
    // Yalnızca tab gizliyken bildirim göster (tab açıksa zaten UI'da görünüyor)
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const allHidden = clients.every((c) => c.visibilityState === "hidden");
      if (!allHidden) return; // Tab görünürse bildirim gösterme

      const title = stage === "hls"
        ? `⚙️ Video işleniyor... ${pct}%`
        : `📤 Gönderi yükleniyor... ${pct}%`;

      const body = pct === 100
        ? "✅ Yükleme tamamlandı! Gönderin paylaşıldı."
        : `İlerleme: ${pct}% — Lütfen bekleyin`;

      self.registration.showNotification("AgroLink", {
        body,
        icon: "/agrolink-icon.png",
        badge: "/agrolink-icon.png",
        tag: "upload-progress",        // Aynı tag → öncekini günceller (stack yapmaz)
        renotify: pct === 100,          // Sadece tamamlandığında ses/titreşim
        silent: pct !== 100,
        data: { pct, stage },
      });
    });
  }

  if (type === "UPLOAD_DONE") {
    self.registration.showNotification("AgroLink", {
      body: "✅ Gönderin başarıyla paylaşıldı!",
      icon: "/agrolink-icon.png",
      badge: "/agrolink-icon.png",
      tag: "upload-progress",
      renotify: true,
    });
  }

  if (type === "UPLOAD_ERROR") {
    self.registration.showNotification("AgroLink", {
      body: "❌ Gönderi paylaşılamadı. Lütfen tekrar deneyin.",
      icon: "/agrolink-icon.png",
      badge: "/agrolink-icon.png",
      tag: "upload-progress",
      renotify: true,
    });
  }
});

// Bildirime tıklanınca uygulamayı aç
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const agroClient = clients.find((c) => c.url.includes(self.location.origin));
      if (agroClient) return agroClient.focus();
      return self.clients.openWindow("/feed");
    })
  );
});

