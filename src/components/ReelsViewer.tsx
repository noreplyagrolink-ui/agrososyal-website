import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX, Loader2, Sprout } from "lucide-react";
import { getReels, likePost, savePost, batchViewPosts } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";
import CommentsModal from "@/components/CommentsModal";
import ShareSheet from "@/components/ShareSheet";
import SmartVideo from "@/components/SmartVideo";

// ════════════════════════════════════════════════════════════════════════
// 🎬 REELS — ayrı sayfa, ayrı endpoint (GET /api/reels), yalnızca video.
//
// Tasarım kararları (isteğe doğrudan karşılık gelir):
//  • "Ayrı endpoint, ayrı sayfa"    → /reels route'u + /api/reels (bkz. server)
//  • "Sadece videolar, metin yok"   → backend zaten yalnızca mediaType='video'
//    döndürüyor; burada da metin-only post render yolu YOK, hiç yazılmadı.
//  • "Kasmasın, normal akış"        → native CSS scroll-snap kullanılıyor
//    (JS ile momentum taklit edilmiyor — bu her zaman takılma hissi verir).
//    Aynı anda en fazla 3 <video> DOM'da tutulur (aktif + komşular), böylece
//    onlarca video birden decode edilmeye çalışılmaz.
//  • "Instagram gibi mantık, farklı UI" → dikey tam ekran + sağda aksiyon
//    sütunu + altta yazar bilgisi mantığı korunuyor (evrensel reel dili),
//    ama ikonografi/renk/şekil bu uygulamanın kimliğine (agro-yeşil, yumuşak
//    "leaf" beğeni animasyonu, cam efektli kontrol paneli) özgü.
// ════════════════════════════════════════════════════════════════════════

interface ReelPost {
  id: string;
  userId?: string;
  name?: string;
  authorUsername?: string;
  profilePic?: string;
  isVerified?: boolean;
  mediaUrl?: string;
  mediaUrls?: any[];
  thumbnail?: string;
  content?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved?: boolean;
  createdAt: string;
}

const GLOBAL_MUTE_KEY = "agro_feed_muted";

