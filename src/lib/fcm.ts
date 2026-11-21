// ═══════════════════════════════════════════════════════════════
// FCM Web Push Notification — Lazy initialized
// Firebase config is read from Vite env vars (VITE_FCM_*).
// Until the user creates the Firebase project and adds .env values,
// initFCM() returns null silently (no errors thrown).
// ═══════════════════════════════════════════════════════════════
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";
import { API_BASE } from "./api";

const cfg = {
  apiKey: import.meta.env.VITE_FCM_API_KEY,
  authDomain: import.meta.env.VITE_FCM_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FCM_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FCM_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FCM_SENDER_ID,
  appId: import.meta.env.VITE_FCM_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined;

// 🔍 GEÇİCİ DEBUG — client hatalarını sunucu console'una POST eder.
// (Telefonda DevTools açılamadığı için hatayı görebilmek amacıyla eklendi;
// sorun bulununca bu fonksiyon ve tüm çağrıları kaldırılacak.)
function debugLog(step: string, extra: Record<string, unknown> = {}) {
  try {
    fetch(`${API_BASE}/device-token`.replace("/device-token", "/_fcm_debug"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, extra, ua: navigator.userAgent, ts: Date.now() }),
    }).catch(() => {});
  } catch {}
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let initPromise: Promise<Messaging | null> | null = null;

const isConfigured = () =>
  !!cfg.apiKey && !!cfg.projectId && !!cfg.appId && !!cfg.messagingSenderId && !!VAPID_KEY;

async function ensureMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (!isConfigured()) {
    console.info("[FCM] Firebase ayarları eksik. .env'e VITE_FCM_* değerlerini ekleyin.");
    return null;
  }
  if (typeof window === "undefined") return null;
  if (!(await isSupported().catch(() => false))) {
    console.info("[FCM] Bu tarayıcı push bildirimi desteklemiyor.");
    return null;
  }
  if (!app) app = initializeApp(cfg);
  messaging = getMessaging(app);
  return messaging;
}

