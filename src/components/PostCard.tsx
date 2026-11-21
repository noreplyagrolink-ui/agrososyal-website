import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, MessageCircleOff, Bookmark, MoreVertical, Share2, BarChart2, MapPin, Tag, X, Repeat2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LikeHeart from "./LikeHeart";
import { likePost, savePost, getStoredUser, getPost, toggleFollow, getToken } from "@/lib/api";
import CommentsModal from "./CommentsModal";
import PostOptionsMenu from "./PostOptionsMenu";
import PostContent from "./PostContent";
import PollCard from "./PollCard";
import ShareSheet from "./ShareSheet";
import SmartVideo from "./SmartVideo";
import EditPostModal from "./EditPostModal";
import PostModal from "./PostModal";
import { useDataSaver } from "@/lib/mediaPrefs";
import { absoluteUrl, inferMediaType } from "@/lib/media";
import { FarmerBadge, getUserBadges } from "./FarmerBadge";
import { InviteBadge } from "./InviteBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { subscribeLiveLikes, emitLiveLike, acceptLiveCount } from "@/lib/liveLikes";

interface PostData {
  id: string;
  userId?: string;
  name?: string;
  username?: string;
  authorUsername?: string;
  profilePic?: string;
  media?: string;
  mediaUrl?: string;
  mediaUrls?: any[];
  content?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved?: boolean;
  createdAt: string;
  mediaType?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  isVerified?: boolean;
  userVerified?: boolean;
  verified?: boolean;
  userType?: string;
  farmerBadgeType?: string;
  hasFarmerBadge?: boolean;
  hasInviteBadge?: boolean;
  shareCount?: number;
  views?: number;
  viewCount?: number; // backward compat alias
  isPoll?: boolean;
  pollQuestion?: string;
  pollOptions?: any[];
  locationName?: string;
  location?: string;
  userPollVote?: number | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  quotedPostId?: string | null;
  quotedPost?: {
    id: string;
    userId?: string;
    name?: string;
    authorUsername?: string;
    username?: string;
    profilePic?: string;
    content?: string;
    mediaUrl?: string;
    media?: string;
    mediaUrls?: any[];
    mediaType?: string;
    isVerified?: boolean;
  } | null;
  quoteCount?: number;
  allowComments?: boolean;
  commentsDisabled?: boolean;
  isFollowing?: boolean;
}

// ─── Verified Badge ───────────────────────────────────────────────────────────
const VerifiedBadge = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 mt-[1px]">
    <path d="M17.7508 9.41667C17.7508 8.1 17.0217 6.95833 15.9608 6.41667C16.0892 6.05417 16.1592 5.6625 16.1592 5.25C16.1592 3.40833 14.7342 1.91833 12.9775 1.91833C12.5858 1.91833 12.2108 1.98833 11.8642 2.12667C11.3492 1.0125 10.2592 0.25 9.00083 0.25C7.7425 0.25 6.65417 1.01417 6.13667 2.125C5.79083 1.9875 5.415 1.91667 5.02333 1.91667C3.265 1.91667 1.84167 3.40833 1.84167 5.25C1.84167 5.66167 1.91083 6.05333 2.03917 6.41667C0.979167 6.95833 0.25 8.09833 0.25 9.41667C0.25 10.6625 0.901667 11.7483 1.86833 12.3217C1.85167 12.4633 1.84167 12.605 1.84167 12.75C1.84167 14.5917 3.265 16.0833 5.02333 16.0833C5.415 16.0833 5.79 16.0117 6.13583 15.875C6.6525 16.9867 7.74083 17.75 9 17.75C10.26 17.75 11.3483 16.9867 11.8642 15.875C12.21 16.0108 12.585 16.0817 12.9775 16.0817C14.7358 16.0817 16.1592 14.59 16.1592 12.7483C16.1592 12.6033 16.1492 12.4617 16.1317 12.3208C17.0967 11.7483 17.7508 10.6625 17.7508 9.4175V9.41667Z" fill="#1D9BF0"/>
    <path d="M12.2375 6.63833L8.62583 12.055C8.505 12.2358 8.3075 12.3333 8.105 12.3333C7.98583 12.3333 7.865 12.3 7.75833 12.2283L7.6625 12.15L5.65 10.1375C5.40583 9.89333 5.40583 9.4975 5.65 9.25417C5.89417 9.01083 6.29 9.00917 6.53333 9.25417L8.00833 10.7267L11.1958 5.94333C11.3875 5.65583 11.7758 5.58 12.0625 5.77083C12.3508 5.9625 12.4292 6.35083 12.2375 6.6375V6.63833Z" fill="white"/>
  </svg>
);

