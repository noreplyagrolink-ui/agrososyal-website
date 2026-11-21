import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, ShoppingBag, Plus, X, MapPin, MessageCircle, Search, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import {
  getStoreProducts, addStoreProduct, deleteStoreProduct, updateStoreProduct,
  getStoreProduct, searchStoreProducts, getStoredUser,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

const categories = ["Tümü", "Tohum", "Gübre", "İlaç", "Makine", "Hayvan", "Meyve", "Sebze", "Diğer"];

const StorePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Tümü");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const currentUser = getStoredUser();

  useEffect(() => { loadProducts(); }, [category]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getStoreProducts(1, category === "Tümü" ? undefined : category);
      setProducts(data.products || []);
    } catch {}
    setLoading(false);
  };

  // Sunucu taraflı arama (boş bırakınca tüm liste)
  useEffect(() => {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchStoreProducts(q);
        setProducts(data.products || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const openDetail = async (p: any) => {
    setDetail(p);
    try {
      const data = await getStoreProduct(p.id);
      if (data?.product) setDetail(data.product);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu ürünü silmek istiyor musunuz?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try { await deleteStoreProduct(id); toast({ title: "Ürün silindi" }); }
    catch { toast({ title: "Silinemedi", variant: "destructive" }); loadProducts(); }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground flex-1">Pazar Yeri</h1>
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"><Plus className="w-5 h-5 text-primary-foreground" /></button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..." className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(c => (
            <button key={c} onClick={() => { setSearch(""); setCategory(c); }} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">Ürün bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => {
              const img = product.images?.[0] || product.image;
              const isOwner = currentUser?.id && (currentUser.id === product.sellerId || currentUser.id === product.userId);
              return (
                <div key={product.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <button onClick={() => openDetail(product)} className="block w-full text-left">
                    {img ? <img src={absoluteUrl(img)} alt="" className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-muted" />}
                  </button>
                  <div className="p-3">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{product.title || product.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
                    {product.price && <p className="text-sm font-bold text-primary mt-1">₺{product.price}</p>}
                    {product.location && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1"><MapPin className="w-3 h-3" />{product.location}</p>}
                    {isOwner ? (
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={() => setEditing(product)} className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold flex items-center justify-center gap-1">
                          <Pencil className="w-3 h-3" /> Düzenle
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="py-2 px-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => navigate(`/chat?to=${product.sellerId || product.userId}`)} className="mt-2 w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" /> Mesaj At
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showAdd && <ProductFormModal onClose={() => setShowAdd(false)} onSaved={loadProducts} />}
      {editing && <ProductFormModal product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadProducts(); }} />}
      {detail && <ProductDetailModal product={detail} onClose={() => setDetail(null)} onMessage={(uid) => { setDetail(null); navigate(`/chat?to=${uid}`); }} />}
      <BottomNav />
    </div>
  );
};

const ProductFormModal = ({ product, onClose, onSaved }: { product?: any; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(product?.title || product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [category, setCategory] = useState(product?.category || "Diğer");
  const [location, setLocation] = useState(product?.location || "");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const isEdit = !!product;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Ürün adı zorunlu", variant: "destructive" });
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("name", title);
    fd.append("description", description);
    if (price) fd.append("price", String(price));
    fd.append("category", category);
    fd.append("type", category);
    if (location) {
      fd.append("location", location);
      fd.append("locationName", location);
    }
    files.forEach(f => {
      fd.append("images", f);
    });
    try {
      if (isEdit) await updateStoreProduct(product.id, fd);
      else await addStoreProduct(fd);
      toast({ title: isEdit ? "Ürün güncellendi" : "Ürün eklendi ✅" });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: e?.message || "Lütfen tekrar deneyin", variant: "destructive" });
    }
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border p-4 space-y-3 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{isEdit ? "Ürünü Düzenle" : "Ürün Ekle"}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ürün adı" className={inputClass} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Açıklama" rows={3} className={inputClass + " resize-none"} />
        <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Fiyat (₺)" type="number" inputMode="decimal" className={inputClass} />
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground px-1">Konum</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Örn: Adana / Seyhan" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground px-1">Çeşit</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass + " appearance-none cursor-pointer"}>
            {categories.filter(c => c !== "Tümü").map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files || []))} className="text-sm text-muted-foreground" />
        <button onClick={handleSubmit} disabled={!title.trim() || loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-30">
          {loading ? "Kaydediliyor..." : (isEdit ? "Güncelle" : "Ürünü Ekle")}
        </button>
      </div>
    </div>
  );
};

const ProductDetailModal = ({ product, onClose, onMessage }: { product: any; onClose: () => void; onMessage: (uid: string) => void }) => {
  const images: string[] = (product.images || (product.image ? [product.image] : [])).map(absoluteUrl);
  const [idx, setIdx] = useState(0);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur border-b border-border">
          <h3 className="text-base font-bold text-foreground line-clamp-1">{product.title || product.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {images.length > 0 && (
          <div className="relative bg-black">
            <img src={images[idx]} alt="" className="w-full aspect-square object-contain" />
            {images.length > 1 && (
              <>
                <button onClick={() => setIdx(i => Math.max(0, i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/70 backdrop-blur text-foreground">‹</button>
                <button onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/70 backdrop-blur text-foreground">›</button>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/70 text-xs font-bold">{idx + 1}/{images.length}</div>
              </>
            )}
          </div>
        )}
        <div className="p-4 space-y-3">
          {product.price && <p className="text-2xl font-bold text-primary">₺{product.price}</p>}
          {product.category && <span className="inline-block px-3 py-1 rounded-full bg-secondary text-xs font-semibold">{product.category}</span>}
          {product.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {product.location}</p>
          )}
          {product.description && <p className="text-sm text-foreground whitespace-pre-wrap">{product.description}</p>}
          {(product.sellerId || product.userId) && (
            <button
              onClick={() => onMessage(product.sellerId || product.userId)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 mt-2"
            >
              <MessageCircle className="w-4 h-4" /> Satıcıya Mesaj
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePage;