function getGlobalMuted(): boolean {
  try {
    const v = localStorage.getItem(GLOBAL_MUTE_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
}

const ReelsPage = () => {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);
  const seenViewsRef = useRef<Set<string>>(new Set());

  // İlk sayfayı yükle
  useEffect(() => {
    document.body.style.overflow = "hidden";
    loadMore(true);
    return () => { document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async (initial = false) => {
    if (fetchingRef.current) return;
    if (!initial && !hasMoreRef.current) return;
    fetchingRef.current = true;
    if (!initial) setLoadingMore(true);
    try {
      const data = await getReels(cursorRef.current, 10);
      const videos: ReelPost[] = data?.videos || [];
      cursorRef.current = data?.nextCursor || null;
      hasMoreRef.current = !!data?.hasMore;
      setReels((prev) => {
        // Aynı video iki kez eklenmesin (cursor sınırında çakışma ihtimaline karşı)
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = videos.filter((v) => !existingIds.has(v.id));
        return [...prev, ...fresh];
      });
    } catch {
      hasMoreRef.current = false;
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
      if (initial) setLoading(false);
    }
  }, []);

  // Kaydırma takibi: hangi slayt aktif + sona yaklaşınca önceden yükle
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIdx && idx >= 0 && idx < reels.length) setActiveIdx(idx);
    // Sondan 3 video kala arka planda bir sonraki sayfayı çek —
    // kullanıcı beklemeden akış devam etsin (kasma hissi olmasın).
    if (idx >= reels.length - 3) loadMore(false);
  };

  // Görüntülenme kaydı: bir reel 1.2sn aktif kalırsa "izlendi" say.
  // Bağımlılık current?.id'ye indirgendi — "reels" her sayfa eklemesinde yeni
  // referans olduğu için "[activeIdx, reels]" gereksiz yere timer'ı sıfırlardı.
  const currentReelId = reels[activeIdx]?.id;
  useEffect(() => {
    if (!currentReelId || seenViewsRef.current.has(currentReelId)) return;
    const t = setTimeout(() => {
      seenViewsRef.current.add(currentReelId);
      batchViewPosts([currentReelId]).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [currentReelId]);

  // Klavye ile gezinme (masaüstü)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = scrollerRef.current;
      if (!el) return;
      if (e.key === "ArrowUp") el.scrollBy({ top: -el.clientHeight, behavior: "smooth" });
      else if (e.key === "ArrowDown") el.scrollBy({ top: el.clientHeight, behavior: "smooth" });
      else if (e.key === "Escape") navigate(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[200] bg-black overscroll-none">
      {/* Üst kontrol şeridi */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Geri"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md">
          <Sprout className="w-3.5 h-3.5 text-primary" strokeWidth={2.4} />
          <span className="text-white text-[13px] font-bold tracking-wide">Reels</span>
        </div>
        <div className="w-9 h-9" aria-hidden />
      </div>

      {loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-white/50 text-sm">Videolar yükleniyor…</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <Sprout className="w-7 h-7 text-primary" />
          </div>
          <p className="text-white font-semibold">Henüz video yok</p>
          <p className="text-white/50 text-sm">Takip ettiklerin veya topluluk video paylaştığında burada görünecek.</p>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain"
          style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" as any, scrollbarWidth: "none" }}
        >
          {reels.map((reel, i) => (
            <div key={reel.id} className="h-full w-full snap-start snap-always">
              {/* Sadece aktif slaytın komşuları (±1) gerçek video elementi render eder;
                  uzaktakiler poster/boş tutulur — çok sayıda eşzamanlı video decode
                  edilmesin diye (performans = kasmama). */}
              <ReelSlide
                reel={reel}
                mount={Math.abs(i - activeIdx) <= 1}
                active={i === activeIdx}
                onOpenProfile={(uid) => uid && navigate(`/user/${uid}`)}
              />
            </div>
          ))}
          {loadingMore && (
            <div className="h-full w-full snap-start flex items-center justify-center bg-black">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Tek bir reel slaytı
// ─────────────────────────────────────────────────────────────────────────
const ReelSlide = ({
  reel, mount, active, onOpenProfile,
}: {
  reel: ReelPost; mount: boolean; active: boolean; onOpenProfile: (userId?: string) => void;
}) => {
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [liked, setLiked] = useState(reel.isLiked);
  const [saved, setSaved] = useState(reel.isSaved || false);
  const [likes, setLikes] = useState(reel.likeCount || 0);
  const [leafBurst, setLeafBurst] = useState(false);
  const [muted, setMuted] = useState(getGlobalMuted());
  const lastTap = useRef(0);

  const mediaUrl = reel.mediaUrl
    ? absoluteUrl(reel.mediaUrl)
    : reel.mediaUrls?.[0]
    ? absoluteUrl(typeof reel.mediaUrls[0] === "string" ? reel.mediaUrls[0] : reel.mediaUrls[0]?.url)
    : "";
  const poster = reel.thumbnail ? absoluteUrl(reel.thumbnail) : undefined;
  const displayName = reel.name || reel.authorUsername || "Kullanıcı";
  const avatar = reel.profilePic ? absoluteUrl(reel.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

  const triggerLeafBurst = () => {
    setLeafBurst(true);
    setTimeout(() => setLeafBurst(false), 750);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) {
        setLiked(true);
        setLikes((l) => l + 1);
        likePost(reel.id).catch(() => {});
      }
      triggerLeafBurst();
    }
    lastTap.current = now;
  };

  const toggleLike = async () => {
    const prevLiked = liked;
    const prevLikes = likes;
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    if (!liked) triggerLeafBurst();
    try { await likePost(reel.id); } catch { setLiked(prevLiked); setLikes(prevLikes); }
  };

  const toggleSave = async () => {
    const prev = saved;
    setSaved(!saved);
    try { await savePost(reel.id); } catch { setSaved(prev); }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(GLOBAL_MUTE_KEY, next ? "1" : "0"); } catch {}
    window.dispatchEvent(new CustomEvent("agro:feed-mute-change", { detail: next }));
  };

  return (
    <div className="relative w-full h-full bg-black">
      <div className="w-full h-full flex items-center justify-center relative" onClick={handleDoubleTap}>
        {mount && mediaUrl ? (
          <SmartVideo
            src={mediaUrl}
            poster={poster}
            forcePlay={active}
            autoPlayInView={false}
            loop
            fit="contain"
            className="w-full h-full"
          />
        ) : poster ? (
          <img src={poster} alt="" className="w-full h-full object-contain opacity-80" />
        ) : (
          <div className="w-full h-full bg-neutral-900" />
        )}

        {/* 🌿 Çift dokunuş beğeni animasyonu — kalp yerine markaya özgü yaprak/filiz motifi */}
        {leafBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <Sprout
              className="w-24 h-24 text-primary drop-shadow-2xl"
              style={{ animation: "reelLeafPulse 0.75s cubic-bezier(0.17,0.67,0.4,1.2) forwards" }}
              strokeWidth={1.6}
              fill="hsl(var(--primary) / 0.35)"
            />
          </div>
        )}
      </div>

      {/* Sağ aksiyon sütunu */}
      <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${liked ? "bg-primary/25" : "bg-white/10"}`}>
            <Heart className={`w-6 h-6 transition-all ${liked ? "fill-primary text-primary scale-110" : "text-white"}`} />
          </div>
          <span className="text-white text-[11px] font-semibold drop-shadow">{likes || ""}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[11px] font-semibold drop-shadow">{reel.commentCount || ""}</span>
        </button>

        <button onClick={toggleSave} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${saved ? "bg-primary/25" : "bg-white/10"}`}>
            <Bookmark className={`w-6 h-6 transition-all ${saved ? "fill-primary text-primary" : "text-white"}`} />
          </div>
        </button>

        <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
        </button>

        <button onClick={toggleMute} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </div>
        </button>
      </div>

      {/* Alt bilgi paneli — yazar + açıklama */}
      <div className="absolute bottom-0 left-0 right-16 z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-20">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={avatar}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover border-2 border-primary/70 cursor-pointer"
            onClick={() => onOpenProfile(reel.userId)}
            onError={(e) => { (e.target as HTMLImageElement).src = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"; }}
          />
          <span className="text-white font-bold text-sm cursor-pointer" onClick={() => onOpenProfile(reel.userId)}>
            {displayName}
          </span>
          {reel.isVerified && (
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
              <path d="M17.7508 9.41667C17.7508 8.1 17.0217 6.95833 15.9608 6.41667C16.0892 6.05417 16.1592 5.6625 16.1592 5.25C16.1592 3.40833 14.7342 1.91833 12.9775 1.91833C12.5858 1.91833 12.2108 1.98833 11.8642 2.12667C11.3492 1.0125 10.2592 0.25 9.00083 0.25C7.7425 0.25 6.65417 1.01417 6.13667 2.125C5.79083 1.9875 5.415 1.91667 5.02333 1.91667C3.265 1.91667 1.84167 3.40833 1.84167 5.25C1.84167 5.66167 1.91083 6.05333 2.03917 6.41667C0.979167 6.95833 0.25 8.09833 0.25 9.41667C0.25 10.6625 0.901667 11.7483 1.86833 12.3217C1.85167 12.4633 1.84167 12.605 1.84167 12.75C1.84167 14.5917 3.265 16.0833 5.02333 16.0833C5.415 16.0833 5.79 16.0117 6.13583 15.875C6.6525 16.9867 7.74083 17.75 9 17.75C10.26 17.75 11.3483 16.9867 11.8642 15.875C12.21 16.0108 12.585 16.0817 12.9775 16.0817C14.7358 16.0817 16.1592 14.59 16.1592 12.7483C16.1592 12.6033 16.1492 12.4617 16.1317 12.3208C17.0967 11.7483 17.7508 10.6625 17.7508 9.4175V9.41667Z" fill="#1D9BF0"/>
              <path d="M12.2375 6.63833L8.62583 12.055C8.505 12.2358 8.3075 12.3333 8.105 12.3333C7.98583 12.3333 7.865 12.3 7.75833 12.2283L7.6625 12.15L5.65 10.1375C5.40583 9.89333 5.40583 9.4975 5.65 9.25417C5.89417 9.01083 6.29 9.00917 6.53333 9.25417L8.00833 10.7267L11.1958 5.94333C11.3875 5.65583 11.7758 5.58 12.0625 5.77083C12.3508 5.9625 12.4292 6.35083 12.2375 6.6375V6.63833Z" fill="white"/>
            </svg>
          )}
        </div>
        {reel.content && (
          <p className="text-white/90 text-sm leading-relaxed line-clamp-2">{reel.content}</p>
        )}
      </div>

      <CommentsModal postId={reel.id} open={showComments} onClose={() => setShowComments(false)} />
      <ShareSheet postId={reel.id} open={showShare} onClose={() => setShowShare(false)} />

      <style>{`
        @keyframes reelLeafPulse {
          0% { opacity: 0; transform: scale(0.3) rotate(-8deg); }
          30% { opacity: 1; transform: scale(1.15) rotate(4deg); }
          55% { transform: scale(0.95) rotate(-2deg); }
          75% { transform: scale(1.05) rotate(1deg); }
          100% { opacity: 0; transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default ReelsPage;

