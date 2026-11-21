import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Check, X } from "lucide-react";
import { getUserSuggestions, toggleFollow } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";

interface SuggestedUser {
  id: string;
  name?: string;
  username: string;
  profilePic?: string;
  isVerified?: boolean;
  hasInviteBadge?: boolean;
}

const DISMISS_KEY = "agro_first_follow_dismissed";

// ─────────────────────────────────────────────────────────────────────────
// FirstFollowWidget — yalnızca hesabında henüz kimseyi takip etmemiş / yeni
// kayıt olmuş kullanıcılara gösterilir. Hava durumu kartının hemen üstünde,
// "İlk 10 kişiyi takip et" başlığıyla, önerilen kullanıcıları yan yana
// (yatay kaydırmalı, story-tarzı dairesel avatarlarla) listeler. Takip
// edilen her kullanıcının üstüne yeşil bir onay rozeti biner.
// ─────────────────────────────────────────────────────────────────────────
const FirstFollowWidget = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (dismissed) return;
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
  }, [dismissed]);

  const followedCount = Object.values(followingMap).filter(Boolean).length;

  const handleFollow = async (id: string) => {
    const next = !followingMap[id];
    setFollowingMap((m) => ({ ...m, [id]: next }));
    try {
      await toggleFollow(id);
    } catch {
      setFollowingMap((m) => ({ ...m, [id]: !next }));
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  if (dismissed || loading || users.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
        aria-label="Kapat"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-1 pr-8">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md flex-shrink-0">
          <UserPlus className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-foreground leading-tight">İlk 10 kişiyi takip et</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {followedCount > 0 ? `${followedCount} kişiyi takip ediyorsun` : "Akışını canlandırmak için birkaç hesabı takip et"}
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pt-3 pb-1 snap-x snap-mandatory">
        {users.map((u) => {
          const avatar = u.profilePic
            ? absoluteUrl(u.profilePic)
            : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
          const isFollowing = !!followingMap[u.id];
          return (
            <div key={u.id} className="flex-shrink-0 w-[76px] snap-start flex flex-col items-center text-center">
              <button
                onClick={() => navigate(`/user/${u.id}`)}
                className="relative active:scale-95 transition-transform"
              >
                <div className={`w-16 h-16 rounded-full p-[2px] ${isFollowing ? "bg-primary" : "bg-gradient-to-br from-primary/50 to-accent/50"}`}>
                  <img
                    src={avatar}
                    alt={u.username}
                    className="w-full h-full rounded-full object-cover bg-background border-2 border-card"
                  />
                </div>
                {isFollowing && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </span>
                )}
              </button>
              <p className="text-[11px] font-semibold text-foreground truncate max-w-full mt-1.5">
                {(u.name || u.username).split(" ")[0]}
              </p>
              <button
                onClick={() => handleFollow(u.id)}
                className={`mt-1 w-full px-2 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 ${
                  isFollowing
                    ? "bg-secondary text-muted-foreground border border-border"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {isFollowing ? "Takipte" : "Takip et"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FirstFollowWidget;

