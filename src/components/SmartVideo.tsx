import { VideoHTMLAttributes, useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, AlertCircle } from "lucide-react";
import { isHls } from "@/lib/media";

interface Props extends VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  fit?: "cover" | "contain";
  forcePlay?: boolean;
  /** Çift dokunuş (beğeni). Verilirse tek dokunuş 250ms gecikmeyle oynat/duraklat yapar. */
  onDoubleTap?: () => void;
  autoPlayInView?: boolean;
  showControls?: boolean;
  /** Reels gibi tam ekran dikey bağlamlarda: minHeight/maxHeight sınırlarını
   *  kaldırır (w-full h-full olur), alt kontrol çubuğunu (play/ilerleme/tam
   *  ekran) gizler — bu bağlamlarda üst seviyede kendi minimal ilerleme
   *  çubuğu gösterilir. */
  fillParent?: boolean;
  /** Üst kapsayıcı (aspect-ratio kutusu) boyutu belirler: video h-full olur,
   *  min/max yükseklik sınırı yoktur ama kontroller görünür kalır. */
  fill?: boolean;
}

/**
 * Aynı anda yalnızca BİR SmartVideo çalsın: biri oynamaya başlayınca
 * diğerlerinin hepsi durdurulur (geçilen videoların arkada çalmaya
 * devam etmesini engeller).
 */
const activeVideos = new Set<HTMLVideoElement>();
function claimPlayback(v: HTMLVideoElement) {
  activeVideos.forEach((o) => { if (o !== v && !o.paused) o.pause(); });
  activeVideos.add(v);
}

/** Gerçek fare/hover olan cihaz mı? (Dokunmatikte mouseenter "yapışır" ve
 *  video ekrandan çıksa bile oynamaya devam ederdi.) */
const canHover = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const GLOBAL_MUTE_KEY = "agro_feed_muted";
const MUTE_EVENT = "agro:feed-mute-change";

function getGlobalMuted(): boolean {
  try {
    const v = localStorage.getItem(GLOBAL_MUTE_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
}

function setGlobalMuted(muted: boolean) {
  try { localStorage.setItem(GLOBAL_MUTE_KEY, muted ? "1" : "0"); } catch {}
  window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: muted }));
}

/**
 * Modern custom video player:
 *  - Hover üzerine gelince otomatik sesli oynatır (ses açıksa)
 *  - Görünüm dışına çıkınca durur
 *  - Tüm akış için ortak ses açma/kapama (localStorage + custom event)
 *  - Play/Pause, mute, ilerleme barı, tam ekran
 *
 * forwardRef: dışarıdan gerçek <video> elementine erişim gerekebiliyor
 * (örn. ReelsPage kendi üst ilerleme çubuğu için seek yapmak istiyor).
 * ref verilmezse (mevcut tüm kullanımlarda olduğu gibi) hiçbir şey değişmez.
 */
