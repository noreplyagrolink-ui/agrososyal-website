import { useState, useCallback, useEffect, useRef, Component, ReactNode } from "react";
import {
  Search, Loader2, UserPlus, Check, Hash, FileText,
  TrendingUp, Play, RefreshCw, X, Clapperboard, Image as ImageIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import ReelsViewer from "@/components/ReelsViewer";
import { Skeleton } from "@/components/ui/skeleton";

// ── Inline API helpers (api.ts'e bağımlılık yok) ────────────────────
const BASE = "https://sehitumitkestitarimmtal.com";

function getToken(): string {
  return localStorage.getItem("token") || "";
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const getExploreAlgo = (page: number, limit: number) =>
  apiFetch(`/api/explore?page=${page}&limit=${limit}`);

const searchUsers = (q: string) =>
  apiFetch(`/api/search/users?q=${encodeURIComponent(q)}`);

const searchPosts = (q: string) =>
  apiFetch(`/api/search/posts?q=${encodeURIComponent(q)}`);

const getTrendingHashtags = () =>
  apiFetch("/api/trending");

const toggleFollow = (userId: string) =>
  apiFetch(`/api/users/${userId}/follow`, { method: "POST" });

// ── Verified rozet (PostCard.tsx ile aynı ikon) ──────────────────────
const VerifiedBadge = () => (
  <svg width="15" height="15" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
    <path d="M17.7508 9.41667C17.7508 8.1 17.0217 6.95833 15.9608 6.41667C16.0892 6.05417 16.1592 5.6625 16.1592 5.25C16.1592 3.40833 14.7342 1.91833 12.9775 1.91833C12.5858 1.91833 12.2108 1.98833 11.8642 2.12667C11.3492 1.0125 10.2592 0.25 9.00083 0.25C7.7425 0.25 6.65417 1.01417 6.13667 2.125C5.79083 1.9875 5.415 1.91667 5.02333 1.91667C3.265 1.91667 1.84167 3.40833 1.84167 5.25C1.84167 5.66167 1.91083 6.05333 2.03917 6.41667C0.979167 6.95833 0.25 8.09833 0.25 9.41667C0.25 10.6625 0.901667 11.7483 1.86833 12.3217C1.85167 12.4633 1.84167 12.605 1.84167 12.75C1.84167 14.5917 3.265 16.0833 5.02333 16.0833C5.415 16.0833 5.79 16.0117 6.13583 15.875C6.6525 16.9867 7.74083 17.75 9 17.75C10.26 17.75 11.3483 16.9867 11.8642 15.875C12.21 16.0108 12.585 16.0817 12.9775 16.0817C14.7358 16.0817 16.1592 14.59 16.1592 12.7483C16.1592 12.6033 16.1492 12.4617 16.1317 12.3208C17.0967 11.7483 17.7508 10.6625 17.7508 9.4175V9.41667Z" fill="#1D9BF0"/>
    <path d="M12.2375 6.63833L8.62583 12.055C8.505 12.2358 8.3075 12.3333 8.105 12.3333C7.98583 12.3333 7.865 12.3 7.75833 12.2283L7.6625 12.15L5.65 10.1375C5.40583 9.89333 5.40583 9.4975 5.65 9.25417C5.89417 9.01083 6.29 9.00917 6.53333 9.25417L8.00833 10.7267L11.1958 5.94333C11.3875 5.65583 11.7758 5.58 12.0625 5.77083C12.3508 5.9625 12.4292 6.35083 12.2375 6.6375V6.63833Z" fill="white"/>
  </svg>
);

// ── Error boundary ───────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.error("SearchPage error:", err); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

type SearchTab = "explore" | "users" | "posts" | "trending";
type ExploreKind = "photos" | "videos";

// ── İskelet yüklemeler ───────────────────────────────────────────────
const ExploreGridSkeleton = () => (
  <div className="rounded-2xl overflow-hidden m-0.5" aria-busy="true">
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 15 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-none" />
      ))}
    </div>
  </div>
);

