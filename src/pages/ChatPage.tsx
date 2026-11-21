import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ArrowLeft, Loader2, Search, Image as ImageIcon, X, Mic, Phone, Video, Plus, UserSearch, Trash2, Play, Pause, AlertCircle, Users, Reply, CornerUpLeft, Download, Camera, ZoomIn } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { getConversations, getMessages, sendMessage, getStoredUser, searchUsers, sendVoiceMessage, deleteConversation, deleteMessage, createGroupChat, getGroupChats, getGroupMessages, sendGroupMessage, sendGroupImage, getGroupInfo, getToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCallContext } from "@/contexts/CallContext";
import { getSocket } from "@/lib/socket";
import { createSafePreviewUrl } from "@/lib/media";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";

async function sendImage(recipientId: string, imageFile: File): Promise<any> {
  const token = getToken();
  const fd = new FormData();
  fd.append("recipientId", recipientId);
  fd.append("image", imageFile);
  const res = await fetch(`${API_BASE}/messages/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  return res.json();
}

// ── URL'leri tıklanabilir linklere çevirir ──
function renderTextWithLinks(text: string, isMe: boolean) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // javascript: / data: protokollerini engelle
      const safeHref = /^https?:\/\//i.test(part) ? part : "#";
      return (
        <a key={i} href={safeHref} target="_blank" rel="noopener noreferrer"
          className={`underline underline-offset-2 break-all ${isMe ? "text-white/90 hover:text-white" : "text-primary hover:text-primary/80"}`}
          onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function isImageUrl(url: string): boolean {
  if (!url) return false;
  return (
    /\/uploads\/(?!voice\/)/.test(url) ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) ||
    url.includes("dicebear")
  );
}

function isVoiceUrl(url: string): boolean {
  if (!url) return false;
  return /\/uploads\/voice\//.test(url) || /\.(webm|ogg|mp3|m4a|wav)(\?|$)/i.test(url);
}

function parseSharedPost(content: string): string | null {
  if (!content) return null;
  const m = content.match(/Paylaşılan Gönderi:\s*\/p\/([a-f0-9-]+)/i);
  return m ? m[1] : null;
}

const absUrl = (u: string) =>
  !u ? u : u.startsWith("http") || u.startsWith("blob:") ? u : `https://sehitumitkestitarimmtal.com${u}`;

// ════════════════ IMAGE LIGHTBOX ════════════════
const ImageLightbox = ({ src, onClose }: { src: string; onClose: () => void }) => {
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle"|"ok"|"err">("idle");

  const handleSaveToGallery = async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus("idle");

    try {
      // 1) Canvas yöntemi — CORS sorununu aşar, resmi blob'a çevirir
      const toBlob = (): Promise<Blob> => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("canvas boş")), "image/jpeg", 0.95);
        };
        img.onerror = () => reject(new Error("resim yüklenemedi"));
        img.src = src + (src.includes("?") ? "&" : "?") + "_t=" + Date.now();
      });

      let blob: Blob;
      try {
        blob = await toBlob();
      } catch {
        // Canvas başarısız olursa fetch dene (same-origin veya CORS izinli ise çalışır)
        const res = await fetch(src, { mode: "cors" });
        blob = await res.blob();
      }

      const fileName = `foto_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      // 2) Web Share API — iOS/Android'de "Fotoğraflara Kaydet" seçeneği çıkar
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Fotoğraf" });
        setSaveStatus("ok");
        return;
      }

      // 3) Fallback: <a download> — masaüstü / Android Chrome
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setSaveStatus("ok");
    } catch (e: any) {
      if (e?.name === "AbortError") {
        // Kullanıcı paylaşım diyaloğunu kapattı — hata değil
      } else {
        setSaveStatus("err");
        // Son çare: yeni sekmede aç, kullanıcı uzun basarak kaydeder
        window.open(src, "_blank");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm"
      style={{ animation: "fadeInScale 0.2s ease" }}
      onClick={onClose}
    >
      <style>{`@keyframes fadeInScale{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}} @keyframes msgSlideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes msgSlideInLeft{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}} @keyframes msgSlideInRight{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <div className="absolute top-4 right-4 flex gap-3 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleSaveToGallery(); }}
          disabled={saving}
          className={`w-11 h-11 rounded-full backdrop-blur flex items-center justify-center text-white transition-colors disabled:opacity-60 ${saveStatus === "ok" ? "bg-green-500/80" : saveStatus === "err" ? "bg-red-500/80" : "bg-white/15 hover:bg-white/25"}`}
          aria-label="Galeriye Kaydet"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saveStatus === "ok" ? <span className="text-base">✓</span> : <Download className="w-5 h-5" />}
        </button>
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-[85dvh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <p className="text-white/40 text-xs mt-3">{saveStatus === "ok" ? "✓ Kaydedildi" : "↑ Galeriye kaydet"}</p>
    </div>
  );
};