// ─── User Type Badge ──────────────────────────────────────────────────────────
// 🌐 Artık sabit Türkçe etiket yerine t() ile çevrilen bir fonksiyon.
function getUserTypeMeta(userType: string | undefined, t: (key: any) => string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    tarim_ogretmeni:   { label: t("roleAgriTeacher"),     bg: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" },
    tarim_ogrencisi:   { label: t("roleAgriStudent"),     bg: "hsl(var(--accent) / 0.15)",  color: "hsl(var(--accent))"  },
    ogretmen:          { label: t("roleTeacher"),         bg: "hsl(var(--muted))",           color: "hsl(var(--muted-foreground))" },
    ziraat_muhendisi:  { label: t("roleAgriEngineer"),    bg: "hsl(var(--primary) / 0.1)",  color: "hsl(var(--primary))" },
    ciftci_hayvancilik:{ label: t("roleLivestockFarmer"), bg: "hsl(var(--accent) / 0.1)",   color: "hsl(var(--accent))"  },
    ciftci:            { label: t("roleFarmer"),          bg: "hsl(var(--primary) / 0.1)",  color: "hsl(var(--primary))" },
  };
  return userType ? map[userType] : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(".0", "") + "B";
  return n.toString();
}

// Referans tasarımdaki gibi: son 24 saat göreli (3sa), sonrası YYYY-AA-GG
function formatTimeAgo(dateStr: string, t: (key: any) => string, lang: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return t("timeJustNow");
  if (diff < 3600)  return `${Math.floor(diff / 60)}${lang === "tr" ? "dk" : "m"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${lang === "tr" ? "sa" : "h"}`;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Medya oranı: Instagram gibi 4:5 (dikey) ile 1.91:1 (yatay) arasına sıkıştırılır
function clampRatio(r: number): number {
  return Math.min(1.91, Math.max(0.8, r));
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PostCard = ({ post, onDeleted }: { post: PostData; onDeleted?: () => void }) => {
  const navigate   = useNavigate();
  const [liked, setLiked]           = useState(post.isLiked);
  const [saved, setSaved]           = useState(post.isSaved ?? false);
  const [likes, setLikes]           = useState(post.likeCount ?? 0);
  const [quoteCount, setQuoteCount] = useState(post.quoteCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions]   = useState(false);
  const [showShare, setShowShare]       = useState(false);
  const [showEdit, setShowEdit]         = useState(false);
  const [openedQuotedPost, setOpenedQuotedPost] = useState<any>(null);
  const [loadingQuotedPost, setLoadingQuotedPost] = useState(false);
  const [editedContent, setEditedContent]   = useState(post.content);
  const [editedLocation, setEditedLocation] = useState(post.locationName || post.location);
  const [heartAnim, setHeartAnim]   = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [natRatio, setNatRatio] = useState<number | null>(null);
  const [loadedImgs, setLoadedImgs] = useState<Record<number, boolean>>({});
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(post.isFollowing ?? false);
  const [followRequested, setFollowRequested] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [dataSaver]                 = useDataSaver();
  const { t, lang } = useLanguage();
  const currentUser                 = getStoredUser();
  const articleRef                  = useRef<HTMLElement>(null);
  const likeBusy                    = useRef(false);

  // 🏷️ Etiketlenen kişiler
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  // ⚡ Hız: etiketler artık her kart mount olur olmaz değil, kart ekrana
  // yaklaşınca (1 kez) çekilir → feed açılışında onlarca istek birden gitmez.
  useEffect(() => {
    let cancelled = false;
    const fetchTags = async () => {
      try {
        const token = getToken();
        const res = await fetch(`https://sehitumitkestitarimmtal.com/api/posts/${post.id}/tags`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTaggedUsers(data.tags || []);
        }
      } catch {}
    };
    const el = articleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { fetchTags(); return () => { cancelled = true; }; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { obs.disconnect(); fetchTags(); }
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => { cancelled = true; obs.disconnect(); };
  }, [post.id]);

  // 🔴 Canlı beğeni: başka kullanıcılar bu postu beğenince sayı anında güncellenir
  useEffect(() => {
    return subscribeLiveLikes(post.id, (count) => {
      if (likeBusy.current) return; // kendi isteğimiz sürerken titremesin
      setLikes((prev) => acceptLiveCount(prev, count));
    });
  }, [post.id]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleLike = async () => {
    if (likeBusy.current) return; // sunucu "toggle" yaptığı için hızlı çift dokunuşu engelle
    likeBusy.current = true;
    const prevLiked = liked;
    const prevLikes = likes;
    // Benim beğenim hariç taban sayı
    const base = prevLiked ? Math.max(prevLikes - 1, 0) : prevLikes;
    const newLiked = !prevLiked;
    setLiked(newLiked);
    setLikes(base + (newLiked ? 1 : 0));
    try {
      const data = await likePost(post.id);
      // Başarılı yanıt her zaman boolean "liked" içerir; yoksa (hata/limit) geri al
      if (typeof data?.liked !== "boolean") throw new Error("like failed");
      const finalCount = base + (data.liked ? 1 : 0);
      setLiked(data.liked);
      setLikes(finalCount);
      emitLiveLike(post.id, finalCount); // diğer kullanıcılara anlık yayınla
    } catch {
      setLiked(prevLiked);
      setLikes(prevLikes);
    } finally {
      likeBusy.current = false;
    }
  };

  const toggleSave = async () => {
    setSaved(s => !s);
    try { await savePost(post.id); } catch { setSaved(s => !s); }
  };

  const toggleFollowUser = async () => {
    if (!post.userId || followLoading) return;
    const prevFollowing = isFollowing;
    const prevRequested = followRequested;
    setFollowLoading(true);
    setIsFollowing(!prevFollowing);
    setFollowRequested(false);
    try {
      const data = await toggleFollow(post.userId);
      setIsFollowing(!!data?.following);
      setFollowRequested(!!data?.requested);
    } catch {
      setIsFollowing(prevFollowing);
      setFollowRequested(prevRequested);
    } finally {
      setFollowLoading(false);
    }
  };

  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDoubleTap = () => {
    try { navigator.vibrate?.(12); } catch {}
    if (!liked) toggleLike();
    // Android'deki gibi: her çift dokunuşta (beğenilmiş olsa da) büyük kalp patlar
    setHeartAnim(false);
    requestAnimationFrame(() => {
      setHeartAnim(true);
      if (heartTimer.current) clearTimeout(heartTimer.current);
      heartTimer.current = setTimeout(() => setHeartAnim(false), 750);
    });
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayName = post.name || post.authorUsername || post.username || "user";
  const handle      = post.authorUsername || post.username || "user";
  const avatar      = post.profilePic
    ? absoluteUrl(post.profilePic)
    : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

  const rawUrls = post.mediaUrls
    ? post.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean).map(absoluteUrl)
    : (post.mediaUrl || post.media)
      ? [absoluteUrl(post.mediaUrl || post.media || "")]
      : [];

  const declaredType   = post.mediaType ?? (post.mediaUrls?.[0] && typeof post.mediaUrls[0] === "object" ? post.mediaUrls[0].type : undefined);
  const firstMediaType = inferMediaType(rawUrls[0], declaredType);
  const mw             = post.mediaWidth  || (post.mediaUrls?.[0] as any)?.width  || 0;
  const mh             = post.mediaHeight || (post.mediaUrls?.[0] as any)?.height || 0;
  const ratio          = mw > 0 && mh > 0 ? mw / mh : null;

  // Oran HER ZAMAN sabit bir kutu olarak verilir (layout kayması / yan kayma yok).
  // Sunucu boyut vermiyorsa ilk medya yüklenince gerçek oran okunur; o ana kadar 4:5.
  const effRatio = ratio ?? natRatio ?? 0.8;
  const mediaStyle: React.CSSProperties = { aspectRatio: String(clampRatio(effRatio)) };
  const hasMedia = rawUrls.length > 0 && firstMediaType !== "text";

  const isOwner        = currentUser?.id === post.userId;
  const isVerified     = post.isVerified || post.userVerified || post.verified;
  const locationName   = editedLocation || post.locationName || post.location;
  const displayContent = editedContent ?? post.content;
  const userTypeMeta   = getUserTypeMeta(post.userType, t);
  const farmerBadges   = getUserBadges(post);
  const commentsAllowed = !(post.commentsDisabled || post.allowComments === false);
  const viewTotal      = post.views ?? post.viewCount ?? 0;

  return (
    <>
      <article
        ref={articleRef}
        className="bg-background pt-2.5 pb-1 w-full max-w-full min-w-0 overflow-hidden lg:border lg:border-border lg:rounded-2xl lg:mb-4"
      >
        {/* ── Üst şerit: büyük avatar + isim + @kullanıcı · tarih + ayarlar ── */}
        <div className="flex items-center gap-2.5 px-3 pb-2.5">
          <button
            onClick={() => post.userId && navigate(`/user/${post.userId}`)}
            className="flex-shrink-0 focus:outline-none"
            aria-label={`${displayName} profiline git`}
          >
            <div className="relative">
              <img
                src={avatar}
                alt={displayName}
                className={`w-9 h-9 rounded-full object-cover bg-muted ring-1 ring-border transition-opacity duration-300 ${
                  avatarLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setAvatarLoaded(true)}
                onError={() => setAvatarLoaded(true)}
              />
              {!avatarLoaded && (
                <div className="absolute inset-0 w-9 h-9 rounded-full bg-muted animate-pulse" />
              )}
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
              <button
                onClick={() => post.userId && navigate(`/user/${post.userId}`)}
                className="text-[14px] font-bold text-foreground leading-5 hover:underline truncate min-w-0 focus:outline-none"
              >
                {displayName}
              </button>
              {isVerified && <VerifiedBadge />}
              {userTypeMeta && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0 whitespace-nowrap hidden sm:inline-block"
                  style={{ background: userTypeMeta.bg, color: userTypeMeta.color }}
                >
                  {userTypeMeta.label}
                </span>
              )}
              {farmerBadges.map((b) => (
                <span key={b} className="flex-shrink-0 hidden sm:inline-flex">
                  <FarmerBadge type={b} size="sm" />
                </span>
              ))}
              {post.hasInviteBadge && (
                <span className="flex-shrink-0">
                  <InviteBadge size="sm" showLabel={false} />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[12px] text-handle truncate min-w-0">@{handle}</span>
              <span className="text-muted-foreground/50 text-[11px] flex-shrink-0">·</span>
              <span className="text-[12px] text-muted-foreground flex-shrink-0">{formatTimeAgo(post.createdAt, t, lang)}</span>
              {locationName && (
                <>
                  <span className="text-muted-foreground/50 text-[11px] flex-shrink-0 hidden sm:inline">·</span>
                  <span className="hidden sm:flex items-center gap-0.5 text-[12px] text-primary/80 min-w-0 flex-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{locationName}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {!isOwner && post.userId && (
            <button
              onClick={toggleFollowUser}
              disabled={followLoading}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-60 ${
                isFollowing || followRequested
                  ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {followRequested ? t("postFollowRequested") : isFollowing ? t("postUnfollow") : t("postFollow")}
            </button>
          )}

          <button
            onClick={() => setShowOptions(true)}
            className="flex-shrink-0 p-1 -mr-1 rounded-full text-foreground/80 hover:bg-muted/60 transition-colors"
            aria-label={t("postOptions")}
          >
            <MoreVertical className="w-[18px] h-[18px]" />
          </button>
        </div>

                {hasMedia ? (
          <>
            {/* ── Medya: neredeyse tam genişlik, büyük yuvarlak köşe ────────── */}
        {rawUrls.length > 0 && firstMediaType !== "text" && (
          <div
            className="relative w-full overflow-hidden bg-muted"
            style={mediaStyle}
            onDoubleClick={firstMediaType === "video" ? undefined : handleDoubleTap}
          >
            {firstMediaType === "video" ? (
              <div className="absolute inset-0">
              <SmartVideo
                src={rawUrls[0]}
                poster={
                  post.thumbnail    ? absoluteUrl(post.thumbnail) :
                  post.thumbnailUrl ? absoluteUrl(post.thumbnailUrl) :
                  undefined
                }
                className="w-full h-full"
                fill
                fit="cover"
                onDoubleTap={handleDoubleTap}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (ratio === null && v.videoWidth && v.videoHeight) setNatRatio(v.videoWidth / v.videoHeight);
                }}
              />
              </div>
            ) : (
              <>
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ touchAction: "pan-y" }}
                  onTouchStart={(e) => {
                    const tt = e.touches[0];
                    (e.currentTarget as any)._touchStartX = tt.clientX;
                    (e.currentTarget as any)._touchStartY = tt.clientY;
                  }}
                  onTouchEnd={(e) => {
                    const startX = (e.currentTarget as any)._touchStartX ?? 0;
                    const startY = (e.currentTarget as any)._touchStartY ?? 0;
                    const dx = e.changedTouches[0].clientX - startX;
                    const dy = e.changedTouches[0].clientY - startY;
                    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                      if (dx < 0 && carouselIdx < rawUrls.length - 1) setCarouselIdx(i => i + 1);
                      if (dx > 0 && carouselIdx > 0) setCarouselIdx(i => i - 1);
                    }
                  }}
                >
                  <div
                    className="flex h-full transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
                  >
                    {rawUrls.map((url, i) => (
                      <div key={i} className="relative w-full h-full flex-shrink-0">
                        {!loadedImgs[i] && (
                          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted-foreground/10 to-muted" />
                        )}
                        <img
                          src={url}
                          alt=""
                          loading={dataSaver || i > 0 ? "lazy" : "eager"}
                          decoding="async"
                          className={`w-full h-full bg-muted object-cover transition-opacity duration-300 ${
                            loadedImgs[i] ? "opacity-100" : "opacity-0"
                          }`}
                          onLoad={(e) => {
                            setLoadedImgs(prev => ({ ...prev, [i]: true }));
                            const im = e.currentTarget;
                            if (i === 0 && ratio === null && im.naturalWidth && im.naturalHeight) setNatRatio(im.naturalWidth / im.naturalHeight);
                          }}
                          onError={(e) => {
                            setLoadedImgs(prev => ({ ...prev, [i]: true }));
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {rawUrls.length > 1 && (
                  <>
                    {carouselIdx > 0 && (
                      <button
                        onClick={() => setCarouselIdx(i => i - 1)}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground shadow-md"
                        aria-label={t("postPrevious")}
                      >‹</button>
                    )}
                    {carouselIdx < rawUrls.length - 1 && (
                      <button
                        onClick={() => setCarouselIdx(i => i + 1)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground shadow-md"
                        aria-label={t("postNext")}
                      >›</button>
                    )}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {rawUrls.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-200 ${i === carouselIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                        />
                      ))}
                    </div>
                  </>
                )}

              </>
            )}

            {/* ❤️ Çift dokunuş kalbi (foto + video) — yaylanarak büyür, solar */}
            {heartAnim && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <Heart
                  className="w-20 h-20 text-white fill-white"
                  style={{
                    animation: "likePop 750ms cubic-bezier(.2,.9,.3,1.2) forwards",
                    filter: "drop-shadow(0 6px 18px rgba(255,48,64,.55))",
                  }}
                />
              </div>
            )}

            {/* 🏷️ Etiketlenen kişiler — sol alt köşe */}
            {taggedUsers.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowTagModal(true); }}
                className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm"
              >
                <Tag className="w-3 h-3 text-white" />
                <div className="flex -space-x-1.5">
                  {taggedUsers.slice(0, 3).map((u: any) => (
                    <img
                      key={u.id}
                      src={u.profilePic || "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                      alt={u.username}
                      className="w-5 h-5 rounded-full border border-white/40 object-cover"
                    />
                  ))}
                </div>
                {taggedUsers.length > 3 && (
                  <span className="text-[10px] text-white font-bold">+{taggedUsers.length - 3}</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Aksiyon çubuğu: Instagram gibi çerçevesiz, küçük ikonlar ── */}
        <div className="flex items-center px-2.5 pt-2 gap-0.5">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1 h-8 pl-0.5 pr-2 flex-shrink-0 rounded-full transition-transform active:scale-[0.88] ${
              liked ? "text-rose-500" : "text-foreground/85"
            }`}
            aria-label={t("postLike")}
            aria-pressed={liked}
          >
            <LikeHeart liked={liked} size={22} />
            <span key={likes} className="text-[13px] font-semibold tabular-nums animate-count-pop">{formatCount(likes)}</span>
          </button>

          <button
            onClick={() => commentsAllowed && setShowComments(true)}
            disabled={!commentsAllowed}
            className={`flex items-center gap-1 h-8 px-2 flex-shrink-0 rounded-full text-foreground/85 active:scale-90 transition-transform ${commentsAllowed ? "" : "opacity-40"}`}
            aria-label={commentsAllowed ? t("postComments") : t("postCommentsDisabled")}
            title={commentsAllowed ? undefined : t("postCommentsDisabledFull")}
          >
            {commentsAllowed ? <MessageCircle className="w-[21px] h-[21px]" strokeWidth={1.8} /> : <MessageCircleOff className="w-[21px] h-[21px]" strokeWidth={1.8} />}
            {commentsAllowed && <span className="text-[13px] font-semibold tabular-nums">{formatCount(post.commentCount ?? 0)}</span>}
          </button>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 h-8 px-2 flex-shrink-0 rounded-full text-foreground/85 active:scale-90 transition-transform"
            aria-label={t("postShare")}
          >
            <Repeat2 className="w-[21px] h-[21px]" strokeWidth={1.8} />
            {quoteCount > 0 && <span className="text-[13px] font-semibold tabular-nums">{formatCount(quoteCount)}</span>}
          </button>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center h-8 px-2 flex-shrink-0 rounded-full text-foreground/85 active:scale-90 transition-transform"
            aria-label={t("postShare")}
          >
            <Share2 className="w-[20px] h-[20px]" strokeWidth={1.8} />
          </button>

          <div className="flex-1 min-w-0" />

          {viewTotal > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground tabular-nums flex-shrink-0 mr-1">
              <BarChart2 className="w-[14px] h-[14px]" />{formatCount(viewTotal)}
            </span>
          )}

          <button
            onClick={toggleSave}
            className={`flex items-center h-8 px-1.5 flex-shrink-0 rounded-full active:scale-90 transition-transform ${saved ? "text-primary" : "text-foreground/85"}`}
            aria-label={saved ? t("postSaved") : t("postSave")}
          >
            <Bookmark className={`w-[21px] h-[21px] ${saved ? "fill-primary" : ""}`} strokeWidth={1.8} />
          </button>
        </div>
{/* ── Metin içeriği ─────────────────────────────────────────────── */}
        {displayContent && (
          <div className="px-3 pt-1.5 pb-1 break-words [overflow-wrap:anywhere]">
            <PostContent content={displayContent} authorUsername="" maxLength={280} />
          </div>
        )}

        {/* ── Alıntılanan gönderi önizlemesi ─────────────────────────────── */}
        {post.quotedPostId && (
          <div className="px-3 pt-1.5 pb-1">
            {post.quotedPost ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (loadingQuotedPost || !post.quotedPost) return;
                  setLoadingQuotedPost(true);
                  try {
                    const r = await getPost(post.quotedPost.id);
                    const full = r.post || r;
                    if (full && !full.error) setOpenedQuotedPost(full);
                  } catch {}
                  setLoadingQuotedPost(false);
                }}
                className="relative w-full text-left border border-border rounded-3xl overflow-hidden hover:bg-secondary/30 transition-colors disabled:opacity-60"
                disabled={loadingQuotedPost}
              >
                {loadingQuotedPost && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                <div className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={post.quotedPost.profilePic ? absoluteUrl(post.quotedPost.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover bg-muted flex-shrink-0"
                    />
                    <span className="text-[13px] font-bold text-foreground truncate">
                      {post.quotedPost.name || post.quotedPost.authorUsername || post.quotedPost.username}
                    </span>
                    {post.quotedPost.isVerified && <VerifiedBadge />}
                    <span className="text-[12px] text-handle truncate">
                      @{post.quotedPost.authorUsername || post.quotedPost.username}
                    </span>
                  </div>
                  {post.quotedPost.content && (
                    <p className="text-[13px] text-foreground/90 leading-5 line-clamp-3 whitespace-pre-wrap">
                      {post.quotedPost.content}
                    </p>
                  )}
                  {(post.quotedPost.mediaUrls?.[0]?.url || post.quotedPost.mediaUrl || post.quotedPost.media) && post.quotedPost.mediaType !== "video" && (
                    <img
                      src={absoluteUrl(post.quotedPost.mediaUrls?.[0]?.url || post.quotedPost.mediaUrl || post.quotedPost.media || "")}
                      alt=""
                      loading="lazy"
                      className="mt-2 w-full max-h-52 object-cover rounded-2xl bg-muted"
                    />
                  )}
                </div>
              </button>
            ) : (
              <div className="border border-border rounded-3xl p-3.5 text-[13px] text-muted-foreground">
                Bu gönderi kaldırılmış
              </div>
            )}
          </div>
        )}

        {post.isPoll && post.pollQuestion && post.pollOptions && (
          <div className="px-3 pt-1.5 pb-1">
            <PollCard
              postId={post.id}
              question={post.pollQuestion}
              options={post.pollOptions}
              userVoted={post.userPollVote}
            />
          </div>
        )}

                  </>
        ) : (
          <>
            {/* ── Metin içeriği ─────────────────────────────────────────────── */}
        {displayContent && (
          <div className="px-3 pt-1.5 pb-1 break-words [overflow-wrap:anywhere]">
            <PostContent content={displayContent} authorUsername="" maxLength={280} />
          </div>
        )}

        {/* ── Alıntılanan gönderi önizlemesi ─────────────────────────────── */}
        {post.quotedPostId && (
          <div className="px-3 pt-1.5 pb-1">
            {post.quotedPost ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (loadingQuotedPost || !post.quotedPost) return;
                  setLoadingQuotedPost(true);
                  try {
                    const r = await getPost(post.quotedPost.id);
                    const full = r.post || r;
                    if (full && !full.error) setOpenedQuotedPost(full);
                  } catch {}
                  setLoadingQuotedPost(false);
                }}
                className="relative w-full text-left border border-border rounded-3xl overflow-hidden hover:bg-secondary/30 transition-colors disabled:opacity-60"
                disabled={loadingQuotedPost}
              >
                {loadingQuotedPost && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                <div className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={post.quotedPost.profilePic ? absoluteUrl(post.quotedPost.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover bg-muted flex-shrink-0"
                    />
                    <span className="text-[13px] font-bold text-foreground truncate">
                      {post.quotedPost.name || post.quotedPost.authorUsername || post.quotedPost.username}
                    </span>
                    {post.quotedPost.isVerified && <VerifiedBadge />}
                    <span className="text-[12px] text-handle truncate">
                      @{post.quotedPost.authorUsername || post.quotedPost.username}
                    </span>
                  </div>
                  {post.quotedPost.content && (
                    <p className="text-[13px] text-foreground/90 leading-5 line-clamp-3 whitespace-pre-wrap">
                      {post.quotedPost.content}
                    </p>
                  )}
                  {(post.quotedPost.mediaUrls?.[0]?.url || post.quotedPost.mediaUrl || post.quotedPost.media) && post.quotedPost.mediaType !== "video" && (
                    <img
                      src={absoluteUrl(post.quotedPost.mediaUrls?.[0]?.url || post.quotedPost.mediaUrl || post.quotedPost.media || "")}
                      alt=""
                      loading="lazy"
                      className="mt-2 w-full max-h-52 object-cover rounded-2xl bg-muted"
                    />
                  )}
                </div>
              </button>
            ) : (
              <div className="border border-border rounded-3xl p-3.5 text-[13px] text-muted-foreground">
                Bu gönderi kaldırılmış
              </div>
            )}
          </div>
        )}

        {post.isPoll && post.pollQuestion && post.pollOptions && (
          <div className="px-3 pt-1.5 pb-1">
            <PollCard
              postId={post.id}
              question={post.pollQuestion}
              options={post.pollOptions}
              userVoted={post.userPollVote}
            />
          </div>
        )}

        {/* ── Aksiyon çubuğu: Instagram gibi çerçevesiz, küçük ikonlar ── */}
        <div className="flex items-center px-2.5 pt-2 gap-0.5">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1 h-8 pl-0.5 pr-2 flex-shrink-0 rounded-full transition-transform active:scale-[0.88] ${
              liked ? "text-rose-500" : "text-foreground/85"
            }`}
            aria-label={t("postLike")}
            aria-pressed={liked}
          >
            <LikeHeart liked={liked} size={22} />
            <span key={likes} className="text-[13px] font-semibold tabular-nums animate-count-pop">{formatCount(likes)}</span>
          </button>

          <button
            onClick={() => commentsAllowed && setShowComments(true)}
            disabled={!commentsAllowed}
            className={`flex items-center gap-1 h-8 px-2 flex-shrink-0 rounded-full text-foreground/85 active:scale-90 transition-transform ${commentsAllowed ? "" : "opacity-40"}`}
            aria-label={commentsAllowed ? t("postComments") : t("postCommentsDisabled")}
            title={commentsAllowed ? undefined : t("postCommentsDisabledFull")}
          >
            {commentsAllowed ? <MessageCircle className="w-[21px] h-[21px]" strokeWidth={1.8} /> : <MessageCircleOff className="w-[21px] h-[21px]" strokeWidth={1.8} />}
            {commentsAllowed && <span className="text-[13px] font-semibold tabular-nums">{formatCount(post.commentCount ?? 0)}</span>}
          </button>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 h-8 px-2 flex-shrink-0 rounded-full text-foreground/85 active:scale-90 transition-transform"
            aria-label={t("postShare")}
          >
            <Repeat2 className="w-[21px] h-[21px]" strokeWidth={1.8} />
            {quoteCount > 0 && <span className="text-[13px] font-semibold tabular-nums">{formatCount(quoteCount)}</span>}
          </button>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center h-8 px-2 flex-shrink-0 rounded-full text-foreground/85 active:scale-90 transition-transform"
            aria-label={t("postShare")}
          >
            <Share2 className="w-[20px] h-[20px]" strokeWidth={1.8} />
          </button>

          <div className="flex-1 min-w-0" />

          {viewTotal > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground tabular-nums flex-shrink-0 mr-1">
              <BarChart2 className="w-[14px] h-[14px]" />{formatCount(viewTotal)}
            </span>
          )}

          <button
            onClick={toggleSave}
            className={`flex items-center h-8 px-1.5 flex-shrink-0 rounded-full active:scale-90 transition-transform ${saved ? "text-primary" : "text-foreground/85"}`}
            aria-label={saved ? t("postSaved") : t("postSave")}
          >
            <Bookmark className={`w-[21px] h-[21px] ${saved ? "fill-primary" : ""}`} strokeWidth={1.8} />
          </button>
        </div>
          </>
        )}

        {/* Gönderiler arası ince ayraç (tam genişlik) */}
        <div className="mt-2.5 h-px bg-border/70 lg:hidden" />
      </article>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <CommentsModal postId={post.id} open={showComments} onClose={() => setShowComments(false)} />
      <PostOptionsMenu
        postId={post.id}
        isOwner={isOwner}
        authorId={post.userId}
        open={showOptions}
        onClose={() => setShowOptions(false)}
        onDeleted={onDeleted}
        onEdit={() => setShowEdit(true)}
      />
      <ShareSheet
        postId={post.id}
        open={showShare}
        onClose={() => setShowShare(false)}
        onQuoted={() => setQuoteCount((c) => c + 1)}
      />

      {openedQuotedPost && (
        <PostModal post={openedQuotedPost} onClose={() => setOpenedQuotedPost(null)} />
      )}
      <EditPostModal
        post={{ id: post.id, content: editedContent, locationName: editedLocation }}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={(u) => { setEditedContent(u.content); setEditedLocation(u.locationName); }}
      />

      {/* 🏷️ Etiketlenen kişiler modalı */}
      {showTagModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center"
          onClick={() => setShowTagModal(false)}
        >
          <div
            className="bg-background w-full max-w-lg rounded-t-3xl pb-6 shadow-2xl"
            style={{ animation: "slideUp 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-border my-3" />
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" /> {t("postTaggedPeople")}
              </h3>
              <button onClick={() => setShowTagModal(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {taggedUsers.map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => { setShowTagModal(false); window.location.href = `/user/${u.id}`; }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  <img
                    src={u.profilePic || "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                    alt={u.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{u.name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Reusable action button ───────────────────────────────────────────────────
type HoverColor = "blue" | "pink" | "green";

const COLOR_MAP: Record<HoverColor, { hover: string; active: string }> = {
  blue:  { hover: "hover:text-blue-500 hover:bg-blue-500/10",  active: "text-blue-500" },
  pink:  { hover: "hover:text-pink-500 hover:bg-pink-500/10",  active: "text-pink-500" },
  green: { hover: "hover:text-green-500 hover:bg-green-500/10",active: "text-green-500" },
};

const ActionBtn = ({
  onClick, icon, count, hoverColor, active = false, activeColor, aria,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  count?: number;
  hoverColor: HoverColor;
  active?: boolean;
  activeColor?: HoverColor;
  aria?: string;
}) => {
  const colors = COLOR_MAP[hoverColor];
  const textClass = active && activeColor ? COLOR_MAP[activeColor].active : "text-muted-foreground";

  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors active:scale-90 ${textClass} ${colors.hover}`}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <span className="text-[13px] tabular-nums leading-none">{formatCount(count)}</span>
      )}
    </button>
  );
};

export default PostCard;






