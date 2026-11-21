import { API_ORIGIN } from "./media";
import { obfuscateToken, deobfuscateToken } from "./security";

const API_BASE = `${API_ORIGIN}/api`;
export { API_BASE, API_ORIGIN };

// ─── Token yardımcıları ───────────────────────────────────────────────────────
// 🔒 GÜVENLİK: Token'lar artık localStorage'da ham/düz okunabilir halde değil,
// obfuscate edilmiş (XOR+Base64) olarak tutuluyor. Bu XSS'i imkansız kılmaz
// (bkz. security.ts'teki açıklama) ama devtools'tan/basit taramadan okumayı
// zorlaştırır. Eski kayıtlar (bu değişiklikten önce yazılmış düz token'lar)
// deobfuscateToken() içindeki fallback ile hâlâ okunabilir, kullanıcı tekrar
// giriş yapmak zorunda kalmaz.
export function getToken(): string | null {
  const raw = localStorage.getItem("agrolink_token");
  return raw ? deobfuscateToken(raw) : null;
}
export function getRefreshToken(): string | null {
  const raw = localStorage.getItem("agrolink_refresh_token");
  return raw ? deobfuscateToken(raw) : null;
}

// ─── CSRF token: sunucunun set ettiği csrf_token cookie'sini okur ────────────
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// POST/PUT/PATCH/DELETE isteklerine CSRF header'ı ekle
const CSRF_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
function withCsrf(method: string, headers: Record<string, string>): Record<string, string> {
  if (!CSRF_METHODS.includes(method.toUpperCase())) return headers;
  const token = getCsrfToken();
  if (token) headers["X-CSRF-Token"] = token;
  return headers;
}
export function setToken(token: string) {
  localStorage.setItem("agrolink_token", obfuscateToken(token));
}
export function setRefreshToken(token: string) {
  localStorage.setItem("agrolink_refresh_token", obfuscateToken(token));
}
export function clearAuth() {
  localStorage.removeItem("agrolink_token");
  localStorage.removeItem("agrolink_refresh_token");
  localStorage.removeItem("agrolink_user");
}
export function getStoredUser() {
  try {
    const u = localStorage.getItem("agrolink_user");
    return u ? JSON.parse(u) : null;
  } catch {
    localStorage.removeItem("agrolink_user");
    return null;
  }
}
export function setStoredUser(user: any) {
  localStorage.setItem("agrolink_user", JSON.stringify(user));
}

// ─── isAuthenticated: token VAR MI + süresi geçmemiş mi kontrol et ───────────
// 🔧 DÜZELTİLDİ: Eski kod sadece "token var mı" bakıyordu. JWT 15dk'da expire
// olduğu için token localStorage'da durur ama geçersizdir → feed/profil 401 →
// logout gibi görünürdü. Şimdi payload'ı parse edip exp kontrolü yapılıyor.
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp: Unix timestamp (saniye). 30 saniye tolerans bırak.
    if (payload.exp && Date.now() / 1000 > payload.exp - 30) {
      // Access token expire olmuş ama refresh token varsa hâlâ authenticated say.
      // apiFetch zaten 401 alınca refresh yapacak.
      const rt = getRefreshToken();
      return !!rt;
    }
    return true;
  } catch {
    return true; // parse hatası → eski davranış: var sayılan token
  }
}

// ─── Refresh kilidi: eş zamanlı 401 fırtınasını önle ─────────────────────────
// 🔧 DÜZELTİLDİ: Eski kodda aynı anda N isteği 401 alırsa N adet /auth/refresh
// gönderiliyordu → race condition → bazıları geçersiz token alıyordu → logout.
let _refreshLock: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { clearAuth(); return false; }
    const data = await res.json();
    if (!data.token) { clearAuth(); return false; }
    setToken(data.token);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    // 🔧 Socket token'ı da güncelle — yoksa socket expire token ile kopuk kalır
    try {
      const { updateSocketToken } = await import("./socket");
      updateSocketToken(data.token);
    } catch {}
    return true;
  } catch {
    return false;
  }
}

// ─── apiFetch: yetkili istekler ──────────────────────────────────────────────
// 🔧 DÜZELTİLDİ:
//   1) window.location.href = login → "agrolink:unauthorized" custom event
//      (App.tsx'teki UnauthorizedListener yakalar, React Router navigate yapar,
//       health-check ekranı gösterilmez, sayfa reload olmaz)
//   2) Refresh kilidi ile race condition önlendi
async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const method = (options.method || "GET").toUpperCase();
  let headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  headers = withCsrf(method, headers);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (!_refreshLock) {
      _refreshLock = tryRefresh().finally(() => { _refreshLock = null; });
    }
    const refreshed = await _refreshLock;
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      headers = withCsrf(method, headers);
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    }
    clearAuth();
    window.dispatchEvent(new CustomEvent("agrolink:unauthorized"));
    throw new Error("Unauthorized");
  }

  return res;
}

// ─── publicFetch: token varsa gönderir, 401'de login'e YÖNLENDİRMEZ ─────────
async function publicFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const method = (options.method || "GET").toUpperCase();
  let headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers = withCsrf(method, headers);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && token) {
    if (!_refreshLock) {
      _refreshLock = tryRefresh().finally(() => { _refreshLock = null; });
    }
    const refreshed = await _refreshLock;
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      headers = withCsrf(method, headers);
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    }
    clearAuth();
    return fetch(`${API_BASE}${path}`, { ...options, headers: { "Content-Type": "application/json" } });
  }
  return res;
}