const SmartVideo = forwardRef<HTMLVideoElement, Props>(function SmartVideo({
  src, poster, fit = "cover", style, className = "",
  forcePlay,
  onDoubleTap, autoPlayInView = true, showControls: _legacy, fillParent = false, fill = false,
  ...rest
}: Props, forwardedRef) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(forwardedRef, () => videoRef.current as HTMLVideoElement, []);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(getGlobalMuted());
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inView, setInView] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const uiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<any>(null);

  // Global mute sync
  useEffect(() => {
    const onMute = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail;
      setMuted(next);
      if (videoRef.current) videoRef.current.muted = next;
    };
    window.addEventListener(MUTE_EVENT, onMute);
    return () => window.removeEventListener(MUTE_EVENT, onMute);
  }, []);

  // HLS.js desteği — .m3u8 dosyaları için
  useEffect(() => {
    if (!src || !isHls(src)) return;
    const v = videoRef.current;
    if (!v) return;

    // Tarayıcı native HLS destekliyorsa (Safari) doğrudan ata
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
      return;
    }

    // HLS.js ile oynat
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) return;
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) setVideoError(true);
      });
    }).catch(() => { setVideoError(true); });

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [src]);

  // Apply mute changes
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // In-view detection
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.5),
      { threshold: [0, 0.5, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto play/pause.
  // - Reels: forcePlay (aktif kart)
  // - Feed: yalnızca ekranda (%50+) görünürken oynar; hover SADECE görünürken
  //   ve gerçek fare olan cihazlarda etkilidir.
  // - Görünüm dışına çıkan video HER ZAMAN durur.
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldPlayRef = useRef(false);
  const shouldPlay = !!forcePlay || (inView && (autoPlayInView || hovering));
  shouldPlayRef.current = shouldPlay;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (shouldPlay) {
      claimPlayback(v);
      v.muted = muted;
      v.play().catch((err: any) => {
        // pause() ile iptal edildiyse (AbortError) ASLA tekrar başlatma —
        // eski hata: catch içinde tekrar play() çağrıldığı için geçilen
        // videolar arkada çalmaya devam ediyordu.
        if (err?.name !== "NotAllowedError") return;
        if (!shouldPlayRef.current) return;
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    } else {
      v.pause();
    }
  }, [shouldPlay, muted]);

  // Sekme arka plana geçince / bileşen kaldırılınca kesin dur
  useEffect(() => {
    const v = videoRef.current;
    const onVis = () => { if (document.hidden) videoRef.current?.pause(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (v) { v.pause(); activeVideos.delete(v); }
    };
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); } else { v.pause(); }
  }, []);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !muted;
    setMuted(next);
    setGlobalMuted(next);
  }, [muted]);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else v.requestFullscreen?.().catch(() => {});
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const pct = Number(e.target.value);
    v.currentTime = (pct / 100) * duration;
    setProgress(pct);
  };

  const flashUi = () => {
    setShowUi(true);
    if (uiTimer.current) clearTimeout(uiTimer.current);
    uiTimer.current = setTimeout(() => setShowUi(false), 2500);
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div
      ref={wrapRef}
      className={`relative group/video w-full ${fillParent || fill ? "h-full" : ""} bg-black ${className}`}
      style={style}
      onMouseEnter={() => { if (canHover()) setHovering(true); flashUi(); }}
      onMouseLeave={() => { setHovering(false); }}
      onMouseMove={flashUi}
      onClick={(e) => {
        e.stopPropagation();
        flashUi();
        if (!onDoubleTap) { togglePlay(); return; }
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0;
          if (tapTimerRef.current) { clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
          onDoubleTap();
        } else {
          lastTapRef.current = now;
          tapTimerRef.current = setTimeout(() => { tapTimerRef.current = null; togglePlay(); }, 260);
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        loop
        muted={muted}
        className={fillParent || fill ? "w-full h-full" : "w-full"}
        style={
          fillParent || fill
            ? { objectFit: fit, objectPosition: "center" }
            : { objectFit: fit, minHeight: "240px", maxHeight: "480px" }
        }
        {...rest}
        onPlay={(e) => { claimPlayback(e.currentTarget); setPlaying(true); rest.onPlay?.(e); }}
        onPause={(e) => { setPlaying(false); rest.onPause?.(e); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgress((v.currentTime / v.duration) * 100);
          rest.onTimeUpdate?.(e);
        }}
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration || 0); rest.onLoadedMetadata?.(e); }}
        onError={(e) => { setVideoError(true); rest.onError?.(e); }}
      />

      {/* Video yüklenemedi hatası */}
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 gap-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Video yüklenemedi</p>
          <button
            onClick={() => { setVideoError(false); if (videoRef.current) { videoRef.current.load(); videoRef.current.play().catch(() => {}); } }}
            className="text-xs font-medium text-primary hover:underline"
          >Tekrar dene</button>
        </div>
      )}

      {/* Center Play overlay (when paused) */}
      {!playing && !videoError && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition"
          aria-label="Oynat"
        >
          <span className="w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center shadow-2xl backdrop-blur">
            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Bottom control bar — reels'te (fillParent) gizlenir, üst seviyede
          kendi minimal ilerleme çubuğu gösterilir (bkz. ReelsPage). */}
      {!fillParent && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 px-2.5 pb-1.5 pt-6 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-200 ${
            showUi || !playing ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur transition"
              aria-label={playing ? "Durdur" : "Oynat"}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={onSeek}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-1.5 accent-white cursor-pointer"
              aria-label="İlerleme"
            />

            <span className="text-[10px] font-semibold text-white tabular-nums w-14 text-right drop-shadow">
              {fmt((progress / 100) * duration)} / {fmt(duration)}
            </span>

            <button
              onClick={toggleMute}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur transition"
              aria-label={muted ? "Sesi aç" : "Sesi kapat"}
              title={muted ? "Sesi aç (tüm akış için)" : "Sesi kapat (tüm akış için)"}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur transition"
              aria-label="Tam ekran"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top-right mute pill (quick access, always visible) — fillParent'ta da
          gösterilir mi diye ayrıca kontrol gerekmez: ReelsPage kendi mute
          butonunu sağ aksiyon sütununda zaten sağlıyor, çakışmasın diye
          burada da fillParent'ta gizleniyor. */}
      {!fillParent && (
        <button
          onClick={toggleMute}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur ring-1 ring-white/15 transition"
          aria-label={muted ? "Sesi aç" : "Sesi kapat"}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
});

export default SmartVideo;
export { getGlobalMuted, setGlobalMuted, MUTE_EVENT };


