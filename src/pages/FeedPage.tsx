import { Fragment, useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { Sprout, Loader2, MessageCircle, Settings, Moon, Sun, Bell, List, Grid3x3, Search, X, TrendingUp, Thermometer, Home, Compass, User, Users, Bot, ShoppingBag, Cloud, AlertTriangle, Calculator as CalcIcon, BookOpen, Camera, Bug, PenLine } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PostCard from "@/components/PostCard";
import { FeedSkeleton } from "@/components/PostSkeleton";
import PostModal from "@/components/PostModal";
import SuggestedUsersCard from "@/components/SuggestedUsersCard";
import FirstFollowWidget from "@/components/FirstFollowWidget";
import AdCard, { useFeedAds } from "@/components/AdCard";
import BottomNav from "@/components/BottomNav";
import StoriesBar from "@/components/StoriesBar";
import ReelsViewer from "@/components/ReelsViewer";
import { getFeed, refreshFeed, searchUsers, searchHashtags, getNotifications, getStoredUser, batchViewPosts, getToken } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";
import { syncWebPushTokenSilently } from "@/lib/fcm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import DiseaseAlarmModal from "@/components/DiseaseAlarmModal";
import ProfileCompleteCard from "@/components/ProfileCompleteCard";
import { useLanguage } from "@/contexts/LanguageContext";

type FeedMode = "normal" | "media";

// ── Feed önbelleği ────────────────────────────────────────────────
// Modül seviyesinde (component dışında) tutulur; profil vb. sayfaya
// gidip geri dönüldüğünde FeedPage yeniden mount olsa da postlar ve
// kaldığın kaydırma konumu kaybolmaz. Sekme kapanınca / tamamen
// yenilenince sıfırlanır. TTL süresi dolduysa sunucudan taze çekilir.
const FEED_CACHE_TTL = 3 * 60 * 1000; // 3 dakika
let feedCache: {
  posts: any[];
  page: number;
  hasMore: boolean;
  scrollY: number;
  timestamp: number;
} | null = null;

const FeedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [deepLinkedPost, setDeepLinkedPost] = useState<any>(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [diseaseAlarmOpen, setDiseaseAlarmOpen] = useState(false);
  const currentUser = getStoredUser();
  const { t, lang } = useLanguage();
  const navHidden = useScrollDirection();

  // Profil tamamlama kartı — 1 kez göster
  const [showCreateGuide, setShowCreateGuide] = useState(() =>
    !localStorage.getItem("agro_create_guide_seen")
  );

  const [showProfileCard, setShowProfileCard] = useState(() => {
    if (localStorage.getItem("agro_profile_complete_card_dismissed") === "1") return false;
    const u = getStoredUser();
    return !u?.profilePic;
  });

  // 🔧 KÖK NEDEN DÜZELTMESİ (web bildirim gelmiyor sorunu):
  // Web'de FCM token'ı SADECE kullanıcı Ayarlar > Bildirimler sayfasına
  // gidip elle "Etkinleştir"e basarsa oluşuyordu. Kullanıcıların büyük
  // çoğunluğu o sayfaya hiç gitmediği için device_tokens tablosunda
  // web_fcm satırı hiç oluşmuyordu (native/Android'de bu adım
  // gerekmediği için orada çalışıyordu). Bu banner, kullanıcıya feed'de
  // doğrudan bir tıklama fırsatı sunarak izin isteğini tetikler.
  const [showPushBanner, setShowPushBanner] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (localStorage.getItem("agro_push_banner_dismissed") === "1") return false;
    return Notification.permission === "default";
  });
  const [pushBannerLoading, setPushBannerLoading] = useState(false);

  const dismissPushBanner = () => {
    setShowPushBanner(false);
    try { localStorage.setItem("agro_push_banner_dismissed", "1"); } catch {}
  };

  const enablePushFromBanner = async () => {
    const authToken = getToken();
    if (!authToken) { setShowPushBanner(false); return; }
    setPushBannerLoading(true);
    try {
      const { requestAndRegisterWebPush } = await import("@/lib/fcm");
      await requestAndRegisterWebPush(authToken);
    } catch {
      // sessiz geç
    } finally {
      setPushBannerLoading(false);
      dismissPushBanner();
    }
  };

  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [feedMode, setFeedMode] = useState<FeedMode>(
    () => (localStorage.getItem("feedMode") as FeedMode) || "normal"
  );

  // Arama
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hashtagResults, setHashtagResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Lider tablosu
  const [topUsers, setTopUsers] = useState<any[]>([]);

  // Bildirim sayısı
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  // Okunmamış mesaj sayısı
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("agro_theme");
    if (saved === "dark") { document.documentElement.classList.add("dark"); return true; }
    if (saved === "light") { document.documentElement.classList.remove("dark"); return false; }
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (sys) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    return sys;
  });

  // Reels
  const [reelsMode, setReelsMode] = useState(false);
  const [reelsIdx, setReelsIdx] = useState(0);

  // Akış reklamları (sponsorlu kart)
  const feedAds = useFeedAds(5);

  // Bölge hastalık alarmları
  const [diseaseAlarms, setDiseaseAlarms] = useState<any[]>([]);

  const deleteDiseaseAlarm = async (alarmId: string) => {
    const token = getToken();
    try {
      await fetch(`https://sehitumitkestitarimmtal.com/api/disease-alarms/${alarmId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiseaseAlarms(prev => prev.filter(a => a.id !== alarmId));
    } catch {}
  };

  // Ref'ler sayesinde observer closure hiçbir zaman stale olmaz
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadFeed = useCallback(async (p: number, retryCount = 0) => {
    if (loadingRef.current && p > 1) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      // p=1 → sunucu seenIds'i sıfırlar (sayfa yeni açıldı/yenilendi)
      // p>1 → sunucu seenIds'e göre yeni postlar döner
      const data = p === 1 ? await refreshFeed(20) : await getFeed(p, 20);
      const newPosts: any[] = data.posts || [];
      if (p === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => {
          const ids = new Set(prev.map((x: any) => x.id));
          return [...prev, ...newPosts.filter((x: any) => !ids.has(x.id))];
        });
      }
      // Sunucudan gelen hasMore'u kullan
      const more = typeof data.hasMore === "boolean" ? data.hasMore : newPosts.length > 0;
      hasMoreRef.current = more;
      setHasMore(more);
      if (p === 1 && newPosts.length === 0 && retryCount === 0) {
        setTimeout(() => loadFeed(1, 1), 1500);
      }
    } catch {
      if (retryCount === 0) setTimeout(() => loadFeed(p, 1), 2000);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = feedCache;
    const isFresh = cached && Date.now() - cached.timestamp < FEED_CACHE_TTL;
    if (isFresh && cached) {
      // ✅ Önbellekten geri yükle — sunucuya tekrar istek atma
      setPosts(cached.posts);
      setPage(cached.page);
      pageRef.current = cached.page;
      setHasMore(cached.hasMore);
      hasMoreRef.current = cached.hasMore;
      setLoading(false);
      const targetY = cached.scrollY;
      // İçerik (görseller vs.) yerleşsin diye kaydırmayı bir tık geciktir
      requestAnimationFrame(() => {
        setTimeout(() => window.scrollTo({ top: targetY, behavior: "auto" }), 50);
      });
    } else {
      loadFeed(1);
    }
  }, [loadFeed]);

  // Postlar/sayfa/hasMore değiştikçe önbelleği güncel tut
  useEffect(() => {
    if (loading && posts.length === 0) return; // ilk yükleme bitmeden önbelleği ezme
    feedCache = {
      posts,
      page,
      hasMore,
      scrollY: feedCache?.scrollY ?? 0,
      timestamp: Date.now(),
    };
  }, [posts, page, hasMore]);

  // Kaydırma konumunu sürekli önbelleğe yaz (sayfadan ayrılırken kaybolmasın)
  useEffect(() => {
    const onScroll = () => {
      if (feedCache) feedCache.scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // DM'den paylaşılan post deep-link: /feed?post=<id>
  useEffect(() => {
    const postId = searchParams.get("post");
    if (!postId) return;
    const token = getToken();
    fetch(`https://sehitumitkestitarimmtal.com/api/posts/${postId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.post || d?.id) setDeepLinkedPost(d?.post || d);
      })
      .catch(() => {});
  }, [searchParams]);

  // Görüntülenme takibi: yenilemede tekrar artışı önlemek için kalıcı (localStorage)
  useEffect(() => {
    if (!posts.length) return;
    import("@/lib/mediaPrefs").then(({ filterUnviewed, markViewed }) => {
      const ids = posts.map((p) => p.id).filter(Boolean);
      const fresh = filterUnviewed(ids);
      if (!fresh.length) return;
      const t = setTimeout(() => {
        batchViewPosts(fresh).then(() => markViewed(fresh)).catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    });
  }, [posts]);

  // FCM Web Push — izin zaten verilmişse sessizce token'ı senkronize et.
  // Otomatik izin İSTEMİYORUZ (tarayıcı kullanıcı jesti olmadan gelen izin
  // isteklerini engelliyordu). Gerçek izin isteği Ayarlar sayfasındaki
  // butondan (kullanıcı tıklamasıyla) yapılıyor.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    syncWebPushTokenSilently(token).then((t) => {
      if (t) console.info("[FCM] web_fcm token senkronize edildi:", t.slice(0, 20) + "...");
    });
  }, []);

  useEffect(() => {
    // Lider tablosu
    const token = getToken();
    fetch("https://sehitumitkestitarimmtal.com/api/users/top-engagement", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.json()).then(d => setTopUsers(d.users || [])).catch(() => {});

    // Bildirim sayısı
    getNotifications(1).then((d) => {
      const notifs = d.notifications || [];
      setUnreadNotifs(notifs.filter((n: any) => !n.read).length);
    }).catch(() => {});

    // Bölge hastalık alarmları (son 48 saat)
    if (token) {
      fetch("https://sehitumitkestitarimmtal.com/api/disease-alarms", {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => {
        const alarms = (d.alarms || []).filter((a: any) => {
          const diff = Date.now() - new Date(a.createdAt).getTime();
          return diff < 48 * 60 * 60 * 1000; // 48 saat
        });
        setDiseaseAlarms(alarms);
      }).catch(() => {});
    }

    // Bildirim sayısı (tekrar — duplicate kaldırıldı)
    getNotifications(1).then((d) => {
      const notifs = d.notifications || [];
      setUnreadNotifs(notifs.filter((n: any) => !n.read).length);
    }).catch(() => {});

    // Okunmamış mesaj sayısı — 30sn'de bir poll
    const fetchUnreadMsgs = async () => {
      try {
        const tk = getToken() || "";
        if (!tk) return;
        const r = await fetch("https://sehitumitkestitarimmtal.com/api/messages/unread/count", {
          headers: { Authorization: `Bearer ${tk}` },
        });
        if (r.ok) { const d = await r.json(); setUnreadMsgs(Number(d.unreadCount ?? 0)); }
      } catch {}
    };
    fetchUnreadMsgs();
    const msgInterval = setInterval(fetchUnreadMsgs, 30_000);

    return () => clearInterval(msgInterval);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("agro_theme", next ? "dark" : "light");
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  // loadMore — ref'lerden okur, closure asla stale olmaz
  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    const next = pageRef.current + 1;
    pageRef.current = next;
    setPage(next);
    loadFeed(next);
  }, [loadFeed]);

  // Observer — sadece 1 kez mount'ta kurulur, loadMore her zaman güncel
  const loadMoreCallbackRef = useRef(loadMore);
  useEffect(() => { loadMoreCallbackRef.current = loadMore; }, [loadMore]);

  useEffect(() => {
    const el = feedEndRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreCallbackRef.current(); },
      { threshold: 0, rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // intentionally empty — refs handle staleness

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) { setSearchResults([]); setHashtagResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [userRes, hashRes] = await Promise.all([
          searchUsers(q),
          searchHashtags(q.startsWith("#") ? q.slice(1) : q),
        ]);
        setSearchResults(userRes.users || []);
        setHashtagResults((hashRes.hashtags || []).slice(0, 3));
      } catch {}
      setSearchLoading(false);
    }, 300);
  };

  // Get media posts for grid mode with reels
  const mediaPosts = useMemo(() => posts.filter(p => {
    const rawUrl = p.mediaUrls?.[0];
    const img = (rawUrl && typeof rawUrl === "object" ? rawUrl.url : rawUrl) || p.mediaUrl || p.media;
    return !!img;
  }), [posts]);

  const openReels = useCallback((post: any, index: number) => {
    setReelsIdx(index);
    setReelsMode(true);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 overflow-x-hidden">
      {/* Header */}
      <header
        className={`sticky top-0 z-40 glass border-b border-border transition-transform duration-300 ease-out ${
          navHidden ? "-translate-y-full md:translate-y-0" : "translate-y-0"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 h-16 px-4 lg:px-6">
          {/* ── SOL: Menü (mobil) + Logo + AgroSosyal + Topluluklar ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setNavMenuOpen(true)} aria-label="Menu" className="lg:hidden flex flex-col gap-[5px] active:scale-90 transition-transform mr-0.5">
              <span className="block w-5 h-[2px] bg-foreground rounded-full" />
              <span className="block w-5 h-[2px] bg-foreground rounded-full" />
              <span className="block w-5 h-[2px] bg-foreground rounded-full" />
            </button>

            <button onClick={() => navigate("/feed")} className="flex items-center gap-2 active:scale-95 transition-transform">
              <img
                src="https://sehitumitkestitarimmtal.com/agro.png"
                alt="Agro"
                className="h-9 w-9 object-cover rounded-xl shadow-sm ring-1 ring-border/50"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="inline font-extrabold text-base sm:text-lg tracking-tight text-foreground whitespace-nowrap">
                Agro<span className="text-primary">Sosyal</span>
              </span>
            </button>

            <button
              onClick={() => navigate("/communities")}
              aria-label={t("navCommunities")}
              title={t("navCommunities")}
              className="relative group w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                         bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15
                         hover:from-violet-500/25 hover:to-fuchsia-500/25
                         ring-1 ring-violet-500/30 active:scale-90 transition"
            >
              <Users className="w-[18px] h-[18px] text-violet-500 group-hover:text-violet-400" strokeWidth={2.2} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-fuchsia-500 ring-2 ring-background" />
            </button>
          </div>

          {/* ── ORTA: Arama (yalnızca geniş ekran) ── */}
          <div className="hidden lg:flex flex-1 items-center justify-center min-w-0">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                placeholder={t("feedSearchPlaceholder")}
                className="w-full bg-secondary border border-border py-2.5 pl-11 pr-4 rounded-full text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>

          {/* ── SAĞ: Dil + Tema + Bildirim — tek düzenli sıra ── */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="hidden sm:block">
              <LanguageSwitcher variant="compact" />
            </div>

            <button onClick={toggleDark} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors" aria-label="Tema">
              {darkMode ? <Sun className="w-[19px] h-[19px] text-foreground" strokeWidth={1.8} /> : <Moon className="w-[19px] h-[19px] text-foreground" strokeWidth={1.8} />}
            </button>

            <button onClick={() => navigate("/notifications")} aria-label={t("navNotifications")} className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary active:scale-90 transition-transform">
              <Bell className="w-[21px] h-[21px] text-foreground" strokeWidth={1.8} />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-background">
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      {/* Yan menü drawer */}
      {navMenuOpen && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setNavMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[82%] max-w-xs bg-card border-r border-border shadow-2xl p-5 animate-slide-in-left flex flex-col gap-2">
            <div className="flex items-center gap-3 pb-4 border-b border-border mb-2">
              <img src="https://sehitumitkestitarimmtal.com/agro.png" alt="" className="w-10 h-10 rounded-xl object-contain ring-1 ring-border" />
              <div>
                <div className="font-extrabold text-foreground">AgroSosyal</div>
                <div className="text-xs text-muted-foreground">{t("navMenu")}</div>
              </div>
            </div>
            {[
              { label: t("navHome"), path: "/feed" },
              { label: t("navSearch"), path: "/search" },
              { label: t("navNotifications"), path: "/notifications" },
              { label: t("navMessages"), path: "/chat" },
              { label: t("navProfile"), path: "/profile" },
              { label: t("navFeatures"), path: "/features" },
              { label: t("navSipSak"), path: "/sip-sak-agro" },
              { label: t("navFarmbook"), path: "/farmbook" },
              { label: t("navAi"), path: "/ai" },
              { label: t("navMarket"), path: "/store" },
              { label: t("navField"), path: "/tarla-takip" },
              { label: t("navPrices"), path: "/fiyatlar" },
              { label: t("navCalculator"), path: "/calculator" },
              { label: t("navDiseaseAlarm"), path: "/ai" },
              { label: t("navEmergency"), path: "/acil-yardim" },
              { label: t("settingsTitle"), path: "/settings" },
            ].map(it => (
              <button key={it.path} onClick={() => {
                setNavMenuOpen(false);
                if (it.path === "/ai") { setDiseaseAlarmOpen(true); return; }
                navigate(it.path);
              }}
                className="text-left px-3 py-3 rounded-xl hover:bg-secondary text-foreground font-medium transition-colors active:scale-[0.98]">
                {it.label}
              </button>
            ))}
          </aside>
        </div>
      )}


      {/* Stories — sadece mobil */}
      <div className="max-w-lg mx-auto border-b border-border lg:hidden">
        <StoriesBar />
      </div>

      {/* Desktop: 3 sütun (sol nav + feed + sağ panel) — X/Twitter benzeri */}
      <div className="lg:max-w-7xl lg:mx-auto lg:grid lg:grid-cols-[260px_minmax(0,600px)_340px] lg:gap-8 lg:px-6 lg:pt-6 lg:justify-center">
        {/* Sol sticky nav (masaüstü) */}
        <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar pb-6">
          <nav className="space-y-1">
            {[
              { label: t("navHome"), path: "/feed", icon: Home },
              { label: t("navSearch"), path: "/search", icon: Compass },
              { label: t("navMessages"), path: "/chat", icon: MessageCircle },
              { label: t("navNotifications"), path: "/notifications", icon: Bell },
              { label: t("navProfile"), path: "/profile", icon: User },
              { label: t("navSipSak"), path: "/sip-sak-agro", icon: Camera },
              { label: t("navFarmbook"), path: "/farmbook", icon: BookOpen },
              { label: t("navAi"), path: "/ai", icon: Bot },
              { label: t("navMarket"), path: "/store", icon: ShoppingBag },
              { label: t("navField"), path: "/tarla-takip", icon: Sprout },
              { label: t("navPrices"), path: "/fiyatlar", icon: TrendingUp },
              { label: t("navCalculator"), path: "/calculator", icon: CalcIcon },
              { label: t("navDiseaseAlarm"), path: "/disease-alarm", icon: Bug },
              { label: t("navEmergency"), path: "/acil-yardim", icon: AlertTriangle },
              { label: t("settingsTitle"), path: "/settings", icon: Settings },
            ].map((it) => {
              const Icon = it.icon;
              const active = typeof window !== "undefined" && window.location.pathname === it.path;
              return (
                <button
                  key={it.label}
                  onClick={() => {
                    if (it.path === "/disease-alarm") { setDiseaseAlarmOpen(true); return; }
                    navigate(it.path);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold transition-all ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2.4 : 1.9} />
                  <span className="truncate">{it.label}</span>
                </button>
              );
            })}
          </nav>
          <button
            onClick={() => navigate("/create")}
            className="mt-4 w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl shadow-md hover:shadow-lg hover:opacity-95 transition-all active:scale-[0.98]"
          >
            Gönderi Oluştur
          </button>
        </aside>

      <main className="max-w-lg mx-auto w-full px-4 pt-4 space-y-4 lg:max-w-none lg:mx-0 lg:px-0 lg:pt-0 min-w-0">

        {/* Arama Alanı */}
        <div className="relative lg:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              placeholder={t("feedSearchPlaceholder")}
              className="w-full bg-secondary border border-border py-3 pl-11 pr-4 rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); setHashtagResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showSearchResults && searchQuery.trim().length >= 2 && (
            <div className="absolute top-14 w-full z-40 bg-card border border-border rounded-2xl shadow-xl p-2 max-h-72 overflow-y-auto">
              {searchLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
              {hashtagResults.map((tag: any) => (
                <button key={tag.id || tag.tag} onClick={() => navigate(`/search?hashtag=${encodeURIComponent(tag.tag)}`)} className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-xl transition-colors text-left">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">#</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">#{tag.tag}</p>
                    <p className="text-xs text-muted-foreground">{tag.postCount || 0} gönderi</p>
                  </div>
                </button>
              ))}
              {searchResults.map((res: any) => (
                <button key={res.id} onClick={() => { setShowSearchResults(false); navigate(`/user/${res.id}`); }} className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-xl transition-colors text-left">
                  <img src={res.profilePic ? absoluteUrl(res.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{res.name || res.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{res.username}</p>
                  </div>
                  {res.isFollowing && <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">{t("feedFollowing")}</span>}
                </button>
              ))}
              {!searchLoading && searchResults.length === 0 && hashtagResults.length === 0 && (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <Search className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">"{searchQuery}" için sonuç bulunamadı</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lider Tablosu */}
        {topUsers.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-3">🏆 En Çok Etkileşim</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {topUsers.slice(0, 4).map((eu: any, idx: number) => {
                const medals = ["🥇", "🥈", "🥉", "🏅"];
                const avatar = eu.profileImage || eu.profilePic
                  ? absoluteUrl(eu.profileImage || eu.profilePic)
                  : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                return (
                  <button key={eu.id} onClick={() => navigate(`/user/${eu.id}`)} className="flex items-center gap-2 flex-shrink-0 bg-secondary px-3 py-2 rounded-xl hover:bg-primary/10 transition-colors active:scale-95">
                    <span className="text-base">{medals[idx]}</span>
                    <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-foreground leading-none">{(eu.name || "").split(" ")[0]}</p>
                      <p className="text-[10px] text-primary font-bold">{eu.totalEngagement || (eu.totalLikes || 0) + (eu.totalShares || 0)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── İlk 10 kişiyi takip et — yeni/ilk kayıt olan kullanıcılara gösterilir ── */}
        <FirstFollowWidget />

        {/* Feed Mod Toggle */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2 justify-end">
          <button
            onClick={() => { setFeedMode("normal"); localStorage.setItem("feedMode", "normal"); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${feedMode === "normal" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setFeedMode("media"); localStorage.setItem("feedMode", "media"); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${feedMode === "media" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
        </div>

        {/* Bildirim izni banner — kullanıcı tıklamasıyla FCM token kaydı tetikler */}
        {showPushBanner && (
          <div className="mx-3 my-2 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("pushBannerTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("pushBannerDesc")}</p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={enablePushFromBanner}
                disabled={pushBannerLoading}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
              >
                {pushBannerLoading ? "..." : t("pushBannerEnable")}
              </button>
              <button
                onClick={dismissPushBanner}
                className="px-3 py-1 rounded-lg text-xs text-muted-foreground"
              >
                {t("pushBannerDismiss")}
              </button>
            </div>
          </div>
        )}

        {/* Profil tamamlama kartı — 1 kez göster */}
        {showProfileCard && (
          <ProfileCompleteCard
            user={currentUser}
            onDismiss={() => setShowProfileCard(false)}
            onUpdated={(u) => {
              // currentUser referansını güncelle (sayfa reload gerekmeden)
              setShowProfileCard(false);
            }}
          />
        )}

        {/* ── Paylaşım rehber kartı (yeni kullanıcıya göster) ── */}
        {showCreateGuide && (
          <div className="mx-3 my-2 p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground">İlk gönderini paylaş!</p>
              <p className="text-[12px] text-muted-foreground">Aşağıdaki ✚ butonuna basarak tarla, ürün veya tecrübeni paylaş.</p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem("agro_create_guide_seen", "1");
                setShowCreateGuide(false);
                navigate("/create");
              }}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-primary text-primary-foreground flex-shrink-0"
            >
              Paylaş
            </button>
            <button
              onClick={() => { localStorage.setItem("agro_create_guide_seen", "1"); setShowCreateGuide(false); }}
              className="text-muted-foreground p-1"
              aria-label={t("close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Feed İçeriği */}
        {loading && posts.length === 0 ? (
          <FeedSkeleton count={2} />
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Sprout className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{t("feedNoPost")}</p>
            <p className="text-xs text-muted-foreground">Birilerini takip ederek akışınızı doldurun!</p>
          </div>
        ) : feedMode === "media" ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {mediaPosts.map((post, index) => {
                const rawUrl = post.mediaUrls?.[0];
                const img = absoluteUrl((rawUrl && typeof rawUrl === "object" ? rawUrl.url : rawUrl) || post.mediaUrl || post.media || "");
                const displayName = post.name || post.authorUsername || post.username || "user";
                const handle = post.authorUsername || post.username || "user";
                const avatar = post.profilePic
                  ? absoluteUrl(post.profilePic)
                  : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                // Grid modunda da reklam: her 9 görselden sonra tam satır sponsorlu kart
                const gridAd = feedAds.length > 0 && index > 0 && (index + 1) % 9 === 0
                  ? feedAds[Math.floor((index + 1) / 9 - 1) % feedAds.length]
                  : null;
                return (
                  <Fragment key={post.id}>
                  <button
                    onClick={() => {
                      // 🎬 DÜZELTMESİ: video postlar artık ayrı /reels sayfasında
                      // (kendi endpoint'i, sadece video) açılıyor. Resim postları
                      // eski davranışını koruyor (aynı sayfada hafif galeri modu).
                      if (post.mediaType === "video") navigate("/reels");
                      else openReels(post, index);
                    }}
                    className="relative aspect-[3/4] group rounded-2xl overflow-hidden bg-card border border-border active:scale-[0.98] transition-transform"
                  >
                    {post.mediaType === "video"
                      ? <video src={img} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="none" />
                      : <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}

                    {/* Üst gradient + kullanıcı bilgisi */}
                    <div className="absolute inset-x-0 top-0 p-2.5 bg-gradient-to-b from-black/65 to-transparent flex items-center gap-2">
                      <img
                        src={avatar}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-white/80 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); post.userId && navigate(`/user/${post.userId}`); }}
                      />
                      <div className="min-w-0 text-left">
                        <p className="text-[12px] font-bold text-white truncate leading-tight drop-shadow">{displayName}</p>
                        <p className="text-[10px] text-white/85 truncate leading-tight drop-shadow">@{handle}</p>
                      </div>
                    </div>

                    {post.mediaType === "video" && (
                      <div className="absolute top-2 right-2">
                        <svg className="w-4 h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}

                    {/* Alt etkileşim sayıları */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-3 text-white text-[11px] font-semibold">
                      <span className="flex items-center gap-1">♥ {post.likeCount || 0}</span>
                      <span className="flex items-center gap-1">💬 {post.commentCount || 0}</span>
                      <span className="flex items-center gap-1">👁 {post.views ?? post.viewCount ?? 0}</span>
                    </div>
                  </button>
                  {gridAd && (
                    <div className="col-span-full">
                      <AdCard ad={gridAd} />
                    </div>
                  )}
                  </Fragment>
                );
              })}
            </div>
            <div className="h-8 flex items-center justify-center">
              {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </div>
          </>
        ) : (
          <>
            {/* Bölge Hastalık Alarm Kartları */}
            {diseaseAlarms.length > 0 && (
              <div className="space-y-2">
                {diseaseAlarms.map((alarm: any) => (
                  <div key={alarm.id} className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex gap-3 items-start">
                    <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bug className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-red-600">⚠️ {t("feedRegionAlarm")}</span>
                        <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full font-semibold">{alarm.cropType}</span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{alarm.city}{alarm.district ? ` / ${alarm.district}` : ""}</span>
                      </div>
                      <p className="text-sm text-foreground mt-1 line-clamp-2">{alarm.diseaseInfo || alarm.note || t("feedDiseaseDetected")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alarm.name || alarm.username} · {new Date(alarm.createdAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {alarm.notifiedCount > 0 && ` · ${alarm.notifiedCount} ${t("feedFarmersNotified")}`}
                      </p>
                    </div>
                    {alarm.reporterId === currentUser?.id && (
                      <button
                        onClick={() => deleteDiseaseAlarm(alarm.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-500 transition-colors"
                        title={t("feedDeleteAlarm")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 🔧 DÜZELTMESİ — "feed'de görsel kişisel profildeki gibi kenara
                yakın değil" sorunu: PostCard iki yerde de birebir aynı dosya
                (mx-1.5 kenar boşluğu var), asıl fark SARMALAYICIDA idi.
                ProfilePage'de post listesi "-mx-4" ile <main>'in px-4
                padding'ini iptal edip postları tam genişliğe yayıyordu; feed
                sayfasında bu telafi hiç yoktu, bu yüzden <main>'in px-4'ü
                PostCard'ın mx-1.5'inin ÜSTÜNE binip görseli daha içeride/uzak
                gösteriyordu. Aynı "-mx-4" burada da uygulanınca iki sayfa
                artık birebir aynı kenar boşluğuna sahip oluyor. */}
            <div className="-mx-4 lg:mx-0">
              {posts.map((post, idx) => {
                // Her 7 postta bir, sahip olduğumuz reklamlardan birini sıra ile göster.
                // İlk 4 posttan önce reklam çıkmasın, kullanıcıyı boğmayalım.
                // Akışta reklam yoğunluğu: 2. posttan sonra her 4 postta bir
                const showAd =
                  feedAds.length > 0 &&
                  idx >= 4 &&
                  (idx - 4) % 8 === 0;
                const adIndex = Math.floor((idx - 4) / 8) % Math.max(feedAds.length, 1);
                return (
                  <div key={post.id} style={{ contain: "content" }}>
                    <PostCard post={post} />
                    {idx === 7 && <SuggestedUsersCard />}
                    {showAd && feedAds[adIndex] && (
                      <div className="mt-3 px-4 lg:px-0">
                        <AdCard ad={feedAds[adIndex]} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="h-8 flex items-center justify-center">
              {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </div>
          </>
        )}
        {/* Sentinel — her zaman DOM'da, koşul dışında */}
        <div ref={feedEndRef} className="h-4" aria-hidden />
      </main>

      {/* Sağ panel (masaüstü) */}
      <aside className="hidden lg:block sticky top-20 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar pb-6">
        <div className="bg-card border border-border rounded-3xl p-4">
          <p className="text-sm font-bold text-foreground mb-3">{t("feedQuickAccess")}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { labelKey: "navPrices", path: "/fiyatlar", icon: TrendingUp, color: "from-emerald-500 to-emerald-600" },
              { labelKey: "navField", path: "/tarla-takip", icon: Sprout, color: "from-violet-500 to-violet-700" },
              { labelKey: "navMarket", path: "/store", icon: ShoppingBag, color: "from-pink-500 to-pink-600" },
              { labelKey: "navEmergency", path: "/acil-yardim", icon: AlertTriangle, color: "from-red-500 to-red-600" },
              { labelKey: "navDiseaseAlarm", path: "/disease-alarm", icon: Bug, color: "from-orange-500 to-orange-700" },
            ].map((q) => {
              const Icon = q.icon;
              return (
                <button key={q.path} onClick={() => {
                  if (q.path === "/disease-alarm") { setDiseaseAlarmOpen(true); return; }
                  navigate(q.path);
                }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gradient-to-br ${q.color} text-white text-xs font-bold active:scale-95 transition-transform shadow-sm hover:shadow-md`}>
                  <Icon className="w-4 h-4" />
                  <span>{t(q.labelKey as any)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {topUsers.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-4">
            <p className="text-sm font-bold text-foreground mb-3">🏆 En Çok Etkileşim</p>
            <div className="space-y-2">
              {topUsers.slice(0, 5).map((eu: any, idx: number) => {
                const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
                const avatar = eu.profileImage || eu.profilePic
                  ? absoluteUrl(eu.profileImage || eu.profilePic)
                  : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                return (
                  <button key={eu.id} onClick={() => navigate(`/user/${eu.id}`)} className="w-full flex items-center gap-3 p-2 hover:bg-secondary rounded-xl transition-colors">
                    <span className="text-base">{medals[idx]}</span>
                    <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-foreground truncate">{eu.name}</p>
                      <p className="text-xs text-primary font-bold">{eu.totalEngagement || 0} etkileşim</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
      </div>

      <BottomNav />

      {reelsMode && (
        <ReelsViewer posts={mediaPosts} startIndex={reelsIdx} onClose={() => setReelsMode(false)} />
      )}

      {diseaseAlarmOpen && (
        <DiseaseAlarmModal
          diseaseResult=""
          onClose={() => setDiseaseAlarmOpen(false)}
          onSent={() => setDiseaseAlarmOpen(false)}
        />
      )}

      {/* DM'den paylaşılan post deep-link modalı */}
      {deepLinkedPost && (
        <PostModal
          post={deepLinkedPost}
          onClose={() => {
            setDeepLinkedPost(null);
            navigate("/feed", { replace: true });
          }}
        />
      )}
    </div>
  );
};

export default FeedPage;









