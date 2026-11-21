import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft, Loader2, Send, Globe, MapPin, Bell, Lock, Ban,
  MoreHorizontal, UserPlus2, Share2, UserMinus, Flag, Copy, Check,
  QrCode, X as XIcon, UserCheck, ZoomIn, ZoomOut,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import VerifiedBadgeModal from "@/components/VerifiedBadgeModal";
import BlurImage from "@/components/BlurImage";
import StoryViewer from "@/components/StoryViewer";
import BanModal from "@/components/BanModal";
import MutualFollowers from "@/components/MutualFollowers";
import PostCard from "@/components/PostCard";
import AuthPromptModal from "@/components/AuthPromptModal";
import ContactCardSheet from "@/components/ContactCardSheet";
import { useCallContext } from "@/contexts/CallContext";
import { getUserProfile, getUserPosts, toggleFollow, getStoredUser, blockUser, getToken } from "@/lib/api";
import { FarmerBadge, getUserBadges } from "@/components/FarmerBadge";
import { InviteBadge } from "@/components/InviteBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileSkeleton from "@/components/ProfileSkeleton";
import { FeedSkeleton } from "@/components/PostSkeleton";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

// ─── Tam ekran resim görüntüleyici (pinch-to-zoom destekli) ───────────────────
interface FullScreenImageViewerProps {
  src: string;
  onClose: () => void;
}

