import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

export type CallStatus =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "in-call"
  | "ended";
export type CallType = "video" | "audio";

// ── Sound helpers ──────────────────────────────────────────────────────────
// We generate sounds via Web Audio API so no extra asset files are needed.

function createRingtoneNode(ctx: AudioContext): OscillatorNode[] {
  // Generates a phone-style dual-tone ring (350Hz + 440Hz, repeating)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.frequency.value = 400;
  osc2.frequency.value = 450;
  gain.gain.value = 0.18;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start();
  osc2.start();
  return [osc1, osc2];
}

function playAcceptSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

function playEndSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.setValueAtTime(360, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 700);
  } catch {}
}

export { playAcceptSound, playEndSound };

export interface CallPeer {
  id: string;
  name?: string;
  username?: string;
  profilePic?: string;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

export function useCall() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType>("video");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [callDuration, setCallDuration] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "poor" | "bad">("good");
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const pendingOffer = useRef<{
    offer: RTCSessionDescriptionInit;
    callerId: string;
  } | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ringtone (for outgoing "calling" state)
  const ringtoneCtxRef = useRef<AudioContext | null>(null);
  const ringtoneNodesRef = useRef<OscillatorNode[]>([]);
  // Notification
  const notificationRef = useRef<Notification | null>(null);

  // Stable refs so socket listeners always see latest values
  const isCallerRef = useRef(false);
  const callIdRef = useRef<string | null>(null);
  const peerRef = useRef<CallPeer | null>(null);
  const statusRef = useRef<CallStatus>("idle");

