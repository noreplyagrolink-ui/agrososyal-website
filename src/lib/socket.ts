import { io, Socket } from "socket.io-client";
import { setToken, setRefreshToken, getToken, getRefreshToken } from "./api";

const SOCKET_URL = "https://sehitumitkestitarimmtal.com";

let socket: Socket | null = null;
let _refreshing = false;

// 🔧 DÜZELTİLDİ: Token expire olunca refresh yapıp yeni tokenla yeniden bağlan.
// Eski kod: expire olan aynı token ile 10 kez deniyordu → sonsuz kopma döngüsü.
// Yeni akış:
//   1) connect_error "Geçersiz token" → token refresh dene
//   2) Refresh başarılı → socket.auth güncelle → reconnect
//   3) Refresh başarısız → unauthorized event → login sayfasına yönlendir

async function tryRefreshForSocket(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt || _refreshing) return null;
  _refreshing = true;
  try {
    const res = await fetch(
      "https://sehitumitkestitarimmtal.com/api/auth/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.token) return null;
    setToken(data.token);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return data.token;
  } catch {
    return null;
  } finally {
    _refreshing = false;
  }
}

export function getSocket(): Socket {
  const token = getToken();

  // Zaten bağlı → direkt dön
  if (socket && socket.connected) return socket;

  // Socket var ama bağlı değil → token güncelle, bağlan
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  // Yeni socket oluştur
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,   // 🔧 10 → 5: daha az gürültülü döngü
    reconnectionDelay: 2000,   // 🔧 1000 → 2000ms: sunucuyu yormaz
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("🔌 socket connected", socket?.id);
  });

  socket.on("connect_error", async (err) => {
    const msg = err.message || "";
    console.warn("socket connect_error:", msg);

    // 🔧 Token hatası → refresh dene, yeni tokenla yeniden bağlan
    if (
      msg.includes("Geçersiz token") ||
      msg.includes("Token gerekli") ||
      msg.includes("jwt expired") ||
      msg.includes("invalid token")
    ) {
      // autoReconnect'i durdur — bizim refresh döngümüz devralıyor
      if (socket) socket.io.opts.reconnection = false;

      const newToken = await tryRefreshForSocket();
      if (newToken && socket) {
        socket.auth = { token: newToken };
        socket.io.opts.reconnection = true;
        socket.connect();
      } else {
        // Refresh da başarısız → kullanıcıyı login'e gönder
        localStorage.removeItem("agrolink_token");
        localStorage.removeItem("agrolink_refresh_token");
        localStorage.removeItem("agrolink_user");
        window.dispatchEvent(new CustomEvent("agrolink:unauthorized"));
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.warn("🔌 socket disconnected:", reason);
    // server tarafından kasıtlı kapatma → refresh gerekmez
    if (reason === "io server disconnect") {
      // sunucu kapattı, token geçersiz olabilir — kısa bekle sonra yeniden dene
      setTimeout(async () => {
        const newToken = await tryRefreshForSocket();
        if (newToken && socket) {
          socket.auth = { token: newToken };
          socket.connect();
        }
      }, 3000);
    }
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// Token yenilendikten sonra socket'i de güncelle (api.ts refresh sonrası çağrılır)
export function updateSocketToken(newToken: string) {
  if (socket) {
    socket.auth = { token: newToken };
    if (!socket.connected) socket.connect();
  }
}



