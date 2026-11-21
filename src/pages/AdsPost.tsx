import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Megaphone, Upload, ArrowLeft, AlertCircle, CheckCircle, Loader2, RefreshCw, Trash2, ExternalLink, Image as ImageIcon } from "lucide-react";
import { sanitizeUrl } from "@/lib/security";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://sehitumitkestitarimmtal.com";

type Step = "form" | "success";

type Ad = {
  id: string;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  isActive: boolean;
  approvalStatus?: string;
  views: number;
  clicks: number;
  createdAt: string;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );

const AdsPost = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("form");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);
  const [adsMessage, setAdsMessage] = useState("");

  const imageRef = useRef<HTMLInputElement>(null);

  const loadMyAds = useCallback(async (authToken: string) => {
    setAdsLoading(true);
    setAdsMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/ads/my`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdsMessage((data as { error?: string }).error || "Reklamlarınız alınamadı.");
        return;
      }

      setAds(Array.isArray((data as { ads?: Ad[] }).ads) ? (data as { ads: Ad[] }).ads : []);
    } catch {
      setAdsMessage("Reklam listesi için sunucuya bağlanılamadı.");
    } finally {
      setAdsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      navigate("/auth");
      return;
    }
    setToken(t);
    void loadMyAds(t);
  }, [loadMyAds, navigate]);

  const validate = () => {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanLink = linkUrl.trim();

    if (!cleanTitle) return "Başlık zorunludur.";
    if (cleanTitle.length > 200) return "Başlık en fazla 200 karakter olmalıdır.";
    if (cleanBody.length > 500) return "Açıklama en fazla 500 karakter olmalıdır.";
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) return "Link http:// veya https:// ile başlamalıdır.";
    if (image) {
      if (!/image\/(jpeg|jpg|png|webp)/i.test(image.type)) return "Görsel JPG, PNG veya WEBP olmalıdır.";
      if (image.size > 5 * 1024 * 1024) return "Görsel 5MB'den küçük olmalıdır.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setMessage(err);
      return;
    }
    if (!token) return;

    setSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.append("title", title.trim());
    if (body.trim()) formData.append("body", body.trim());
    if (linkUrl.trim()) formData.append("linkUrl", linkUrl.trim());
    if (image) formData.append("image", image);

    try {
      const res = await fetch(`${API_BASE}/api/ads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTitle("");
        setBody("");
        setLinkUrl("");
        setImage(null);
        if (imageRef.current) imageRef.current.value = "";
        setStep("success");
        void loadMyAds(token);
      } else {
        setMessage((data as { error?: string }).error || "Reklam oluşturulamadı. Lütfen bilgileri kontrol edin.");
      }
    } catch {
      setMessage("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (adId: string) => {
    if (!token) return;
    setDeletingId(adId);
    setAdsMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/ads/${adId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdsMessage((data as { error?: string }).error || "Reklam pasife alınamadı.");
        return;
      }
      setAds((current) => current.map((ad) => (ad.id === adId ? { ...ad, isActive: false } : ad)));
    } catch {
      setAdsMessage("Silme işlemi için sunucuya bağlanılamadı.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePermanentDelete = async (adId: string) => {
    if (!token) return;
    if (!window.confirm("Bu reklamı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    setPermanentDeletingId(adId);
    setAdsMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/ads/${adId}?permanent=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdsMessage((data as { error?: string }).error || "Reklam silinemedi.");
        return;
      }
      setAds((current) => current.filter((ad) => ad.id !== adId));
    } catch {
      setAdsMessage("Silme işlemi için sunucuya bağlanılamadı.");
    } finally {
      setPermanentDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4 py-10 sm:px-6 sm:py-12">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/[0.05] blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-5xl"
      >
        <Link
          to="/choose"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Geri Dön</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] gap-6 items-start">
          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass rounded-3xl p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Megaphone size={22} className="text-primary-foreground" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Reklam Oluştur</h2>
                    <p className="text-xs text-muted-foreground">POST /api/ads ile gerçek sisteme gönderilir</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                      Başlık <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                      placeholder="Reklam başlığı"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{title.length}/200</p>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                      Açıklama
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={500}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/40 resize-none"
                      placeholder="Reklam açıklama metni..."
                    />
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{body.length}/500</p>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                      Link URL
                    </label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                      placeholder="https://..."
                    />
                    {linkUrl.trim() && /^https?:\/\//i.test(linkUrl.trim()) && (
                      <a
                        href={sanitizeUrl(linkUrl.trim())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Linke Git
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                      Reklam Görseli
                    </label>
                    <button
                      type="button"
                      onClick={() => imageRef.current?.click()}
                      className="w-full p-4 rounded-2xl border-2 border-dashed border-border hover:border-amber-500/50 transition-colors text-left flex items-center gap-4 group"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${image ? "bg-amber-500/10" : "bg-secondary group-hover:bg-amber-500/10"}`}>
                        <Upload size={22} className={`transition-colors ${image ? "text-amber-500" : "text-muted-foreground group-hover:text-amber-500"}`} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Görsel Seç</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {image ? image.name : "JPG, PNG, WEBP — opsiyonel, 1200x628'e kırpılır"}
                        </p>
                      </div>
                      {image && <CheckCircle size={18} className="text-amber-500 flex-shrink-0" />}
                      <input
                        ref={imageRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && setImage(e.target.files[0])}
                      />
                    </button>
                  </div>

                  {message && (
                    <div className="text-sm p-3 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2">
                      <AlertCircle size={16} /> {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={18} className="animate-spin" />}
                    {submitting ? "Gönderiliyor..." : "Reklamı Oluştur"}
                  </button>
                </form>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-3xl p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle size={40} className="text-amber-400" strokeWidth={1.5} />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Reklam Gönderildi!</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Reklamınız incelemeye alındı. Admin onayından sonra Agro Sosyal feed'inde yayınlanacak.
                  <br />
                  <span className="text-amber-400 font-medium">⏳ Onay bekliyor...</span>
                </p>
                <button
                  onClick={() => setStep("form")}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                >
                  <Megaphone size={16} />
                  Yeni Reklam Oluştur
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass rounded-3xl p-6 sm:p-7"
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">Reklamlarım</h2>
                <p className="text-xs text-muted-foreground">GET /api/ads/my</p>
              </div>
              <button
                type="button"
                onClick={() => token && loadMyAds(token)}
                disabled={adsLoading}
                className="w-10 h-10 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center disabled:opacity-50"
                aria-label="Reklamları yenile"
              >
                <RefreshCw size={16} className={adsLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {adsMessage && (
              <div className="mb-4 text-sm p-3 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2">
                <AlertCircle size={16} /> {adsMessage}
              </div>
            )}

            {adsLoading ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 size={18} className="animate-spin" /> Yükleniyor...
              </div>
            ) : ads.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-border rounded-2xl">
                <ImageIcon size={28} className="mx-auto text-muted-foreground mb-2" strokeWidth={1.4} />
                <p className="text-sm text-muted-foreground">Henüz reklamınız yok.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {ads.map((ad) => (
                  <div key={ad.id} className="rounded-2xl border border-border bg-secondary/40 p-3">
                    {ad.imageUrl && (
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full aspect-[1200/628] object-cover rounded-xl mb-3 bg-muted"
                        loading="lazy"
                      />
                    )}
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground truncate">{ad.title}</h3>
                          {ad.approvalStatus === 'pending' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 bg-amber-500/15 text-amber-400">
                              ⏳ Onay Bekliyor
                            </span>
                          )}
                          {ad.approvalStatus === 'approved' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${ad.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                              {ad.isActive ? "✅ Aktif" : "Pasif"}
                            </span>
                          )}
                          {ad.approvalStatus === 'rejected' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 bg-destructive/10 text-destructive">
                              ❌ Reddedildi
                            </span>
                          )}
                          {!ad.approvalStatus && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${ad.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                              {ad.isActive ? "Aktif" : "Pasif"}
                            </span>
                          )}
                        </div>
                        {ad.body && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{ad.body}</p>}
                        <p className="text-[11px] text-muted-foreground/70">{formatDate(ad.createdAt)}</p>
                        {ad.linkUrl && (
                          <a
                            href={sanitizeUrl(ad.linkUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors"
                          >
                            <ExternalLink size={12} />
                            Linke Git
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{ad.views ?? 0} görüntülenme</span>
                      <span>{ad.clicks ?? 0} tıklama</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeactivate(ad.id)}
                          disabled={!ad.isActive || deletingId === ad.id}
                          className="inline-flex items-center gap-1 text-amber-500 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {deletingId === ad.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          Pasife Al
                        </button>
                        <span className="text-border">|</span>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(ad.id)}
                          disabled={permanentDeletingId === ad.id}
                          className="inline-flex items-center gap-1 text-destructive hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {permanentDeletingId === ad.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.aside>
        </div>
      </motion.div>
    </div>
  );
};

export default AdsPost;


