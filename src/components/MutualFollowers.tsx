import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, Users } from "lucide-react";
import { getMutualFollowers } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";

interface MutualUser {
  id: string;
  name?: string;
  username: string;
  profilePic?: string;
}

const MutualFollowers = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const [list, setList] = useState<MutualUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getMutualFollowers(userId)
      .then((d) => {
        if (!alive) return;
        const arr = (d.mutualFollowers || d.users || d.mutual || []) as MutualUser[];
        setList(arr);
        setCount(d.count ?? arr.length);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [userId]);

  if (loading || count === 0) return null;

  const preview = list.slice(0, 4);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 mt-2 mb-1 group"
      >
        <div className="flex -space-x-2">
          {preview.map((u) => {
            const avatar = u.profilePic
              ? absoluteUrl(u.profilePic)
              : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
            return (
              <img
                key={u.id}
                src={avatar}
                alt={u.username}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-background bg-muted"
              />
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-left leading-snug">
          <span className="font-semibold text-foreground">{preview.map(u => u.username).slice(0, 2).join(", ")}</span>
          {count > 2 && <> ve <span className="font-semibold text-foreground">{count - 2} diğer kişi</span></>} takip ediyor
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-fade-in">
          <header className="sticky top-0 glass border-b border-border flex items-center gap-3 h-14 px-4">
            <button onClick={() => setOpen(false)} className="active:scale-90 transition-transform">
              <X className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-base font-bold text-foreground">Ortak Takipçiler</h1>
              <span className="text-xs text-muted-foreground">({count})</span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto max-w-lg w-full mx-auto">
            {list.length === 0 ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="divide-y divide-border">
                {list.map((u) => {
                  const avatar = u.profilePic
                    ? absoluteUrl(u.profilePic)
                    : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                  return (
                    <button
                      key={u.id}
                      onClick={() => { setOpen(false); navigate(`/user/${u.id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{u.name || u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
};

export default MutualFollowers;

