// Tarih ve sayı format yardımcıları

export function formatTimeAgo(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "az önce";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dakika önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} gün önce`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} hafta önce`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} ay önce`;
  const yr = Math.floor(day / 365);
  return `${yr} yıl önce`;
}

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

// Varsayılan SVG avatar üretici (kullanıcı adının ilk harfini gösterir)
export function defaultAvatar(name: string | null | undefined, size = 100): string {
  const letter = (name?.trim()?.[0] || "?").toUpperCase();
  const colors: [string, string][] = [
    ["#7c3aed", "#ec4899"], ["#06b6d4", "#3b82f6"], ["#10b981", "#06b6d4"],
    ["#f59e0b", "#ef4444"], ["#8b5cf6", "#6366f1"], ["#ec4899", "#f97316"],
  ];
  const idx = (letter.charCodeAt(0) || 0) % colors.length;
  const [a, b] = colors[idx];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><circle cx='${size/2}' cy='${size/2}' r='${size/2}' fill='url(%23g)'/><text x='50%' y='58%' font-family='system-ui,sans-serif' font-size='${size*0.5}' font-weight='700' fill='white' text-anchor='middle'>${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}

// Varsayılan video kapağı (başlığı koyar)
export function defaultThumbnail(title: string | null | undefined): string {
  const t = (title || "İzleo").slice(0, 28);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%237c3aed'/><stop offset='1' stop-color='%23ec4899'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g)'/><text x='50%' y='52%' font-family='system-ui,sans-serif' font-size='34' font-weight='800' fill='white' text-anchor='middle' opacity='0.92'>${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}

// Görüntülenme sayısının her oturumda yalnızca 1 sayılmasını sağlar.
// localStorage'da o video id'si daha önce işaretlendiyse view count tetiklemez.
const VIEWED_KEY = "izleo_viewed_videos";

export function hasViewed(videoId: string): boolean {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    if (!raw) return false;
    const arr: string[] = JSON.parse(raw);
    return Array.isArray(arr) && arr.includes(videoId);
  } catch { return false; }
}

export function markViewed(videoId: string) {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(videoId)) {
      arr.push(videoId);
      // En fazla son 500 video'yu sakla
      const trimmed = arr.slice(-500);
      localStorage.setItem(VIEWED_KEY, JSON.stringify(trimmed));
    }
  } catch { /* ignore */ }
}
