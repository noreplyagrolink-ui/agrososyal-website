import type { Socket } from "socket.io-client";
import { getSocket } from "./socket";
import { getToken } from "./api";

/**
 * 🔴 Canlı beğeni sayısı
 *
 * Sunucu (lib/socket.js) zaten şu iki olayı destekliyor:
 *   istemci → sunucu : "post:like"        { postId, count }
 *   sunucu → diğerleri: "post:like:update" { postId, count, userId }
 *
 * Bu modül tek bir dinleyiciyi tüm PostCard'lar için paylaşır (kart başına
 * ayrı socket dinleyicisi açmaz), böylece 50 post olsa bile tek listener vardır.
 *
 * Güvenlik notu: sunucu "count" değerini istemciden gelen haliyle yayınlıyor.
 * Bu yüzden alıcı tarafta değer doğrulanır (sonlu, negatif olmayan tam sayı)
 * ve mevcut sayıdan aşırı sapan değerler yok sayılır (bkz. acceptLiveCount).
 */

type Listener = (count: number) => void;

const listeners = new Map<string, Set<Listener>>();
let attached: Socket | null = null;
let lastEnsure = 0;

/** Canlı güncellemenin mevcut sayıdan en fazla bu kadar sapmasına izin verilir. */
const MAX_JUMP = 25;

/** Gelen canlı değeri mevcut değerle karşılaştırıp kabul edilecek yeni değeri döndürür. */
export function acceptLiveCount(prev: number, next: number): number {
  if (!Number.isFinite(next) || next < 0) return prev;
  const n = Math.floor(next);
  if (Math.abs(n - prev) > MAX_JUMP) return prev;
  return n;
}

function handleUpdate(payload: any) {
  const postId = payload?.postId != null ? String(payload.postId) : "";
  if (!postId) return;
  const count = Number(payload?.count);
  if (!Number.isFinite(count) || count < 0) return;
  const subs = listeners.get(postId);
  if (!subs || subs.size === 0) return;
  subs.forEach((fn) => {
    try { fn(count); } catch { /* tek bir kart hatası diğerlerini etkilemesin */ }
  });
}

/** Socket'e (yeniden) bağlanıp dinleyiciyi kurar. Giriş yapılmamışsa hiçbir şey yapmaz. */
function ensureAttached() {
  if (!getToken()) return;
  // Bağlı ve dinleyici zaten kurulu → yapacak bir şey yok
  if (attached && attached.connected) return;
  // getSocket() çağrısını en fazla 3 sn'de bir yap (çok sayıda kart aynı anda mount olabilir)
  const now = Date.now();
  if (now - lastEnsure < 3000 && attached) return;
  lastEnsure = now;
  try {
    const s = getSocket();
    if (attached === s) return;
    attached?.off("post:like:update", handleUpdate);
    s.on("post:like:update", handleUpdate);
    attached = s;
  } catch { /* socket kurulamazsa sessizce geç — beğeni yine REST ile çalışır */ }
}

/** Bir postun canlı beğeni sayısına abone ol. Dönen fonksiyon aboneliği kaldırır. */
export function subscribeLiveLikes(postId: string, fn: Listener): () => void {
  const key = String(postId);
  let set = listeners.get(key);
  if (!set) { set = new Set(); listeners.set(key, set); }
  set.add(fn);
  ensureAttached();
  return () => {
    const s = listeners.get(key);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) listeners.delete(key);
  };
}

/** Kendi beğeni sonucumuzu (sunucunun onayladığı sayı) diğer kullanıcılara yayınla. */
export function emitLiveLike(postId: string, count: number) {
  if (!getToken()) return;
  try {
    ensureAttached();
    const s = attached ?? getSocket();
    s.emit("post:like", { postId, count });
  } catch { /* sessiz */ }
}