const FullScreenImageViewer = ({ src, onClose }: FullScreenImageViewerProps) => {
  const { t } = useLanguage();
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastDistRef = useRef<number | null>(null);
  const lastOffsetRef = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistRef.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastOffsetRef.current = offset;
      isDraggingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastDistRef.current;
      setScale(prev => clamp(prev * delta, 1, 5));
      lastDistRef.current = dist;
    } else if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      if (scale > 1) {
        setOffset({
          x: lastOffsetRef.current.x + dx,
          y: lastOffsetRef.current.y + dy,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    lastDistRef.current = null;
    isDraggingRef.current = false;
    if (scale <= 1) setOffset({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] bg-black flex items-center justify-center"
      style={{ touchAction: "none" }}
    >
      {/* Kapat */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
      >
        <XIcon className="w-5 h-5 text-white" />
      </button>

      {/* Zoom göstergesi */}
      <div className="absolute top-4 left-4 z-10 bg-white/15 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5">
        <ZoomIn className="w-3.5 h-3.5 text-white" />
        <span className="text-white text-xs font-bold">{scale.toFixed(1)}x</span>
      </div>

      {/* Zoom butonları */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        <button
          onClick={() => { setScale(s => clamp(s - 0.5, 1, 5)); if (scale <= 1.5) setOffset({ x: 0, y: 0 }); }}
          className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
        >
          <ZoomOut className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
          className="px-4 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform text-white text-sm font-semibold"
        >
          Sıfırla
        </button>
        <button
          onClick={() => setScale(s => clamp(s + 0.5, 1, 5))}
          className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
        >
          <ZoomIn className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Resim */}
      <img
        src={src}
        alt={t("upEnlargeProfilePic")}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          transition: isDraggingRef.current ? "none" : "transform 0.2s ease",
          maxWidth: "100vw",
          maxHeight: "100vh",
          objectFit: "contain",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        draggable={false}
      />

      {/* Kaydır ipucu */}
      {scale === 1 && (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-xs">
          Yakınlaştırmak için çift dokun veya kaydır
        </p>
      )}
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "tagged">("posts");
  const [isPrivateLocked, setIsPrivateLocked] = useState(false);

  const [stories, setStories] = useState<any[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [bannedProfile, setBannedProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showContactCard, setShowContactCard] = useState(false);
  const { startCall } = useCallContext();
  const [linkCopied, setLinkCopied] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [taggedPostsList, setTaggedPostsList] = useState<any[]>([]);
  const [taggedLoading, setTaggedLoading] = useState(false);

  // ── Tam ekran avatar görüntüleyici ──
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [avatarViewerSrc, setAvatarViewerSrc] = useState("");
  const [showQR, setShowQR] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const banTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUser = getStoredUser();

  const openAvatarViewer = (src: string) => {
    setAvatarViewerSrc(src);
    setShowAvatarViewer(true);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // ── Oturum açılmamış kullanıcılar da profil görebilsin ──
        // getUserProfile hata fırlatırsa direkt fetch ile deneyelim
        let data: any = null;
        try {
          data = await getUserProfile(id);
        } catch {
          // api.ts yönlendirme yapıyorsa direkt fetch ile deneyelim
          try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/users/${id}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) data = await res.json();
          } catch {}
        }

        if (!data) { setLoading(false); return; }

        const u = data.user || data;
        setUser(u);
        setFollowing(u.isFollowing || u._followed || false);

        const me = getStoredUser();
        const isOwn = me?.id && u?.id && me.id === u.id;
        const banned = !!(data.bannedProfile || u.isBanned || u.banned || u.isSuspended);
        setBannedProfile(banned);

        if (banned && isOwn) {
          banTimerRef.current = setTimeout(() => setShowBanModal(true), 3000);
        }

        // ── Gönderileri çek ──
        try {
          let p: any = null;
          try {
            p = await getUserPosts(u.id || id, 1);
          } catch {
            const token = getToken();
            const res = await fetch(`${API_BASE}/posts/user/${u.id || id}?page=1`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) p = await res.json();
          }
          if (p) {
            const newPosts = p.posts || [];
            setPosts(newPosts);
            setIsPrivateLocked(!!p.isPrivate);
            // Limit yok — sayfa dolu olduğu sürece daha fazlası olabilir
            setHasMore(!p.isPrivate && newPosts.length > 0);
            setPage(1);
          }
        } catch {}

        // ── Story'leri çek ──
        try {
          const token = getToken();
          const stRes = await fetch(`${API_BASE}/stories`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (stRes.ok) {
            const stData = await stRes.json();
            const allGroups = stData.stories || [];
            const userGroup = allGroups.find((g: any) => g.userId === (u.id || id));
            if (userGroup) setStories(userGroup.stories || []);
          }
        } catch {}
      } catch {}
      setLoading(false);
    })();
    return () => { if (banTimerRef.current) clearTimeout(banTimerRef.current); };
  }, [id]);

  // ── Sonsuz kaydırma — limitsize ──
  const loadMorePosts = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !user) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const next = pageRef.current + 1;
    try {
      let p: any = null;
      try {
        p = await getUserPosts(user.id || id!, next);
      } catch {
        const token = getToken();
        const res = await fetch(`${API_BASE}/posts/user/${user.id || id}?page=${next}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) p = await res.json();
      }
      if (p) {
        const newPosts = p.posts || [];
        if (newPosts.length === 0) {
          hasMoreRef.current = false;
          setHasMore(false);
        } else {
          setPosts(prev => {
            const ids = new Set(prev.map((x: any) => x.id));
            const filtered = newPosts.filter((np: any) => np?.id && !ids.has(np.id));
            return [...prev, ...filtered];
          });
          pageRef.current = next;
          setPage(next);
          // Sonraki sayfa olup olmadığını kontrol et
          const more = newPosts.length > 0;
          hasMoreRef.current = more;
          setHasMore(more);
        }
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (err) {
      console.error("[UserProfilePage] loadMorePosts hatası:", err);
      hasMoreRef.current = false;
      setHasMore(false);
    }
  }, [user, id]);

  // Ref'ler: observer'ı SADECE bir kez kurup en güncel değerleri buradan okuyoruz
  // (her state değişiminde disconnect/reconnect etmek bazı tarayıcılarda
  //  intersection callback'inin kaçırılmasına yol açıyordu → "aşağı insem de
  //  yeni post gelmiyor" hatası).
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const loadMorePostsRef = useRef(loadMorePosts);
  useEffect(() => { loadMorePostsRef.current = loadMorePosts; }, [loadMorePosts]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          loadMorePostsRef.current();
        }
      },
      { threshold: 0, rootMargin: "0px 0px 600px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Güvenlik ağı: içerik viewport'u doldurmuyorsa (kısa liste) sentinel hep
  // görünür kalabilir ama tekrar tetiklenmeyebilir — state değişince tekrar dene.
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight + 600 && rect.bottom > 0;
    if (isVisible) loadMorePosts();
  }, [hasMore, loadingMore, posts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 📱 Mobil uygulama (WebView) yedeği — bazı WebView motorlarında IntersectionObserver
  // güvenilir tetiklenmiyor. Klasik scroll/touchmove event'i ile bağımsız kontrol.
  useEffect(() => {
    const checkScrollBottom = () => {
      if (!hasMoreRef.current || loadingMoreRef.current) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const viewport = window.innerHeight || document.documentElement.clientHeight;
      const fullHeight = document.documentElement.scrollHeight;
      if (fullHeight - (scrollY + viewport) < 700) {
        loadMorePostsRef.current();
      }
    };
    window.addEventListener("scroll", checkScrollBottom, { passive: true });
    window.addEventListener("touchmove", checkScrollBottom, { passive: true });
    window.addEventListener("resize", checkScrollBottom);
    checkScrollBottom();
    return () => {
      window.removeEventListener("scroll", checkScrollBottom);
      window.removeEventListener("touchmove", checkScrollBottom);
      window.removeEventListener("resize", checkScrollBottom);
    };
  }, []);

  const handleFollow = async () => {
    if (!user) return;
    if (!currentUser) { setAuthPrompt(true); return; }
    const prev = following;
    setFollowing(!prev);
    setUser((u: any) => ({
      ...u,
      followerCount: (u.followerCount || 0) + (prev ? -1 : 1),
    }));
    try { await toggleFollow(user.id || id!); } catch { setFollowing(prev); }
  };

  const profileShareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/agrolink/user/${user?.id || id}`
    : "";

  const handleShareProfile = async () => {
    setShowMenu(false);
    const shareData = { title: user?.name || user?.username || "Profil", text: `@${user?.username || ""} hesabına bak`, url: profileShareUrl };
    try {
      if ((navigator as any).share) { await (navigator as any).share(shareData); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(profileShareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {}
  };

  const handleSuggestionsToggle = async () => {
    if (showSuggestions) { setShowSuggestions(false); return; }
    setShowSuggestions(true);
    if (suggestions.length > 0) return;
    setSuggestionsLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users/recommendations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setSuggestions((data.recommendations || data.users || []).slice(0, 8));
    } catch {}
    setSuggestionsLoading(false);
  };

  const handleUnfollowFromMenu = async () => {
    setShowMenu(false);
    if (!user || !following) return;
    setFollowing(false);
    setUser((u: any) => ({ ...u, followerCount: Math.max(0, (u.followerCount || 0) - 1) }));
    try { await toggleFollow(user.id || id!); } catch { setFollowing(true); }
  };

  const handleBlockFromMenu = async () => {
    setShowMenu(false);
    if (!user) return;
    const ok = window.confirm(`@${user.username} kullanıcısını engellemek istediğine emin misin?`);
    if (!ok) return;
    try {
      await blockUser(user.id || id!);
      navigate(-1);
    } catch {
      alert(t("upBlockFailed"));
    }
  };

  const openFollowers = () => {
    if (!user?.id) return;
    navigate(`/user/${user.id}/connections?tab=followers&u=${encodeURIComponent(user.username || "")}`);
  };

  const openFollowing = () => {
    if (!user?.id) return;
    navigate(`/user/${user.id}/connections?tab=following&u=${encodeURIComponent(user.username || "")}`);
  };

  const isOwnProfile = currentUser?.id === user?.id;

  // Etiketlenen postları çek — sekme değişince (hook erken return'den ÖNCE olmalı)
  useEffect(() => {
    if (activeTab !== "tagged" || !user?.id || taggedPostsList.length > 0) return;
    setTaggedLoading(true);
    (async () => {
      try {
        const token = getToken();
        const endpoint = isOwnProfile
          ? `${API_BASE}/users/me/tagged-posts`
          : `${API_BASE}/users/${user.id}/tagged-posts`;
        const res = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setTaggedPostsList(data.posts || []);
        }
      } catch {}
      setTaggedLoading(false);
    })();
  }, [activeTab, user?.id, isOwnProfile, taggedPostsList.length]);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Kullanıcı bulunamadı</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm font-semibold">Geri Dön</button>
      </div>
    );
  }

  const avatar = user.profilePic
    ? absoluteUrl(user.profilePic)
    : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
  const hasStory = stories.length > 0;
  const isVerified = user.isVerified || user.verified;
  const farmerBadges = getUserBadges(user);

  const filteredPosts = activeTab === "media"
    ? posts.filter((p) => p.mediaUrl || p.media || p.mediaUrls?.length)
    : activeTab === "tagged"
    ? taggedPostsList
    : posts;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Tam ekran avatar görüntüleyici ── */}
      {showAvatarViewer && (
        <FullScreenImageViewer src={avatarViewerSrc} onClose={() => setShowAvatarViewer(false)} />
      )}

      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto grid grid-cols-3 items-center h-16 px-4">
          <div className="flex justify-start">
            <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
          </div>
          <div className="flex justify-center">
            <img
              src="https://sehitumitkestitarimmtal.com/agro.png"
              alt="Agro"
              className="h-10 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div className="flex justify-end">
            <button className="active:scale-90 transition-transform">
              <Bell className="w-6 h-6 text-foreground" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto pb-6">
        {/* Cover */}
        <div className="relative px-3 pt-3">
          <div className="relative h-52 sm:h-60 rounded-[28px] overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 shadow-[0_18px_50px_-22px_hsl(var(--foreground)/0.45)] animate-fade-in">
            {user.coverPic && (
              <img
                src={absoluteUrl(user.coverPic)}
                alt=""
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 60%" }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            <button
              aria-label={t("upMore")}
              onClick={() => setShowMenu(true)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/35 hover:bg-black/45 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* ── Avatar — ana profil (ProfilePage) ile aynı: tam yuvarlak ── */}
          <div className="absolute left-6 -bottom-10">
            <div
              className={`w-[104px] h-[104px] rounded-full p-[3px] ${
                hasStory
                  ? "bg-gradient-to-tr from-primary to-accent"
                  : "bg-background"
              } ring-[5px] ring-background shadow-xl`}
            >
              <button
                onClick={() => {
                  if (hasStory) {
                    setShowStoryViewer(true);
                  } else {
                    openAvatarViewer(avatar);
                  }
                }}
                className="w-full h-full rounded-full overflow-hidden block active:scale-95 transition-transform"
                aria-label={hasStory ? t("upWatchStory") : t("upEnlargeProfilePic")}
                // Long press için touch olayları
                onTouchStart={(e) => {
                  const timer = setTimeout(() => openAvatarViewer(avatar), 500);
                  (e.currentTarget as any)._lpTimer = timer;
                }}
                onTouchEnd={(e) => {
                  clearTimeout((e.currentTarget as any)._lpTimer);
                }}
                onTouchMove={(e) => {
                  clearTimeout((e.currentTarget as any)._lpTimer);
                }}
              >
                <BlurImage
                  src={avatar}
                  alt={user.username}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Aksiyon butonları */}
        {!isOwnProfile ? (
          <div className="flex items-center justify-end gap-2 px-5 pt-3">
            {/* 🔧 DÜZELTMESİ — "gizlilikte seçtiğim mesaj izni çalışmıyor" sorunu:
                Profil açılmadan önce backend'in hesapladığı canMessage/canMessageReason
                alanına göre buton pasif hale getirilir; engelliyse tıklanamaz olur. */}
            {(() => {
              const messagingDisabled = user.canMessage === false;
              const reasonLabel =
                user.canMessageReason === "none"
                  ? "Bu kullanıcı mesajlarını kapattı"
                  : user.canMessageReason === "followers_only"
                  ? "Bu kullanıcı yalnızca takipçilerinden mesaj kabul ediyor"
                  : user.canMessageReason === "blocked"
                  ? "Bu kullanıcıyla mesajlaşamazsınız"
                  : undefined;
              return (
                <motion.button
                  whileTap={messagingDisabled ? undefined : { scale: 0.86 }}
                  transition={{ type: "spring", stiffness: 600, damping: 26 }}
                  onClick={() => {
                    if (messagingDisabled) return;
                    if (!currentUser) { setAuthPrompt(true); return; }
                    setShowContactCard(true);
                  }}
                  disabled={messagingDisabled}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-md ${
                    messagingDisabled
                      ? "bg-secondary/40 border-border opacity-40 cursor-not-allowed"
                      : "bg-gradient-to-br from-background to-secondary/60 border-foreground/25 shadow-[0_4px_14px_-6px_hsl(var(--foreground)/0.3)]"
                  }`}
                  aria-label={reasonLabel || t("upMessage")}
                  title={reasonLabel}
                >
                  <Send className="w-[19px] h-[19px] text-foreground -rotate-12 translate-x-[1px]" strokeWidth={2} />
                </motion.button>
              );
            })()}
            <button
              onClick={handleFollow}
              className={`px-5 h-10 rounded-full text-sm font-bold transition-all active:scale-95 ${
                following
                  ? "bg-secondary text-secondary-foreground border border-border"
                  : "bg-foreground text-background"
              }`}
            >
              {following ? t("upFollowing") : t("postFollow")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end gap-2 px-5 pt-3">
              <button
                aria-label={t("upSuggestedPeople")}
                onClick={handleSuggestionsToggle}
                className={`w-10 h-10 rounded-full border flex items-center justify-center active:scale-90 transition-all ${
                  showSuggestions
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border bg-background text-foreground/80"
                }`}
              >
                <UserPlus2 className="w-5 h-5" strokeWidth={1.9} />
              </button>
            </div>

            {showSuggestions && (
              <div className="mx-4 mt-3 rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold text-foreground">{t("upSuggestedPeopleTitle")}</p>
                  <button onClick={() => setShowSuggestions(false)} className="text-muted-foreground">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                {suggestionsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">{t("upNoSuggestions")}</p>
                ) : (
                  <div className="divide-y divide-border">
                    {suggestions.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/user/${s.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 active:bg-secondary transition-colors text-left"
                      >
                        <img
                          src={s.profilePic ? absoluteUrl(s.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                          alt={s.username}
                          className="w-10 h-10 rounded-[10px] object-cover ring-2 ring-border flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{s.name || s.username}</p>
                          <p className="text-xs text-muted-foreground truncate">@{s.username}</p>
                        </div>
                        {s.isFollowing ? (
                          <UserCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <span className="text-xs font-bold text-primary flex-shrink-0">Takip Et</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className={`px-4 ${isOwnProfile ? "pt-14" : "pt-4"}`}>
          {bannedProfile && !isOwnProfile && (
            <div className="mb-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm font-semibold text-destructive">🚫 Erişim Engeli — Politika İhlali</p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-extrabold text-foreground italic">{user.name || user.username}</h2>
            {isVerified && (
              <button
                onClick={() => setShowVerifiedModal(true)}
                aria-label={t("upAboutAccount")}
                className="active:scale-90 transition-transform"
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
                  <path d="M17.7508 9.41667C17.7508 8.1 17.0217 6.95833 15.9608 6.41667C16.0892 6.05417 16.1592 5.6625 16.1592 5.25C16.1592 3.40833 14.7342 1.91833 12.9775 1.91833C12.5858 1.91833 12.2108 1.98833 11.8642 2.12667C11.3492 1.0125 10.2592 0.25 9.00083 0.25C7.7425 0.25 6.65417 1.01417 6.13667 2.125C5.79083 1.9875 5.415 1.91667 5.02333 1.91667C3.265 1.91667 1.84167 3.40833 1.84167 5.25C1.84167 5.66167 1.91083 6.05333 2.03917 6.41667C0.979167 6.95833 0.25 8.09833 0.25 9.41667C0.25 10.6625 0.901667 11.7483 1.86833 12.3217C1.85167 12.4633 1.84167 12.605 1.84167 12.75C1.84167 14.5917 3.265 16.0833 5.02333 16.0833C5.415 16.0833 5.79 16.0117 6.13583 15.875C6.6525 16.9867 7.74083 17.75 9 17.75C10.26 17.75 11.3483 16.9867 11.8642 15.875C12.21 16.0108 12.585 16.0817 12.9775 16.0817C14.7358 16.0817 16.1592 14.59 16.1592 12.7483C16.1592 12.6033 16.1492 12.4617 16.1317 12.3208C17.0967 11.7483 17.7508 10.6625 17.7508 9.4175V9.41667Z" fill="#1D9BF0" />
                  <path d="M12.2375 6.63833L8.62583 12.055C8.505 12.2358 8.3075 12.3333 8.105 12.3333C7.98583 12.3333 7.865 12.3 7.75833 12.2283L7.6625 12.15L5.65 10.1375C5.40583 9.89333 5.40583 9.4975 5.65 9.25417C5.89417 9.01083 6.29 9.00917 6.53333 9.25417L8.00833 10.7267L11.1958 5.94333C11.3875 5.65583 11.7758 5.58 12.0625 5.77083C12.3508 5.9625 12.4292 6.35083 12.2375 6.6375V6.63833Z" fill="white" />
                </svg>
              </button>
            )}
            <span className="text-sm text-muted-foreground font-normal">@{user.username}</span>
          </div>

          {/* Çiftçi Sertifika Rozetleri + Davet Rozeti */}
          {(farmerBadges.length > 0 || user.hasInviteBadge) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {farmerBadges.map((b) => (
                <FarmerBadge key={b} type={b} size="md" />
              ))}
              {user.hasInviteBadge && <InviteBadge size="md" />}
            </div>
          )}

          {user.bio && (
            <p className="text-sm text-foreground mb-2 leading-relaxed whitespace-pre-wrap">{user.bio}</p>
          )}
          {(user.city || user.location) && (
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {user.city || user.location}
            </p>
          )}
          {user.website && (
            <a
              href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 mb-2 flex items-center gap-1 hover:underline"
            >
              <Globe className="w-3 h-3" /> {user.website.replace(/^https?:\/\//, "")}
            </a>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 mt-3 mb-5 text-sm flex-wrap">
            <button onClick={openFollowing} className="flex items-baseline gap-1.5">
              <span className="font-bold text-foreground">{(user.followingCount ?? 0).toLocaleString()}</span>
              <span className="text-muted-foreground">Takip Edilen</span>
            </button>
            <span className="text-border">|</span>
            <button onClick={openFollowers} className="flex items-baseline gap-1.5">
              <span className="font-bold text-foreground">{(user.followerCount ?? 0).toLocaleString()}</span>
              <span className="text-muted-foreground">Takipçi</span>
            </button>
            <span className="text-border">|</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-foreground">{user.postCount ?? posts.length}</span>
              <span className="text-muted-foreground">Gönderi</span>
            </div>
          </div>

          {!isOwnProfile && user.id && <MutualFollowers userId={user.id} />}

          {/* Tabs */}
          <div className="flex border-b border-border mb-4 -mx-4 overflow-x-auto no-scrollbar">
            {[
              { key: "posts" as const, labelKey: "upTabTimeline" as const },
              { key: "media" as const, labelKey: "upTabMedia" as const },
              { key: "replies" as const, labelKey: "upTabReplies" as const },
              { key: "tagged" as const, labelKey: "upTabTagged" as const },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => tab.key !== "replies" && setActiveTab(tab.key as "posts" | "media" | "tagged")}
                className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.key ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.key === "tagged" ? `🏷️ ${t(tab.labelKey)}` : t(tab.labelKey)}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {isPrivateLocked ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-5">
                <Lock className="w-9 h-9 text-foreground" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Bu Hesap Gizli</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Bu hesabın gönderilerini görmek için{" "}
                <span className="font-semibold text-foreground">@{user.username}</span> hesabını takip et.
              </p>
              {!isOwnProfile && !following && (
                <button
                  onClick={handleFollow}
                  className="mt-5 px-6 h-10 rounded-full bg-foreground text-background text-sm font-bold active:scale-95 transition-transform"
                >
                  Takip İsteği Gönder
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 🏷️ Etiketlendi sekmesi yükleniyorsa spinner göster */}
              {activeTab === "tagged" && taggedLoading && (
                <FeedSkeleton count={1} />
              )}

              {!(activeTab === "tagged" && taggedLoading) && (
                <div className="divide-y divide-border">
                  {filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {/* ── Sonsuz scroll tetikleyici — limit yok ── */}
              {activeTab !== "tagged" && (
                <div ref={loadMoreRef} className="h-16 flex items-center justify-center">
                  {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  {!hasMore && filteredPosts.length > 0 && (
                    <p className="text-xs text-muted-foreground">Tüm gönderiler yüklendi</p>
                  )}
                </div>
              )}

              {filteredPosts.length === 0 && !loadingMore && !(activeTab === "tagged" && taggedLoading) && (
                <p className="text-center text-muted-foreground py-10 text-sm">
                  {activeTab === "tagged"
                    ? (isOwnProfile ? t("upNoTaggedOwn") : t("upNoTaggedOther"))
                    : t("upNoContent")}
                </p>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav />
      <VerifiedBadgeModal open={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} />

      {showStoryViewer && hasStory && (
        <StoryViewer
          group={{
            userId: user.id,
            username: user.username,
            profilePic: user.profilePic,
            isVerified: user.isVerified || user.verified,
            stories: stories,
          } as any}
          onClose={() => setShowStoryViewer(false)}
        />
      )}

      <BanModal visible={showBanModal} forceLogout />
      <AuthPromptModal open={authPrompt} onClose={() => setAuthPrompt(false)} action="follow" />

      {/* ── Menü — başka profil ── */}
      <ContactCardSheet
        open={showContactCard && !isOwnProfile}
        user={user}
        messagingDisabled={user?.canMessage === false}
        onClose={() => setShowContactCard(false)}
        onMessage={() => { setShowContactCard(false); navigate(`/chat?to=${user.id}`); }}
        onCall={(video) => {
          setShowContactCard(false);
          startCall(
            { id: user.id || user._id, name: user.name, username: user.username, profilePic: user.profilePic },
            video ? "video" : "audio"
          );
        }}
        onShare={handleShareProfile}
        onMore={() => { setShowContactCard(false); setShowMenu(true); }}
      />

      {showMenu && !isOwnProfile && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="bg-background w-full max-w-lg rounded-t-3xl pb-6 shadow-2xl"
            style={{ animation: "slideUp 0.25s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-1.5 rounded-full bg-border my-3" />
            <div className="px-3">
              <button
                onClick={handleShareProfile}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {linkCopied ? <Check className="w-5 h-5 text-primary" /> : <Share2 className="w-5 h-5 text-primary" />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {linkCopied ? t("upLinkCopied") : t("upShareProfile")}
                  </p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </button>

              <button
                onClick={async () => {
                  setShowMenu(false);
                  try {
                    await navigator.clipboard.writeText(profileShareUrl);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 1800);
                  } catch {}
                }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Copy className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-sm font-semibold text-foreground">Profil bağlantısını kopyala</span>
              </button>

              <button
                onClick={() => { setShowMenu(false); setShowQR(true); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-sm font-semibold text-foreground">QR Kod ile Paylaş</span>
              </button>

              {following && (
                <button
                  onClick={handleUnfollowFromMenu}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <UserMinus className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Takipten çık</p>
                    <p className="text-xs text-muted-foreground">@{user.username} hesabını takip etmeyi bırak</p>
                  </div>
                </button>
              )}

              <button
                onClick={handleBlockFromMenu}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-destructive/10 active:bg-destructive/15 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-destructive">Engelle</p>
                  <p className="text-xs text-muted-foreground">@{user.username} sana ulaşamaz</p>
                </div>
              </button>

              <button
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Flag className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-sm font-semibold text-foreground">Şikayet et</span>
              </button>
            </div>

            <button
              onClick={() => setShowMenu(false)}
              className="mt-3 mx-3 w-[calc(100%-1.5rem)] py-3 rounded-2xl bg-secondary text-sm font-semibold text-foreground"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* ── QR Kod Modalı ── */}
      {showQR && user && (
        <div
          className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-background w-full max-w-sm rounded-t-3xl pb-8 shadow-2xl"
            style={{ animation: "slideUp 0.25s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-border" />
            </div>

            <div className="flex items-center justify-between px-5 pb-4">
              <h3 className="text-base font-bold text-foreground">Profil QR Kodu</h3>
              <button
                onClick={() => setShowQR(false)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <XIcon className="w-4 h-4 text-foreground" />
              </button>
            </div>

            <div className="mx-5 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border p-6 flex flex-col items-center gap-5">
              {/* Avatar — kare ve tıklanabilir */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => openAvatarViewer(user.profilePic ? absoluteUrl(user.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg")}
                  className="active:scale-95 transition-transform"
                  aria-label={t("upEnlargeProfilePic")}
                >
                  <img
                    src={user.profilePic ? absoluteUrl(user.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                    alt={user.username}
                    className="w-16 h-16 rounded-[14px] object-cover ring-4 ring-primary/20"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"; }}
                  />
                </button>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">{user.name || user.username}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-3 shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(profileShareUrl)}&bgcolor=ffffff&color=15803d&margin=6&qzone=1`}
                  alt={t("upQrCode")}
                  className="w-44 h-44 rounded-lg"
                  loading="lazy"
                />
              </div>

              <div className="w-full bg-secondary/60 rounded-xl px-4 py-2 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">{profileShareUrl}</p>
              </div>
            </div>

            <div className="flex gap-3 px-5 mt-4">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(profileShareUrl);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 1800);
                  } catch {}
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 active:scale-95 transition-all text-sm font-semibold text-foreground"
              >
                {linkCopied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? t("upCopied") : t("upCopy")}
              </button>
              <button
                onClick={async () => {
                  try {
                    await (navigator as any).share({ title: user.name || user.username, url: profileShareUrl });
                  } catch {}
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 transition-all text-sm font-semibold text-primary-foreground"
              >
                <Share2 className="w-4 h-4" />
                Paylaş
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;







