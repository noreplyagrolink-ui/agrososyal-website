import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Eye, Radio, Loader2, RefreshCw, WifiOff } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { getSocket } from "@/lib/socket";
import { absoluteUrl, API_ORIGIN } from "@/lib/media";
import { getToken } from "@/lib/api";

interface LiveStream {
  streamId: string;
  userId: string;
  username: string;
  name: string;
  profilePic: string;
  title: string;
  viewerCount: number;
  startedAt: string;
  thumbnail?: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const card = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 22 } },
};

export default function LiveListPage() {
  const navigate   = useNavigate();
  const [streams,    setStreams]    = useState<LiveStream[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  // ── Yayın listesini sunucudan çek ────────────────────────────────────────
  const fetchStreams = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setFetchError(false);
    try {
      const token = getToken() || "";
      const res = await fetch(`${API_ORIGIN}/api/live/streams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStreams(data.streams || []);
    } catch (err) {
      console.error("live streams fetch error:", err);
      setFetchError(true);
      setStreams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Socket: anlık yayın başlama / bitme / viewer güncellemesi ────────────
  useEffect(() => {
    fetchStreams();

    let sock: ReturnType<typeof getSocket> | null = null;
    try { sock = getSocket(); socketRef.current = sock; } catch {}

    if (!sock) return;

    const onStarted = (data: LiveStream) => {
      setStreams(prev => {
        if (prev.find(s => s.streamId === data.streamId)) return prev;
        return [data, ...prev];
      });
    };

    const onEnded = ({ streamId }: { streamId: string }) => {
      setStreams(prev => prev.filter(s => s.streamId !== streamId));
    };

    const onViewerUpdate = ({ streamId, viewerCount }: { streamId: string; viewerCount: number }) => {
      setStreams(prev => prev.map(s => s.streamId === streamId ? { ...s, viewerCount } : s));
    };

    // Thumbnail güncellemesi (host yayın başlattıktan 1-2s sonra gönderir)
    const onThumbnailUpdate = ({ streamId, thumbnail }: { streamId: string; thumbnail: string }) => {
      setStreams(prev => prev.map(s => s.streamId === streamId ? { ...s, thumbnail } : s));
    };

    // Socket yeniden bağlandıysa listeyi yenile (bağlantı kopunca missed event olabilir)
    const onReconnect = () => {
      fetchStreams(true);
    };

    sock.on("live:started",          onStarted);
    sock.on("live:ended",            onEnded);
    sock.on("live:viewer_update",    onViewerUpdate);
    sock.on("live:thumbnail_update", onThumbnailUpdate);
    sock.on("connect",               onReconnect);

    return () => {
      if (sock) {
        sock.off("live:started",          onStarted);
        sock.off("live:ended",            onEnded);
        sock.off("live:viewer_update",    onViewerUpdate);
        sock.off("live:thumbnail_update", onThumbnailUpdate);
        sock.off("connect",               onReconnect);
      }
    };
  }, [fetchStreams]);

  // ── Süre formatla ─────────────────────────────────────────────────────────
  const elapsed = (startedAt: string) => {
    const sec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const m   = Math.floor(sec / 60);
    const h   = Math.floor(m / 60);
    if (h > 0) return `${h}s ${m % 60}d`;
    return `${m}d`;
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-border"
        style={{
          background: "linear-gradient(160deg, hsl(var(--background)/0.94) 0%, hsl(var(--background)/0.80) 100%)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              <h1 className="text-base font-extrabold text-foreground tracking-tight">Canlı Yayınlar</h1>
            </span>
            {streams.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/25">
                {streams.length} CANLI
              </span>
            )}
          </div>
          <button
            onClick={() => fetchStreams(true)}
            disabled={refreshing}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5">
        {/* Yayın başlat butonu */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/live/new")}
          className="w-full mb-6 flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-red-500/40 bg-red-500/5 hover:bg-red-500/10 transition-colors group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-md shadow-red-500/30 flex-shrink-0">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Canlı Yayın Başlat</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Takipçilerine anlık yayın yap</p>
          </div>
          <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500 text-white shadow-sm shadow-red-500/40">
            🔴 CANLI
          </span>
        </motion.button>

        {/* Yükleniyor */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Yayınlar yükleniyor...</p>
          </div>

        ) : fetchError ? (
          /* Sunucu hatası */
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-base font-bold text-foreground">Yayınlar yüklenemedi</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Sunucuya bağlanırken hata oluştu.
            </p>
            <button
              onClick={() => fetchStreams()}
              className="mt-1 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Tekrar Dene
            </button>
          </div>

        ) : streams.length === 0 ? (
          /* Aktif yayın yok */
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Radio className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-bold text-foreground">Aktif yayın yok</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Şu an kimse yayın yapmıyor. İlk yayını sen başlatabilirsin!
            </p>
          </div>

        ) : (
          <>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Aktif Yayınlar
            </p>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              <AnimatePresence>
                {streams.map(stream => (
                  <motion.button
                    key={stream.streamId}
                    variants={card}
                    exit={{ opacity: 0, scale: 0.92, y: -10 }}
                    onClick={() => navigate(`/live/${stream.streamId}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-red-500/30 active:scale-[0.97] transition-all text-left group"
                    style={{ boxShadow: "0 1px 8px hsl(var(--foreground)/0.06)" }}
                  >
                    {/* Thumbnail / Avatar */}
                    <div className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted">
                      <img
                        src={stream.thumbnail ? absoluteUrl(stream.thumbnail) : absoluteUrl(stream.profilePic)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-red-500 text-white leading-none">
                        CANLI
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{stream.title || "Canlı Yayın"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img
                          src={absoluteUrl(stream.profilePic)}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover border border-border"
                        />
                        <p className="text-[11px] text-muted-foreground truncate">
                          {stream.name || stream.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          {stream.viewerCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Radio className="w-3 h-3 text-red-400" />
                          {elapsed(stream.startedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Katıl */}
                    <span className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-colors">
                      Katıl
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}


