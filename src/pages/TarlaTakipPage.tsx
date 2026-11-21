import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Plus, MapPin, Camera, StickyNote, Sprout, X, Leaf, TrendingUp, ImageIcon, FileText, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { getTarlalar, addTarla, addTarlaPhoto, addTarlaNote } from "@/lib/api";

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

const TarlaTakipPage = () => {
  const navigate = useNavigate();
  const [tarlalar, setTarlalar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTarla, setSelectedTarla] = useState<any>(null);

  useEffect(() => { loadTarlalar(); }, []);

  const loadTarlalar = async () => {
    setLoading(true);
    try {
      const data = await getTarlalar();
      setTarlalar(data.tarlalar || data.fields || []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <div className="flex-1 flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">🌾 Tarla Takip</h1>
            {tarlalar.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">{tarlalar.length} tarla</span>
            )}
          </div>
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform"><Plus className="w-5 h-5 text-primary-foreground" /></button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : tarlalar.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sprout className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Henüz tarla yok</p>
              <p className="text-sm text-muted-foreground">İlk tarlani ekle, büyümesini gün gün takip et</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform">+ İlk Tarlayı Ekle</button>
          </div>
        ) : (
          tarlalar.map(tarla => {
            const gun = tarla.gun || 1;
            const tahmini = tarla.tahminiHasat || 90;
            const progress = Math.min(Math.round((gun / tahmini) * 100), 100);
            const fotoCount = tarla.fotos?.length || tarla.photos?.length || 0;
            const lastFoto = tarla.fotos?.[tarla.fotos.length - 1]?.url || tarla.lastPhoto;

            return (
            <div key={tarla.id} onClick={() => setSelectedTarla(tarla)} className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:bg-secondary/20 active:scale-[0.98] transition-all duration-150">
              {/* Üst: son fotoğraf varsa göster, yoksa renkli banner */}
              {lastFoto ? (
                <div className="relative h-32 bg-muted overflow-hidden">
                  <img src={absoluteUrl(lastFoto)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{tarla.name || tarla.ad}</p>
                      <p className="text-white/80 text-[11px]">{tarla.product || tarla.crop || tarla.urun || "Ürün belirtilmemiş"}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white">{gun}. gün</span>
                  </div>
                </div>
              ) : (
                <div className="h-14 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center px-4 gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{tarla.name || tarla.ad}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{tarla.product || tarla.crop || tarla.urun || "Ürün belirtilmemiş"}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">{gun}. gün</span>
                </div>
              )}

              <div className="p-3 space-y-2.5">
                {/* İlerleme çubuğu */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Sezon ilerlemesi</span>
                    <span className="text-[11px] font-semibold text-primary">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Alt satır: stats + konum */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {tarla.alanDonm && (
                    <span className="flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />{tarla.alanDonm} dönüm
                    </span>
                  )}
                  {tarla.size && (
                    <span className="flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />{tarla.size} dönüm
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <ImageIcon className="w-3 h-3" />{fotoCount} fotoğraf
                  </span>
                  {(tarla.location || tarla.locationName) && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />{tarla.location || tarla.locationName}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0 opacity-40" />
                </div>

                {/* Son not varsa göster */}
                {(tarla.notes?.length > 0 || tarla.fotos?.some((f: any) => f.not)) && (() => {
                  const sonNot = tarla.notes?.[tarla.notes.length - 1]?.content
                    || tarla.notes?.[tarla.notes.length - 1]
                    || tarla.fotos?.filter((f: any) => f.not).slice(-1)[0]?.not;
                  return sonNot ? (
                    <p className="text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
                      <FileText className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary/60" />
                      <span className="line-clamp-1">{sonNot}</span>
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
            );
          })
        )}
      </main>

      {showAdd && <AddTarlaModal onClose={() => setShowAdd(false)} onAdded={loadTarlalar} />}
      {selectedTarla && <TarlaDetailModal tarla={selectedTarla} onClose={() => setSelectedTarla(null)} onUpdated={loadTarlalar} />}
      <BottomNav />
    </div>
  );
};

const AddTarlaModal = ({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) => {
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [size, setSize] = useState("");
  const [location, setLocation] = useState("");
  const [tahminiHasat, setTahminiHasat] = useState("90");
  const [loading, setLoading] = useState(false);
  const inputClass = "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addTarla({ name, crop, size: parseFloat(size) || undefined, location, tahminiHasat: parseInt(tahminiHasat) || 90 });
      onAdded();
      onClose();
    } catch {}
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border p-4 space-y-3">
        {/* Handle */}
        <div className="flex justify-center -mt-1 mb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">🌱 Yeni Tarla</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Tarla adı *" className={inputClass} />
        <input value={crop} onChange={e => setCrop(e.target.value)} placeholder="Ekili ürün (buğday, domates...)" className={inputClass} />
        <div className="grid grid-cols-2 gap-2">
          <input value={size} onChange={e => setSize(e.target.value)} placeholder="Alan (dönüm)" type="number" className={inputClass} />
          <input value={tahminiHasat} onChange={e => setTahminiHasat(e.target.value)} placeholder="Tahmini hasat (gün)" type="number" className={inputClass} />
        </div>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Konum (opsiyonel)" className={inputClass} />
        <button onClick={handleSubmit} disabled={!name.trim() || loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-30 active:scale-95 transition-transform flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Ekleniyor...</> : "Tarlayı Ekle"}
        </button>
      </div>
    </div>
  );
};

const TarlaDetailModal = ({ tarla, onClose, onUpdated }: { tarla: any; onClose: () => void; onUpdated: () => void }) => {
  const [note, setNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSendingNote(true);
    try { await addTarlaNote(tarla.id, note); setNote(""); onUpdated(); } catch {}
    setSendingNote(false);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      await addTarlaPhoto(tarla.id, fd);
      onUpdated();
    } catch {}
    setUploadingPhoto(false);
  };

  const gun = tarla.gun || 1;
  const tahmini = tarla.tahminiHasat || 90;
  const progress = Math.min(Math.round((gun / tahmini) * 100), 100);
  const fotos = tarla.fotos || tarla.photos || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border max-h-[88vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">{tarla.name || tarla.ad}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">{tarla.product || tarla.crop || tarla.urun || "Ürün belirtilmemiş"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Stats chips */}
        <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
          <div className="flex-1 bg-primary/10 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-primary leading-none">{gun}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">gün geçti</p>
          </div>
          <div className="flex-1 bg-muted rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-foreground leading-none">{fotos.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">fotoğraf</p>
          </div>
          <div className="flex-1 bg-muted rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-foreground leading-none">{progress}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">tamamlandı</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">

          {/* Fotoğraf ekle butonu */}
          <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploadingPhoto ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}>
            {uploadingPhoto
              ? <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-sm text-primary font-medium">Yükleniyor...</span></>
              : <><Camera className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground font-medium">Fotoğraf Ekle</span></>
            }
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>

          {/* Fotoğraf grid */}
          {fotos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Fotoğraflar</p>
              <div className="grid grid-cols-3 gap-1.5">
                {fotos.map((f: any, i: number) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={absoluteUrl(f.url || f)} alt="" className="w-full h-full object-cover" />
                    {(f.gun || f.not) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                        {f.gun && <p className="text-white text-[9px] font-semibold">Gün {f.gun}</p>}
                        {f.not && <p className="text-white/80 text-[9px] truncate">{f.not}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not ekle */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Not Ekle</p>
            <div className="flex items-center gap-2">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddNote()}
                placeholder="Bugün ne yaptın? Gübre, sulama, ilaç..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
              />
              <button
                onClick={handleAddNote}
                disabled={!note.trim() || sendingNote}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-90 transition-transform"
              >
                {sendingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Notlar listesi */}
          {tarla.notes?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Notlar</p>
              {[...tarla.notes].reverse().map((n: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/60">
                  <FileText className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{n.content || n}</p>
                    {n.createdAt && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TarlaTakipPage;


