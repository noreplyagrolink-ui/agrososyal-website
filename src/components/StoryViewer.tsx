import { useState, useEffect, useCallback, useRef } from "react";
import { X, Eye, ChevronUp, Heart, Trash2, Loader2 } from "lucide-react";
import { getStoryViewers, getStoredUser, likeStory, deleteStory, getToken } from "@/lib/api";

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

interface StoryItem {
  id: string;
  mediaUrl: string;
  mediaType?: string;
  text?: string;
  caption?: string;
  createdAt: string;
  isViewed?: boolean;
  likeCount?: number;
  isLiked?: boolean;
  /** "Gönderiyi hikayede paylaş" — backend kaynak gönderi özetini ve kart konumunu gönderir */
  quotedPostId?: string;
  quotedPost?: {
    id: string;
    content?: string;
    mediaType?: string;
    postMediaUrl?: string;
    username?: string;
    name?: string;
    profilePic?: string;
  } | null;
  postSticker?: string | { scale?: number; x?: number; y?: number } | null;
}

interface StoryGroup {
  userId: string;
  username: string;
  profilePic?: string;
  isVerified?: boolean;
  stories: StoryItem[];
}


const VIDEO_RE = /\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i;

/** Hikayede paylaşılan gönderi kartı (Instagram "gönderiyi hikayende paylaş" gibi). */
const SharedPostCard = ({ post, sticker, onReady }: {
  post: NonNullable<StoryItem["quotedPost"]>;
  sticker?: StoryItem["postSticker"];
  onReady: () => void;
}) => {
  let pos = { scale: 1, x: 0.5, y: 0.5 };
  try {
    const o = typeof sticker === "string" ? JSON.parse(sticker) : sticker;
    if (o) pos = { scale: Number(o.scale) || 1, x: Number(o.x ?? 0.5), y: Number(o.y ?? 0.5) };
  } catch {}

  const mediaUrl = post.postMediaUrl ? absoluteUrl(post.postMediaUrl) : "";
  const isVid = !!mediaUrl && (post.mediaType === "video" || VIDEO_RE.test(mediaUrl));
  const avatar = post.profilePic ? absoluteUrl(post.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
  const name = post.name || post.username || "";
  const text = (post.content || "").trim();

  // Medya yoksa ya da yüklenemezse timer yine de başlasın
  useEffect(() => { if (!mediaUrl) onReady(); }, [mediaUrl]);

  return (
    <div className="relative w-full h-full overflow-hidden"
         style={{ background: "linear-gradient(160deg,#0B8F5A 0%,#075B3B 55%,#0a2a20 100%)" }}>
      {mediaUrl && !isVid && (
        <img src={mediaUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-125" />
      )}
      <div
        className="absolute w-[82%] max-h-[78%] overflow-hidden rounded-3xl bg-card text-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col"
        style={{
          left: `${pos.x * 100}%`,
          top: `${pos.y * 100}%`,
          transform: `translate(-50%,-50%) scale(${pos.scale})`,
        }}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-border" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight truncate">{name}</p>
            {post.username && <p className="text-[11px] text-muted-foreground leading-tight truncate">@{post.username}</p>}
          </div>
        </div>
        {mediaUrl && (
          isVid ? (
            <video
              src={mediaUrl}
              className="w-full max-h-[46vh] object-contain bg-black"
              autoPlay loop muted playsInline
              onLoadedData={onReady} onError={onReady}
            />
          ) : (
            <img src={mediaUrl} alt="" className="w-full max-h-[46vh] object-cover bg-black"
                 onLoad={onReady} onError={onReady} draggable={false} />
          )
        )}
        {text && (
          <p className={`px-3.5 py-3 whitespace-pre-wrap break-words ${mediaUrl ? "text-[13px] line-clamp-3" : "text-[16px] line-clamp-[10]"}`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

interface OriginRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  group: StoryGroup;
  onClose: () => void;
  originRect?: OriginRect;
}

const STORY_DURATION = 5000; // 5 seconds for images only

const StoryViewer = ({ group, onClose, originRect }: Props) => {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  // Instagram-style entrance: "opening" (initial frame at origin), "open" (full-screen), "closing" (back to origin)
  const [phase, setPhase] = useState<"opening" | "open" | "closing">(originRect ? "opening" : "open");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const story = group.stories[idx];
  const currentUser = getStoredUser();
  const isOwnStory = currentUser?.id === group.userId;

  // Trigger entrance animation on next frame so initial styles commit first.
  // Double rAF + a tiny timeout guarantees the browser paints the "opening"
  // (origin) frame before transitioning to the "open" (full-screen) frame.
  useEffect(() => {
    if (!originRect) return;
    let raf2 = 0;
    let to: ReturnType<typeof setTimeout> | null = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        to = setTimeout(() => setPhase("open"), 16);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (to) clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while viewer is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Animated close that reverses back into the origin avatar
  const requestClose = useCallback(() => {
    if (!originRect) { onClose(); return; }
    setPaused(true);
    setPhase("closing");
    setTimeout(() => onClose(), 400);
  }, [originRect, onClose]);

  useEffect(() => {
    if (story) {
      setLiked(story.isLiked || false);
      setLikeCount(story.likeCount || 0);
    }
  }, [idx, story]);

  const markViewed = useCallback(async (storyId: string) => {
    try {
      const token = getToken();
      await fetch(`https://sehitumitkestitarimmtal.com/api/stories/${storyId}/view`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
  }, []);

  const goNext = useCallback(() => {
    if (idx < group.stories.length - 1) {
      setIdx(i => i + 1);
      setProgress(0);
      setImgLoaded(false);
    } else {
      requestClose();
    }
  }, [idx, group.stories.length, requestClose]);

  const goPrev = () => {
    if (idx > 0) {
      setIdx(i => i - 1);
      setProgress(0);
      setImgLoaded(false);
    }
  };

  const VIDEO_URL = /\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i;
  const quoted = story?.quotedPost || null;
  // Paylaşılan gönderi kartında video varsa kart kendi <video>'sunu çizer; story timer'ı görsel gibi işler
  const isVideo = !quoted && (story?.mediaType === "video" || VIDEO_URL.test(story?.mediaUrl || ""));

  // Timer: ONLY for images, NOT for videos
  useEffect(() => {
    if (paused || !imgLoaded || isVideo) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { goNext(); return 0; }
        return p + (100 / (STORY_DURATION / 100));
      });
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [idx, paused, imgLoaded, goNext, isVideo]);

  useEffect(() => {
    if (story) markViewed(story.id);
  }, [story, markViewed]);

  const loadViewers = async () => {
    if (!isOwnStory || !story) return;
    setViewersLoading(true);
    setShowViewers(true);
    setPaused(true);
    try {
      const data = await getStoryViewers(story.id);
      setViewers(data.viewers || []);
    } catch {}
    setViewersLoading(false);
  };

  const handleLike = async () => {
    if (!story) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => prev + (wasLiked ? -1 : 1));
    try { await likeStory(story.id); } catch {
      setLiked(wasLiked);
      setLikeCount(prev => prev + (wasLiked ? 1 : -1));
    }
  };

  const handleDelete = async () => {
    if (!story || !isOwnStory) return;
    try {
      await deleteStory(story.id);
      if (group.stories.length <= 1) requestClose();
      else goNext();
    } catch {}
  };

  // Swipe down to close (gesture-driven; hooks must run before any early return)
  const touchStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    if (phase !== "open") return;
    touchStartY.current = e.touches[0].clientY;
    setPaused(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 120) {
      requestClose();
    } else {
      setDragY(0);
      setPaused(false);
    }
    touchStartY.current = null;
  };

  if (!story) return null;

  const avatar = group.profilePic
    ? absoluteUrl(group.profilePic)
    : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

  const hasMedia = story.mediaUrl && !story.mediaUrl.endsWith("/");

  // ─── Instagram-style transform from origin avatar ───
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  let originTransform = "none";
  let originRadius = "0px";
  if (originRect && vw && vh) {
    const cx = originRect.x + originRect.w / 2;
    const cy = originRect.y + originRect.h / 2;
    const tx = cx - vw / 2;
    const ty = cy - vh / 2;
    const scale = Math.max(originRect.w / vw, originRect.h / vh);
    originTransform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    originRadius = "9999px";
  }

  const isAtOrigin = phase === "opening" || phase === "closing";
  const innerTransform = isAtOrigin && originTransform !== "none"
    ? originTransform
    : `translate3d(0, ${dragY}px, 0)`;
  const innerRadius = isAtOrigin ? originRadius : "0px";
  const innerOpacity = phase === "open" && dragY > 0
    ? Math.max(0.4, 1 - dragY / 600)
    : phase === "opening" ? 0.6 : phase === "closing" ? 0.5 : 1;
  const backdropOpacity = phase === "opening" ? 0 : phase === "closing" ? 0 : 1;
  // Spring-like Apple/Instagram timing curve
  const TRANSITION = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 360ms ease-out";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: `rgba(0,0,0,${backdropOpacity})`,
        transition: "background 380ms cubic-bezier(0.22, 1, 0.36, 1)",
        overscrollBehavior: "contain",
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="relative w-full max-w-lg h-full max-h-[100dvh] bg-black overflow-hidden will-change-transform"
        style={{
          transform: innerTransform,
          borderRadius: innerRadius,
          opacity: innerOpacity,
          transformOrigin: "center center",
          // Always animate transform/radius/opacity; only disable while user is actively dragging
          transition: dragY > 0 ? "none" : TRANSITION,
        }}
      >

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/25 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full"
                style={{
                  width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                  transition: i === idx ? "none" : "width 0.3s",
                }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-3 right-3 z-20 flex items-center gap-2">
          <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/40" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-bold truncate">{group.username}</p>
              {group.isVerified && (
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
                  <path d="M17.7508 9.41667C17.7508 8.1 17.0217 6.95833 15.9608 6.41667C16.0892 6.05417 16.1592 5.6625 16.1592 5.25C16.1592 3.40833 14.7342 1.91833 12.9775 1.91833C12.5858 1.91833 12.2108 1.98833 11.8642 2.12667C11.3492 1.0125 10.2592 0.25 9.00083 0.25C7.7425 0.25 6.65417 1.01417 6.13667 2.125C5.79083 1.9875 5.415 1.91667 5.02333 1.91667C3.265 1.91667 1.84167 3.40833 1.84167 5.25C1.84167 5.66167 1.91083 6.05333 2.03917 6.41667C0.979167 6.95833 0.25 8.09833 0.25 9.41667C0.25 10.6625 0.901667 11.7483 1.86833 12.3217C1.85167 12.4633 1.84167 12.605 1.84167 12.75C1.84167 14.5917 3.265 16.0833 5.02333 16.0833C5.415 16.0833 5.79 16.0117 6.13583 15.875C6.6525 16.9867 7.74083 17.75 9 17.75C10.26 17.75 11.3483 16.9867 11.8642 15.875C12.21 16.0108 12.585 16.0817 12.9775 16.0817C14.7358 16.0817 16.1592 14.59 16.1592 12.7483C16.1592 12.6033 16.1492 12.4617 16.1317 12.3208C17.0967 11.7483 17.7508 10.6625 17.7508 9.4175V9.41667Z" fill="#1D9BF0"/>
                  <path d="M12.2375 6.63833L8.62583 12.055C8.505 12.2358 8.3075 12.3333 8.105 12.3333C7.98583 12.3333 7.865 12.3 7.75833 12.2283L7.6625 12.15L5.65 10.1375C5.40583 9.89333 5.40583 9.4975 5.65 9.25417C5.89417 9.01083 6.29 9.00917 6.53333 9.25417L8.00833 10.7267L11.1958 5.94333C11.3875 5.65583 11.7758 5.58 12.0625 5.77083C12.3508 5.9625 12.4292 6.35083 12.2375 6.6375V6.63833Z" fill="white"/>
                </svg>
              )}
            </div>
            <p className="text-white/50 text-[10px]">{new Date(story.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          {isOwnStory && (
            <button onClick={handleDelete} className="text-white/60 p-2 hover:text-destructive transition-colors"><Trash2 className="w-5 h-5" /></button>
          )}
          <button onClick={requestClose} className="text-white p-2"><X className="w-5 h-5" /></button>
        </div>

        {/* Media */}
        <div className="w-full h-full flex items-center justify-center"
          onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
          {quoted ? (
            <SharedPostCard
              key={story.id}
              post={quoted}
              sticker={story.postSticker}
              onReady={() => setImgLoaded(true)}
            />
          ) : hasMedia ? (
            isVideo ? (
              <video key={story.id} src={absoluteUrl(story.mediaUrl)} className="w-full h-full object-contain" autoPlay muted={false} playsInline
                onLoadedData={() => setImgLoaded(true)} onError={() => setImgLoaded(true)} onEnded={goNext} />
            ) : (
              <img key={story.id} src={absoluteUrl(story.mediaUrl)} alt="" className="w-full h-full object-contain"
                onLoad={() => setImgLoaded(true)} onError={() => setImgLoaded(true)} />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/80 to-accent/80 p-8"
              ref={() => { if (!imgLoaded) setTimeout(() => setImgLoaded(true), 50); }}>
              <p className="text-white text-2xl font-bold text-center">{story.text}</p>
            </div>
          )}
          {!imgLoaded && hasMedia && !quoted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-24 left-4 right-4 z-20">
            <p className="text-white text-sm text-center drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-xl px-4 py-2">{story.caption}</p>
          </div>
        )}

        {/* Bottom actions */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-3">
          {!isOwnStory && (
            <button onClick={handleLike} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-medium active:scale-95 transition-transform">
              <Heart className={`w-5 h-5 transition-all ${liked ? "fill-pink-500 text-pink-500 scale-110" : ""}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
          )}
          {isOwnStory && (
            <button onClick={loadViewers} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-medium active:scale-95 transition-transform">
              <Eye className="w-4 h-4" />
              <span>Görüntüleyenler</span>
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tap areas */}
        <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={goNext} />

        {/* Viewers modal */}
        {showViewers && (
          <div className="absolute inset-0 z-30 flex items-end" onClick={() => { setShowViewers(false); setPaused(false); }}>
            <div className="w-full bg-background rounded-t-3xl max-h-[60vh] overflow-hidden" onClick={e => e.stopPropagation()}
              style={{ animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}>
              <div className="flex items-center justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">
                  Görüntüleyenler {!viewersLoading && `(${viewers.length})`}
                </h3>
                <button onClick={() => { setShowViewers(false); setPaused(false); }} className="text-muted-foreground text-sm font-medium">Kapat</button>
              </div>
              <div className="overflow-y-auto max-h-[50vh]">
                {viewersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : viewers.length === 0 ? (
                  <div className="text-center py-10">
                    <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Henüz görüntüleyen yok</p>
                  </div>
                ) : viewers.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <img src={v.profilePic ? absoluteUrl(v.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                      alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{v.name || v.username}</p>
                      <p className="text-xs text-muted-foreground">@{v.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;



