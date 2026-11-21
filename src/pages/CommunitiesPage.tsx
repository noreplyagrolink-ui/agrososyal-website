import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, Users, Loader2, Lock, Globe, Camera, ImagePlus, X, BadgeCheck } from "lucide-react";
import { listCommunities, createCommunity, getStoredUser } from "@/lib/api";
import { absoluteUrl, createSafePreviewUrl } from "@/lib/media";
import BottomNav from "@/components/BottomNav";

interface Community {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  memberCount?: number;
  isPrivate?: boolean;
  owner?: any;
  ownerVerified?: boolean;
}

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const me = getStoredUser();

  const [items, setItems] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [error, setError] = useState("");

  const pickAvatar = async (f: File | null) => {
    setAvatarFile(f);
    setAvatarPreview(f ? await createSafePreviewUrl(f) : "");
  };
  const pickBanner = async (f: File | null) => {
    setBannerFile(f);
    setBannerPreview(f ? await createSafePreviewUrl(f) : "");
  };
  const resetForm = () => {
    setName(""); setSlug(""); setSlugTouched(false); setDescription("");
    setIsPrivate(false); setAvatarFile(null); setBannerFile(null);
    setAvatarPreview(""); setBannerPreview(""); setError("");
  };

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
      .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);

  const load = async (query = "") => {
    setLoading(true);
    try {
      const data = await listCommunities(query, 1);
      setItems(data.communities || data.items || data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const submit = async () => {
    setError("");
    const finalName = name.trim();
    const finalSlug = (slug.trim() || slugify(finalName));
    if (!finalName) { setError("Topluluk adı gerekli"); return; }
    if (!finalSlug || finalSlug.length < 3) { setError("Geçerli bir slug girin (en az 3 karakter)"); return; }
    setCreating(true);
    try {
      const res = await createCommunity(
        {
          name: finalName,
          slug: finalSlug,
          description: description.trim() || undefined,
          isPrivate,
        },
        { avatar: avatarFile, banner: bannerFile }
      );
      if (res?.community?.id || res?.id) {
        const id = res.community?.id || res.id;
        navigate(`/communities/${res.community?.slug || res.slug || id}`);
      } else if (res?.error || res?.message) {
        setError(res.error || res.message);
      } else {
        setShowCreate(false);
        resetForm();
        load("");
      }
    } catch (e: any) {
      setError(e?.message || "Topluluk oluşturulamadı (min. 50 takipçi gerekiyor olabilir).");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full hover:bg-secondary active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-foreground text-[15px] tracking-tight">Topluluklar</p>
              <p className="text-[11px] text-muted-foreground">Discord tarzı sunucular</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full
                       bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md
                       hover:shadow-lg active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Oluştur</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Topluluk ara…"
            className="w-full bg-secondary border border-border py-3 pl-11 pr-4 rounded-2xl text-sm
                       text-foreground placeholder:text-muted-foreground/60
                       focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Henüz topluluk yok</p>
            <p className="text-xs text-muted-foreground">Topluluk oluşturmak için en az 50 takipçin olmalı.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/communities/${c.slug || c.id}`)}
                className="group relative text-left rounded-2xl border border-border bg-card overflow-hidden
                           hover:border-primary/50 transition-colors active:scale-[0.99]"
              >
                <div className="relative h-20 w-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/30 to-pink-500/30">
                  {c.coverImage && (
                    <img src={absoluteUrl(c.coverImage)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                  )}
                </div>
                <div className="p-3 -mt-7 relative">
                  <div className="w-12 h-12 rounded-2xl bg-card ring-2 ring-card overflow-hidden shadow-md flex items-center justify-center">
                    {c.icon ? (
                      <img src={absoluteUrl(c.icon)} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-extrabold">
                        {c.name?.[0]?.toUpperCase() || "#"}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <p className="font-bold text-foreground text-sm truncate">{c.name}</p>
                    {c.ownerVerified && (
                      <BadgeCheck className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    )}
                    {c.isPrivate
                      ? <Lock className="w-3 h-3 text-muted-foreground" />
                      : <Globe className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                  )}
                  <p className="text-[11px] text-primary font-bold mt-1.5">
                    {c.memberCount ?? 0} üye
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => { if (!creating) { setShowCreate(false); resetForm(); } }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl"
          >
            <p className="text-lg font-extrabold text-foreground">Yeni topluluk</p>
            <p className="text-xs text-muted-foreground mt-1">
              Topluluk oluşturmak için en az <b>50 takipçin</b> olmalı.
            </p>

            <div className="mt-4 space-y-3">
              {/* Banner + Avatar pickers */}
              <div className="relative">
                <label className="block relative w-full aspect-[3/1] rounded-2xl overflow-hidden bg-secondary border border-border cursor-pointer group">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/30 to-pink-500/30 flex flex-col items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-6 h-6 mb-1" />
                      <span className="text-[11px] font-semibold">Banner ekle (1500×500)</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickBanner(e.target.files?.[0] || null)}
                  />
                  {bannerPreview && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); pickBanner(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </label>

                {/* Avatar overlapping banner */}
                <label className="absolute -bottom-6 left-4 w-20 h-20 rounded-full overflow-hidden ring-4 ring-card bg-secondary border border-border cursor-pointer group shadow-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex flex-col items-center justify-center text-white gap-0.5">
                      <Camera className="w-5 h-5" />
                      <span className="text-[8px] font-bold leading-tight text-center px-1">Profil Resmi</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickAvatar(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground pl-1 pt-5">
                Avatar 300×300 (yuvarlak) • Banner 1500×500
              </p>


              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                maxLength={50}
                placeholder="Topluluk adı"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3">
                <span className="text-xs text-muted-foreground">/c/</span>
                <input
                  value={slug}
                  onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                  maxLength={32}
                  placeholder="topluluk-slug"
                  className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
                />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={240}
                placeholder="Kısa açıklama (isteğe bağlı)"
                rows={3}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-violet-500" />
                Gizli topluluk (sadece davetli)
              </label>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                disabled={creating}
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 transition"
              >
                Vazgeç
              </button>
              <button
                disabled={creating || !me}
                onClick={submit}
                className="px-5 py-2 rounded-full text-sm font-bold text-white
                           bg-gradient-to-br from-violet-500 to-fuchsia-500
                           shadow-md hover:shadow-lg disabled:opacity-50 transition"
              >
                {creating ? "Oluşturuluyor…" : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}