export async function initFCM(): Promise<Messaging | null> {
  if (!initPromise) initPromise = ensureMessaging();
  return initPromise;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.info("[FCM] Bu tarayıcı Notification API'yi desteklemiyor.");
    return "denied";
  }
  if (Notification.permission !== "default") {
    // "denied" ise tarayıcı bir daha sormaz — kullanıcı site ayarlarından
    // manuel olarak izin vermeli. Bu, kod hatası değil, tarayıcı kısıtıdır.
    if (Notification.permission === "denied") {
      console.info("[FCM] Bildirim izni daha önce reddedilmiş. Tekrar açmak için tarayıcı site ayarlarından izin verilmeli.");
    }
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export async function registerWebPushToken(authToken: string): Promise<string | null> {
  try {
    debugLog("start");
    const m = await initFCM();
    if (!m) { debugLog("initFCM_null"); return null; }
    debugLog("initFCM_ok");

    const perm = await requestPushPermission();
    if (perm !== "granted") {
      console.info(`[FCM] Bildirim izni durumu: ${perm}. Push token alınamadı.`);
      debugLog("perm_not_granted", { perm });
      return null;
    }
    debugLog("perm_granted");

    // Service worker'ı kayıt et (Vite dev'de de çalışır)
    let swReg: ServiceWorkerRegistration;
    try {
      swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      debugLog("sw_registered", { state: swReg.active?.state || swReg.installing?.state || swReg.waiting?.state || "unknown" });
      // Aktif olana kadar bekle — bazı Chrome Android sürümlerinde
      // getToken, SW henüz "activated" olmadan çağrılırsa sessizce başarısız olabilir
      if (!swReg.active) {
        await new Promise<void>((resolve) => {
          const sw = swReg.installing || swReg.waiting;
          if (!sw) return resolve();
          const onChange = () => {
            if (sw.state === "activated") { sw.removeEventListener("statechange", onChange); resolve(); }
          };
          sw.addEventListener("statechange", onChange);
          setTimeout(resolve, 5000); // güvenlik timeout'u
        });
        debugLog("sw_active_wait_done");
      }
    } catch (swErr: any) {
      debugLog("sw_register_error", { message: swErr?.message, name: swErr?.name });
      throw swErr;
    }

    let token: string | null | undefined;
    try {
      token = await getToken(m, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      debugLog("getToken_ok", { hasToken: !!token, tokenPrefix: token ? token.slice(0, 12) : null });
    } catch (tokenErr: any) {
      debugLog("getToken_error", { message: tokenErr?.message, name: tokenErr?.name, code: tokenErr?.code });
      throw tokenErr;
    }
    if (!token) { debugLog("token_empty"); return null; }

    // Sunucuya kaydet
    try {
      const saveRes = await fetch(`${API_BASE}/device-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token, platform: "web_fcm" }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.text().catch(() => "");
        console.warn("[FCM] device-token kayıt başarısız:", saveRes.status, errBody);
        debugLog("save_failed", { status: saveRes.status, errBody });
      } else {
        console.info("[FCM] web_fcm token başarıyla kaydedildi");
        debugLog("save_ok");
      }
    } catch (e: any) {
      console.warn("[FCM] device-token kayıt hatası:", e);
      debugLog("save_exception", { message: e?.message });
    }

    // Foreground bildirim listener (sayfa açıkken gelen bildirimleri yakalar)
    onMessage(m, (payload) => {
      const title = payload.notification?.title || "Agrolink";
      const body = payload.notification?.body || "";
      try {
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch {
        // Sessiz geç
      }
      window.dispatchEvent(new CustomEvent("fcm:message", { detail: payload }));
    });

    return token;
  } catch (e: any) {
    console.warn("[FCM] register hatası:", e);
    debugLog("outer_catch", { message: e?.message, name: e?.name });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 KÖK NEDEN DÜZELTMESİ — Web'de FCM bildirimleri çalışmıyordu:
// registerWebPushToken() her sayfa yüklenişinde otomatik (useEffect
// ile) çağrılıyordu ve içinde Notification.requestPermission() vardı.
// Modern tarayıcılar (Chrome/Edge/Android WebView dahil), bir KULLANICI
// TIKLAMASINA bağlı olmayan izin isteklerini sessizce engeller veya
// otomatik "denied" sayar — bu yüzden kullanıcı hiçbir izin diyaloğu
// görmüyordu ve token hiç oluşmuyordu (mobil native app'te bu kısıt
// yok, o yüzden orada çalışıyordu).
//
// Çözüm: otomatik çalışan kodlar artık İZİN İSTEMİYOR — sadece izin
// zaten "granted" ise (kullanıcı bir şekilde daha önce izin vermişse)
// sessizce token senkronize ediyor. Gerçek izin isteği artık SADECE
// bir kullanıcı tıklamasından (buton) gelen requestAndRegisterWebPush()
// üzerinden yapılıyor — bu, tarayıcının izin diyaloğunu güvenilir
// şekilde göstermesini sağlar.
// ═══════════════════════════════════════════════════════════════
export async function syncWebPushTokenSilently(authToken: string): Promise<string | null> {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      // İzin verilmemiş: burada ASLA sormuyoruz (otomatik çağrıldığı için
      // kullanıcı jesti sayılmaz, tarayıcı engeller). Kullanıcı Ayarlar'dan
      // "Bildirimleri Etkinleştir" butonuna basmalı.
      return null;
    }
    return await registerWebPushToken(authToken);
  } catch {
    return null;
  }
}

// Kullanıcının açıkça tıkladığı bir buton tarafından çağrılmalı
// (ör. Ayarlar > Bildirim Ayarları > "Bildirimleri Etkinleştir").
// Gerçek bir tıklama olayı içinden çağrıldığı için tarayıcı izin
// diyaloğunu güvenilir şekilde gösterir.
export async function requestAndRegisterWebPush(authToken: string): Promise<{ ok: boolean; permission: NotificationPermission }> {
  const perm = await requestPushPermission();
  if (perm !== "granted") return { ok: false, permission: perm };
  const token = await registerWebPushToken(authToken);
  return { ok: !!token, permission: perm };
}

export async function unregisterWebPushToken(authToken: string) {
  try {
    const m = await initFCM();
    if (!m) return;
    const swReg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    const token = await getToken(m, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    }).catch(() => null);
    if (!token) return;
    await fetch(`${API_BASE}/device-token`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: "web_fcm" }),
    }).catch(() => {});
  } catch {
    /* sessiz geç */
  }
}


