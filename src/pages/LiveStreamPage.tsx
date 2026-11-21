import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Eye, Mic, MicOff, Video, VideoOff,
  Send, Share2, Radio, Loader2, AlertCircle,
  FlipHorizontal2, Copy, Check, Wifi, WifiOff,
  Clock,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { getStoredUser } from "@/lib/api";
import { absoluteUrl, API_ORIGIN } from "@/lib/media";

// ─── ICE: STUN (ücretsiz public) + TURN (open-relay fallback) ────────────────
// open-relay.metered.ca ücretsiz community TURN sunucuları
const ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// ─── Adaptif kalite (bant genişliğine göre blur + ikon) ──────────────────────
const QUALITY_LEVELS = [
  { minBps: 900_000,  blurPx: 0,   label: "HD",   color: "text-green-400" },
  { minBps: 400_000,  blurPx: 1.5, label: "SD",   color: "text-yellow-400" },
  { minBps: 150_000,  blurPx: 3,   label: "Düşük", color: "text-orange-400" },
  { minBps: 0,        blurPx: 5,   label: "Kötü",  color: "text-red-400" },
];

const EMOJI_LIST = ["❤️", "😂", "😮", "👏", "🔥", "🌾", "🌱", "💪"];

interface FloatingEmoji { id: string; emoji: string; x: number; }
interface ChatMsg {
  id: string; userId: string; username: string;
  name: string; profilePic: string; text: string; isEmoji?: boolean; ts: number;
}
interface StreamInfo {
  streamId: string; userId: string; username: string;
  name: string; profilePic: string; title: string;
  viewerCount: number; likeCount: number; startedAt: string;
  hostMuted?: boolean; hostCamOff?: boolean;
}

// ─── Thumbnail: video kareden canvas snapshot ─────────────────────────────────
function captureVideoThumbnail(video: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320) || 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

