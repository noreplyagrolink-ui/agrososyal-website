import { useEffect, useRef, useState, useCallback } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  RotateCcw,
  FlipHorizontal2,
  Signal,
  AlertTriangle,
  RefreshCw,
  Monitor,
  MonitorOff,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { useCall } from "@/hooks/useCall";
import { avatarUrl } from "@/lib/avatar";

type CallApi = ReturnType<typeof useCall>;

// Duration formatter  e.g. 125 → "2:05"
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const CallOverlay = ({ call }: { call: CallApi }) => {
  const {
    status,
    callType,
    peer,
    isCaller,
    muted,
    cameraOff,
    speakerOff,
    facingMode,
    callDuration,
    isReconnecting,
    connectionQuality,
    isScreenSharing,
    localVideoRef,
    remoteVideoRef,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    flipCamera,
    triggerIceRestart,
    toggleScreenShare,
  } = call;

  // Controls visibility — hide after 4s of inactivity, show on tap
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => {
    if (status === "in-call") {
      resetHideTimer();
    } else {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [status, resetHideTimer]);

  if ((status === "idle" || status === "ended") && !peer) return null;
  if (!peer) return null;

  const avatar = avatarUrl(peer.profilePic);
  const isRinging = status === "ringing";
  const isCalling = status === "calling";
  const isConnecting = status === "connecting";
  const isInCall = status === "in-call";
  const showVideo = callType === "video" && (isInCall || isConnecting);
  const isAudioCall = callType === "audio";
  // Camera is off but call is still active (audio-only fallback in video call)
  const isVideoCallAudioOnly = callType === "video" && isInCall && cameraOff && !isScreenSharing;

  // Quality indicator
  const qualityColor =
    connectionQuality === "good"
      ? "text-green-400"
      : connectionQuality === "poor"
      ? "text-yellow-400"
      : "text-red-400";

  const overlay = (
    <div
      className="fixed inset-0 flex flex-col select-none"
      style={{
        zIndex: 999999,
        background: isAudioCall
          ? "linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
          : "#000",
      }}
      onClick={isInCall ? resetHideTimer : undefined}
    >
      {/* ── Remote video full-screen ── */}
      {showVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── Audio call: large blurred avatar bg ── */}
      {isAudioCall && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={avatar}
            alt=""
            className="w-full h-full object-cover scale-150 blur-3xl opacity-20"
          />
        </div>
      )}

      {/* ── Local PIP (video call) ── */}
      {callType === "video" && (isInCall || isConnecting) && (
        <div
          className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl"
          style={{ zIndex: 20 }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === "user" && !isScreenSharing ? "scaleX(-1)" : "none" }}
          />
          {cameraOff && !isScreenSharing && (
            <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center gap-1">
              <VideoOff className="w-6 h-6 text-white/50" />
              <span className="text-white/40 text-[9px]">Kamera kapalı</span>
            </div>
          )}
          {isScreenSharing && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-center">
              <span className="text-[9px] bg-blue-500/80 text-white px-1.5 py-0.5 rounded-full">Ekran</span>
            </div>
          )}
        </div>
      )}

      {/* ── Camera-off audio-only banner (video call with cam disabled) ── */}
      {isVideoCallAudioOnly && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ zIndex: 5 }}>
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl">
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <span className="text-white/60 text-sm">Kamera kapalı – sesli devam ediyor</span>
        </div>
      )}

      {/* ── Pre-call / ringing / connecting overlay ── */}
      {!isInCall && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6"
          style={{ zIndex: 20 }}
        >
          {/* Animated ring */}
          {(isRinging || isCalling) && (
            <div className="relative">
              <div className="absolute -inset-6 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute -inset-3 rounded-full border border-primary/20 animate-pulse" />
            </div>
          )}

          <img
            src={avatar}
            alt=""
            className="w-32 h-32 rounded-full object-cover ring-4 ring-white/20 shadow-2xl relative z-10"
          />
          <p className="text-2xl font-bold text-white drop-shadow-lg">
            {peer.name || peer.username}
          </p>
          {peer.username && peer.name && (
            <p className="text-sm text-white/60">@{peer.username}</p>
          )}
          <p className="text-sm text-white/70 font-medium tracking-wide">
            {isRinging &&
              (isCaller
                ? "Çağrılıyor..."
                : `Gelen ${callType === "video" ? "görüntülü" : "sesli"} arama`)}
            {isCalling && "Çalıyor..."}
            {isConnecting && "Bağlanıyor..."}
          </p>
        </div>
      )}

      {/* ── In-call header (name + duration + quality) ── */}
      {isInCall && (
        <div
          className={`absolute top-0 left-0 right-0 p-4 pt-12 flex flex-col items-center transition-all duration-500 ${
            controlsVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            zIndex: 25,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
          }}
        >
          <p className="text-white font-semibold text-base">
            {peer.name || peer.username}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {isReconnecting ? (
              <span className="text-yellow-400 text-xs flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Yeniden bağlanıyor...
              </span>
            ) : (
              <>
                <Signal className={`w-3 h-3 ${qualityColor}`} />
                <span className="text-white/70 text-xs">
                  {formatDuration(callDuration)}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-transform transition-opacity duration-500 ease-in-out ${
          isInCall
            ? controlsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-full opacity-0"
            : "translate-y-0 opacity-100"
        }`}
        style={{
          zIndex: 30,
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
          paddingTop: 32,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        {/* ── Incoming call buttons ── */}
        {isRinging && !isCaller ? (
          <div className="flex items-center justify-center gap-16 pb-8">
            {/* Reject */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center active:scale-90 transition-transform shadow-xl"
                aria-label="Reddet"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-white/70 text-xs">Reddet</span>
            </div>
            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center active:scale-90 transition-transform shadow-xl animate-bounce"
                aria-label="Kabul et"
              >
                <Phone className="w-7 h-7 text-white" />
              </button>
              <span className="text-white/70 text-xs">Kabul et</span>
            </div>
          </div>
        ) : (
          /* ── In-call / calling controls ── */
          <div className="flex items-center justify-center gap-5 pb-8 flex-wrap">
            {/* Mute */}
            <ControlBtn
              onClick={toggleMute}
              active={muted}
              icon={muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              label={muted ? "Ses Aç" : "Sustur"}
            />

            {/* Camera on/off — video only */}
            {callType === "video" && (
              <ControlBtn
                onClick={toggleCamera}
                active={cameraOff}
                icon={
                  cameraOff ? (
                    <VideoOff className="w-5 h-5" />
                  ) : (
                    <Video className="w-5 h-5" />
                  )
                }
                label={cameraOff ? "Kamera Aç" : "Kamera Kapat"}
              />
            )}

            {/* Flip camera — video only, in-call, not screen sharing */}
            {callType === "video" && isInCall && !isScreenSharing && (
              <ControlBtn
                onClick={flipCamera}
                active={false}
                icon={<FlipHorizontal2 className="w-5 h-5" />}
                label="Çevir"
              />
            )}

            {/* Screen share — video call, in-call */}
            {callType === "video" && isInCall && (
              <ControlBtn
                onClick={toggleScreenShare}
                active={isScreenSharing}
                icon={
                  isScreenSharing ? (
                    <MonitorOff className="w-5 h-5" />
                  ) : (
                    <Monitor className="w-5 h-5" />
                  )
                }
                label={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                highlight={isScreenSharing}
              />
            )}

            {/* Speaker toggle */}
            <ControlBtn
              onClick={toggleSpeaker}
              active={speakerOff}
              icon={
                speakerOff ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )
              }
              label={speakerOff ? "Hoparlör" : "Hoparlör"}
            />

            {/* ICE restart — only when reconnecting */}
            {isReconnecting && (
              <ControlBtn
                onClick={triggerIceRestart}
                active={false}
                icon={<RotateCcw className="w-5 h-5 text-yellow-300" />}
                label="Yeniden Bağlan"
                highlight
              />
            )}

            {/* End call — big red */}
            <button
              onClick={() => endCall(true)}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center active:scale-90 transition-transform shadow-xl"
              aria-label="Sonlandır"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* ── Poor/bad connection banner ── */}
      {isInCall && connectionQuality !== "good" && !isReconnecting && (
        <div
          className="absolute top-24 left-0 right-0 flex justify-center pointer-events-none"
          style={{ zIndex: 40 }}
        >
          <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-yellow-400 text-xs">
              {connectionQuality === "poor"
                ? "Bağlantı zayıf"
                : "Bağlantı çok zayıf"}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
};

// Small reusable control button
function ControlBtn({
  onClick,
  active,
  icon,
  label,
  highlight = false,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg ${
          highlight
            ? "bg-yellow-500/20 border border-yellow-400/50"
            : active
            ? "bg-white text-black"
            : "bg-white/15 text-white backdrop-blur-md border border-white/10"
        }`}
        aria-label={label}
      >
        {icon}
      </button>
      <span className="text-white/60 text-[10px] leading-tight text-center max-w-[52px] truncate">
        {label}
      </span>
    </div>
  );
}

export default CallOverlay;