const UserRowsSkeleton = () => (
  <div className="flex flex-col gap-2 px-3 py-2" aria-busy="true">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

const abs = (u: string) => (!u ? u : u.startsWith("http") ? u : `${BASE}${u}`);

/** mediaUrls her zaman güvenli array olsun */
function safeMediaUrls(post: any): any[] {
  const raw = post?.mediaUrls;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function firstThumb(post: any): { url: string; isVideo: boolean } | null {
  const urls = safeMediaUrls(post);
  const first = urls[0];
  const rawUrl =
    (first && typeof first === "object" ? first.url : first) ||
    post?.mediaUrl ||
    post?.media ||
    "";
  if (!rawUrl) return null;
  const url = abs(rawUrl);
  const isVideo =
    post?.mediaType === "video" ||
    (first && typeof first === "object" && first.type === "video") ||
    /\.(mp4|webm|mov)$/i.test(url);
  return { url, isVideo };
}

// ── Thumb hücre: yüklenirken blur → gerçek görüntü ──────────────────
function ThumbCell({
  thumb, post, onClick,
}: {
  thumb: { url: string; isVideo: boolean };
  post: any;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      className="relative aspect-square overflow-hidden bg-muted active:opacity-75 transition-opacity"
      onClick={onClick}
    >
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted-foreground/10 to-muted" />
      )}

      {thumb.isVideo ? (
        <video
          src={thumb.url}
          className={`w-full h-full object-cover transition-all duration-500 ${loaded ? "blur-0 scale-100" : "blur-md scale-105"}`}
          muted
          playsInline
          onLoadedData={() => setLoaded(true)}
        />
      ) : (
        <img
          src={thumb.url}
          alt=""
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-500 ${loaded ? "blur-0 scale-100" : "blur-md scale-105"}`}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            setLoaded(true);
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />
      )}

      {/* Video rozeti */}
      {thumb.isVideo && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
          <Play className="w-2.5 h-2.5 text-white fill-white" />
        </div>
      )}

      {/* Hover overlay */}
      {post.likeCount > 0 && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
          <span className="text-white text-xs font-bold drop-shadow">❤️ {post.likeCount}</span>
        </div>
      )}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────
const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(
    searchParams.get("hashtag") ? "#" + searchParams.get("hashtag") : ""
  );
  const [activeTab, setActiveTab] = useState<SearchTab>(
    searchParams.get("hashtag") ? "posts" : "explore"
  );

  // Explore
  const [exploreKind, setExploreKind] = useState<ExploreKind>("photos");
  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [exploreError, setExploreError] = useState(false);
  const [explorePage, setExplorePage] = useState(1);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Search
  const [userResults, setUserResults] = useState<any[]>([]);
  const [postResults, setPostResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Trending hashtags
  const [trendingTags, setTrendingTags] = useState<{ tag: string; postCount: number }[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Reels viewer
  const [reelsIdx, setReelsIdx] = useState(0);
  const [reelsMode, setReelsMode] = useState(false);

  // ── load explore ──
  const loadExplore = useCallback(async (page: number, append = false) => {
    try {
      if (page === 1) setExploreLoading(true);
      else setLoadingMore(true);
      setExploreError(false);
      const data = await getExploreAlgo(page, 30);
      const incoming: any[] = data.posts || [];
      setExploreHasMore(data.hasMore ?? incoming.length === 30);
      setExplorePosts((prev) => append ? [...prev, ...incoming] : incoming);
    } catch {
      setExploreError(true);
    } finally {
      setExploreLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadExplore(1); }, [loadExplore]);

  // Trending hashtags yükle
  const loadTrending = useCallback(async () => {
    if (trendingTags.length > 0) return; // zaten yüklüyse tekrar çekme
    setTrendingLoading(true);
    try {
      const data = await getTrendingHashtags();
      setTrendingTags(data.hashtags || []);
    } catch { /* sessizce geç */ } finally {
      setTrendingLoading(false);
    }
  }, [trendingTags.length]);

  // hashtag param
  useEffect(() => {
    const ht = searchParams.get("hashtag");
    if (ht) { setActiveTab("posts"); doSearch("#" + ht); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trending sekmesi açıldığında yükle
  useEffect(() => {
    if (activeTab === "trending") loadTrending();
  }, [activeTab, loadTrending]);

  // Infinite scroll
  useEffect(() => {
    if (activeTab !== "explore") return;
    const el = bottomRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && exploreHasMore && !loadingMore && !exploreLoading) {
        const next = explorePage + 1;
        setExplorePage(next);
        loadExplore(next, true);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, exploreHasMore, loadingMore, exploreLoading, explorePage, loadExplore]);

  // ── search ──
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setUserResults([]); setPostResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const [uRes, pRes] = await Promise.all([searchUsers(q), searchPosts(q)]);
      setUserResults(uRes.users || []);
      setPostResults(pRes.posts || []);
    } catch { setUserResults([]); setPostResults([]); }
    setLoading(false);
  }, []);

  const handleInput = (q: string) => {
    setQuery(q);
    if (q.trim().length >= 2 && (activeTab === "explore" || activeTab === "trending")) setActiveTab("users");
    if (q.trim().length < 2 && activeTab !== "explore" && activeTab !== "trending") setActiveTab("explore");
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(q), 380);
  };

  const clearSearch = () => { setQuery(""); setUserResults([]); setPostResults([]); setSearched(false); setActiveTab("explore"); };

  const handleFollow = async (userId: string, idx: number) => {
    const prev = userResults[idx]._followed;
    setUserResults((r) => r.map((u, i) => i === idx ? { ...u, _followed: !prev } : u));
    try { await toggleFollow(userId); } catch {
      setUserResults((r) => r.map((u, i) => i === idx ? { ...u, _followed: prev } : u));
    }
  };

  // ── grid posts (medyalı olanlar) ──
  const gridPosts = explorePosts.filter((p) => !!firstThumb(p));
  // Keşfet ikiye bölündü: Fotoğraflar | Videolar
  const photoPosts = gridPosts.filter((p) => !firstThumb(p)!.isVideo);
  const videoPosts = gridPosts.filter((p) => firstThumb(p)!.isVideo);
  const activeGrid = exploreKind === "photos" ? photoPosts : videoPosts;

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border"
        style={{
          background: "linear-gradient(160deg,hsl(var(--background)/0.96) 0%,hsl(var(--background)/0.84) 100%)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2 space-y-2.5">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="#hashtag veya kullanıcı ara..."
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
            {query && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5">
            {(searched
              ? [
                  { key: "users" as SearchTab,  label: "Kullanıcılar", icon: UserPlus, count: userResults.length },
                  { key: "posts" as SearchTab,  label: "Gönderiler",   icon: FileText, count: postResults.length },
                ]
              : [
                  { key: "explore" as SearchTab,  label: "Keşfet",   icon: TrendingUp },
                  { key: "trending" as SearchTab, label: "Etiketler", icon: Hash },
                ]
            ).map(({ key, label, icon: Icon, count }: any) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count !== undefined && count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === key ? "bg-white/20" : "bg-primary/10 text-primary"
                  }`}>{count}</span>
                )}
              </button>
            ))}

            {/* 🎬 Reels — Keşfet/Etiketler sekmelerinin yanında sabit buton.
                Diğer tab'ların aksine bir görünüm değiştirmiyor, doğrudan
                ayrı /reels sayfasına yönlendiriyor. */}
            {!searched && (
              <button
                onClick={() => navigate("/reels")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Clapperboard className="w-3.5 h-3.5" />
                Reels
              </button>
            )}
          </div>

          {/* Keşfet alt bölümleri: Fotoğraflar | Videolar */}
          {!searched && activeTab === "explore" && (
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-secondary" role="tablist">
              {([
                { key: "photos" as ExploreKind, label: "Fotoğraflar", icon: ImageIcon },
                { key: "videos" as ExploreKind, label: "Videolar", icon: Play },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={exploreKind === key}
                  onClick={() => setExploreKind(key)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    exploreKind === key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-lg mx-auto">
        <ErrorBoundary fallback={
          <div className="text-center py-20 space-y-3">
            <p className="text-3xl">😕</p>
            <p className="text-muted-foreground text-sm">Bir şeyler ters gitti.</p>
            <button onClick={() => location.reload()} className="text-primary text-xs font-semibold underline">Yeniden dene</button>
          </div>
        }>

          {/* ── Loading (search) ── */}
          {loading ? (
            activeTab === "posts" ? <ExploreGridSkeleton /> : <UserRowsSkeleton />

          /* ── Explore grid ── */
          ) : activeTab === "explore" ? (
            exploreLoading ? (
              <ExploreGridSkeleton />
            ) : exploreError ? (
              <div className="text-center py-20 space-y-3">
                <p className="text-muted-foreground text-sm">Yüklenemedi</p>
                <button
                  onClick={() => loadExplore(1)}
                  className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tekrar dene
                </button>
              </div>
            ) : (
              <>
                {/* 3 sütun grid - dış köşeler yumuşak */}
                {activeGrid.length > 0 && (
                  <div className="rounded-2xl overflow-hidden m-0.5">
                    <div className="grid grid-cols-3 gap-0.5">
                      {activeGrid.map((post, i) => {
                        const thumb = firstThumb(post)!;
                        return (
                          <ThumbCell
                            key={post.id}
                            thumb={thumb}
                            post={post}
                            onClick={() => { setReelsIdx(i); setReelsMode(true); }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeGrid.length === 0 && !exploreHasMore && (
                  <div className="text-center py-20 space-y-3">
                    {exploreKind === "photos"
                      ? <ImageIcon className="w-12 h-12 text-muted-foreground/25 mx-auto" />
                      : <Play className="w-12 h-12 text-muted-foreground/25 mx-auto" />}
                    <p className="text-muted-foreground text-sm">
                      {exploreKind === "photos" ? "Henüz keşfedilecek fotoğraf yok" : "Henüz keşfedilecek video yok"}
                    </p>
                  </div>
                )}

                {/* Load more (aktif bölüm kısa kalırsa sentinel görünür kalıp devamını yükler) */}
                <div ref={bottomRef} className="py-6 flex justify-center">
                  {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-primary/50" />}
                  {!loadingMore && !exploreHasMore && activeGrid.length > 0 && (
                    <p className="text-[11px] text-muted-foreground/50">Hepsi görüntülendi</p>
                  )}
                </div>
              </>
            )

          /* ── User results ── */
          ) : activeTab === "users" ? (
            !searched ? (
              <div className="text-center py-20 space-y-3">
                <Search className="w-11 h-11 text-muted-foreground/25 mx-auto" />
                <p className="text-muted-foreground text-sm font-medium">Çiftçi arkadaşlarını bul</p>
                <p className="text-muted-foreground/50 text-xs">#hashtag ile gönderi, isimle kullanıcı ara</p>
              </div>
            ) : userResults.length === 0 ? (
              <div className="text-center py-20 space-y-2">
                <UserPlus className="w-10 h-10 text-muted-foreground/25 mx-auto" />
                <p className="text-muted-foreground text-sm">Kullanıcı bulunamadı</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-3 py-2">
                {userResults.map((user, i) => {
                  if (!user?.id) return null;
                  const avatar = user.profilePic
                    ? abs(user.profilePic)
                    : `${BASE}/varsay%C4%B1lan.jpeg`;
                  const isVerified = user.isVerified || user.verified || user.ownerVerified;
                  const isFollowing = user._followed || user.isFollowing;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-white/10 transition-colors"
                      style={{
                        background: "hsl(var(--card) / 0.6)",
                        backdropFilter: "blur(16px) saturate(1.5)",
                        WebkitBackdropFilter: "blur(16px) saturate(1.5)",
                      }}
                    >
                      <img
                        src={avatar}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover cursor-pointer ring-2 ring-primary/15 flex-shrink-0"
                        onClick={() => navigate(`/user/${user.id}`)}
                      />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${user.id}`)}>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-foreground truncate">{user.name || user.username}</p>
                          {isVerified && <VerifiedBadge />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                        {user.followerCount > 0 && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {Number(user.followerCount).toLocaleString("tr-TR")} takipçi
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleFollow(user.id, i)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                          isFollowing
                            ? "bg-secondary text-secondary-foreground"
                            : "text-white"
                        }`}
                        style={!isFollowing ? { background: "linear-gradient(150deg, hsl(var(--primary)), hsl(var(--accent)))" } : undefined}
                      >
                        {isFollowing
                          ? <span className="flex items-center gap-1"><Check className="w-3 h-3" />Takip</span>
                          : <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" />Takip Et</span>
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            )

          /* ── Post results ── */
          ) : activeTab === "posts" ? (
            postResults.length === 0 ? (
              <div className="text-center py-20 space-y-2">
                <Hash className="w-10 h-10 text-muted-foreground/25 mx-auto" />
                <p className="text-muted-foreground text-sm">Gönderi bulunamadı</p>
              </div>
            ) : (
              <div>
                {postResults.map((post: any) =>
                  post?.id ? <PostCard key={post.id} post={post} /> : null
                )}
              </div>
            )

          /* ── Trending hashtags ── */
          ) : (
            trendingLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            ) : trendingTags.length === 0 ? (
              <div className="text-center py-20 space-y-2">
                <Hash className="w-10 h-10 text-muted-foreground/25 mx-auto" />
                <p className="text-muted-foreground text-sm">Henüz etiket yok</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-1">
                {(() => {
                  const maxCount = Math.max(...trendingTags.map(t => t.postCount), 1);
                  return trendingTags.map((item, i) => {
                    const pct = Math.round((item.postCount / maxCount) * 100);
                    // Renk: üst 3 = primary, 4-7 = sarı-turuncu, geri kalan = muted
                    const barColor =
                      i === 0 ? "bg-primary" :
                      i === 1 ? "bg-primary/80" :
                      i === 2 ? "bg-primary/60" :
                      i < 7   ? "bg-amber-400/70" :
                                "bg-muted-foreground/30";
                    return (
                      <button
                        key={item.tag}
                        onClick={() => {
                          const tag = item.tag.replace(/^#/, "");
                          setQuery("#" + tag);
                          setActiveTab("posts");
                          doSearch("#" + tag);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-secondary active:bg-secondary/80 transition-colors text-left group"
                      >
                        {/* Sıra no */}
                        <span className="w-6 shrink-0 text-center text-[11px] font-bold text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
                          {i + 1}
                        </span>

                        {/* Tag + gönderi sayısı */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{item.tag}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {Number(item.postCount).toLocaleString("tr-TR")} gönderi
                          </p>
                        </div>

                        {/* Bar grafiği */}
                        <div className="flex items-end gap-[2px] h-6 shrink-0">
                          {/* 5 bar — soldan sağa yükselen mini histogram */}
                          {[0.3, 0.5, 0.65, 0.85, 1].map((factor, bi) => {
                            const barH = Math.max(4, Math.round((pct / 100) * factor * 24));
                            return (
                              <div
                                key={bi}
                                className={`w-[3px] rounded-full transition-all duration-500 ${barColor}`}
                                style={{ height: barH }}
                              />
                            );
                          })}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )
          )}
        </ErrorBoundary>
      </main>

      {/* Reels viewer */}
      {reelsMode && (
        <ReelsViewer
          posts={activeGrid.filter((p) => p?.id)}
          startIndex={reelsIdx}
          onClose={() => setReelsMode(false)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default SearchPage;