// ════════════════ SWIPEABLE MESSAGE ════════════════
const SwipeableMessage = ({
  children, isMe, onReply, onContextReply,
}: {
  children: React.ReactNode; isMe: boolean; onReply: () => void; onContextReply: () => void;
}) => {
  const touchStartX = useRef<number>(0);
  const [dragX, setDragX] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setTriggered(false);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0 && diff < 100) {
      setDragX(Math.min(diff, 80));
      if (diff >= THRESHOLD && !triggered) {
        setTriggered(true);
        try { (navigator as any).vibrate?.(30); } catch {}
      }
    }
  };
  const handleTouchEnd = () => {
    if (triggered) onReply();
    setDragX(0);
    setTriggered(false);
  };

  return (
    <div
      className="relative select-none"
      style={{ transform: `translateX(${dragX}px)`, transition: dragX === 0 ? "transform 0.2s cubic-bezier(.4,0,.2,1)" : "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onContextReply(); }}
    >
      {dragX > 8 && (
        <div
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-primary/20"
          style={{ opacity: Math.min(dragX / THRESHOLD, 1), transform: `translateX(-100%) translateY(-50%) scale(${0.7 + 0.3 * Math.min(dragX / THRESHOLD, 1)})` }}
        >
          <Reply className="w-4 h-4 text-primary" />
        </div>
      )}
      {children}
    </div>
  );
};

// ════════════════ VOICE RECORDER ════════════════
const VoiceRecorder = ({ onSend, onCancel }: { onSend: (blob: Blob, duration: number) => void; onCancel: () => void }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [permError, setPermError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setPermError("Tarayıcı mikrofonu desteklemiyor"); return; }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
        const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        recorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.start();
        setRecording(true);
        tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch (e: any) {
        setPermError(e?.message?.includes("denied") ? "Mikrofon izni verilmedi" : "Mikrofon başlatılamadı");
      }
    })();
    return () => { active = false; cleanup(); };
  }, [cleanup]);

  const stopAndSend = () => {
    const rec = recorderRef.current;
    if (!rec) { onCancel(); return; }
    const dur = seconds;
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      cleanup();
      if (blob.size > 500) onSend(blob, dur); else onCancel();
    };
    rec.stop();
    setRecording(false);
  };

  const cancelRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    cleanup();
    onCancel();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border-t border-border">
      {permError ? (
        <><p className="flex-1 text-sm text-destructive">{permError}</p><button onClick={onCancel} className="px-4 h-9 rounded-full bg-secondary text-foreground text-sm font-bold">Kapat</button></>
      ) : (
        <>
          <button onClick={cancelRecording} aria-label="İptal" className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive active:scale-90 transition-transform">
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            <div className="flex-1 flex items-end gap-0.5 h-7">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="flex-1 rounded-full bg-primary/70"
                  style={{ height: `${30 + Math.abs(Math.sin((seconds + i) * 0.7)) * 70}%`, transition: "height 0.15s" }} />
              ))}
            </div>
            <span className="text-sm font-mono font-bold text-foreground tabular-nums w-12 text-right">{fmt(seconds)}</span>
          </div>
          <button onClick={stopAndSend} disabled={!recording || seconds === 0} aria-label="Gönder"
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-50 active:scale-90 transition-transform shadow-lg">
            <Send className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
};

