// ============================================================
//  AgroLink — Güvenlik Yardımcıları
// ============================================================

// ---- XSS: Tehlikeli HTML karakterlerini kaçır ----
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
}

// ---- Input doğrulama ----
export function validateInput(
  value: string,
  type: "text" | "email" | "username" | "url" | "number"
): { valid: boolean; error?: string } {
  if (!value || value.trim().length === 0) return { valid: false, error: "Bu alan boş bırakılamaz" };

  switch (type) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? { valid: true }
        : { valid: false, error: "Geçerli bir e-posta adresi girin" };
    case "username":
      return /^[a-zA-Z0-9_]{3,30}$/.test(value)
        ? { valid: true }
        : { valid: false, error: "Kullanıcı adı 3-30 karakter, sadece harf/rakam/_" };
    case "url":
      try { new URL(value); return { valid: true }; }
      catch { return { valid: false, error: "Geçerli bir URL girin" }; }
    case "number":
      return isNaN(Number(value)) ? { valid: false, error: "Sayı giriniz" } : { valid: true };
    default:
      return value.length > 5000
        ? { valid: false, error: "Metin çok uzun (max 5000 karakter)" }
        : { valid: true };
  }
}

// ---- Rate Limiter ----
// Örnek: rateLimiter("login", 5, 60_000) → 1 dakikada 5 deneme
const _rlStore: Record<string, { count: number; resetAt: number }> = {};

export function rateLimiter(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = _rlStore[key];

  if (!entry || now > entry.resetAt) {
    _rlStore[key] = { count: 1, resetAt: now + windowMs };
    return true; // izin verildi
  }

  if (entry.count >= limit) return false; // bloklandı
  entry.count++;
  return true;
}

// ---- Güvenli localStorage ----
export const safeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
  },
  set(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch {}
  },
};

// ---- SQL Injection karakterlerini temizle (client-side öneri) ----
export function stripSQLInjection(input: string): string {
  return input.replace(/['";\\]/g, "").replace(/--/g, "").replace(/\/\*/g, "").replace(/\*\//g, "");
}

// ---- Dosya tipi doğrulama ----
export function validateFileType(file: File, allowed: string[]): boolean {
  return allowed.includes(file.type);
}

export function validateFileSize(file: File, maxMB: number): boolean {
  return file.size <= maxMB * 1024 * 1024;
}

// ---- URL'den script/javascript protokolünü temizle ----
export function sanitizeUrl(url: string): string {
  if (!url) return "#";
  const lower = url.toLowerCase().trim();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:text/html") ||
    lower.startsWith("data:application") ||
    lower.startsWith("vbscript:") ||
    !lower.startsWith("http")
  ) return "#";
  return url;
}

// ---- CSRF Token: sunucunun set ettiği csrf_token cookie'sinden okunmalı ----
// NOT: localStorage tabanlı CSRF token XSS'e karşı savunmasızdır.
// api.ts'deki withCsrf() fonksiyonu cookie'den okur — o fonksiyonu kullanın.
// Bu fonksiyon KULLANILMAMALIDIR — geriye dönük uyumluluk için bırakıldı.
/** @deprecated api.ts withCsrf() kullanın */
export function getCSRFToken(): string {
  // Cookie'den oku — localStorage yerine
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return "";
}

// ---- Clickjacking önlemi (frame busting) ----
export function preventClickjacking(): void {
  // Disabled in preview/iframe environments to prevent SecurityError
  try {
    if (window.self !== window.top) {
      // Only attempt frame busting if we have permission
      try { window.top!.location.href = window.self.location.href; } catch {}
    }
  } catch {}
}

// ---- Konsol uyarısı (sosyal mühendislik önlemi) ----
export function addConsoleWarning(): void {
  console.log(
    "%c⛔ DUR!",
    "color: red; font-size: 48px; font-weight: bold;"
  );
  console.log(
    "%cBu konsol geliştiriciler içindir. Buraya bir şey yapıştırmanız isteniyorsa bu bir sosyal mühendislik saldırısıdır!",
    "color: #ff6b6b; font-size: 14px;"
  );
}

// ════════════════════════════════════════════════════════════════
// ---- Token depolama gizleme (obfuscation) ----
// ÖNEMLİ / DÜRÜST NOT: Bu, XSS'e karşı KESİN bir çözüm DEĞİLDİR.
// localStorage her durumda aynı sayfanın JS'i tarafından okunabilir;
// bir XSS zaten sayfanın kodunu çalıştırabildiği için bu decode
// fonksiyonunu da çağırıp token'ı çözebilir. Gerçek/kalıcı çözüm,
// token'ların backend tarafından httpOnly + Secure + SameSite=strict
// cookie olarak set edilmesidir (JS'in hiç erişemeyeceği şekilde) —
// bu ise sunucu (server.js) tarafında değişiklik gerektirir.
//
// Bu katman ne işe yarar:
//  - Token'lar artık localStorage'da düz okunabilir JSON/JWT olarak
//    durmuyor; rastgele biri devtools'u açıp Application/Storage
//    sekmesine baktığında ham token'ı doğrudan göremez.
//  - Basit otomatik "localStorage'ı tara ve token/refreshToken
//    anahtarlarını dök" tarzı fırsatçı script'leri ve tarayıcı
//    uzantılarının kaba taramasını zorlaştırır.
//  - Hedefli bir XSS saldırısını (saldırgan kendi kodunu çalıştırıp
//    bu dosyayı da import edebiliyorsa) DURDURMAZ.
// ════════════════════════════════════════════════════════════════
const OBFUSCATION_KEY = "agro_9f3";

export function obfuscateToken(raw: string): string {
  try {
    let out = "";
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
    }
    return btoa(unescape(encodeURIComponent(out)));
  } catch {
    return raw; // encode başarısızsa ham veriyi kaybetmemek için fallback
  }
}

export function deobfuscateToken(stored: string): string {
  try {
    const decoded = decodeURIComponent(escape(atob(stored)));
    let out = "";
    for (let i = 0; i < decoded.length; i++) {
      out += String.fromCharCode(decoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
    }
    return out;
  } catch {
    return stored; // eski/düz formatta kayıtlıysa (geçiş dönemi) olduğu gibi dön
  }
}