// ─── Süre formatla ────────────────────────────────────────────────────────────
function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LiveStreamPage() {
  const { streamId: rawId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const me = getStoredUser();

  const isNewStream = rawId === "new";
  const [realStreamId, setRealStreamId] = useState<string>(isNewStream ? "" : (rawId ?? ""));
  const [isHost, setIsHost] = useState(isNewStream);

  const [phase, setPhase] = useState<"setup" | "connecting" | "live" | "viewer" | "ended" | "error">(
    isNewStream ? "setup" : "connecting"
  );

  const [streamInfo, setStreamInfo]     = useState<StreamInfo | null>(null);
  const [errorMsg, setErrorMsg]         = useState("");
  const [streamTitle, setStreamTitle]   = useState("");
  const [starting, setStarting]         = useState(false);

  // ── Video ──────────────────────────────────────────────────────────────────
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const setupVideoRef  = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef          = useRef<Map<string, RTCPeerConnection>>(new Map());

  // ── Host kontroller ────────────────────────────────────────────────────────
  const [muted,        setMuted]        = useState(false);
  const [camOff,       setCamOff]       = useState(false);
  const [facingMode,   setFacingMode]   = useState<"user" | "environment">("user");
  const [hostDuration, setHostDuration] = useState(0);
  const durationRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Bağlantı kalitesi (izleyici) ──────────────────────────────────────────
  const [qualityIdx,   setQualityIdx]   = useState(0);
  const lastBytesRef   = useRef(0);
  const qualityTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Bağlantı durumu ───────────────────────────────────────────────────────
  const [connState,    setConnState]    = useState<"connected" | "reconnecting" | "failed">("connected");
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount = useRef(0);

  // ── Link kopyalama ────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ── Chat / emoji ──────────────────────────────────────────────────────────
  const [messages,       setMessages]       = useState<ChatMsg[]>([]);
  const [chatInput,      setChatInput]      = useState("");
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [likeCount,      setLikeCount]      = useState(0);
  const [viewerCount,    setViewerCount]    = useState(0);
  const [liked,          setLiked]          = useState(false);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const socketRef   = useRef<ReturnType<typeof getSocket> | null>(null);

  // ── Emoji uçuşu ───────────────────────────────────────────────────────────
  const spawnEmoji = useCallback((emoji: string) => {
    const id = Math.random().toString(36).slice(2);
    const x  = 8 + Math.random() * 68;
    setFloatingEmojis(p => [...p, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis(p => p.filter(e => e.id !== id)), 2800);
  }, []);

  // ── Host: yayın süresi sayacı ─────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    setHostDuration(0);
    durationRef.current = setInterval(() => setHostDuration(d => d + 1), 1000);
  }, []);

  // ── Adaptif kalite izleyici ───────────────────────────────────────────────
  const startQualityMonitor = useCallback(() => {
    if (qualityTimer.current) clearInterval(qualityTimer.current);
    lastBytesRef.current = 0;
    qualityTimer.current = setInterval(async () => {
      const pc = pcRef.current.get("viewer");
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        stats.forEach(r => {
          if (r.type === "inbound-rtp" && r.kind === "video") {
            const bytes: number = r.bytesReceived ?? 0;
            const bps = (bytes - lastBytesRef.current) * 8 * 2; // per 500ms window
            lastBytesRef.current = bytes;
            const idx = QUALITY_LEVELS.findIndex(l => bps >= l.minBps);
            setQualityIdx(idx < 0 ? QUALITY_LEVELS.length - 1 : idx);
          }
        });
      } catch {}
    }, 500);
  }, []);

  // ── RTCPeerConnection helper (viewer) ─────────────────────────────────────
  const buildViewerPC = useCallback((sock: ReturnType<typeof getSocket>, streamId: string) => {
    const old = pcRef.current.get("viewer");
    if (old) { try { old.close(); } catch {} pcRef.current.delete("viewer"); }

    const pc = new RTCPeerConnection({ iceServers: ICE });
    pcRef.current.set("viewer", pc);

    pc.ontrack = e => {
      if (remoteVideoRef.current && e.streams[0])
        remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onicecandidate = e => {
      if (e.candidate)
        sock.emit("live:ice_candidate", { streamId, candidate: e.candidate.toJSON(), target: "host" });
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setConnState("connected");
        reconnectCount.current = 0;
        startQualityMonitor();
      } else if (state === "disconnected" || state === "failed") {
        setConnState("reconnecting");
        // Exponential backoff retry — max 5 attempts
        if (reconnectCount.current < 5) {
          const delay = Math.min(1000 * 2 ** reconnectCount.current, 16000);
          reconnectCount.current++;
          reconnectTimer.current = setTimeout(() => {
            if (socketRef.current?.connected) {
              sock.emit("live:join", { streamId });
            } else {
              setConnState("failed");
            }
          }, delay);
        } else {
          setConnState("failed");
        }
      }
    };
    return pc;
  }, [startQualityMonitor]);

  // ── Socket bağlantısı (izleyici) ──────────────────────────────────────────
  useEffect(() => {
    if (isNewStream) return;
    if (!rawId) return;

    let sock: ReturnType<typeof getSocket> | null = null;
    try { sock = getSocket(); socketRef.current = sock; } catch {}
    if (!sock) { setErrorMsg("Sunucuya bağlanılamadı."); setPhase("error"); return; }

    sock.emit("live:join", { streamId: rawId });

    sock.on("live:info", (info: StreamInfo) => {
      setStreamInfo(info);
      setLikeCount(info.likeCount ?? 0);
      setViewerCount(info.viewerCount ?? 0);
      if (me?.id && String(info.userId) === String(me.id)) setIsHost(true);
      setPhase("viewer");
    });

    sock.on("live:not_found", () => {
      setErrorMsg("Bu yayın artık mevcut değil.");
      setPhase("error");
    });

    sock.on("live:viewer_update", ({ viewerCount: vc }: { viewerCount: number }) => setViewerCount(vc));
    sock.on("live:like",          ({ total }: { total: number }) => setLikeCount(total));
    sock.on("live:emoji",         ({ emoji }: { emoji: string }) => spawnEmoji(emoji));
    sock.on("live:message",       (msg: ChatMsg) => {
      setMessages(p => [...p.slice(-99), msg]);
      if (msg.isEmoji) spawnEmoji(msg.text);
    });
    sock.on("live:ended", () => setPhase("ended"));

    // Host mic/cam durumu değişti → izleyicide göster
    sock.on("live:host_state", ({ muted: hm, camOff: hc }: { muted: boolean; camOff: boolean }) => {
      setStreamInfo(prev => prev ? { ...prev, hostMuted: hm, hostCamOff: hc } : prev);
    });

    // WebRTC: host offer → izleyici answer
    sock.on("live:offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      const pc = buildViewerPC(sock!, rawId);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sock!.emit("live:answer", { streamId: rawId, answer });
    });

    sock.on("live:ice_candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current.get("viewer");
      await pc?.addIceCandidate(candidate).catch(() => {});
    });

    // Socket yeniden bağlandıysa yayına tekrar join et
    sock.on("connect", () => {
      if (phase === "viewer" || phase === "connecting") {
        sock!.emit("live:join", { streamId: rawId });
      }
    });

    return () => {
      sock!.emit("live:leave", { streamId: rawId });
      [
        "live:info", "live:not_found", "live:viewer_update", "live:like",
        "live:emoji", "live:message", "live:ended", "live:offer",
        "live:answer", "live:ice_candidate", "live:host_state", "connect",
      ].forEach(ev => sock!.off(ev));
      if (qualityTimer.current) clearInterval(qualityTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      pcRef.current.forEach(pc => { try { pc.close(); } catch {} });
      pcRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawId]);

  // ── Setup: kamera önizleme ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "setup") return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (setupVideoRef.current) setupVideoRef.current.srcObject = stream;
      })
      .catch(() => {
        setErrorMsg("Kamera/mikrofon izni gerekli. Lütfen tarayıcı izinlerini kontrol et.");
        setPhase("error");
      });
  }, [phase]);

  // ── Chat scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Yayın başlat ──────────────────────────────────────────────────────────
  const startBroadcast = useCallback(async () => {
    setStarting(true);
    try {
      const sid = (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
      setRealStreamId(sid);

      let stream = localStreamRef.current;
      if (!stream || stream.getTracks().every(t => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        localStreamRef.current = stream;
      }

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      let sock = socketRef.current;
      if (!sock) { try { sock = getSocket(); socketRef.current = sock; } catch {} }
      if (!sock) throw new Error("Sunucu bağlantısı kurulamadı.");

      // Thumbnail: 1 saniye sonra kare yakala
      let thumbnail: string | null = null;
      setTimeout(() => {
        if (localVideoRef.current) thumbnail = captureVideoThumbnail(localVideoRef.current);
      }, 1000);

      sock.on("live:viewer_update", ({ viewerCount: vc }: { viewerCount: number }) => setViewerCount(vc));
      sock.on("live:like",          ({ total }: { total: number }) => setLikeCount(total));
      sock.on("live:emoji",         ({ emoji }: { emoji: string }) => spawnEmoji(emoji));
      sock.on("live:message",       (msg: ChatMsg) => setMessages(p => [...p.slice(-99), msg]));
      sock.on("live:ended",         () => setPhase("ended"));

      // HOST: 1-to-N WebRTC
      const createPeerForViewer = async (viewerSocketId: string) => {
        const old = pcRef.current.get(viewerSocketId);
        if (old) { try { old.close(); } catch {} pcRef.current.delete(viewerSocketId); }

        const pc = new RTCPeerConnection({ iceServers: ICE });
        pcRef.current.set(viewerSocketId, pc);

        const lStream = localStreamRef.current;
        if (lStream) lStream.getTracks().forEach(t => pc.addTrack(t, lStream));

        pc.onicecandidate = e => {
          if (e.candidate)
            sock!.emit("live:ice_candidate", {
              streamId: sid, candidate: e.candidate.toJSON(),
              target: "viewers", toSocketId: viewerSocketId,
            });
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") {
            // Viewer bağlantısı koptu — PC temizle (viewer yeniden join edecek)
            try { pc.close(); } catch {}
            pcRef.current.delete(viewerSocketId);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sock!.emit("live:offer_to_viewer", { streamId: sid, viewerSocketId, offer });
      };

      sock.on("live:viewer_joined", async ({ viewerSocketId }: { viewerSocketId: string }) => {
        await createPeerForViewer(viewerSocketId);
      });

      sock.on("live:answer", async ({ answer, viewerSocketId }: { answer: RTCSessionDescriptionInit; viewerSocketId: string }) => {
        const pc = pcRef.current.get(viewerSocketId);
        await pc?.setRemoteDescription(answer).catch(() => {});
      });

      sock.on("live:ice_candidate", async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
        const pc = pcRef.current.get(from);
        await pc?.addIceCandidate(candidate).catch(() => {});
      });

      // Sunucuya yayın başlat
      sock.emit("live:start", {
        streamId: sid,
        title: streamTitle.trim() || "Canlı Yayın",
        thumbnail, // null olabilir, sunucu handle eder
      });

      // Thumbnail 1s sonra hazır olursa güncelle
      setTimeout(() => {
        if (localVideoRef.current) {
          const thumb = captureVideoThumbnail(localVideoRef.current);
          if (thumb) sock!.emit("live:update_thumbnail", { streamId: sid, thumbnail: thumb });
        }
      }, 1500);

      window.history.replaceState(null, "", `/live/${sid}`);
      startDurationTimer();
      setPhase("live");
    } catch (err: any) {
      setErrorMsg(err?.message || "Yayın başlatılamadı.");
      setPhase("error");
    } finally {
      setStarting(false);
    }
  }, [streamTitle, spawnEmoji, startDurationTimer]);

  // ── Yayını bitir ──────────────────────────────────────────────────────────
  const endBroadcast = useCallback(() => {
    const sid = realStreamId || rawId;
    socketRef.current?.emit("live:end", { streamId: sid });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current.forEach(pc => { try { pc.close(); } catch {} });
    pcRef.current.clear();
    if (durationRef.current) clearInterval(durationRef.current);
    navigate("/live");
  }, [realStreamId, rawId, navigate]);

  // ── İptal (setup) ─────────────────────────────────────────────────────────
  const cancelSetup = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    navigate(-1);
  };

  // ── Mikrofon ──────────────────────────────────────────────────────────────
  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    const newMuted = !muted;
    setMuted(newMuted);
    const sid = realStreamId || rawId;
    socketRef.current?.emit("live:host_state", { streamId: sid, muted: newMuted, camOff });
  };

  // ── Kamera ────────────────────────────────────────────────────────────────
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    const newCamOff = !camOff;
    setCamOff(newCamOff);
    const sid = realStreamId || rawId;
    socketRef.current?.emit("live:host_state", { streamId: sid, muted, camOff: newCamOff });
  };

  // ── Kamera çevir (ön/arka) ────────────────────────────────────────────────
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const newFacing = facingMode === "user" ? "environment" : "user";
    try {
      // Eski video track'i durdur
      localStreamRef.current.getVideoTracks().forEach(t => t.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];

      // Tüm PC sender'larına yeni track'i ver
      pcRef.current.forEach(async pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(newTrack).catch(() => {});
      });

      // Localstream'i güncelle
      const old = localStreamRef.current.getVideoTracks()[0];
      if (old) localStreamRef.current.removeTrack(old);
      localStreamRef.current.addTrack(newTrack);

      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setFacingMode(newFacing);
    } catch (e) {
      console.error("flipCamera:", e);
    }
  }, [facingMode]);

  // ── Beğeni ────────────────────────────────────────────────────────────────
  const sendLike = () => {
    if (liked) return;
    setLiked(true);
    socketRef.current?.emit("live:like", { streamId: realStreamId || rawId });
    spawnEmoji("❤️");
  };

  // ── Emoji ─────────────────────────────────────────────────────────────────
  const sendEmoji = (emoji: string) => {
    socketRef.current?.emit("live:emoji", { streamId: realStreamId || rawId, emoji });
    spawnEmoji(emoji);
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    socketRef.current?.emit("live:message", { streamId: realStreamId || rawId, text });
    setChatInput("");
  };

  // ── Link kopyala ──────────────────────────────────────────────────────────
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: native share
      navigator.share?.({ title: streamInfo?.title || "Canlı Yayın", url: window.location.href });
    }
  };

  const quality = QUALITY_LEVELS[qualityIdx] ?? QUALITY_LEVELS[QUALITY_LEVELS.length - 1];

  // ════════════════════════════════════════════════════════════════
  // RENDER — SETUP
  // ════════════════════════════════════════════════════════════════
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 relative bg-zinc-950">
          <video
            ref={setupVideoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

          <button
            onClick={cancelSetup}
            className="absolute top-12 left-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Kamera çevirme butonu setup ekranında da */}
          <button
            onClick={flipCamera}
            className="absolute top-12 right-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <FlipHorizontal2 className="w-4 h-4 text-white" />
          </button>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/80 text-sm font-semibold">Önizleme</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 border-t border-white/8 px-5 pt-5 pb-10">
          <p className="text-white font-bold text-lg mb-1">Canlı Yayın Başlat</p>
          <p className="text-white/40 text-[12px] mb-4">Takipçilerin seni anlık izleyebilecek</p>

          <input
            value={streamTitle}
            onChange={e => setStreamTitle(e.target.value)}
            placeholder="Yayın başlığı gir (isteğe bağlı)"
            maxLength={120}
            className="w-full bg-white/8 border border-white/12 rounded-2xl px-4 py-3.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-4"
          />

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startBroadcast}
            disabled={starting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-base shadow-xl shadow-red-500/30 disabled:opacity-60"
          >
            {starting
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Başlatılıyor...</>
              : <><Radio className="w-5 h-5" /> Yayını Başlat</>
            }
          </motion.button>

          <button onClick={cancelSetup} className="w-full mt-3 py-3 text-white/40 text-sm font-semibold">
            İptal
          </button>
        </div>
      </div>
    );
  }

  if (phase === "connecting") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
        <p className="text-white/50 text-sm">Yayına bağlanıyor...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-white font-semibold">{errorMsg}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-semibold">
          Geri Dön
        </button>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white/8 flex items-center justify-center mb-2">
          <Radio className="w-7 h-7 text-white/40" />
        </div>
        <p className="text-white font-bold text-xl">Yayın Sona Erdi</p>
        <p className="text-white/40 text-sm">Bu canlı yayın bitirildi.</p>
        <button
          onClick={() => navigate("/live")}
          className="mt-3 px-7 py-3 rounded-full bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/30"
        >
          Diğer Yayınlara Bak
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER — CANLI (host veya izleyici)
  // ════════════════════════════════════════════════════════════════
  const sid = realStreamId || rawId || "";

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden select-none">

      {/* ── Video ── */}
      <div className="flex-1 relative bg-black">
        {isHost && (
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
        )}
        {!isHost && (
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: quality.blurPx > 0 ? `blur(${quality.blurPx}px)` : "none",
              transition: "filter 0.8s ease",
            }}
          />
        )}

        {/* Host kamerası kapalıysa siyah + ikon */}
        {isHost && camOff && (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3 z-10">
            <VideoOff className="w-10 h-10 text-white/30" />
            <p className="text-white/30 text-sm">Kamera Kapalı</p>
          </div>
        )}

        {/* İzleyici: host kamerası kapalıyken overlay */}
        {!isHost && streamInfo?.hostCamOff && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
            <VideoOff className="w-8 h-8 text-white/40" />
            <p className="text-white/40 text-xs">Yayıncı kamerasını kapattı</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75 pointer-events-none" />

        {/* ── Üst bar ── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-2 z-20">
          <div className="flex items-center gap-2">
            <img
              src={absoluteUrl(isHost ? me?.profilePic : streamInfo?.profilePic)}
              alt=""
              className="w-9 h-9 rounded-full object-cover border-2 border-red-500"
            />
            <div>
              <p className="text-white text-[12px] font-bold leading-none">
                {isHost ? (me?.name || me?.username) : (streamInfo?.name || streamInfo?.username || "Yayıncı")}
              </p>
              {streamInfo && <p className="text-white/50 text-[10px] mt-0.5">@{streamInfo.username}</p>}
            </div>
            <span className="ml-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-red-500 text-white animate-pulse">
              CANLI
            </span>
            {/* Host: yayın süresi */}
            {isHost && (
              <span className="flex items-center gap-1 text-[10px] text-white/60 ml-1">
                <Clock className="w-3 h-3" /> {formatDuration(hostDuration)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Kalite göstergesi (izleyici) */}
            {!isHost && (
              <span className={`flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold ${quality.color}`}>
                {connState === "reconnecting" ? (
                  <><WifiOff className="w-3 h-3" /> Bağlanıyor</>
                ) : (
                  <><Wifi className="w-3 h-3" /> {quality.label}</>
                )}
              </span>
            )}
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
              <Eye className="w-3 h-3" /> {viewerCount}
            </span>
            {/* Host: mic muted göstergesi */}
            {!isHost && streamInfo?.hostMuted && (
              <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                <MicOff className="w-3 h-3 text-red-400" />
              </span>
            )}
            <button
              onClick={isHost ? endBroadcast : () => navigate(-1)}
              className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Bağlantı sorunları ── */}
        <AnimatePresence>
          {connState === "reconnecting" && !isHost && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-orange-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <Loader2 className="w-3 h-3 text-white animate-spin" />
              <p className="text-white text-[10px] font-semibold">Yayına yeniden bağlanılıyor...</p>
            </motion.div>
          )}
          {connState === "failed" && !isHost && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-red-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <WifiOff className="w-3 h-3 text-white" />
              <p className="text-white text-[10px] font-semibold">Bağlantı kesildi</p>
            </motion.div>
          )}
          {quality.blurPx > 0 && connState === "connected" && !isHost && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <p className="text-white/70 text-[10px] font-semibold">
                Yavaş bağlantı — kalite: {quality.label}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Emoji uçuşu ── */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {floatingEmojis.map(fe => (
              <motion.span
                key={fe.id}
                initial={{ opacity: 1, y: "88%", scale: 0.5 }}
                animate={{ opacity: 0, y: "-5%",  scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.6, ease: "easeOut" }}
                style={{ left: `${fe.x}%`, position: "absolute", bottom: 0 }}
                className="text-3xl"
              >
                {fe.emoji}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Chat overlay ── */}
        <div className="absolute bottom-28 left-0 right-16 px-3 z-20 pointer-events-none">
          <div className="space-y-1 max-h-44 overflow-hidden flex flex-col justify-end">
            <AnimatePresence initial={false}>
              {messages.slice(-8).map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                  className="flex items-center gap-1.5 pointer-events-auto"
                >
                  <img src={absoluteUrl(msg.profilePic)} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                  <span className="bg-black/55 backdrop-blur-sm rounded-2xl px-2.5 py-1 text-[11px] text-white max-w-[85%]">
                    <span className="font-bold text-white/75 mr-1">{msg.name || msg.username}</span>
                    {msg.isEmoji ? <span className="text-base">{msg.text}</span> : msg.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Beğeni (sağ) ── */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-0.5">
          <motion.button
            whileTap={{ scale: 0.72 }}
            onClick={sendLike}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors ${liked ? "bg-red-500 shadow-red-500/40" : "bg-black/50 backdrop-blur-sm"}`}
          >
            <Heart className={`w-5 h-5 ${liked ? "text-white fill-white" : "text-white"}`} />
          </motion.button>
          <span className="text-white text-[10px] font-bold">{likeCount}</span>
        </div>

        {/* ── Host kontroller ── */}
        {isHost && (
          <div className="absolute left-3 bottom-28 z-20 flex flex-col gap-2">
            <motion.button whileTap={{ scale: 0.85 }} onClick={toggleMic}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${muted ? "bg-red-500/80" : "bg-black/50 backdrop-blur-sm"}`}>
              {muted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.85 }} onClick={toggleCam}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${camOff ? "bg-red-500/80" : "bg-black/50 backdrop-blur-sm"}`}>
              {camOff ? <VideoOff className="w-4 h-4 text-white" /> : <Video className="w-4 h-4 text-white" />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.85 }} onClick={flipCamera}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FlipHorizontal2 className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        )}
      </div>

      {/* ── Alt bar: emoji + chat ── */}
      <div className="bg-zinc-950 border-t border-white/8 px-3 pt-2.5 pb-6 z-40">
        <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto scrollbar-none">
          {EMOJI_LIST.map(emoji => (
            <motion.button
              key={emoji} whileTap={{ scale: 0.68 }} onClick={() => sendEmoji(emoji)}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-xl hover:bg-white/15 transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <img
            src={absoluteUrl(me?.profilePic)} alt=""
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white/15"
          />
          <div className="flex-1 flex items-center bg-white/8 border border-white/10 rounded-full px-3.5 gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Yorum yaz..."
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none py-2.5"
            />
            <motion.button whileTap={{ scale: 0.78 }} onClick={sendChat} disabled={!chatInput.trim()}
              className="text-white/50 disabled:opacity-30 hover:text-white transition-colors">
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
          {/* Link kopyala / paylaş */}
          <motion.button whileTap={{ scale: 0.85 }}
            className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center"
            onClick={copyLink}
          >
            {copied
              ? <Check className="w-4 h-4 text-green-400" />
              : <Copy className="w-4 h-4 text-white/55" />
            }
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }}
            className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center"
            onClick={() => navigator.share?.({ title: streamInfo?.title || "Canlı Yayın", url: window.location.href })}
          >
            <Share2 className="w-4 h-4 text-white/55" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

