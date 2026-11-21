import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Star, Bell, BellOff, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { getTarimFiyatlari, takipFiyat } from "@/lib/api";

const TarimFiyatlariPage = () => {
  const navigate = useNavigate();
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getTarimFiyatlari();
        setPrices(data.prices || data.fiyatlar || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleTakip = async (id: string, idx: number) => {
    const prev = prices[idx].isFollowing;
    setPrices(p => p.map((item, i) => i === idx ? { ...item, isFollowing: !prev } : item));
    try { await takipFiyat(id); } catch {
      setPrices(p => p.map((item, i) => i === idx ? { ...item, isFollowing: prev } : item));
    }
  };

  const filtered = search ? prices.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.product?.toLowerCase().includes(search.toLowerCase())) : prices;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground">📊 Tarım Fiyatları</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..." className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20"><p className="text-muted-foreground text-sm">Fiyat bilgisi bulunamadı</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item, idx) => {
              const change = item.change || item.degisim || 0;
              const isUp = change > 0;
              return (
                <div key={item.id || idx} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{item.name || item.product || item.urun}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-foreground">₺{item.price || item.fiyat}</span>
                      {change !== 0 && (
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-green-500" : "text-destructive"}`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isUp ? "+" : ""}{change}%
                        </span>
                      )}
                    </div>
                    {item.unit && <p className="text-[10px] text-muted-foreground mt-0.5">{item.unit}</p>}
                  </div>
                  <button onClick={() => handleTakip(item.id, idx)} className={`p-2 rounded-xl transition-colors ${item.isFollowing ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {item.isFollowing ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default TarimFiyatlariPage;