// ─── apiFormFetch: multipart upload + 401 refresh desteği ────────────────────
// 🔧 DÜZELTİLDİ: Eski kodda 401'de refresh yoktu → video/resim upload sonrası
// token expire olmuşsa direkt hata veriyordu.
async function apiFormFetch(path: string, method: string, formData: FormData): Promise<any> {
  const doRequest = async (tok: string | null) => {
    const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {};
    withCsrf(method, headers);
    return fetch(`${API_BASE}${path}`, { method, headers, body: formData });
  };

  let res = await doRequest(getToken());

  if (res.status === 401) {
    if (!_refreshLock) {
      _refreshLock = tryRefresh().finally(() => { _refreshLock = null; });
    }
    const refreshed = await _refreshLock;
    if (refreshed) {
      res = await doRequest(getToken());
    } else {
      clearAuth();
      window.dispatchEvent(new CustomEvent("agrolink:unauthorized"));
      throw new Error("Unauthorized");
    }
  }

  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `İstek başarısız (${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─── login: network hatası yakalanır ─────────────────────────────────────────
// 🔧 DÜZELTİLDİ: Eski kod try/catch yoktu → fetch network hatası fırlatırsa
// LoginPage catch'i "Bağlantı hatası" gösteriyordu ama bu olmamalı;
// şimdi hata nesnesi döndürülüyor, LoginPage kendi catch'iyle hallediyor.
export async function login(identifier: string, password: string, recaptchaToken?: string) {
  try {
    // FCM token varsa login body'sine ekle — sunucu giriş anında device_tokens'a kaydeder
    let fcmToken: string | undefined;
    try {
      const { initFCM, requestPushPermission } = await import("./fcm");
      const { getToken } = await import("firebase/messaging");
      const perm = Notification.permission;
      if (perm === "granted") {
        const m = await initFCM();
        if (m) {
          const swReg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js").catch(() => undefined);
          const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined;
          if (VAPID_KEY) {
            fcmToken = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg }).catch(() => undefined);
          }
        }
      }
    } catch { /* FCM yoksa sessiz geç */ }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, recaptchaToken, ...(fcmToken ? { fcmToken, fcmPlatform: "web_fcm" } : {}) }),
    });
    return res.json();
  } catch {
    throw new Error("NETWORK_ERROR");
  }
}

export async function register(data: { name: string; username: string; email: string; password: string; birthDate?: string; city?: string; inviteCode?: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function verify2FA(tempToken: string, code: string) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tempToken, code }),
  });
  return res.json();
}

export async function verifyEmailCode(tempToken: string, code: string) {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tempToken, code }),
  });
  return res.json();
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(token: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  return res.json();
}

export async function resendVerification(email: string) {
  const res = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await apiFetch("/users/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return res.json();
}

export async function deleteAccount(password: string) {
  const res = await apiFetch("/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
  return res.json();
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {}
  clearAuth();
}

// ═══════════════════ PROFILE ═══════════════════
export async function getMe() {
  const res = await apiFetch("/me");
  return res.json();
}

export async function getUserProfile(idOrUsername: string) {
  const res = await publicFetch(`/users/${idOrUsername}`);
  return res.json();
}

export async function getUserPosts(userId: string, page = 1) {
  const res = await publicFetch(`/users/${userId}/posts?page=${page}`);
  return res.json();
}

export async function updateProfile(formData: FormData) {
  return apiFormFetch("/users/profile", "PUT", formData);
}

export async function getUserActivity(userId: string, page = 1) {
  const res = await apiFetch(`/users/${userId}/activity?page=${page}`);
  return res.json();
}

export async function getUserStats(userId: string) {
  const res = await apiFetch(`/users/${userId}/stats`);
  return res.json();
}

export async function getMyStats() {
  const res = await apiFetch("/users/me/stats");
  return res.json();
}

// ═══════════════════ FEED ═══════════════════
export async function getFeed(page = 1, limit = 20) {
  // Sunucu seenIds tabanlı pagination yapar — page parametresi yok, her çağrı yeni post döner
  // refresh=1 sadece pull-to-refresh için (manuel yenileme) kullan
  const res = await apiFetch(`/feed?limit=${limit}`);
  return res.json();
}

export async function refreshFeed(limit = 20) {
  // Pull-to-refresh: sunucu seenIds'i sıfırlar, baştan başlar
  const res = await apiFetch(`/feed?limit=${limit}&refresh=1`);
  return res.json();
}

export async function getExploreFeed(page = 1) {
  const res = await apiFetch(`/feed/explore?page=${page}`);
  return res.json();
}

// ═══════════════════ REELS (sadece video, ayrı endpoint) ═══════════════════
// Cursor-tabanlı sayfalama: ilk çağrıda cursor gönderilmez, dönen nextCursor
// bir sonraki çağrıya geçirilir. OFFSET kullanılmıyor — kayan veri postları
// atlamasın/tekrarlamasın diye (bkz. server-4-2-1.js /api/reels açıklaması).
export async function getReels(cursor?: string | null, limit = 10) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("cursor", cursor);
  const res = await apiFetch(`/reels?${qs.toString()}`);
  return res.json();
}

// ═══════════════════ POSTS ═══════════════════
export async function createPost(formData: FormData) {
  return apiFormFetch("/posts", "POST", formData);
}

export async function getPost(postId: string) {
  const res = await apiFetch(`/posts/${postId}`);
  return res.json();
}

export async function editPost(postId: string, data: { content?: string; allowComments?: boolean; locationName?: string }) {
  const res = await apiFetch(`/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePost(postId: string) {
  const res = await apiFetch(`/posts/${postId}`, { method: "DELETE" });
  return res.json();
}

export async function likePost(postId: string) {
  const res = await apiFetch(`/posts/${postId}/like`, { method: "POST" });
  return res.json();
}

export async function savePost(postId: string) {
  const res = await apiFetch(`/posts/${postId}/save`, { method: "POST" });
  return res.json();
}

export async function getPostLikes(postId: string) {
  const res = await apiFetch(`/posts/${postId}/likes`);
  return res.json();
}

export async function quotePost(postId: string, content: string) {
  const res = await apiFetch(`/posts/${postId}/quote`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function reportPost(postId: string, reason: string, description?: string) {
  const res = await apiFetch("/reports/post", {
    method: "POST",
    body: JSON.stringify({ postId, reason, description }),
  });
  return res.json();
}

export async function getPopularPosts(limit = 20, period = "7d") {
  const res = await apiFetch(`/posts/popular?limit=${limit}&period=${period}`);
  return res.json();
}

export async function getLikedPosts(page = 1) {
  const res = await apiFetch(`/posts/liked?page=${page}`);
  return res.json();
}

export async function getSavedPosts(page = 1) {
  const res = await apiFetch(`/saved?page=${page}`);
  return res.json();
}

export async function batchViewPosts(postIds: string[]) {
  const res = await apiFetch("/posts/batch-view", {
    method: "POST",
    body: JSON.stringify({ postIds }),
  });
  return res.json();
}

// Poll
export async function votePoll(postId: string, optionIndex: number) {
  const res = await apiFetch(`/posts/${postId}/poll/vote`, {
    method: "POST",
    body: JSON.stringify({ optionIndex }),
  });
  return res.json();
}

// ═══════════════════ COMMENTS ═══════════════════
// Yanıtlar ayrı uçtan gelir (Android ile aynı): GET/POST /comments/:id/replies
export async function getCommentReplies(commentId: string) {
  const res = await apiFetch(`/comments/${commentId}/replies`);
  return res.json();
}

export async function addCommentReply(commentId: string, content: string) {
  const res = await apiFetch(`/comments/${commentId}/replies`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function getPostComments(postId: string, page = 1) {
  const res = await apiFetch(`/posts/${postId}/comments?page=${page}`);
  return res.json();
}

export async function addComment(postId: string, content: string, parentId?: string) {
  const res = await apiFetch(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }),
  });
  return res.json();
}

export async function editComment(commentId: string, content: string) {
  const res = await apiFetch(`/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function deleteComment(commentId: string) {
  const res = await apiFetch(`/comments/${commentId}`, { method: "DELETE" });
  return res.json();
}

export async function likeComment(commentId: string) {
  const res = await apiFetch(`/comments/${commentId}/like`, { method: "POST" });
  return res.json();
}

// ═══════════════════ FOLLOW ═══════════════════
export async function toggleFollow(userId: string) {
  const res = await apiFetch(`/users/${userId}/follow`, { method: "POST" });
  return res.json();
}

export async function getFollowers(userId: string, page = 1) {
  const res = await apiFetch(`/users/${userId}/followers?page=${page}`);
  return res.json();
}

export async function getFollowing(userId: string, page = 1) {
  const res = await apiFetch(`/users/${userId}/following?page=${page}`);
  return res.json();
}

export async function getFollowersList(userId: string, page = 1) {
  const res = await apiFetch(`/users/${userId}/followers/list?page=${page}&limit=50`);
  return res.json();
}

export async function getFollowingList(userId: string, page = 1) {
  const res = await apiFetch(`/users/${userId}/following/list?page=${page}&limit=50`);
  return res.json();
}

export async function getMutualFollowers(userId: string) {
  const res = await apiFetch(`/users/${userId}/mutual-followers`);
  return res.json();
}

export async function handleFollowRequest(notifId: string, action: "accept" | "reject") {
  const res = await apiFetch(`/notifications/${notifId}/follow-request`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
  return res.json();
}

// ═══════════════════ BLOCK ═══════════════════
export async function blockUser(userId: string) {
  const res = await apiFetch(`/users/${userId}/block`, { method: "POST" });
  return res.json();
}

export async function unblockUser(userId: string) {
  const res = await apiFetch(`/users/${userId}/unblock`, { method: "POST" });
  return res.json();
}

export async function getBlockedUsers() {
  const res = await apiFetch("/users/blocks");
  return res.json();
}

// ═══════════════════ MESSAGES ═══════════════════
export async function getConversations() {
  const res = await apiFetch("/messages/conversations");
  return res.json();
}

export async function getMessages(userId: string, page = 1) {
  const res = await apiFetch(`/messages/${userId}?page=${page}&limit=50`);
  return res.json();
}

export async function sendMessage(recipientId: string, content: string) {
  const res = await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify({ recipientId, content }),
  });
  return res.json();
}

export async function deleteConversation(userId: string) {
  const res = await apiFetch(`/messages/conversations/${userId}`, { method: "DELETE" });
  return res.json();
}

export async function startChatWith(userId: string) {
  const res = await apiFetch("/messages/start", {
    method: "POST",
    body: JSON.stringify({ recipientId: userId }),
  });
  return res.json();
}

export async function sharePostMessage(recipientId: string, postId: string) {
  const res = await apiFetch("/messages/share-post", {
    method: "POST",
    body: JSON.stringify({ recipientId, postId }),
  });
  return res.json();
}

// ═══════════════════ CHANNELS ═══════════════════
export async function createChannel(name: string, memberIds: string[]) {
  const res = await apiFetch("/channels", {
    method: "POST",
    body: JSON.stringify({ name, memberIds }),
  });
  return res.json();
}

export async function getChannels() {
  const res = await apiFetch("/channels");
  return res.json();
}

export async function getChannelMessages(channelId: string, page = 1) {
  const res = await apiFetch(`/channels/${channelId}/messages?page=${page}`);
  return res.json();
}

export async function sendChannelMessage(channelId: string, content: string) {
  const res = await apiFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function getChannelMembers(channelId: string) {
  const res = await apiFetch(`/channels/${channelId}/members`);
  return res.json();
}

export async function deleteChannel(channelId: string) {
  const res = await apiFetch(`/channels/${channelId}`, { method: "DELETE" });
  return res.json();
}

// ═══════════════════ NOTIFICATIONS ═══════════════════
export async function getNotifications(page = 1) {
  const res = await apiFetch(`/notifications?page=${page}`);
  return res.json();
}

export async function markNotificationsRead(id?: string) {
  // Backend supports both PUT and POST; we use PUT (with POST fallback).
  const body = id ? JSON.stringify({ id }) : JSON.stringify({});
  let res = await apiFetch("/notifications/read", { method: "PUT", body });
  if (!res.ok) {
    res = await apiFetch("/notifications/read", { method: "POST", body });
  }
  return res.json().catch(() => ({}));
}

export async function deleteNotification(id: string) {
  const res = await apiFetch(`/notifications/${id}`, { method: "DELETE" });
  return res.json().catch(() => ({}));
}

export async function deleteAllNotifications() {
  const res = await apiFetch(`/notifications`, { method: "DELETE" });
  return res.json().catch(() => ({}));
}

// ═══════════════════ MESSAGES EXTRA ═══════════════════
export async function deleteMessage(messageId: string) {
  const res = await apiFetch(`/messages/${messageId}`, { method: "DELETE" });
  return res.json().catch(() => ({}));
}

export async function getUnreadMessagesCount() {
  const res = await apiFetch(`/messages/unread/count`);
  return res.json().catch(() => ({ count: 0 }));
}

export async function getGroupChats() {
  const res = await apiFetch(`/chats/groups`);
  return res.json().catch(() => ({ groups: [] }));
}

export async function createGroupChat(name: string, memberIds: string[]) {
  const res = await apiFetch(`/chats/group`, {
    method: "POST",
    body: JSON.stringify({ name, memberIds }),
  });
  return res.json().catch(() => ({}));
}

export async function getGroupMessages(groupId: string, page = 1) {
  // Try group-specific endpoint first, fallback to generic messages endpoint
  const res = await apiFetch(`/chats/group/${groupId}/messages?page=${page}&limit=50`);
  if (res.ok) return res.json().catch(() => ({ messages: [] }));
  // Fallback: try /messages/:groupId
  const res2 = await apiFetch(`/messages/${groupId}?page=${page}&limit=50`);
  return res2.json().catch(() => ({ messages: [] }));
}

export async function sendGroupMessage(groupId: string, content: string) {
  const res = await apiFetch(`/chats/group/${groupId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (res.ok) return res.json().catch(() => ({}));
  // Fallback: try /messages with groupId as recipientId
  const res2 = await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify({ recipientId: groupId, content, groupId }),
  });
  return res2.json().catch(() => ({}));
}

export async function sendGroupImage(groupId: string, imageFile: File) {
  const token = getToken();
  const fd = new FormData();
  fd.append("groupId", groupId);
  fd.append("image", imageFile);
  // Try group endpoint first
  const res = await fetch(`${API_BASE}/chats/group/${groupId}/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (res.ok) return res.json().catch(() => ({}));
  // Fallback to DM image endpoint
  const fd2 = new FormData();
  fd2.append("recipientId", groupId);
  fd2.append("image", imageFile);
  const res2 = await fetch(`${API_BASE}/messages/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd2,
  });
  return res2.json().catch(() => ({}));
}

export async function getGroupInfo(groupId: string) {
  const res = await apiFetch(`/chats/group/${groupId}`);
  return res.json().catch(() => ({}));
}

// ═══════════════════ VIDEO ═══════════════════
export function videoStreamUrl(filename: string) {
  return `${API_BASE}/videos/stream/${filename}`;
}
export function videoThumbnailUrl(idOrFilename: string) {
  return `${API_BASE}/videos/thumbnail/${idOrFilename}`;
}
export async function getVideoInfo(postOrVideoId: string) {
  const res = await apiFetch(`/videos/${postOrVideoId}/info`);
  return res.json().catch(() => ({}));
}
export async function getHlsStatus(videoId: string) {
  const res = await apiFetch(`/videos/${videoId}/hls-status`);
  return res.json().catch(() => ({}));
}
export async function getUploadChunkStatus(uploadId: string) {
  const res = await apiFetch(`/upload/chunk/${uploadId}/status`);
  return res.json().catch(() => ({}));
}

// ═══════════════════ XHR upload (progress) ═══════════════════
export function uploadWithProgress(
  path: string,
  formData: FormData,
  onProgress?: (pct: number) => void,
  method: "POST" | "PUT" = "POST"
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE}${path}`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try { resolve(JSON.parse(xhr.responseText || "{}")); }
      catch { resolve({}); }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

// ═══════════════════ SEARCH ═══════════════════
export async function searchUsers(query: string) {
  const res = await apiFetch(`/search/users?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function searchPosts(query: string) {
  const res = await apiFetch(`/search/posts?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function searchHashtags(query: string) {
  const res = await apiFetch(`/search/hashtags?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function searchByHashtag(tag: string, page = 1) {
  const res = await apiFetch(`/search/hashtag/${encodeURIComponent(tag)}?page=${page}`);
  return res.json();
}

// ═══════════════════ STORIES ═══════════════════
export async function getStories() {
  const res = await apiFetch("/stories");
  return res.json();
}

export async function createStory(formData: FormData) {
  return apiFormFetch("/stories", "POST", formData);
}

export async function markStoryViewed(storyId: string) {
  const res = await apiFetch(`/stories/${storyId}/view`, { method: "POST" });
  return res.json();
}

export async function likeStory(storyId: string) {
  const res = await apiFetch(`/stories/${storyId}/like`, { method: "POST" });
  return res.json();
}

export async function deleteStory(storyId: string) {
  const res = await apiFetch(`/stories/${storyId}`, { method: "DELETE" });
  return res.json();
}

export async function getStoryViewers(storyId: string) {
  const res = await apiFetch(`/stories/${storyId}/viewers`);
  return res.json();
}

export async function sharePostToStory(postId: string) {
  const res = await apiFetch("/stories/share-post", {
    method: "POST",
    body: JSON.stringify({ postId }),
  });
  return res.json();
}

export async function getStoryLikes(storyId: string) {
  const res = await apiFetch(`/stories/${storyId}/likes`);
  return res.json();
}

// ═══════════════════ TRENDING & STATS ═══════════════════
export async function getTrending() {
  const res = await apiFetch("/trending");
  return res.json();
}

export async function getStats() {
  const res = await apiFetch("/stats");
  return res.json();
}

export async function getTopEngagementUsers() {
  const res = await apiFetch("/users/top-engagement");
  return res.json();
}

export async function getOnlineUsers() {
  const res = await apiFetch("/users/online");
  return res.json();
}

export async function getOnlineCount() {
  const res = await apiFetch("/online-count");
  return res.json();
}

export async function getRecommendedUsers() {
  const res = await apiFetch("/users/recommendations");
  return res.json();
}

// ═══════════════════ SUGGESTIONS / MUTE / FOLLOW REQUESTS ═══════════════════
export async function getUserSuggestions() {
  const res = await apiFetch("/users/suggestions");
  return res.json();
}

// ═══════════════════ DAVET SİSTEMİ ═══════════════════
export async function getMyInvite() {
  const res = await apiFetch("/invites/me");
  return res.json();
}

export async function getInviteList() {
  const res = await apiFetch("/invites/list");
  return res.json();
}

export async function getFollowRequests() {
  const res = await apiFetch("/follow-requests");
  return res.json();
}

export async function acceptFollowRequest(requesterId: string) {
  const res = await apiFetch(`/follow-requests/${requesterId}/accept`, { method: "POST" });
  return res.json();
}

export async function rejectFollowRequest(requesterId: string) {
  const res = await apiFetch(`/follow-requests/${requesterId}/reject`, { method: "POST" });
  return res.json();
}

export async function muteUser(userId: string) {
  const res = await apiFetch(`/users/${userId}/mute`, { method: "POST" });
  return res.json();
}

export async function unmuteUser(userId: string) {
  const res = await apiFetch(`/users/${userId}/mute`, { method: "DELETE" });
  return res.json();
}

export async function getMutedUsers() {
  const res = await apiFetch("/users/muted");
  return res.json();
}

export async function getNearbyUsers(lat: number, lng: number, radius = 50) {
  const res = await apiFetch(`/users/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  return res.json();
}

// ═══════════════════ PRIVACY & SETTINGS ═══════════════════
export async function getPrivacySettings() {
  const res = await apiFetch("/users/privacy-settings");
  return res.json();
}

export async function updatePrivacySettings(settings: any) {
  const res = await apiFetch("/users/privacy-settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function getNotificationSettings() {
  const res = await apiFetch("/users/notification-settings");
  return res.json();
}

export async function updateNotificationSettings(settings: any) {
  const res = await apiFetch("/users/notification-settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });
  return res.json();
}

// ═══════════════════ STORE ═══════════════════
export async function getStoreProducts(page = 1, category?: string) {
  let url = `/store/products?page=${page}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  const res = await apiFetch(url);
  return res.json();
}

export async function getStoreProduct(productId: string) {
  const res = await apiFetch(`/store/products/${productId}`);
  return res.json();
}

export async function addStoreProduct(formData: FormData) {
  return apiFormFetch("/store/products", "POST", formData);
}

export async function updateStoreProduct(productId: string, formData: FormData) {
  return apiFormFetch(`/store/products/${productId}`, "PUT", formData);
}

export async function deleteStoreProduct(productId: string) {
  const res = await apiFetch(`/store/products/${productId}`, { method: "DELETE" });
  return res.json().catch(() => ({}));
}

export async function getSellerProducts(sellerId: string) {
  const res = await apiFetch(`/store/products/seller/${sellerId}`);
  return res.json();
}

export async function searchStoreProducts(query: string, page = 1) {
  const res = await apiFetch(`/store/search?q=${encodeURIComponent(query)}&page=${page}`);
  return res.json().catch(() => ({ products: [] }));
}

// /api/products aliases (newer backend route)
export async function getProducts(page = 1) {
  const res = await apiFetch(`/products?page=${page}`);
  return res.json().catch(() => ({ products: [] }));
}

export async function getMyProducts() {
  const res = await apiFetch(`/products/my`);
  return res.json().catch(() => ({ products: [] }));
}

export async function getUserProducts(userId: string) {
  const res = await apiFetch(`/users/${userId}/products`);
  return res.json().catch(() => ({ products: [] }));
}

export async function createProduct(formData: FormData) {
  return apiFormFetch(`/products`, "POST", formData);
}

export async function updateProduct(productId: string, formData: FormData) {
  return apiFormFetch(`/products/${productId}`, "PUT", formData);
}

export async function deleteProduct(productId: string) {
  const res = await apiFetch(`/products/${productId}`, { method: "DELETE" });
  return res.json().catch(() => ({}));
}

// ═══════════════════ VERIFICATION ═══════════════════
export async function getVerificationStatus() {
  const res = await apiFetch("/users/verification/status");
  return res.json();
}

export async function requestVerification(formData: FormData) {
  return apiFormFetch("/verification/request", "POST", formData);
}

export async function applyVerification(formData: FormData) {
  return apiFormFetch("/users/verification/apply", "POST", formData);
}

// ═══════════════════ WEATHER ═══════════════════
export async function getWeather(lat: number, lon: number) {
  const res = await apiFetch(`/weather?lat=${lat}&lon=${lon}`);
  return res.json();
}

export async function getWeatherCurrent(lat: number, lon: number) {
  const res = await fetch(`${API_BASE}/weather/current?lat=${lat}&lon=${lon}`);
  return res.json();
}

export async function getWeatherForecast(lat: number, lon: number) {
  const res = await fetch(`${API_BASE}/weather/forecast?lat=${lat}&lon=${lon}`);
  return res.json();
}

export async function getWeatherAir(lat: number, lon: number) {
  const res = await fetch(`${API_BASE}/weather/air?lat=${lat}&lon=${lon}`);
  return res.json();
}

// ═══════════════════ TARIM FİYATLARI ═══════════════════
export async function getTarimFiyatlari() {
  const res = await apiFetch("/tarim-fiyatlari");
  return res.json();
}

export async function takipFiyat(priceId: string) {
  const res = await apiFetch(`/tarim-fiyatlari/${priceId}/takip`, { method: "POST" });
  return res.json();
}

// ═══════════════════ TARLA TAKİP ═══════════════════
export async function getTarlalar() {
  const res = await apiFetch("/hasat-takip/tarlalar");
  return res.json();
}

export async function addTarla(data: any) {
  const res = await apiFetch("/hasat-takip/tarlalar", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addTarlaPhoto(tarlaId: string, formData: FormData) {
  return apiFormFetch(`/hasat-takip/tarlalar/${tarlaId}/foto`, "POST", formData);
}

export async function addTarlaNote(tarlaId: string, note: string) {
  const res = await apiFetch(`/hasat-takip/tarlalar/${tarlaId}/not`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  return res.json();
}

// ═══════════════════ ACİL YARDIM ═══════════════════
export async function getAcilYardimPosts(page = 1) {
  const res = await apiFetch(`/acil-yardim?page=${page}`);
  return res.json();
}

export async function createAcilYardim(data: any) {
  const res = await apiFetch("/acil-yardim", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function acilYardimGidiyorum(postId: string) {
  const res = await apiFetch(`/acil-yardim/${postId}/gidiyorum`, { method: "POST" });
  return res.json();
}

export async function acilYardimYorum(postId: string, content: string) {
  const res = await apiFetch(`/acil-yardim/${postId}/yorum`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.json();
}

// ═══════════════════ OG PREVIEW ═══════════════════
export async function getOgPreview(url: string) {
  const res = await apiFetch(`/og-preview?url=${encodeURIComponent(url)}`);
  return res.json();
}

// ═══════════════════ PROFILE SHARE ═══════════════════
export async function getProfileShareLink(userId: string) {
  const res = await apiFetch(`/users/${userId}/share-link`);
  return res.json();
}

// ═══════════════════ HASHTAGS ═══════════════════
export async function getHashtagPosts(tag: string, page = 1) {
  const res = await apiFetch(`/hashtags/${encodeURIComponent(tag)}?page=${page}`);
  return res.json();
}

// ═══════════════════ FARMBOOK STATS ═══════════════════
export async function getFarmbookStats() {
  const res = await apiFetch("/farmbook/stats");
  return res.json();
}


export async function exportFarmbook() {
  try {
    const token = localStorage.getItem("token");
    const res = await apiFetch(`/farmbook/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

// ═══════════════════ APP VERSION ═══════════════════
export async function getAppVersion() {
  const res = await fetch(`${API_BASE}/app/version`);
  return res.json();
}


// ═══════════════════ SHARE / DM EXTRA ═══════════════════
export async function sharePostToDM(postId: string, recipientId: string) {
  const res = await apiFetch("/messages/share-post", {
    method: "POST",
    body: JSON.stringify({ postId, recipientId }),
  });
  return res.json();
}

// ═══════════════════ VOICE MESSAGE ═══════════════════
export async function sendVoiceMessage(recipientId: string, voiceBlob: Blob) {
  const token = getToken();

  // Multer hangi field adını beklediği bilinmiyor → en yaygın 3 olasılığı sırayla dene.
  const tryFields = ["voice", "audio", "file"];
  // Ekstra olarak farklı uzantı isimleriyle de deneyelim
  const ext = (voiceBlob.type || "").includes("ogg") ? "ogg" : "webm";
  const fileName = `voice-${Date.now()}.${ext}`;
  const mimeType = voiceBlob.type || "audio/webm";

  let lastError: any = null;
  for (const field of tryFields) {
    const fd = new FormData();
    fd.append("recipientId", recipientId);
    const file = new File([voiceBlob], fileName, { type: mimeType });
    fd.append(field, file);

    try {
      const res = await fetch(`${API_BASE}/messages/voice`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.voiceUrl || data?.messageId || data?.url || data?.message)) {
        // Normalize response
        return {
          ...data,
          voiceUrl: data.voiceUrl || data.url || data.message?.content || data.message?.voiceUrl,
          messageId: data.messageId || data.message?.id,
        };
      }
      lastError = data?.error || data?.message || `HTTP ${res.status}`;
      // Eğer 401 ya da network ise yeniden denemeye gerek yok
      if (res.status === 401 || res.status === 413) break;
    } catch (e: any) {
      lastError = e?.message || "Ağ hatası";
    }
  }
  return { error: typeof lastError === "string" ? lastError : "Sesli mesaj gönderilemedi" };
}



// ═══════════════════ Multi-account support ═══════════════════
export type StoredAccount = {
  id?: string | number;
  username?: string;
  name?: string;
  profilePic?: string | null;
  token: string;
  refreshToken?: string | null;
};

const ACCOUNTS_KEY = "agrolink_accounts";

export function getAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    // Önce obfuscate edilmiş formatı dene; başarısız olursa (güncellemeden
    // önce düz JSON olarak kaydedilmiş eski veri) düz parse'a düş.
    try {
      return JSON.parse(deobfuscateToken(raw));
    } catch {
      return JSON.parse(raw);
    }
  } catch {
    return [];
  }
}

export function saveCurrentAsAccount() {
  const u = getStoredUser();
  const t = getToken();
  const rt = getRefreshToken();
  if (!u || !t) return;
  const all = getAccounts().filter(a => String(a.id ?? a.username) !== String(u.id ?? u.username));
  all.unshift({ id: u.id, username: u.username, name: u.name, profilePic: u.profilePic, token: t, refreshToken: rt });
  localStorage.setItem(ACCOUNTS_KEY, obfuscateToken(JSON.stringify(all.slice(0, 5))));
}

export function switchToAccount(account: StoredAccount) {
  saveCurrentAsAccount();
  setToken(account.token);
  if (account.refreshToken) setRefreshToken(account.refreshToken);
  localStorage.setItem("agrolink_user", JSON.stringify({
    id: account.id, username: account.username, name: account.name, profilePic: account.profilePic
  }));
}

export function removeAccount(idOrUsername: string | number) {
  const all = getAccounts().filter(a => String(a.id ?? a.username) !== String(idOrUsername));
  localStorage.setItem(ACCOUNTS_KEY, obfuscateToken(JSON.stringify(all)));
}


// ═══════════════════ COMMUNITIES ═══════════════════
export async function listCommunities(query = "", page = 1) {
  const q = query ? `&q=${encodeURIComponent(query)}` : "";
  const res = await publicFetch(`/communities?page=${page}${q}`);
  return res.json();
}
export async function getCommunity(slugOrId: string) {
  const res = await publicFetch(`/communities/${slugOrId}`);
  return res.json();
}
export async function createCommunity(
  data: { name: string; description?: string; slug?: string; isPrivate?: boolean },
  files?: { avatar?: File | Blob | null; banner?: File | Blob | null }
) {
  const fd = new FormData();
  fd.append("name", data.name);
  if (data.slug) fd.append("slug", data.slug);
  if (data.description) fd.append("description", data.description);
  if (typeof data.isPrivate === "boolean") fd.append("isPrivate", String(data.isPrivate));
  if (files?.avatar) fd.append("avatar", files.avatar as any, (files.avatar as any).name || "avatar.jpg");
  if (files?.banner) fd.append("banner", files.banner as any, (files.banner as any).name || "banner.jpg");
  return apiFormFetch(`/communities`, "POST", fd);
}
export async function deleteCommunity(id: string) {
  const res = await apiFetch(`/communities/${id}`, { method: "DELETE" });
  return res.json();
}
export async function updateCommunity(
  id: string,
  data: { name?: string; description?: string; isPrivate?: boolean },
  files?: { avatar?: File | Blob | null; banner?: File | Blob | null }
) {
  const fd = new FormData();
  if (data.name !== undefined) fd.append("name", data.name);
  if (data.description !== undefined) fd.append("description", data.description);
  if (typeof data.isPrivate === "boolean") fd.append("isPrivate", String(data.isPrivate));
  if (files?.avatar) fd.append("avatar", files.avatar as any, (files.avatar as any).name || "avatar.jpg");
  if (files?.banner) fd.append("banner", files.banner as any, (files.banner as any).name || "banner.jpg");
  return apiFormFetch(`/communities/${id}`, "PUT", fd);
}
export async function joinCommunity(id: string) {
  const res = await apiFetch(`/communities/${id}/join`, { method: "POST" });
  return res.json();
}
export async function getCommunityPosts(id: string, page = 1) {
  const res = await publicFetch(`/communities/${id}/posts?page=${page}`);
  return res.json();
}
export async function postToCommunity(id: string, formData: FormData) {
  return apiFormFetch(`/communities/${id}/posts`, "POST", formData);
}
export async function getCommunityMembers(id: string, page = 1) {
  const res = await publicFetch(`/communities/${id}/members?page=${page}`);
  return res.json();
}
export async function getUserCommunities(userId: string) {
  const res = await publicFetch(`/users/${userId}/communities`);
  return res.json();
}

// ═══════════════════ ADS ═══════════════════
export async function getRandomAd() {
  try {
    const res = await publicFetch(`/ads/random`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}


// ═══════════════════ FARMBOOK ═══════════════════
export interface FarmbookRecord {
  id?: string;
  title: string;
  type?: string;             // ekim, gübreleme, ilaçlama, hasat, satış, gider, gelir, not
  crop?: string;             // ürün
  field?: string;            // tarla / parsel
  amount?: number;           // miktar (kg, lt, vb.)
  unit?: string;             // birim
  cost?: number;             // maliyet (TL)
  income?: number;           // gelir (TL)
  date?: string;             // ISO date
  note?: string;             // notlar
  createdAt?: string;
  updatedAt?: string;
}

export async function getFarmbookRecords(): Promise<{ records: FarmbookRecord[] }> {
  try {
    const res = await apiFetch(`/farmbook/records`);
    if (!res.ok) return { records: [] };
    const data = await res.json();
    return { records: data.records || data || [] };
  } catch { return { records: [] }; }
}

export async function createFarmbookRecord(record: FarmbookRecord) {
  const res = await apiFetch(`/farmbook/records`, {
    method: "POST",
    body: JSON.stringify(record),
  });
  return res.json();
}

export async function updateFarmbookRecord(id: string, record: Partial<FarmbookRecord>) {
  const res = await apiFetch(`/farmbook/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(record),
  });
  return res.json();
}

export async function deleteFarmbookRecord(id: string) {
  const res = await apiFetch(`/farmbook/records/${id}`, { method: "DELETE" });
  return res.ok;
}


// ═══════════════════ ŞİP ŞAK AGRO ═══════════════════
// Çiftçinin tarladan çektiği fotoğraf (ya da bitkinin son durumu)
// normal post olarak akışta görünür.
export async function createSipSakAgroPost(file: File, caption: string) {
  const fd = new FormData();
  fd.append("media", file);
  fd.append("content", caption || "");
  fd.append("source", "sipsak-agro");
  fd.append("tags", "sipsak-agro");
  return apiFormFetch("/posts", "POST", fd);
}

// ═══════════════════ MÜZİK ═══════════════════
export async function getMusicTracks() {
  const res = await apiFetch("/music/tracks");
  return res.json();
}

// ═══════════════════ HASTALIK ALARM AĞI ═══════════════════
export async function reportDiseaseAlarm(data: {
  city: string;
  district?: string;
  cropType: string;
  diseaseInfo: string;
  note?: string;
}) {
  const res = await apiFetch("/disease-alarms", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getDiseaseAlarms(city?: string, cropType?: string) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (cropType) params.set("cropType", cropType);
  const res = await apiFetch(`/disease-alarms?${params.toString()}`);
  return res.json();
}

// ═══════════════════ ÇİFTÇİ SERTİFİKA SİSTEMİ ═══════════════════
export async function getFarmerCertificateStatus() {
  const res = await apiFetch("/farmer-certificate/status");
  return res.json();
}

export async function applyFarmerCertificate(type: "organik_ciftci" | "iyi_tarim_uzmani") {
  const res = await apiFetch("/farmer-certificate/apply", {
    method: "POST",
    body: JSON.stringify({ type }),
  });
  return res.json();
}

export async function voteFarmerCertificate(targetUserId: string, vote: "approve" | "reject") {
  const res = await apiFetch("/farmer-certificate/vote", {
    method: "POST",
    body: JSON.stringify({ targetUserId, vote }),
  });
  return res.json();
}

export async function submitCertificateQuiz(answers: Record<string, string>) {
  const res = await apiFetch("/farmer-certificate/quiz", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  return res.json();
}

export async function getCertificateQuestions() {
  const res = await apiFetch("/farmer-certificate/questions");
  return res.json();
}





