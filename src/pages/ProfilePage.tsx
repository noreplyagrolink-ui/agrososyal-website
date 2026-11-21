import { useEffect, useState, useRef, useCallback } from "react";
import { Settings, Loader2, LogOut, Film, X, MoreHorizontal, UserPlus2, Award, Share2, Link2, QrCode, ChevronRight, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import EditProfileModal from "@/components/EditProfileModal";
import PostModal from "@/components/PostModal";
import PostCard from "@/components/PostCard";
import ReelsViewer from "@/components/ReelsViewer";
import StoryViewer from "@/components/StoryViewer";
import VerifiedBadgeModal from "@/components/VerifiedBadgeModal";
import BlurImage from "@/components/BlurImage";
import AccountSwitcherSheet from "@/components/AccountSwitcherSheet";
import { getMe, getUserPosts, logout as apiLogout, getSavedPosts, getStories, getLikedPosts, getMyInvite, getToken } from "@/lib/api";
import { FarmerBadge, getUserBadges } from "@/components/FarmerBadge";
import { InviteBadge } from "@/components/InviteBadge";
import FarmerCertificateModal from "@/components/FarmerCertificateModal";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileSkeleton from "@/components/ProfileSkeleton";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";
type ProfileTab = "posts" | "photos" | "videos" | "saved" | "liked" | "tagged";

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPostsList, setSavedPostsList] = useState<any[]>([]);
  const [likedPostsList, setLikedPostsList] = useState<any[]>([]);
  const [taggedPostsList, setTaggedPostsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [myInvite, setMyInvite] = useState<{ inviteCount: number; hasInviteBadge: boolean; inviteLink: string | null; inviteCode: string | null } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [followListTitle, setFollowListTitle] = useState("");
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followPage, setFollowPage] = useState(1);
  const [followHasMore, setFollowHasMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reelsMode, setReelsMode] = useState(false);
  const [reelsIdx, setReelsIdx] = useState(0);
  const [stories, setStories] = useState<any[]>([]);
  const [viewingStory, setViewingStory] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const meData = await getMe();
        const u = meData.user;
        setUser(u);
        if (u?.id) {
          const [p, stData] = await Promise.all([
            getUserPosts(u.id, 1),
            getStories().catch(() => ({ stories: [] })),
          ]);
          const newPosts = p.posts || [];
          setPosts(newPosts);
          // Sayfa başına gelen post sayısı 0'dan büyükse devam ettir
          setHasMore(newPosts.length > 0);
          // Find own stories
          const allGroups = stData.stories || [];
          const ownGroup = allGroups.find((g: any) => g.userId === u.id);
          if (ownGroup) setStories(ownGroup.stories || []);
        }
        // 🎟️ Davet ilerlemesi (X/10) — profil header'ında gösterilecek
        getMyInvite()
          .then((inv) => {
            if (inv && !inv.error) {
              setMyInvite({
                inviteCount: inv.inviteCount || 0,
                hasInviteBadge: !!inv.hasInviteBadge,
                inviteLink: inv.inviteLink || null,
                inviteCode: inv.inviteCode || null,
              });
            }
          })
          .catch(() => {});
      } catch (err: any) {
        // 🔧 DÜZELTİLDİ: "Unauthorized" hatası api.ts'den gelir ve
        // App.tsx'deki UnauthorizedListener zaten /login'e yönlendirir.
        // Burada tekrar navigate("/login") YAPMA → çift yönlendirme olur,
        // health-check ekranı gösterilir, kullanıcı logout olmuş gibi görünür.
        // Diğer hatalar (network, 500 vs.) için sadece loading'i kapat.
        console.warn("[ProfilePage] veri yüklenemedi:", err?.message);
      } finally { setLoading(false); }
    })();
  }, [navigate]);

  // Load saved posts when tab changes
  useEffect(() => {
    if (activeTab === "saved" && savedPostsList.length === 0) {
      (async () => {
        try {
          const data = await getSavedPosts(1);
          setSavedPostsList(data.posts || data.savedPosts || []);
        } catch {}
      })();
    }
    if (activeTab === "liked" && likedPostsList.length === 0) {
      (async () => {
        try {
          const data = await getLikedPosts(1);
          setLikedPostsList(data.posts || data.likedPosts || []);
        } catch {}
      })();
    }
    if (activeTab === "tagged" && taggedPostsList.length === 0) {
      (async () => {
        try {
          const token = getToken();
          const res = await fetch(`${API_BASE}/users/me/tagged-posts`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          setTaggedPostsList(data.posts || []);
        } catch {}
      })();
    }
  }, [activeTab, savedPostsList.length, likedPostsList.length, taggedPostsList.length]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !user) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const next = pageRef.current + 1;
    try {
      const p = await getUserPosts(user.id, next);
      const newPosts = p.posts || [];
      // Aynı id'leri tekrar eklememek için dedupe
      setPosts(prev => {
        const ids = new Set(prev.map((x: any) => x.id));
        const filtered = newPosts.filter((np: any) => np?.id && !ids.has(np.id));
        return [...prev, ...filtered];
      });
      // Boş geldiyse dur, aksi halde devam
      const more = newPosts.length > 0;
      hasMoreRef.current = more;
      setHasMore(more);
      pageRef.current = next;
      setPage(next);
    } catch (err) {
      console.error("[ProfilePage] loadMorePosts hatası:", err);
      hasMoreRef.current = false;
      setHasMore(false);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [user]);

  // Ref'ler: observer'ı SADECE bir kez kurup en güncel değerleri buradan okuyoruz.
  // (Observer'ı her state değişiminde disconnect/reconnect etmek bazı tarayıcılarda
  //  intersection callback'inin kaçırılmasına ve "aşağı insem de yeni post gelmiyor"
  //  hatasına yol açıyordu.)
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
    // rootMargin: 400px erken tetikle, kullanıcı sona gelmeden yüklemeye başla
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        loadMorePostsRef.current();
      }
    }, { threshold: 0, rootMargin: "0px 0px 600px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sayfa kısa sürerse (içerik viewport'u doldurmuyorsa) sentinel hep "intersecting"
  // kalır ama tarayıcı yeni bir callback tetiklemeyebilir — bunun için ekstra bir
  // güvenlik ağı: hasMore/loadingMore değiştiğinde sentinel hâlâ görünürdeyse tekrar dene.
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight + 600 && rect.bottom > 0;
    if (isVisible) loadMorePosts();
  }, [hasMore, loadingMore, posts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 📱 Mobil uygulama (WebView) yedeği — bazı WebView motorlarında IntersectionObserver
  // güvenilir tetiklenmiyor. Bu yüzden klasik scroll/touchmove event'i ile de,
  // sayfa sonuna yaklaşınca bağımsız olarak loadMorePosts çağrılır.
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
    // Mount olduğunda da bir kez kontrol et (kısa sayfa / az post durumunda)
    checkScrollBottom();
    return () => {
      window.removeEventListener("scroll", checkScrollBottom);
      window.removeEventListener("touchmove", checkScrollBottom);
      window.removeEventListener("resize", checkScrollBottom);
    };
  }, []);

  const handleLogout = async () => {
    await apiLogout();
    navigate("/login");
  };

  const fetchFollowList = async (type: "followers" | "following", pg = 1, append = false) => {
    setFollowLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users/${user.id}/${type}/list?page=${pg}&limit=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const list = data[type] || data.users || [];
      if (append) setFollowList(prev => [...prev, ...list]);
      else setFollowList(list);
      setFollowHasMore(pg < (data.totalPages || 1));
      setFollowPage(pg);
    } catch {}
    setFollowLoading(false);
  };

  const openFollowers = () => {
    if (!user?.id) return;
    navigate(`/user/${user.id}/connections?tab=followers&u=${encodeURIComponent(user.username || "")}`);
  };

  const openFollowing = () => {
    if (!user?.id) return;
    navigate(`/user/${user.id}/connections?tab=following&u=${encodeURIComponent(user.username || "")}`);
  };

  const loadMoreFollow = () => {
    if (followLoading || !followHasMore) return;
    const type = followListTitle === "Takipçiler" ? "followers" : "following";
    fetchFollowList(type, followPage + 1, true);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }
  if (!user) return null;

  const avatar = user.profilePic
    ? absoluteUrl(user.profilePic)
    : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

  const isVerified = user.isVerified || user.verified;
  const farmerBadges = getUserBadges(user);
  const hasStory = stories.length > 0;

  const filteredPosts = activeTab === "saved"
    ? savedPostsList
    : activeTab === "liked"
    ? likedPostsList
    : activeTab === "tagged"
    ? taggedPostsList
    : posts.filter((p) => {
        if (activeTab === "photos") return (p.mediaType === "image" || (!p.mediaType && (p.mediaUrl || p.media)));
        if (activeTab === "videos") return p.mediaType === "video";
        return true;
      });

  // (tabs definition removed — tabs rendered inline in JSX)

  const handlePostClick = (post: any, index: number) => {
    setReelsIdx(index);
    setReelsMode(true);
  };

  const handleAvatarClick = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (hasStory) {
      setViewingStory(true);
    } else {
      setLightboxImg(avatar);
    }
  };

  const startLongPress = () => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      // hafif haptic
      try { (navigator as any).vibrate?.(15); } catch {}
      setShowAccountSheet(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const storyGroup = {
    userId: user.id,
    username: user.username,
    profilePic: user.profilePic ? absoluteUrl(user.profilePic) : undefined,
    isVerified,
    stories,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header
        className="sticky top-0 z-40 border-b border-white/10"
        style={{
          background: "hsl(var(--background) / 0.72)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          boxShadow: "0 1px 0 hsl(0 0% 100%/0.06) inset, 0 8px 24px -16px hsl(var(--foreground)/0.15)",
        }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={handleLogout} aria-label="Çıkış" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary/60 active:scale-90 transition-all">
            <LogOut className="w-[21px] h-[21px] text-foreground" strokeWidth={1.8} />
          </button>
          <img
            src="https://sehitumitkestitarimmtal.com/agro.png"
            alt="Agro"
            className="h-9 w-9 object-cover rounded-xl shadow-sm ring-1 ring-border/50"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <button onClick={() => navigate("/settings")} aria-label="Ayarlar" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary/60 active:scale-90 transition-all">
            <Settings className="w-[21px] h-[21px] text-foreground" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto pb-6">
        {/* Cover — premium card, alt köşeler yuvarlak, sağ üstte ... menü */}
        <div className="relative px-3 pt-3">
          <div className="relative h-52 sm:h-60 rounded-[28px] overflow-hidden bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30 shadow-[0_18px_50px_-22px_hsl(var(--foreground)/0.45)] animate-fade-in">
            {user.coverPic && (
              <img
                src={absoluteUrl(user.coverPic)}
                alt=""
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 60%" }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

            {/* ... menü */}
            <button
              onClick={() => setProfileMenuOpen(true)}
              aria-label="Daha fazla"
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/35 hover:bg-black/45 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {/* Profil menüsü bottom sheet */}
            {profileMenuOpen && (
              <div className="fixed inset-0 z-[90]" onClick={() => setProfileMenuOpen(false)}>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <div
                  className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl pb-8 pt-4 px-4 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
                  <div className="space-y-1">
                    {[
                      { icon: Settings, label: "Ayarlar", action: () => { setProfileMenuOpen(false); navigate("/settings"); } },
                      { icon: Share2, label: "Profili Paylaş", action: () => {
                        setProfileMenuOpen(false);
                        if (navigator.share) navigator.share({ title: user?.name || user?.username, url: window.location.href });
                        else { navigator.clipboard.writeText(window.location.href); }
                      }},
                      { icon: Link2, label: "Profil Bağlantısını Kopyala", action: () => {
                        setProfileMenuOpen(false);
                        navigator.clipboard.writeText(window.location.href);
                      }},
                      { icon: UserPlus2, label: "QR Kodu Göster", action: () => { setProfileMenuOpen(false); } },
                      { icon: LogOut, label: "Çıkış Yap", action: async () => { setProfileMenuOpen(false); handleLogout(); }, danger: true },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors active:scale-[0.98] ${
                          (item as any).danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                        <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avatar - sol alt, kalın bg-ring ile oyuk efekti */}
          <button
            onClick={handleAvatarClick}
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchCancel={cancelLongPress}
            onContextMenu={(e) => { e.preventDefault(); longPressFiredRef.current = true; setShowAccountSheet(true); }}
            className="absolute left-6 -bottom-10 active:scale-95 transition-transform"
            aria-label="Profil resmi — uzun bas: hesap değiştir"
          >
            <div className={`w-[104px] h-[104px] rounded-full p-[3px] ${hasStory ? "bg-gradient-to-tr from-primary to-accent" : "bg-background"} ring-[5px] ring-background shadow-xl`}>
              <BlurImage
                src={avatar}
                alt={user.username}
                wrapperClassName="w-full h-full rounded-full"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </button>
        </div>

        {/* Sağ üst aksiyon (yuvarlak ikon) + Profili Düzenle */}
        <div className="flex items-center justify-end gap-2 px-5 pt-3">
          <button
            onClick={() => navigate("/search")}
            aria-label="Kişi öner"
            className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center active:scale-90 transition-transform text-foreground/80"
          >
            <UserPlus2 className="w-5 h-5" strokeWidth={1.9} />
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-5 h-10 rounded-full text-sm font-semibold border border-foreground/80 text-foreground bg-transparent active:scale-95 transition-transform"
          >
            {t("profileEditBtn")}
          </button>
          <button
            onClick={() => setShowCertModal(true)}
            className="w-10 h-10 rounded-full border border-amber-500/50 bg-amber-500/10 flex items-center justify-center active:scale-90 transition-transform text-amber-600"
            title="Çiftçi Sertifikası"
          >
            <Award className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-extrabold text-foreground italic">
              {user.name || user.username}
            </h2>
            {isVerified && (
              <button
                onClick={() => setShowVerifiedModal(true)}
                aria-label="Bu hesap hakkında"
                className="active:scale-90 transition-transform"
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
                  <path d="M17.7508 9.41667C17.7508 8.1 17.0217 6.95833 15.9608 6.41667C16.0892 6.05417 16.1592 5.6625 16.1592 5.25C16.1592 3.40833 14.7342 1.91833 12.9775 1.91833C12.5858 1.91833 12.2108 1.98833 11.8642 2.12667C11.3492 1.0125 10.2592 0.25 9.00083 0.25C7.7425 0.25 6.65417 1.01417 6.13667 2.125C5.79083 1.9875 5.415 1.91667 5.02333 1.91667C3.265 1.91667 1.84167 3.40833 1.84167 5.25C1.84167 5.66167 1.91083 6.05333 2.03917 6.41667C0.979167 6.95833 0.25 8.09833 0.25 9.41667C0.25 10.6625 0.901667 11.7483 1.86833 12.3217C1.85167 12.4633 1.84167 12.605 1.84167 12.75C1.84167 14.5917 3.265 16.0833 5.02333 16.0833C5.415 16.0833 5.79 16.0117 6.13583 15.875C6.6525 16.9867 7.74083 17.75 9 17.75C10.26 17.75 11.3483 16.9867 11.8642 15.875C12.21 16.0108 12.585 16.0817 12.9775 16.0817C14.7358 16.0817 16.1592 14.59 16.1592 12.7483C16.1592 12.6033 16.1492 12.4617 16.1317 12.3208C17.0967 11.7483 17.7508 10.6625 17.7508 9.4175V9.41667Z" fill="#1D9BF0"/>
                  <path d="M12.2375 6.63833L8.62583 12.055C8.505 12.2358 8.3075 12.3333 8.105 12.3333C7.98583 12.3333 7.865 12.3 7.75833 12.2283L7.6625 12.15L5.65 10.1375C5.40583 9.89333 5.40583 9.4975 5.65 9.25417C5.89417 9.01083 6.29 9.00917 6.53333 9.25417L8.00833 10.7267L11.1958 5.94333C11.3875 5.65583 11.7758 5.58 12.0625 5.77083C12.3508 5.9625 12.4292 6.35083 12.2375 6.6375V6.63833Z" fill="white"/>
                </svg>
              </button>
            )}
            {/* 🏅 Topluluk Elçisi rozeti — mavi tikin hemen yanında */}
            {user.hasInviteBadge && <InviteBadge size="md" />}
            <span className="text-sm text-muted-foreground font-normal">@{user.username}</span>
          </div>

          {/* Çiftçi Sertifika Rozetleri */}
          {farmerBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {farmerBadges.map((b) => (
                <FarmerBadge key={b} type={b} size="md" />
              ))}
            </div>
          )}
          {user.bio && (
            <p className="text-sm text-foreground mb-2 leading-relaxed whitespace-pre-wrap">{user.bio}</p>
          )}
          {(user.city || user.location) && <p className="text-xs text-muted-foreground mb-1">📍 {user.city || user.location}</p>}
          {user.website && (
            <a href={user.website.startsWith("http") ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mb-2 block hover:underline">
              🌐 {user.website.replace(/^https?:\/\//, "")}
            </a>
          )}

          {/* 🎟️ Davet Et — X/10 ilerlemesi. Tıklayınca davet linkini kopyalar. */}
          {myInvite && (
            <button
              onClick={async () => {
                if (!myInvite.inviteLink) return;
                try {
                  await navigator.clipboard.writeText(myInvite.inviteLink);
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2000);
                } catch {}
              }}
              className="w-full flex items-center justify-between gap-3 mt-3.5 mb-1 px-4 py-3 rounded-2xl border border-primary/25 bg-primary/5 active:scale-[0.99] transition-transform text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-[18px] h-[18px] text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground leading-tight">
                    {myInvite.hasInviteBadge ? "Topluluk Elçisisin 🎉" : "Arkadaşlarını davet et"}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {inviteCopied ? "Davet linki kopyalandı ✓" : "Linke dokun, kopyala ve paylaş"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="h-1.5 w-14 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full agro-gradient rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (myInvite.inviteCount / 10) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-extrabold text-primary whitespace-nowrap">
                  {myInvite.inviteCount}/10
                </span>
              </div>
            </button>
          )}

          {/* Stats — glass kart üçlüsü */}
          <div
            className="flex items-center gap-4 mt-3.5 mb-4 [&>div.w-px]:my-0 [&>div.w-px]:h-4 [&>button]:flex-row [&>button]:flex-none [&>button]:gap-1.5 [&>button]:py-1 [&>div:not(.w-px)]:flex-row [&>div:not(.w-px)]:flex-none [&>div:not(.w-px)]:gap-1.5 [&>div:not(.w-px)]:py-1"
            style={{
              background: "transparent",
            }}
          >
            <button onClick={openFollowing} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 active:bg-white/5 transition-colors">
              <span className="font-extrabold text-foreground text-[15px]">{(user.followingCount ?? 0).toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">{t("profileFollowing")}</span>
            </button>
            <div className="w-px my-2.5 bg-border/60" />
            <button onClick={openFollowers} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 active:bg-white/5 transition-colors">
              <span className="font-extrabold text-foreground text-[15px]">{(user.followerCount ?? 0).toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">{t("profileFollowers")}</span>
            </button>
            <div className="w-px my-2.5 bg-border/60" />
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3">
              <span className="font-extrabold text-foreground text-[15px]">{user.postCount ?? posts.length}</span>
              <span className="text-[11px] text-muted-foreground">{t("profilePosts")}</span>
            </div>
          </div>

          {/* Tabs — glass segmented pill */}
          <div
            className="flex gap-1 mb-4 overflow-x-auto no-scrollbar border-b border-border"
            style={{
              background: "hsl(var(--card) / 0.5)",
              backdropFilter: "blur(18px) saturate(1.6)",
              WebkitBackdropFilter: "blur(18px) saturate(1.6)",
            }}
          >
            {[
              { key: "posts" as ProfileTab, label: t("profileTabPosts") },
              { key: "photos" as ProfileTab, label: t("profileTabMedia") },
              { key: "videos" as ProfileTab, label: t("profileTabVideos") },
              { key: "liked" as ProfileTab, label: t("profileTabLiked") },
              { key: "saved" as ProfileTab, label: t("profileTabSaved") },
              { key: "tagged" as ProfileTab, label: t("profileTabTagged") },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-[3px] -mb-px transition-all ${
                  activeTab === tab.key
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col -mx-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
            {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>

          {filteredPosts.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">
              {activeTab === "saved" ? t("profileNoSaved")
               : activeTab === "tagged" ? t("profileNoTagged")
               : t("profileNoContent")}
            </p>
          )}
        </div>
      </main>

      <AccountSwitcherSheet open={showAccountSheet} onClose={() => setShowAccountSheet(false)} />

      <BottomNav />
      <EditProfileModal user={user} open={showEditModal} onClose={() => setShowEditModal(false)} onUpdated={(updated) => setUser({ ...user, ...updated })} />
      <VerifiedBadgeModal open={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} onApply={() => navigate("/settings")} />
      {showCertModal && (
        <FarmerCertificateModal
          onClose={() => setShowCertModal(false)}
          onCertified={() => { setShowCertModal(false); getMe().then((d) => setUser(d.user)); }}
        />
      )}

      {selectedPost && <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />}

      {reelsMode && (
        <ReelsViewer posts={filteredPosts} startIndex={reelsIdx} onClose={() => setReelsMode(false)} />
      )}

      {viewingStory && (
        <StoryViewer group={storyGroup} onClose={() => setViewingStory(false)} />
      )}

      {lightboxImg && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          <img src={lightboxImg} alt="" className="max-w-[90vw] max-h-[90dvh] rounded-2xl object-contain"
            style={{ animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }} />
          <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }`}</style>
        </div>
      )}

      {showFollowModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center" onClick={() => setShowFollowModal(false)}>
          <div className="bg-background w-full max-w-lg rounded-t-3xl max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">{followListTitle}</h2>
              <button onClick={() => setShowFollowModal(false)} className="text-muted-foreground text-sm">Kapat</button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]" onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) loadMoreFollow();
            }}>
              {followList.length === 0 && !followLoading ? (
                <p className="text-center text-muted-foreground py-10 text-sm">Kimse yok</p>
              ) : followList.map((u: any) => {
                const av = u.profilePic ? absoluteUrl(u.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                return (
                  <button key={u.id} onClick={() => { setShowFollowModal(false); navigate(`/user/${u.id}`); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                    <img src={av} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{u.name || u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </button>
                );
              })}
              {followLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;








