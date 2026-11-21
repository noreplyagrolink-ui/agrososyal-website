import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, AlertTriangle, Plus, MapPin, Clock, Users, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { getAcilYardimPosts, createAcilYardim, acilYardimGidiyorum, acilYardimYorum, getStoredUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

const AcilYardimPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const currentUser = getStoredUser();

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await getAcilYardimPosts(1);
      setPosts(data.posts || data.emergencies || []);
    } catch {}
    setLoading(false);
  };

  const handleGidiyorum = async (postId: string) => {
    try {
      await acilYardimGidiyorum(postId);
      toast({ title: "Yardıma gidiyorsunuz 🤝" });
      loadPosts();
    } catch (e: any) {
      toast({ title: "İşlem başarısız", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground flex-1">🚨 Acil Yardım</h1>
          <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-full bg-destructive flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">Acil durumlarda yardım isteyin veya yardıma gidin!</p>
          <p className="text-xs text-muted-foreground mt-1">Doğal afet, hayvan hastalığı, hasat felaketi vb.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">Şu anda acil yardım talebi yok</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{post.title || post.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{post.description || post.content}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {post.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.location}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(post.createdAt).toLocaleDateString("tr-TR")}</span>
                {post.helpersCount > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{post.helpersCount} kişi gidiyor</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleGidiyorum(post.id)} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98]">
                  🤝 Ben Gidiyorum
                </button>
                <button onClick={() => navigate(`/chat?to=${post.userId}`)} className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground">
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {showCreate && <CreateAcilYardim onClose={() => setShowCreate(false)} onCreated={() => { toast({ title: "Yardım talebi gönderildi ✅" }); loadPosts(); }} />}
      <BottomNav />
    </div>
  );
};

const MessageCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
);

const CreateAcilYardim = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("genel");
  const [loading, setLoading] = useState(false);

  const inputClass = "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    try {
      // Backend bazen farklı alan adları bekliyor; uyumluluk için hepsini gönder
      await createAcilYardim({
        title,
        description,
        content: description,
        location,
        locationName: location,
        type,
        category: type,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      toast({ title: "Gönderilemedi", description: e?.message || "Lütfen tekrar deneyin", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">🚨 Yardım Talebi Oluştur</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Başlık" className={inputClass} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Durum açıklaması..." rows={3} className={inputClass + " resize-none"} />
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Konum" className={inputClass} />
        <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
          <option value="genel">Genel</option>
          <option value="afet">Doğal Afet</option>
          <option value="hastalik">Hayvan Hastalığı</option>
          <option value="hasat">Hasat Felaketi</option>
          <option value="yangin">Yangın</option>
        </select>
        <button onClick={handleSubmit} disabled={!title.trim() || loading} className="w-full py-3 rounded-xl bg-destructive text-white font-semibold text-sm disabled:opacity-30">
          {loading ? "Gönderiliyor..." : "Yardım Talebi Gönder"}
        </button>
      </div>
    </div>
  );
};

export default AcilYardimPage;

