import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck, Upload, CreditCard, ArrowLeft, Shield,
  RefreshCw, Trash2, CheckCircle, AlertCircle, Loader2,
  Clock, ExternalLink
} from "lucide-react";

const API_BASE = "https://sehitumitkestitarimmtal.com";
const AGROPAY_URL = "https://sehitumitkestitarimmtal.com/agropay/";
// ⚠️ Doğru localStorage anahtarı
const TOKEN_KEY = "agrolink_token";

type Step = "loading" | "status" | "pending" | "apply" | "submitted";

const Verification = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [isVerified, setIsVerified] = useState(false);

  // Apply form
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [refCode, setRefCode] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) { navigate("/auth"); return; }
    setToken(t);
    checkStatus(t);
  }, [navigate]);

  const checkStatus = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/verification/status`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isVerified) {
          setIsVerified(true);
          setStep("status");
        } else {
          // Pending başvuru var mı kontrol et (429 alırsak pending demektir)
          setStep("apply");
        }
      } else {
        setStep("apply");
      }
    } catch {
      setStep("apply");
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !frontImage || !backImage) return;
    setSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("surname", surname);
    formData.append("frontImage", frontImage);
    formData.append("backImage", backImage);
    if (reason) formData.append("reason", reason);

    try {
      const res = await fetch(`${API_BASE}/api/verification/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 429) {
        // Zaten bekleyen başvuru var
        setStep("pending");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setRefCode(data.refCode || "");
        setStep("submitted");
        // 2 saniye sonra agropay'e yönlendir
        setRedirecting(true);
        setTimeout(() => {
          const url = data.refCode
            ? `${AGROPAY_URL}?ref=${encodeURIComponent(data.refCode)}`
            : AGROPAY_URL;
          window.location.href = url;
        }, 2500);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Başvuru gönderilemedi. Lütfen tekrar deneyin.");
      }
    } catch {
      setMessage("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveBadge = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/verification/remove`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsVerified(false);
        setStep("apply");
        setMessage("");
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "İşlem başarısız.");
      }
    } catch {
      setMessage("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── File Upload Box ────────────────────────────────────────────────
  const FileUploadBox = ({
    label,
    file,
    inputRef,
    onSet,
  }: {
    label: string;
    file: File | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onSet: (f: File) => void;
  }) => (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors text-left flex items-center gap-4 group"
    >
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
        {file
          ? <CheckCircle size={22} className="text-primary" strokeWidth={1.5} />
          : <Upload size={22} className="text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {file ? file.name : "Dosya seçmek için tıklayın"}
        </p>
      </div>
      {file && (
        <span className="text-xs text-primary font-medium flex-shrink-0">✓ Seçildi</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onSet(e.target.files[0])}
      />
    </button>
  );

  // ── Loading ────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        <Link
          to="/verify"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Geri Dön</span>
        </Link>

        <AnimatePresence mode="wait">

          {/* ── DOĞRULANMIŞ DURUM ─────────────────────────────────── */}
          {step === "status" && isVerified && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-3xl p-8"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <BadgeCheck size={40} className="text-primary-foreground" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Hesabınız Doğrulanmış</h2>
                <p className="text-muted-foreground text-sm">Mavi tik rozetiniz aktif</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => checkStatus(token!)}
                  disabled={submitting}
                  className="w-full py-3 rounded-full glass text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
                >
                  <RefreshCw size={18} /> Durumu Yenile
                </button>
                <button
                  onClick={handleRemoveBadge}
                  disabled={submitting}
                  className="w-full py-3 rounded-full border border-destructive/30 text-destructive font-semibold flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors"
                >
                  {submitting
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Trash2 size={18} />
                  }
                  Rozeti Kaldır
                </button>
              </div>

              {message && (
                <p className="text-sm text-center text-destructive mt-4">{message}</p>
              )}
            </motion.div>
          )}

          {/* ── BEKLEYEN BAŞVURU ──────────────────────────────────── */}
          {step === "pending" && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-3xl p-8 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                <Clock size={40} className="text-amber-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Başvurunuz İnceleniyor</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Zaten inceleme bekleyen bir başvurunuz var.<br />
                Ekibimiz 1–3 iş günü içinde e-posta ile size dönecektir.
              </p>
              <div className="glass rounded-xl p-4 mb-6 text-sm text-muted-foreground">
                📧 Sonuç kayıtlı e-posta adresinize bildirilecektir.
              </div>
              <button
                onClick={() => navigate("/feed")}
                className="w-full py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                Ana Sayfaya Dön
              </button>
            </motion.div>
          )}

          {/* ── BAŞVURU FORMU ─────────────────────────────────────── */}
          {step === "apply" && (
            <motion.div
              key="apply"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-3xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Shield size={22} className="text-primary-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Doğrulama Başvurusu</h2>
                  <p className="text-xs text-muted-foreground">Kimlik bilgilerinizi girin</p>
                </div>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Ad</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                      placeholder="Mehmet"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Soyad</label>
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                      placeholder="Yılmaz"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Başvuru Nedeni <span className="text-muted-foreground/50">(isteğe bağlı)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    rows={2}
                    placeholder="Neden doğrulanmak istiyorsunuz?"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Kimlik Belgeleri <span className="text-destructive">*</span>
                  </p>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Net ve okunabilir fotoğraflar yükleyin
                  </p>
                  {/* Sunucu sadece frontImage + backImage kabul ediyor */}
                  <FileUploadBox
                    label="Kimlik Ön Yüz"
                    file={frontImage}
                    inputRef={frontRef as React.RefObject<HTMLInputElement>}
                    onSet={setFrontImage}
                  />
                  <FileUploadBox
                    label="Kimlik Arka Yüz"
                    file={backImage}
                    inputRef={backRef as React.RefObject<HTMLInputElement>}
                    onSet={setBackImage}
                  />
                </div>

                {/* Fiyat bilgisi */}
                <div className="glass rounded-xl p-4 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aylık Plan</span>
                    <span className="text-foreground font-semibold">₺99/ay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yıllık Plan</span>
                    <span className="text-primary font-semibold">₺948/yıl (%20 tasarruf)</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">
                    Belge yükledikten sonra ödeme sayfasına yönlendirileceksiniz.
                  </p>
                </div>

                {message && (
                  <div className="text-sm p-3 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2">
                    <AlertCircle size={16} className="flex-shrink-0" /> {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !frontImage || !backImage || !name || !surname}
                  className="w-full py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 size={18} className="animate-spin" /> Gönderiliyor...</>
                    : <><CreditCard size={18} /> Başvur ve Ödemeye Geç</>
                  }
                </button>
              </form>
            </motion.div>
          )}

          {/* ── GÖNDERİLDİ → AGROPAY YÖNLENDİRME ───────────────── */}
          {step === "submitted" && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass rounded-3xl p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle size={40} className="text-primary" strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-2xl font-bold text-foreground mb-2">Belgeler Alındı!</h2>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                Kimlik belgeleriniz başarıyla yüklendi.<br />
                Şimdi ödeme sayfasına yönlendiriliyorsunuz...
              </p>

              {refCode && (
                <div className="glass rounded-xl p-4 mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Referans Kodunuz</p>
                  <p className="text-lg font-mono font-bold text-primary">{refCode}</p>
                  <p className="text-xs text-muted-foreground mt-1">Bu kodu saklayın</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
                <Loader2 size={16} className="animate-spin text-primary" />
                Ödeme sayfası açılıyor...
              </div>

              <button
                onClick={() => {
                  const url = refCode ? `${AGROPAY_URL}?ref=${encodeURIComponent(refCode)}` : AGROPAY_URL;
                  window.location.href = url;
                }}
                className="w-full py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} /> Ödeme Sayfasına Git
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Verification;