// ════════════════ VOICE PLAYER ════════════════
const VoicePlayer = ({ src, isMe }: { src: string; isMe: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 min-w-[200px]`}>
      <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/25" : "bg-primary"}`}>
        {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5 fill-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`relative h-1.5 rounded-full overflow-hidden ${isMe ? "bg-white/25" : "bg-muted-foreground/25"}`}>
          <div className={`absolute left-0 top-0 h-full rounded-full ${isMe ? "bg-white" : "bg-primary"}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Mic className={`w-3 h-3 ${isMe ? "text-white/80" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-mono ${isMe ? "text-white/80" : "text-muted-foreground"}`}>
            {fmt(playing || current ? current : duration)}
          </span>
        </div>
      </div>
      <audio ref={audioRef} src={src}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={(e) => { const el = e.target as HTMLAudioElement; setCurrent(el.currentTime); setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0); }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
        preload="metadata"
      />
    </div>
  );
};

// ════════════════ SHARED POST CARD ════════════════
const SharedPostCard = ({ postId, isMe }: { postId: string; isMe: boolean }) => {
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/posts/${postId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPost(d?.post || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) return <div className="w-[260px] h-32 bg-black/10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!post) return <div className="w-[260px] p-3"><p className={`text-[11px] ${isMe ? "text-white/70" : "text-muted-foreground"}`}>📷 Paylaşılan gönderi (silinmiş)</p></div>;

  const rawUrl = post.mediaUrls?.[0];
  const img = absUrl((rawUrl && typeof rawUrl === "object" ? rawUrl.url : rawUrl) || post.mediaUrl || post.media || "");
  const author = post.name || post.username || "kullanıcı";

  return (
    <button onClick={() => navigate(`/feed?post=${postId}`)} className="block w-[260px] text-left active:scale-[0.98] transition-transform">
      {img ? <img src={img} alt="" className="w-full h-40 object-cover" /> : <div className="w-full h-24 bg-black/15 flex items-center justify-center"><p className="text-xs">Metin gönderisi</p></div>}
      <div className="px-3 py-2">
        <p className={`text-[11px] font-bold mb-0.5 ${isMe ? "text-white" : "text-foreground"}`}>@{author}</p>
        <p className={`text-xs line-clamp-2 ${isMe ? "text-white/85" : "text-muted-foreground"}`}>{post.content || "Gönderiyi görüntüle"}</p>
      </div>
    </button>
  );
};

// ════════════════ MAIN PAGE ════════════════
const ChatPage = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showVoiceRec, setShowVoiceRec] = useState(false);
  const [convToDelete, setConvToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  // Grup profil resmi için state
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const currentUser = getStoredUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const groupPhotoRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const activeChatRef = useRef<any>(null);
  const { toast } = useToast();
  const { startCall } = useCallContext();

  // activeChatRef her zaman güncel activeChat'i tutar
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState("");
  const [newChatResults, setNewChatResults] = useState<any[]>([]);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const newChatTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [groupCreating, setGroupCreating] = useState(false);
  const groupSearchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const [dmData, grpData] = await Promise.allSettled([getConversations(), getGroupChats()]);
      const dms = dmData.status === "fulfilled" && Array.isArray(dmData.value?.conversations) ? dmData.value.conversations : [];
      const grps = grpData.status === "fulfilled" && Array.isArray(grpData.value?.groups) ? grpData.value.groups.map((g: any) => ({
        ...g,
        isGroup: true,
        partner: { id: g.id, name: g.name, profilePic: g.photo || g.avatar || null, isGroup: true },
        partner_id: g.id,
      })) : [];
      setConversations([...grps, ...dms]);
    } catch (e) {
      console.warn("[ChatPage] conversations load failed", e);
      setConversations([]);
    }
    setLoading(false);
  }, []);

  const markAsRead = useCallback((partnerId: string) => {
    try {
      const socket = getSocket();
      socket?.emit("markRead", { partnerId });
      socket?.emit("messages:read", { partnerId });
    } catch {}
    // Also update local state
    setMessages((prev) => prev.map((m) => m.senderId !== currentUser?.id ? { ...m, read: true } : m));
  }, [currentUser?.id]);

  const openChat = useCallback(async (conv: any) => {
    if (!conv) return;
    const safeConv = {
      ...conv,
      partner: conv.partner || { id: conv.partner_id, name: "", username: conv.partner_username || "" },
    };
    setActiveChat(safeConv);
    setReplyTo(null);
    try {
      const partnerId = safeConv.partner?.id || safeConv.partner_id;
      if (!partnerId) return;
      const isGroup = safeConv.isGroup || safeConv.partner?.isGroup;
      const data = isGroup ? await getGroupMessages(partnerId) : await getMessages(partnerId);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      if (!isGroup) markAsRead(partnerId);
    } catch (e) {
      console.warn("[ChatPage] messages load failed", e);
      setMessages([]);
    }
  }, [markAsRead]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ─── REAL-TIME socket ───
  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
    try { socket = getSocket(); } catch (e) { console.warn("socket init failed", e); }
    if (!socket) return;

    const handleIncoming = (raw: any) => {
      const msg = raw?.message || raw;
      if (!msg) return;
      const myId = currentUser?.id;
      const senderId = msg.senderId || msg.sender_id || msg.sender?.id || msg.from;
      const recipientId = msg.recipientId || msg.recipient_id || msg.recipient?.id || msg.to;
      const groupId = msg.groupId || msg.group_id || msg.group?.id;

      loadConversations();

      const currentPartnerId = activeChatRef.current?.partner?.id || activeChatRef.current?.partner_id;

      const belongsToCurrentChat =
        currentPartnerId && (
          senderId === currentPartnerId ||
          recipientId === currentPartnerId ||
          groupId === currentPartnerId ||
          senderId === myId
        );

      if (belongsToCurrentChat) {
        setMessages((prev) => {
          if (prev.some((m) => m.id && msg.id && m.id === msg.id)) return prev;
          const idx = prev.findIndex(
            (m) => String(m.id).startsWith("temp-") && m.senderId === senderId && m.content === msg.content
          );
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...msg, pending: false };
            return copy;
          }
          return [...prev, { ...msg, _isNew: true }];
        });
        // Karşı taraftan gelen mesajı hemen okundu olarak işaretle
        if (senderId !== myId && currentPartnerId) {
          markAsRead(currentPartnerId);
        }
      }
    };

    const handleRead = (data: any) => {
      const ids: string[] = data?.messageIds || (data?.messageId ? [data.messageId] : []);
      const partnerId = data?.partnerId || data?.userId;
      if (ids.length) {
        setMessages((prev) => prev.map((m) => ids.includes(m.id) ? { ...m, read: true, readAt: new Date().toISOString() } : m));
      } else if (partnerId) {
        // Tüm mesajları okundu yap
        setMessages((prev) => prev.map((m) => m.senderId === currentUser?.id ? { ...m, read: true } : m));
      }
    };

    const events = ["newMessage", "new_message", "message", "message:new", "receiveMessage", "chat:message", "directMessage", "group:message", "groupMessage", "group_message"];
    events.forEach((ev) => socket!.on(ev, handleIncoming));
    const readEvents = ["message:read", "messagesRead", "messages_read", "read"];
    readEvents.forEach((ev) => socket!.on(ev, handleRead));

    return () => {
      events.forEach((ev) => socket!.off(ev, handleIncoming));
      readEvents.forEach((ev) => socket!.off(ev, handleRead));
    };
  }, [currentUser?.id, loadConversations, markAsRead]);

  // ─── FALLBACK polling every 2s ───
  useEffect(() => {
    const partnerId = activeChat?.partner?.id || activeChat?.partner_id;
    if (!partnerId) return;
    const isGroup = activeChat?.isGroup || activeChat?.partner?.isGroup;
    const interval = setInterval(async () => {
      try {
        const data = isGroup ? await getGroupMessages(partnerId) : await getMessages(partnerId);
        const fresh = Array.isArray(data?.messages) ? data.messages : [];
        setMessages((prev) => {
          const temps = prev.filter((m) => String(m.id).startsWith("temp-") && !fresh.some((f: any) => f.content === m.content && f.senderId === m.senderId));
          const freshIds = new Set(fresh.map((f: any) => f.id));
          const prevIds = new Set(prev.filter((m) => !String(m.id).startsWith("temp-")).map((m) => m.id));
          const same = freshIds.size === prevIds.size && [...freshIds].every(id => prevIds.has(id));
          if (same && temps.length === 0) return prev;
          return [...fresh, ...temps];
        });
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeChat]);

  // ─── Conversation list poll every 4s ───
  useEffect(() => {
    if (activeChat) return;
    const interval = setInterval(() => { loadConversations(); }, 4000);
    return () => clearInterval(interval);
  }, [activeChat, loadConversations]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const partnerId = params.get("to");
      if (!partnerId) return;
      if (conversations.length === 0 && !loading) { openChat({ partner: { id: partnerId, name: "", username: "" } }); return; }
      const existing = conversations.find((c) => (c?.partner?.id || c?.partner_id) === partnerId);
      if (existing) openChat(existing);
      else if (conversations.length > 0) openChat({ partner: { id: partnerId, name: "", username: "" } });
    } catch (e) { console.warn("[ChatPage] URL parse failed", e); }
  }, [conversations, loading, openChat]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Dosya 10MB'dan büyük olamaz"); return; }
    setImageFile(file);
    setImagePreview(await createSafePreviewUrl(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || sending) return;
    const partnerId = activeChat?.partner?.id || activeChat?.partner_id;
    if (!partnerId) return;
    const isGroup = activeChat?.isGroup || activeChat?.partner?.isGroup;

    const text = input.trim();
    setInput("");
    const imgFile = imageFile;
    const imgPreview = imagePreview;
    const currentReply = replyTo;
    clearImage();
    setReplyTo(null);
    setSending(true);

    const replyPrefix = currentReply
      ? `↩ "${(currentReply.content || "").substring(0, 60).replace(/\n/g, " ")}"\n`
      : "";
    const finalText = replyPrefix + (text || "");

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMsg = {
      id: tempId,
      senderId: currentUser?.id,
      content: finalText,
      mediaUrl: imgPreview,
      createdAt: new Date().toISOString(),
      pending: true,
      _replyTo: currentReply,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      if (imgFile) {
        const data = isGroup
          ? await sendGroupImage(partnerId, imgFile)
          : await (async () => {
              const token = getToken();
              const fd = new FormData();
              fd.append("recipientId", partnerId);
              fd.append("image", imgFile);
              const res = await fetch(`${API_BASE}/messages/image`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: fd,
              });
              return res.json();
            })();
        setMessages((prev) => prev.map((m) =>
          m.id === tempId ? { ...m, id: data.messageId || m.id, mediaUrl: data.imageUrl ? absUrl(data.imageUrl) : imgPreview, pending: false } : m
        ));
      }
      if (finalText) {
        isGroup
          ? await sendGroupMessage(partnerId, finalText)
          : await sendMessage(partnerId, finalText);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false } : m)));
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true, pending: false } : m)));
    }
    setSending(false);
  };

  const handleSendVoice = async (blob: Blob, _duration: number) => {
    const partnerId = activeChat?.partner?.id || activeChat?.partner_id;
    if (!partnerId) { setShowVoiceRec(false); return; }
    const isGroup = activeChat?.isGroup || activeChat?.partner?.isGroup;
    setShowVoiceRec(false);
    const tempId = `temp-${Date.now()}`;
    const localUrl = URL.createObjectURL(blob);
    setMessages((prev) => [...prev, { id: tempId, senderId: currentUser?.id, content: localUrl, createdAt: new Date().toISOString(), pending: true, _localVoice: true }]);
    try {
      let r: any;
      if (isGroup) {
        // Group voice: send as group image endpoint fallback or group message with blob URL
        const token = getToken();
        const fd = new FormData();
        fd.append("groupId", partnerId);
        fd.append("voice", blob, "voice.webm");
        const res = await fetch(`${API_BASE}/chats/group/${partnerId}/voice`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        r = res.ok ? await res.json().catch(() => ({})) : null;
        if (!r?.voiceUrl) {
          // Fallback: use regular voice endpoint
          r = await sendVoiceMessage(partnerId, blob);
        }
      } else {
        r = await sendVoiceMessage(partnerId, blob);
      }
      if (r?.error || !r?.voiceUrl) throw new Error(r?.error || "Sesli mesaj gönderilemedi");
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: r.messageId || m.id, content: r.voiceUrl, pending: false, _localVoice: false } : m));
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true, pending: false } : m)));
      toast({ title: "Sesli mesaj gönderilemedi", description: err?.message || "Lütfen tekrar deneyin", variant: "destructive" });
    }
  };

  const handleConvPressStart = (conv: any) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      try { (navigator as any).vibrate?.(40); } catch {}
      setConvToDelete(conv);
    }, 550);
  };

  const handleConvPressEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleConvClick = (conv: any) => {
    if (longPressTriggered.current) { longPressTriggered.current = false; return; }
    openChat(conv);
  };

  const confirmDeleteConv = async () => {
    if (!convToDelete || deleting) return;
    const partnerId = convToDelete?.partner?.id || convToDelete?.partner_id;
    if (!partnerId) { setConvToDelete(null); return; }
    setDeleting(true);
    setConversations((prev) => prev.filter((c) => (c?.partner?.id || c?.partner_id) !== partnerId));
    try {
      await deleteConversation(partnerId);
      toast({ title: "Sohbet silindi" });
    } catch (err: any) {
      toast({ title: "Silinemedi", description: err?.message || "Tekrar deneyin", variant: "destructive" });
      loadConversations();
    }
    setDeleting(false);
    setConvToDelete(null);
  };

  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery) return true;
    const name = (c?.partner?.name || c?.partner?.username || c?.name || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // ─── ACTIVE CHAT VIEW ───
  if (activeChat) {
    const partner = activeChat.partner || {};
    const isGroup = activeChat.isGroup || partner?.isGroup;
    const partnerAvatar = partner?.profilePic
      ? absUrl(partner.profilePic)
      : isGroup
        ? null
        : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <style>{`
          @keyframes msgSlideInRight{from{opacity:0;transform:translateX(18px) scale(0.96)}to{opacity:1;transform:translateX(0) scale(1)}}
          @keyframes msgSlideInLeft{from{opacity:0;transform:translateX(-18px) scale(0.96)}to{opacity:1;transform:translateX(0) scale(1)}}
          @keyframes fadeInScale{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
          @keyframes msgDropIn{from{opacity:0;transform:translateY(-18px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
          .msg-me{animation:msgSlideInRight 0.22s cubic-bezier(.4,0,.2,1) both}
          .msg-them{animation:msgSlideInLeft 0.22s cubic-bezier(.4,0,.2,1) both}
          .msg-new{animation:msgDropIn 0.28s cubic-bezier(.34,1.56,.64,1) both}
          .scrollbar-hide::-webkit-scrollbar{display:none}
        `}</style>

        <header
          className="sticky top-0 z-40 border-b border-white/10"
          style={{
            background: "hsl(var(--background) / 0.72)",
            backdropFilter: "blur(24px) saturate(1.8)",
            WebkitBackdropFilter: "blur(24px) saturate(1.8)",
            boxShadow: "0 1px 0 hsl(0 0% 100%/0.06) inset, 0 8px 24px -16px hsl(var(--foreground)/0.15)",
          }}
        >
          <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
            <button onClick={() => { setActiveChat(null); setMessages([]); }} className="active:scale-90 transition-transform">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            {partnerAvatar ? (
              <img src={partnerAvatar} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center ring-2 ring-primary/20">
                <Users className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{partner?.name || partner?.username || "Sohbet"}</p>
              {isGroup ? (
                <p className="text-[10px] text-muted-foreground">
                  {activeChat?.members?.length ? `${activeChat.members.length} üye` : "Grup sohbeti"}
                </p>
              ) : partner?.isOnline ? (
                <p className="text-[10px] text-primary">● Çevrimiçi</p>
              ) : null}
            </div>
            {!isGroup && (
              <div className="flex gap-1">
                <button onClick={() => startCall({ id: partner.id || partner._id, name: partner.name, username: partner.username, profilePic: partner.profilePic }, "audio")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors" aria-label="Sesli ara">
                  <Phone className="w-[18px] h-[18px]" />
                </button>
                <button onClick={() => startCall({ id: partner.id || partner._id, name: partner.name, username: partner.username, profilePic: partner.profilePic }, "video")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors" aria-label="Görüntülü ara">
                  <Video className="w-[18px] h-[18px]" />
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-1.5 overflow-y-auto scrollbar-hide pb-40">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12 animate-fade-in">
              Henüz mesaj yok. İlk mesajı sen at! 👋
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUser?.id;
            const content = msg.content || "";
            const sharedPostId = parseSharedPost(content);
            const mediaUrl = msg.mediaUrl
              ? absUrl(msg.mediaUrl)
              : (typeof content === "string" && (content.startsWith("/uploads/") || content.startsWith("blob:")))
                ? (content.startsWith("blob:") ? content : absUrl(content))
                : null;

            const isVoice = msg._localVoice || (typeof content === "string" && isVoiceUrl(content));
            const isImage = mediaUrl && isImageUrl(mediaUrl);
            const isText = !sharedPostId && !isVoice && !isImage && content;

            const replyMatch = isText && content.match(/^↩ "(.{0,60})"\n([\s\S]*)$/);
            const replyPreviewText = replyMatch ? replyMatch[1] : null;
            const mainText = replyMatch ? replyMatch[2] : content;

            // Animasyon gecikmesi — yeni mesajlara (son 5) animasyon
            const animDelay = Math.max(0, idx - (messages.length - 6)) * 40;

            return (
              <SwipeableMessage
                key={msg.id}
                isMe={isMe}
                onReply={() => setReplyTo(msg)}
                onContextReply={() => setReplyTo(msg)}
              >
                <div
                  className={`group flex items-end gap-1.5 ${isMe ? "justify-end msg-me" : "justify-start msg-them"} ${msg._isNew ? "msg-new" : ""}`}
                  style={{ animationDelay: `${animDelay}ms` }}
                >
                  {!isMe && (
                    <div className="flex flex-col items-start">
                      {isGroup && (
                        <span className="text-[9px] font-bold text-primary/70 px-1 mb-0.5 truncate max-w-[120px]">
                          {msg.senderName || msg.sender?.name || msg.sender?.username || ""}
                        </span>
                      )}
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center flex-shrink-0 mb-1">
                        <span className="text-[9px] text-white font-bold">
                          {((msg.senderName || msg.sender?.name || partner?.name || "?")[0] || "?").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                  {isMe && !msg.pending && !msg.failed && !String(msg.id).startsWith("temp-") && (
                    <button
                      onClick={async () => {
                        if (!confirm("Bu mesajı silmek istiyor musunuz?")) return;
                        const id = msg.id;
                        setMessages((prev) => prev.filter((m) => m.id !== id));
                        try { await deleteMessage(id); } catch {}
                      }}
                      aria-label="Mesajı sil"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive mb-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className={`max-w-[78%] rounded-[20px] overflow-hidden text-sm ${
                    isMe
                      ? "text-primary-foreground rounded-br-[6px]"
                      : "text-secondary-foreground rounded-bl-[6px]"
                  } ${msg.pending ? "opacity-60" : ""} ${msg.failed ? "border border-destructive" : ""}`}
                  style={
                    isMe
                      ? { background: "linear-gradient(155deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)", boxShadow: "0 3px 10px -4px hsl(var(--primary)/0.45)" }
                      : { background: "hsl(var(--secondary))", boxShadow: "0 1px 3px hsl(var(--foreground)/0.06)" }
                  }>

                    {replyPreviewText && (
                      <div className={`flex items-center gap-1.5 px-3 pt-2 pb-1 border-b ${isMe ? "border-white/20" : "border-border"}`}>
                        <CornerUpLeft className={`w-3 h-3 flex-shrink-0 ${isMe ? "text-white/60" : "text-muted-foreground"}`} />
                        <p className={`text-[10px] italic truncate ${isMe ? "text-white/70" : "text-muted-foreground"}`}>{replyPreviewText}</p>
                      </div>
                    )}

                    {sharedPostId ? (
                      <SharedPostCard postId={sharedPostId} isMe={isMe} />
                    ) : isVoice ? (
                      <VoicePlayer src={msg._localVoice ? content : absUrl(content)} isMe={isMe} />
                    ) : isImage ? (
                      <div className="relative group/img cursor-zoom-in" onClick={() => setLightboxSrc(mediaUrl!)}>
                        <img src={mediaUrl!} alt="" className="w-full max-w-[260px] max-h-[340px] object-cover transition-transform group-hover/img:scale-[1.01]" />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow" />
                        </div>
                      </div>
                    ) : null}

                    {isText && (
                      <div className="px-3.5 py-2.5">
                        <p className="break-words whitespace-pre-wrap leading-relaxed">{renderTextWithLinks(mainText, isMe)}</p>
                      </div>
                    )}

                    <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <span className="text-[10px]">
                        {msg.failed ? "✗ Gönderilemedi" : msg.pending ? "⏳" : new Date(msg.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMe && !msg.pending && !msg.failed && (() => {
                        const isRead = msg.read || msg.seen || msg.isRead || msg.readAt;
                        const isDelivered = isRead || msg.delivered || msg.deliveredAt || msg.status === "delivered" || msg.status === "read" || msg.status === "seen";
                        if (isRead) return (
                          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-label="Görüldü" className="text-blue-400 drop-shadow-sm">
                            <path d="M11.071 0.653L4.797 6.928 2.097 4.228 1.04 5.286l3.757 3.757L12.129 1.71zM14.314 0.653L8.04 6.928 7.116 6.005 6.058 7.062l1.982 1.982L15.371 1.71z" fill="currentColor"/>
                          </svg>
                        );
                        if (isDelivered) return (
                          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-label="İletildi" className="text-primary-foreground/80">
                            <path d="M11.071 0.653L4.797 6.928 2.097 4.228 1.04 5.286l3.757 3.757L12.129 1.71zM14.314 0.653L8.04 6.928 7.116 6.005 6.058 7.062l1.982 1.982L15.371 1.71z" fill="currentColor"/>
                          </svg>
                        );
                        return (
                          <svg width="12" height="11" viewBox="0 0 12 11" fill="none" aria-label="Gönderildi" className="text-primary-foreground/80">
                            <path d="M11.071 0.653L4.797 6.928 2.097 4.228 1.04 5.286l3.757 3.757L11.129 1.71z" fill="currentColor"/>
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </SwipeableMessage>
            );
          })}
          <div ref={messagesEndRef} />
        </main>

        {/* Lightbox */}
        {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

        <div
          className="fixed bottom-0 left-0 right-0 border-t border-white/10"
          style={{
            background: "hsl(var(--background) / 0.75)",
            backdropFilter: "blur(26px) saturate(1.8)",
            WebkitBackdropFilter: "blur(26px) saturate(1.8)",
          }}
        >
          {showVoiceRec ? (
            <div className="max-w-lg mx-auto"><VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowVoiceRec(false)} /></div>
          ) : (
            <>
              {replyTo && (
                <div className="max-w-lg mx-auto px-3 pt-2 pb-0">
                  <div className="flex items-center gap-2 bg-primary/10 border-l-2 border-primary rounded-r-xl px-3 py-2">
                    <CornerUpLeft className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <p className="flex-1 text-xs text-primary truncate">{(replyTo.content || "Mesaj").substring(0, 80)}</p>
                    <button onClick={() => setReplyTo(null)} className="p-0.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
              {imagePreview && (
                <div className="max-w-lg mx-auto px-3 pt-3 pb-1">
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="" className="h-16 w-16 object-cover rounded-xl border border-border" />
                    <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center shadow">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              )}
              <div className="max-w-lg mx-auto flex items-end gap-2 px-3 py-2.5">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

                {/* Tek parça glass pill: resim + ses ikonları + input hepsi aynı kapsül içinde */}
                <div
                  className="flex-1 flex items-center gap-1 rounded-full pl-1.5 pr-1.5 py-1.5 min-w-0"
                  style={{
                    background: "hsl(var(--secondary) / 0.7)",
                    border: "1px solid hsl(0 0% 100% / 0.08)",
                  }}
                >
                  <button onClick={() => fileRef.current?.click()} aria-label="Resim" className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background/60 transition-colors active:scale-90">
                    <ImageIcon className="w-[19px] h-[19px]" />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Mesaj yaz..."
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 px-1.5 py-1 text-sm outline-none min-w-0"
                    maxLength={5000}
                  />
                  <button onClick={() => setShowVoiceRec(true)} aria-label="Sesli mesaj" className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background/60 transition-colors active:scale-90">
                    <Mic className="w-[19px] h-[19px]" />
                  </button>
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending || (!input.trim() && !imageFile)}
                  aria-label="Gönder"
                  className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                  style={{
                    background: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                    boxShadow: "0 6px 16px -6px hsl(var(--primary)/0.55)",
                  }}
                >
                  {sending ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Send className="w-4 h-4 text-primary-foreground" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── CONVERSATION LIST ───
  const handleNewChatSearch = (q: string) => {
    setNewChatQuery(q);
    clearTimeout(newChatTimeout.current);
    if (q.trim().length < 2) { setNewChatResults([]); return; }
    newChatTimeout.current = setTimeout(async () => {
      setNewChatLoading(true);
      try { const res = await searchUsers(q); setNewChatResults(res?.users || []); } catch { setNewChatResults([]); }
      setNewChatLoading(false);
    }, 300);
  };

  const handleGroupSearch = (q: string) => {
    setGroupQuery(q);
    clearTimeout(groupSearchTimeout.current);
    if (q.trim().length < 2) { setGroupSearchResults([]); return; }
    groupSearchTimeout.current = setTimeout(async () => {
      setGroupSearchLoading(true);
      try { const res = await searchUsers(q); setGroupSearchResults(res?.users || []); } catch { setGroupSearchResults([]); }
      setGroupSearchLoading(false);
    }, 300);
  };

  const toggleGroupMember = (user: any) => {
    setGroupMembers(prev => prev.find(m => m.id === user.id) ? prev.filter(m => m.id !== user.id) : [...prev, user]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast({ title: "Grup adı gerekli", variant: "destructive" }); return; }
    if (groupMembers.length < 1) { toast({ title: "En az 1 üye ekle", variant: "destructive" }); return; }
    setGroupCreating(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("name", groupName.trim());
      fd.append("memberIds", JSON.stringify(groupMembers.map(m => m.id)));
      if (groupPhotoFile) fd.append("photo", groupPhotoFile);
      const res = await fetch(`${API_BASE}/chats/group`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Grup oluşturulamadı");
      }
      toast({ title: "✓ Grup oluşturuldu" });
      setShowGroupModal(false);
      setGroupName(""); setGroupMembers([]); setGroupQuery(""); setGroupSearchResults([]);
      setGroupPhotoFile(null); setGroupPhotoPreview(null);
      await loadConversations();
    } catch (e: any) {
      toast({ title: "Grup oluşturulamadı", description: e?.message, variant: "destructive" });
    } finally {
      setGroupCreating(false);
    }
  };

  const startNewChat = (user: any) => {
    setShowNewChat(false);
    setNewChatQuery(""); setNewChatResults([]);
    openChat({ partner: { id: user.id, name: user.name, username: user.username, profilePic: user.profilePic } });
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <style>{`
        @keyframes convIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        .conv-item{animation:convIn 0.18s ease both}
      `}</style>
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold text-foreground">Mesajlar</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGroupModal(true)} aria-label="Grup oluştur"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/10 transition-colors active:scale-90" title="Grup oluştur">
              <Users className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => setShowNewChat(true)} aria-label="Yeni mesaj"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/10 transition-colors active:scale-90">
              <Plus className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewChat(false)} />
          <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border border-b-0 max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Yeni Mesaj</h3>
              <button onClick={() => setShowNewChat(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={newChatQuery} onChange={(e) => handleNewChatSearch(e.target.value)} placeholder="Kullanıcı ara..." autoFocus
                  className="w-full bg-secondary text-foreground placeholder:text-muted-foreground rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-8">
              {newChatLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
              {!newChatLoading && newChatQuery.length >= 2 && newChatResults.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">Kullanıcı bulunamadı</p>}
              {newChatResults.map((user) => (
                <button key={user.id} onClick={() => startNewChat(user)} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary/50 rounded-xl transition-colors">
                  <img src={user.profilePic ? absUrl(user.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"} alt="" className="w-11 h-11 rounded-full object-cover" />
                  <div className="text-left"><p className="text-sm font-semibold text-foreground">{user.name || user.username}</p><p className="text-xs text-muted-foreground">@{user.username}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grup Oluşturma Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!groupCreating) setShowGroupModal(false); }} />
          <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border border-b-0 max-h-[88vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Grup Oluştur</h3>
              <button onClick={() => setShowGroupModal(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-4 pt-4 pb-2 space-y-3">
              {/* Grup profil fotoğrafı */}
              <div className="flex items-center gap-4">
                <input ref={groupPhotoRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setGroupPhotoFile(f);
                  setGroupPhotoPreview(await createSafePreviewUrl(f));
                }} />
                <button onClick={() => groupPhotoRef.current?.click()}
                  className="w-16 h-16 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors flex-shrink-0">
                  {groupPhotoPreview
                    ? <img src={groupPhotoPreview} alt="" className="w-full h-full object-cover" />
                    : <Camera className="w-6 h-6 text-muted-foreground" />}
                </button>
                <div className="flex-1">
                  <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Grup adı..." maxLength={50}
                    className="w-full bg-secondary text-foreground placeholder:text-muted-foreground rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                  <p className="text-[10px] text-muted-foreground mt-1 pl-2">Fotoğraf ve isim ekle</p>
                </div>
              </div>

              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 py-1">
                  {groupMembers.map(m => (
                    <button key={m.id} onClick={() => toggleGroupMember(m)}
                      className="flex items-center gap-1.5 bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-semibold active:scale-95 transition-transform">
                      <img src={m.profilePic ? absUrl(m.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"} className="w-4 h-4 rounded-full object-cover" alt="" />
                      {m.name || m.username}<X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={groupQuery} onChange={(e) => handleGroupSearch(e.target.value)} placeholder="Üye ara..."
                  className="w-full bg-secondary text-foreground placeholder:text-muted-foreground rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {groupSearchLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
              {groupSearchResults.map(user => {
                const selected = !!groupMembers.find(m => m.id === user.id);
                return (
                  <button key={user.id} onClick={() => toggleGroupMember(user)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${selected ? "bg-primary/10" : "hover:bg-secondary/50"}`}>
                    <img src={user.profilePic ? absUrl(user.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-foreground">{user.name || user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    {selected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-4 border-t border-border">
              <button disabled={groupCreating || !groupName.trim() || groupMembers.length === 0} onClick={handleCreateGroup}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-md disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.98]">
                {groupCreating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `✓ Grubu Oluştur (${groupMembers.length} üye)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Sohbet ara..."
            className="w-full bg-secondary text-foreground placeholder:text-muted-foreground rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none" />
        </div>
      </div>

      <main className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredConvs.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <UserSearch className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">Henüz mesaj yok</p>
            <button onClick={() => setShowNewChat(true)} className="text-sm text-primary font-semibold">Yeni mesaj başlat</button>
          </div>
        ) : (
          filteredConvs.map((conv, idx) => {
            const partner = conv?.partner || {};
            const isGroup = conv?.isGroup || partner?.isGroup;
            const avatar = partner?.profilePic ? absUrl(partner.profilePic) : null;
            const lastContent = conv?.content || conv?.lastMessage?.content || "";
            const isImg = typeof lastContent === "string" && (lastContent.startsWith("/uploads/") && !lastContent.includes("/voice/"));
            const isVoice = typeof lastContent === "string" && lastContent.includes("/uploads/voice/");
            const isShared = typeof lastContent === "string" && /Paylaşılan Gönderi/.test(lastContent);
            const preview = isShared ? "📷 Gönderi paylaştı" : isVoice ? "🎤 Sesli mesaj" : isImg ? "📷 Fotoğraf" : (lastContent || "Mesaj yok");
            return (
              <button
                key={conv?.id || partner?.id || idx}
                onClick={() => handleConvClick(conv)}
                onTouchStart={() => handleConvPressStart(conv)}
                onTouchEnd={handleConvPressEnd}
                onTouchMove={handleConvPressEnd}
                onTouchCancel={handleConvPressEnd}
                onMouseDown={() => handleConvPressStart(conv)}
                onMouseUp={handleConvPressEnd}
                onMouseLeave={handleConvPressEnd}
                onContextMenu={(e) => { e.preventDefault(); setConvToDelete(conv); }}
                className="conv-item w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 active:bg-secondary/70 transition-colors select-none"
                style={{ animationDelay: `${idx * 30}ms`, WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
              >
                <div className="relative flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover pointer-events-none" draggable={false} />
                  ) : isGroup ? (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{(partner?.name || partner?.username || "?")[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  {partner?.isOnline && !isGroup && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-background" />}
                  {isGroup && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 border-2 border-background flex items-center justify-center"><Users className="w-2 h-2 text-white" /></div>}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{partner?.name || partner?.username || conv?.name || "Kullanıcı"}</p>
                  <p className="text-xs text-muted-foreground truncate">{preview}</p>
                </div>
                {conv?.unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 flex-shrink-0 shadow-sm shadow-primary/30">
                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </main>

      {convToDelete && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center" onClick={() => !deleting && setConvToDelete(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-border p-6 pb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center pb-3"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center"><Trash2 className="w-5 h-5 text-destructive" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground">Sohbeti sil?</h3>
                <p className="text-xs text-muted-foreground truncate">{convToDelete?.partner?.name || convToDelete?.partner?.username || "Kullanıcı"} ile olan sohbet silinecek</p>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-3 mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">Bu işlem geri alınamaz. Tüm mesajlar silinir.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConvToDelete(null)} disabled={deleting} className="flex-1 py-3 rounded-2xl bg-secondary text-foreground font-semibold text-sm active:scale-[0.98] transition-transform">Vazgeç</button>
              <button onClick={confirmDeleteConv} disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-70">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Sil
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ChatPage;






