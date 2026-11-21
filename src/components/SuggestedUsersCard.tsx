import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, X } from "lucide-react";
import { getUserSuggestions, toggleFollow } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";

interface SuggestedUser {
  id: string;
  name?: string;
  username: string;
  profilePic?: string;
  isVerified?: boolean;
  followerCount?: number;
  reason?: string;
}

const SuggestedUsersCard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    getUserSuggestions()
      .then((d) => {
        if (!alive) return;
        const list = (d.users || d.suggestions || []) as SuggestedUser[];
        setUsers(list.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const handleFollow = async (id: string) => {
    setFollowingMap((m) => ({ ...m, [id]: !m[id] }));
    try { await toggleFollow(id); } catch { setFollowingMap((m) => ({ ...m, [id]: !m[id] })); }
  };

  const dismiss = (id: string) => setDismissedIds((s) => new Set([...s, id]));

  const visible = users.filter((u) => !dismissedIds.has(u.id));
  if (loading || visible.length === 0) return null;

  return (
    <div className="my-4 md:mx-0">
      {/* 🔧 DÜZELTMESİ — çifte negatif margin önlendi: bu kart artık
          FeedPage'de zaten "-mx-4" olan bir wrapper içinde render ediliyor
          (bkz. FeedPage.tsx post listesi), kendi içinde ayrıca "-mx-4"
          uygulanınca kart olması gerekenden fazla dışarı taşıyordu. */}
      <div className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-y md:border md:rounded-3xl border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-foreground leading-tight">Sizin için öneriler</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Tanıyor olabileceğiniz çiftçiler</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/search")}
            className="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
          >
            Tümü <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-5 snap-x snap-mandatory">
          {visible.map((u) => {
            const avatar = u.profilePic
              ? absoluteUrl(u.profilePic)
              : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
            const isFollowing = followingMap[u.id];
            return (
              <div
                key={u.id}
                className="relative flex-shrink-0 w-[200px] snap-start bg-card border border-border rounded-3xl overflow-hidden flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-all"
              >
                {/* cover banner */}
                <div className="relative w-full h-[90px] bg-gradient-to-br from-primary/40 via-accent/30 to-primary/20">
                  <img
                    src={avatar}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                <button
                  onClick={() => dismiss(u.id)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-background/70 backdrop-blur hover:bg-background flex items-center justify-center"
                  aria-label="Gizle"
                >
                    <X className="w-4 h-4 text-foreground" />
                </button>
                </div>
                {/* avatar overlapping */}
                <button onClick={() => navigate(`/user/${u.id}`)} className="active:scale-95 transition-transform -mt-9 z-10">
                  <div className="w-[70px] h-[70px] rounded-full p-[3px] bg-card">
                    <img
                      src={avatar}
                      alt={u.username}
                      className="w-full h-full rounded-full object-cover bg-background"
                    />
                  </div>
                </button>
                <div className="px-3 pb-4 pt-1 w-full flex flex-col items-center">
                  <button
                    onClick={() => handleFollow(u.id)}
                    className={`mt-1 px-6 py-1.5 rounded-full text-[13px] font-bold transition-all active:scale-95 shadow-sm ${
                      isFollowing
                        ? "bg-secondary text-foreground border border-border"
                        : "bg-gradient-to-r from-sky-400 to-blue-500 text-white"
                    }`}
                  >
                    {isFollowing ? "Takip Ediliyor" : "Takip et"}
                  </button>
                  <button
                    onClick={() => navigate(`/user/${u.id}`)}
                    className="mt-2.5 text-[14px] font-bold text-foreground leading-tight truncate max-w-full hover:underline"
                  >
                    {u.name || u.username}
                  </button>
                  <p className="text-[12px] text-muted-foreground truncate max-w-full">@{u.username}</p>
                  {(u.followerCount !== undefined) && (
                    <div className="mt-2 grid grid-cols-3 gap-1 w-full text-center">
                      <div>
                        <p className="text-[12px] font-bold text-foreground">0</p>
                        <p className="text-[10px] text-muted-foreground">takip</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-foreground">{formatK(u.followerCount || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">takipçi</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-foreground">0</p>
                        <p className="text-[10px] text-muted-foreground">gönderi</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "B";
  return String(n);
}

export default SuggestedUsersCard;


