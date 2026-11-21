import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Loader2, Bell } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import BlurImage from "@/components/BlurImage";
import { getStoredUser, toggleFollow, getToken } from "@/lib/api";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

type Tab = "mutual" | "followers" | "following";

const TABS: { key: Tab; label: string }[] = [
  { key: "mutual", label: "Ortak Takipçiler" },
  { key: "followers", label: "Takipçi" },
  { key: "following", label: "Takip Edilenler" },
];

const FollowListPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "followers";
  const username = params.get("u") || "";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const me = getStoredUser();

  const fetchList = useCallback(async (t: Tab, pg: number, append: boolean) => {
    if (!id) return;
    setLoading(true);
    try {
      const token = getToken();
      const endpoint = t === "mutual"
        ? `${API_BASE}/users/${id}/mutual?page=${pg}&limit=30`
        : `${API_BASE}/users/${id}/${t}/list?page=${pg}&limit=30`;
      const res = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      const items = data[t] || data.users || data.mutual || [];
      setList(prev => append ? [...prev, ...items] : items);
      setHasMore(pg < (data.totalPages || 1));
      setPage(pg);
      // seed following state
      const map: Record<string, boolean> = {};
      items.forEach((u: any) => { map[u.id] = !!(u.isFollowing || u._followed); });
      setFollowingMap(prev => ({ ...prev, ...map }));
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchList(tab, 1, false);
  }, [tab, fetchList]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && hasMore && !loading) fetchList(tab, page + 1, true);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, page, tab, fetchList]);

  const handleFollow = async (uid: string) => {
    const prev = followingMap[uid];
    setFollowingMap(m => ({ ...m, [uid]: !prev }));
    try { await toggleFollow(uid); } catch { setFollowingMap(m => ({ ...m, [uid]: prev })); }
  };

  const filtered = list.filter(u =>
    !search ||
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with logo */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-lg mx-auto grid grid-cols-3 items-center h-14 px-4">
          <span />
          <div className="flex justify-center">
            <img
              src="https://sehitumitkestitarimmtal.com/agro.png"
              alt="Agro"
              className="h-9 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div className="flex justify-end">
            <button className="active:scale-90 transition-transform">
              <Bell className="w-5 h-5 text-foreground" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto grid grid-cols-3 border-b border-border">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative py-3 text-sm font-semibold transition-colors active:scale-95 ${
                tab === t.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* Title row with back arrow */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform" aria-label="Geri">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-extrabold italic text-foreground">{username || "Kullanıcı"}</h1>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
              className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-background text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* List */}
        <div>
          {filtered.map(u => {
            const av = u.profilePic
              ? absoluteUrl(u.profilePic)
              : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
            const isMe = me?.id === u.id;
            const fState = followingMap[u.id];
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 active:bg-secondary/40 transition-colors">
                <button onClick={() => navigate(`/user/${u.id}`)} className="active:scale-95 transition-transform">
                  <BlurImage
                    src={av}
                    alt={u.username}
                    wrapperClassName="w-14 h-14 rounded-full"
                    className="w-14 h-14 object-cover rounded-full"
                  />
                </button>
                <button
                  onClick={() => navigate(`/user/${u.id}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-foreground truncate">{u.name || u.username}</p>
                    {(u.isVerified || u.verified || u.ownerVerified) && (
                      <svg className="w-4 h-4 flex-shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="10" fill="#3b82f6" />
                        <path d="M9 12l2 2 4-4" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    @{u.username}
                    {typeof u.followerCount === "number" && (
                      <span> · {u.followerCount >= 1000
                        ? `${(u.followerCount / 1000).toFixed(1)}B`
                        : u.followerCount} Takipçi</span>
                    )}
                  </p>
                </button>
                {!isMe && (
                  <button
                    onClick={() => handleFollow(u.id)}
                    className={`px-5 h-10 rounded-full text-sm font-bold active:scale-95 transition-transform ${
                      fState
                        ? "bg-secondary text-secondary-foreground border border-border"
                        : "bg-foreground text-background"
                    }`}
                  >
                    {fState ? "Takipte" : "Takip Et"}
                  </button>
                )}
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">Kimse bulunamadı</p>
          )}

          <div ref={sentinelRef} className="h-12 flex items-center justify-center">
            {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FollowListPage;