  useEffect(() => {
    isCallerRef.current = isCaller;
  }, [isCaller]);
  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);
  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ------------------------------------------------------------------
  // Ringtone controls (outgoing call — "Çalıyor...")
  // ------------------------------------------------------------------
  const startRingtone = useCallback(() => {
    try {
      const ctx = new AudioContext();
      ringtoneCtxRef.current = ctx;
      let playing = true;
      const schedule = () => {
        if (!playing) return;
        const nodes = createRingtoneNode(ctx);
        ringtoneNodesRef.current = nodes;
        // Ring for 0.8s, pause for 0.8s, repeat
        setTimeout(() => {
          nodes.forEach((n) => { try { n.stop(); } catch {} });
          setTimeout(() => { if (playing) schedule(); }, 800);
        }, 800);
      };
      schedule();
      (ctx as any).__stopPlaying = () => { playing = false; };
    } catch {}
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      ringtoneNodesRef.current.forEach((n) => { try { n.stop(); } catch {} });
      ringtoneNodesRef.current = [];
      if (ringtoneCtxRef.current) {
        (ringtoneCtxRef.current as any).__stopPlaying?.();
        ringtoneCtxRef.current.close();
        ringtoneCtxRef.current = null;
      }
    } catch {}
  }, []);

  // ------------------------------------------------------------------
  // Push / browser notification for incoming calls (background tab)
  // ------------------------------------------------------------------
  const showCallNotification = useCallback((callerName: string, type: CallType) => {
    if (!("Notification" in window)) return;
    const show = () => {
      try {
        notificationRef.current?.close();
        notificationRef.current = new Notification(
          `📞 Gelen ${type === "video" ? "Görüntülü" : "Sesli"} Arama`,
          {
            body: `${callerName} sizi arıyor`,
            icon: "/favicon.ico",
            tag: "incoming-call",
            requireInteraction: true,
            silent: false,
          }
        );
        notificationRef.current.onclick = () => {
          window.focus();
          notificationRef.current?.close();
        };
      } catch {}
    };

    if (Notification.permission === "granted") {
      show();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => { if (p === "granted") show(); });
    }
  }, []);

  const closeCallNotification = useCallback(() => {
    notificationRef.current?.close();
    notificationRef.current = null;
  }, []);

  // ------------------------------------------------------------------
  // Duration timer
  // ------------------------------------------------------------------
  const startDurationTimer = useCallback(() => {
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Connection quality monitoring
  // ------------------------------------------------------------------
  const startQualityMonitor = useCallback(() => {
    statsIntervalRef.current = setInterval(async () => {
      if (!pcRef.current) return;
      try {
        const stats = await pcRef.current.getStats();
        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.mediaType === "video") {
            const loss = report.fractionLost ?? 0;
            if (loss > 0.15) setConnectionQuality("bad");
            else if (loss > 0.05) setConnectionQuality("poor");
            else setConnectionQuality("good");
          }
        });
      } catch {}
    }, 4000);
  }, []);

  const stopQualityMonitor = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidates.current = [];
    pendingOffer.current = null;
    if (iceRestartTimeoutRef.current) {
      clearTimeout(iceRestartTimeoutRef.current);
      iceRestartTimeoutRef.current = null;
    }
    stopDurationTimer();
    stopQualityMonitor();
    stopRingtone();
    closeCallNotification();
    setMuted(false);
    setCameraOff(false);
    setSpeakerOff(false);
    setFacingMode("user");
    setCallDuration(0);
    setIsReconnecting(false);
    setConnectionQuality("good");
    setIsScreenSharing(false);
  }, [stopDurationTimer, stopQualityMonitor, stopRingtone, closeCallNotification]);

  // ------------------------------------------------------------------
  // End call
  // ------------------------------------------------------------------
  const endCall = useCallback(
    (notify = true) => {
      if (notify && callIdRef.current && peerRef.current) {
        getSocket().emit("call:end", {
          callId: callIdRef.current,
          recipientId: peerRef.current.id,
        });
      }
      playEndSound();
      cleanup();
      setStatus("ended");
      setTimeout(() => {
        setStatus("idle");
        setPeer(null);
        setCallId(null);
        setIsCaller(false);
      }, 300);
    },
    [cleanup]
  );

  // ------------------------------------------------------------------
  // ICE Restart (WebRTC reconnect)
  // ------------------------------------------------------------------
  const triggerIceRestart = useCallback(async () => {
    if (!pcRef.current || !isCallerRef.current) return;
    setIsReconnecting(true);
    try {
      const offer = await pcRef.current.createOffer({ iceRestart: true });
      await pcRef.current.setLocalDescription(offer);
      if (callIdRef.current && peerRef.current) {
        getSocket().emit("webrtc_ice_restart", {
          callId: callIdRef.current,
          recipientId: peerRef.current.id,
          offer,
        });
      }
    } catch (e) {
      console.error("ICE restart failed", e);
      endCall(false);
    }
  }, [endCall]);

  // ------------------------------------------------------------------
  // Init RTCPeerConnection
  // ------------------------------------------------------------------
  const initPeerConnection = useCallback(
    (cId: string, partnerId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          getSocket().emit("webrtc_ice_candidate", {
            callId: cId,
            recipientId: partnerId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0];
        remoteStreamRef.current = stream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setStatus("in-call");
        startDurationTimer();
        startQualityMonitor();
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "failed") {
          // Try ICE restart before giving up
          if (isCallerRef.current) {
            iceRestartTimeoutRef.current = setTimeout(() => {
              triggerIceRestart();
            }, 1000);
          } else {
            endCall(false);
          }
        } else if (state === "disconnected") {
          setIsReconnecting(true);
          iceRestartTimeoutRef.current = setTimeout(() => {
            if (
              pcRef.current &&
              pcRef.current.connectionState === "disconnected"
            ) {
              endCall(false);
            }
          }, 8000);
        } else if (state === "connected") {
          setIsReconnecting(false);
          if (iceRestartTimeoutRef.current) {
            clearTimeout(iceRestartTimeoutRef.current);
            iceRestartTimeoutRef.current = null;
          }
        } else if (state === "closed") {
          endCall(false);
        }
      };

      pc.onicegatheringstatechange = () => {
        // Nothing needed but could be used for UI feedback
      };

      return pc;
    },
    [endCall, triggerIceRestart, startDurationTimer, startQualityMonitor]
  );

  // ------------------------------------------------------------------
  // Get local media stream
  // ------------------------------------------------------------------
  const getLocalStream = useCallback(
    async (type: CallType, facing: "user" | "environment" = "user") => {
      // Try 4K → 1080p → 720p fallback
      const videoConstraintsFallback: MediaTrackConstraints[] = [
        { width: { ideal: 3840 }, height: { ideal: 2160 }, facingMode: facing, frameRate: { ideal: 30, max: 60 } },
        { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: facing, frameRate: { ideal: 30, max: 30 } },
        { width: { ideal: 1280 }, height: { ideal: 720 },  facingMode: facing, frameRate: { ideal: 30, max: 30 } },
      ];

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Enhanced audio processing where available
        ...(({ sampleRate: 48000, sampleSize: 16, channelCount: 1 }) as any),
      };

      let stream: MediaStream | null = null;

      if (type === "video") {
        for (const vc of videoConstraintsFallback) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: vc });
            break;
          } catch {
            // try next quality
          }
        }
      }

      if (!stream) {
        // audio-only or all video attempts failed — get audio only
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
        if (type === "video") {
          // camera failed — continue audio only, set cameraOff
          setCameraOff(true);
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && stream.getVideoTracks().length > 0) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    },
    []
  );

  // ------------------------------------------------------------------
  // Flip camera (switch front/back)
  // ------------------------------------------------------------------
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const newFacing = facingMode === "user" ? "environment" : "user";

    try {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());

      const newConstraints: MediaStreamConstraints = {
        audio: false,
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: newFacing,
          frameRate: { ideal: 30, max: 30 },
        },
      };
      const newStream = await navigator.mediaDevices.getUserMedia(newConstraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      localStreamRef.current.addTrack(newVideoTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setFacingMode(newFacing);
    } catch (e) {
      console.error("flipCamera error", e);
    }
  }, [facingMode]);

  // ------------------------------------------------------------------
  // Start call (outgoing)
  // ------------------------------------------------------------------
  const startCall = useCallback(
    async (target: CallPeer, type: CallType = "video") => {
      try {
        const cId = `call_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        setCallId(cId);
        callIdRef.current = cId;
        setPeer(target);
        peerRef.current = target;
        setCallType(type);
        setIsCaller(true);
        isCallerRef.current = true;
        setStatus("calling");
        statusRef.current = "calling";
        startRingtone();

        const stream = await getLocalStream(type, "user");
        const pc = initPeerConnection(cId, target.id);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        getSocket().emit("call:initiate", {
          recipientId: target.id,
          type,
          callId: cId,
        });
      } catch (e) {
        console.error("startCall error", e);
        alert("Kamera/mikrofon erişimi reddedildi");
        cleanup();
        setStatus("idle");
      }
    },
    [initPeerConnection, cleanup, getLocalStream, startRingtone]
  );

  // ------------------------------------------------------------------
  // Accept call (incoming)
  // ------------------------------------------------------------------
  const acceptCall = useCallback(async () => {
    if (!callId || !peer) return;
    try {
      stopRingtone();
      closeCallNotification();
      playAcceptSound();
      setStatus("connecting");
      const stream = await getLocalStream(callType, "user");
      const pc = initPeerConnection(callId, peer.id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      getSocket().emit("call:respond", {
        callId,
        callerId: peer.id,
        response: "accept",
      });

      if (pendingOffer.current) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(pendingOffer.current.offer)
        );
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidates.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        getSocket().emit("webrtc_answer", {
          callId,
          recipientId: peer.id,
          answer,
        });
        pendingOffer.current = null;
      }
    } catch (e) {
      console.error("acceptCall error", e);
      endCall();
    }
  }, [callId, peer, callType, initPeerConnection, endCall, getLocalStream, stopRingtone, closeCallNotification]);

  // ------------------------------------------------------------------
  // Reject call
  // ------------------------------------------------------------------
  const rejectCall = useCallback(() => {
    if (!callId || !peer) return;
    getSocket().emit("call:respond", {
      callId,
      callerId: peer.id,
      response: "reject",
    });
    cleanup();
    setStatus("idle");
    setPeer(null);
    setCallId(null);
  }, [callId, peer, cleanup]);

  // ------------------------------------------------------------------
  // In-call controls
  // ------------------------------------------------------------------
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOff(!track.enabled);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setSpeakerOff(remoteVideoRef.current.muted);
    }
  }, []);

  // ------------------------------------------------------------------
  // Screen sharing
  // ------------------------------------------------------------------
  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Stop screen share, revert to camera
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender && cameraTrack) {
        cameraTrack.enabled = !cameraOff;
        await sender.replaceTrack(cameraTrack);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in peer connection
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        // Update local preview
        if (localVideoRef.current) {
          const previewStream = new MediaStream([screenTrack]);
          localVideoRef.current.srcObject = previewStream;
        }

        // Auto-stop when user ends via browser UI
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.error("Screen share error", e);
      }
    }
  }, [isScreenSharing, cameraOff]);

  // ------------------------------------------------------------------
  // Socket listeners
  // ------------------------------------------------------------------
  useEffect(() => {
    const s = getSocket();

    const onIncoming = ({ callId: cId, caller, type }: any) => {
      if (pcRef.current) return; // already in a call
      setCallId(cId);
      setPeer(caller);
      setCallType(type || "video");
      setIsCaller(false);
      setStatus("ringing");
      // Show browser/push notification for background tab / mobile
      const callerName = caller?.name || caller?.username || "Birisi";
      showCallNotification(callerName, type || "video");
      // Start ringtone so user hears incoming call
      startRingtone();
    };

    const onRinging = () => {
      setStatus("calling");
      // keep ringtone playing while other side rings
    };
    const onRejected = () => {
      stopRingtone();
      closeCallNotification();
      endCall(false);
    };
    const onEnded = () => {
      stopRingtone();
      closeCallNotification();
      endCall(false);
    };

    const onOffer = async ({ callId: cId, callerId, offer }: any) => {
      if (pcRef.current && pcRef.current.signalingState === "stable") {
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          for (const c of pendingCandidates.current) {
            await pcRef.current
              .addIceCandidate(new RTCIceCandidate(c))
              .catch(() => {});
          }
          pendingCandidates.current = [];
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          if (callIdRef.current && peerRef.current) {
            getSocket().emit("webrtc_answer", {
              callId: callIdRef.current,
              recipientId: peerRef.current.id,
              answer,
            });
          }
        } catch (e) {
          console.error("onOffer handle error", e);
        }
      } else {
        pendingOffer.current = { offer, callerId };
      }
    };

    // ICE restart offer received by callee
    const onIceRestart = async ({ offer }: any) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        if (callIdRef.current && peerRef.current) {
          getSocket().emit("webrtc_answer", {
            callId: callIdRef.current,
            recipientId: peerRef.current.id,
            answer,
          });
        }
        setIsReconnecting(false);
      } catch (e) {
        console.error("onIceRestart error", e);
      }
    };

    const onAnswer = async ({ answer }: any) => {
      try {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        for (const c of pendingCandidates.current) {
          await pcRef.current
            .addIceCandidate(new RTCIceCandidate(c))
            .catch(() => {});
        }
        pendingCandidates.current = [];
        setIsReconnecting(false);
      } catch (e) {
        console.error("onAnswer", e);
      }
    };

    const onIce = async ({ candidate }: any) => {
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    };

    const onCallerAccepted = async () => {
      stopRingtone(); // callee accepted — stop ringing on caller side
      playAcceptSound();
      setStatus("connecting");
      if (
        pcRef.current &&
        isCallerRef.current &&
        callIdRef.current &&
        peerRef.current
      ) {
        try {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          s.emit("webrtc_offer", {
            callId: callIdRef.current,
            recipientId: peerRef.current.id,
            offer,
          });
        } catch (e) {
          console.error("create offer error", e);
        }
      }
    };

    const onErr = (e: any) => {
      console.warn("call:error", e);
      alert(e?.error || "Arama hatası");
      endCall(false);
    };

    s.on("incoming_call", onIncoming);
    s.on("call:ringing", onRinging);
    s.on("call:accepted", onCallerAccepted);
    s.on("call_accepted", onCallerAccepted);
    s.on("call:rejected", onRejected);
    s.on("call_rejected", onRejected);
    s.on("call_ended", onEnded);
    s.on("call:ended", onEnded);
    s.on("call:error", onErr);
    s.on("webrtc_offer", onOffer);
    s.on("webrtc_answer", onAnswer);
    s.on("webrtc_ice_candidate", onIce);
    s.on("webrtc_ice_restart", onIceRestart);

    return () => {
      s.off("incoming_call", onIncoming);
      s.off("call:ringing", onRinging);
      s.off("call:accepted", onCallerAccepted);
      s.off("call_accepted", onCallerAccepted);
      s.off("call:rejected", onRejected);
      s.off("call_rejected", onRejected);
      s.off("call_ended", onEnded);
      s.off("call:ended", onEnded);
      s.off("call:error", onErr);
      s.off("webrtc_offer", onOffer);
      s.off("webrtc_answer", onAnswer);
      s.off("webrtc_ice_candidate", onIce);
      s.off("webrtc_ice_restart", onIceRestart);
    };
  }, [endCall, showCallNotification, startRingtone, stopRingtone, closeCallNotification]);

  return {
    // state
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
    // refs
    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    remoteStreamRef,
    // actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    flipCamera,
    triggerIceRestart,
    toggleScreenShare,
  };
}
