import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sprout,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Mail,
  Camera,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Leaf,
  Users,
  TrendingUp,
  Sparkles,
  User as UserIcon,
  AtSign,
  Lock,
  Calendar,
  MapPin,
  X,
  FileText,
  Phone,
  Building2,
  ExternalLink,
  ChevronRight,
  Gift,
  Copy,
  Share2,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import {
  login,
  register,
  verify2FA,
  setToken,
  setRefreshToken,
  setStoredUser,
  getStoredUser,
  saveCurrentAsAccount as saveCurrentAsAccountFn,
  clearAuth,
  getMyInvite,
} from "@/lib/api";
import { useT, useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ReCaptcha, { resetRecaptcha } from "@/components/ReCaptcha";
import { createSafePreviewUrl } from "@/lib/media";
import { getToken } from "@/lib/api";
import WelcomeSplashScreen from "@/components/WelcomeSplashScreen";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";
const AGROPAY_URL = "https://sehitumitkestitarimmtal.com/agropay/";
const SUPPORT_EMAIL = "noreply.agrolink@gmail.com";

const SCHOOL_NAME = "Şehit Ümit Kesti Tarım Mesleki ve Teknik Anadolu Lisesi";
const SCHOOL_ADDRESS = "Evkaf Mah. Arslan Aydınlık Cad. No:37 Fatsa / ORDU";
const SCHOOL_PHONE_1 = "(532) 226 77 39";
const SCHOOL_PHONE_2 = "(545) 588 06 76";

const GOOGLE_CLIENT_ID =
  "942312074029-0qa0cf3m6s7tpfe0cbaqaho3fls28jos.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            el: HTMLElement,
            cfg: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              locale?: string;
              width?: number;
            }
          ) => void;
          cancel: () => void;
        };
      };
    };
    __grecaptchaReady?: Promise<void>;
  }
}

type AuthView =
  | "health-check"
  | "login"
  | "register-1"
  | "register-2"
  | "forgot"
  | "2fa"
  | "email-verify"
  | "onboard-avatar"
  | "onboard-website"
  | "onboard-verify"
  | "onboard-invite";

// ── Policy Modal ──────────────────────────────────────────────────────────────
type PolicyType = "privacy" | "terms" | null;

const PolicyModal = ({
  type,
  onClose,
}: {
  type: PolicyType;
  onClose: () => void;
}) => {
  if (!type) return null;

  const isPrivacy = type === "privacy";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[80vh] flex flex-col
          bg-card border border-border/60 shadow-2xl
          rounded-t-3xl sm:rounded-3xl overflow-hidden
          animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: "0.3s" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/95 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl agro-gradient flex items-center justify-center shadow-agro">
              {isPrivacy ? (
                <ShieldCheck className="w-4.5 h-4.5 text-primary-foreground" />
              ) : (
                <FileText className="w-4.5 h-4.5 text-primary-foreground" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-medium text-primary uppercase tracking-widest">
                {isPrivacy ? "Gizlilik Politikası" : "Kullanım Şartları"}
              </p>
              <p className="text-xs text-muted-foreground font-medium">{SCHOOL_NAME}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm text-muted-foreground leading-relaxed">
          {isPrivacy ? (
            <>
              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  1. Amaç ve Kapsam
                </h3>
                <p>
                  Bu Gizlilik Politikası, <strong className="text-foreground">AgroLink</strong> platformunun
                  kullanıcılarına ilişkin kişisel verilerin toplanması, kullanılması,
                  saklanması, paylaşılması ve korunmasına dair ilkeleri açıklamaktadır.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  2. Hangi Verileri Topluyoruz?
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Kimlik ve Hesap", value: "Ad, Kullanıcı adı, E-posta, Şifre" },
                    { label: "Profil Verileri", value: "Profil fotoğrafı, Biyografi, Doğum tarihi, Şehir" },
                    { label: "İçerik ve Etkileşim", value: "Paylaşımlar, Yorumlar, Beğeniler, Takip bilgileri" },
                    { label: "Konum Verisi", value: "IP adresinden türetilmiş yaklaşık konum" },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
                      <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium text-xs">{item.label}</p>
                        <p className="text-xs">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  3. Verilerin İşlenme Amaçları
                </h3>
                <ul className="space-y-1.5">
                  {[
                    "Hesap oluşturma ve kimlik doğrulama",
                    "Sosyal etkileşim ve içerik paylaşımı",
                    "Güvenlik ve dolandırıcılığın önlenmesi",
                    "Uygulama geliştirme ve analitik analizler",
                    "Tarımsal topluluk deneyiminin iyileştirilmesi",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  4. Veri Güvenliği
                </h3>
                <p className="text-xs">
                  Kişisel verileriniz SSL/TLS şifreleme, güvenlik duvarları ve yetkisiz erişim
                  kontrolleri ile korunmaktadır. Verileriniz üçüncü taraflarla açık rızanız
                  olmaksızın paylaşılmaz.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  5. Haklarınız
                </h3>
                <p className="text-xs">
                  KVKK kapsamında; verilerinize erişme, düzeltme, silme ve itiraz etme
                  haklarına sahipsiniz. Talepleriniz için aşağıdaki iletişim bilgilerini kullanabilirsiniz.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  1. Kabul Koşulları
                </h3>
                <p className="text-xs">
                  AgroLink'i kullanarak bu şartları kabul etmiş sayılırsınız. Platform yalnızca
                  tarımsal amaçlı kullanım için tasarlanmıştır.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  2. Kullanım Kuralları
                </h3>
                <ul className="space-y-1.5">
                  {[
                    "Gerçek kimliğinizle kayıt olmanız zorunludur",
                    "Yanıltıcı, hakaret içeren veya zararlı içerik paylaşılamaz",
                    "Diğer kullanıcıların verilerini izinsiz kullanamazsınız",
                    "Spam ve otomatik hesap oluşturma yasaktır",
                    "Ticari amaçlı kullanım için önceden izin alınmalıdır",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  3. İçerik Politikası
                </h3>
                <p className="text-xs">
                  Platformda paylaştığınız içerikler size ait olmakla birlikte, AgroLink'e bu
                  içerikleri platform amacıyla kullanma hakkı tanırsınız. Telif hakkı ihlalleri
                  raporlanabilir.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  4. Hesap Feshi
                </h3>
                <p className="text-xs">
                  Kuralları ihlal eden hesaplar uyarı verilmeksizin askıya alınabilir veya
                  kalıcı olarak kapatılabilir. Hesabınızı dilediğiniz zaman silebilirsiniz.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full agro-gradient inline-block" />
                  5. Değişiklikler
                </h3>
                <p className="text-xs">
                  Bu şartlar önceden bildirim yapılarak güncellenebilir. Güncel şartlar her
                  zaman platform üzerinden erişilebilir durumdadır.
                </p>
              </section>
            </>
          )}

          {/* Contact Card */}
          <div className="mt-2 p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              İletişim ve Veri Sorumlusu
            </p>
            <p className="text-xs font-medium text-foreground">{SCHOOL_NAME}</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p>{SCHOOL_ADDRESS}</p>
                  <p className="text-muted-foreground/70 mt-0.5">Ordu İl Merkezine 39 km · Fatsa İlçe Merkezine 0 km</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>
                  <a href={`tel:${SCHOOL_PHONE_1.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">{SCHOOL_PHONE_1}</a>
                  {" · "}
                  <a href={`tel:${SCHOOL_PHONE_2.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">{SCHOOL_PHONE_2}</a>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-primary transition-colors">{SUPPORT_EMAIL}</a>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-muted-foreground/60 pb-2">
            Son güncelleme: {new Date().getFullYear()} · AgroLink
          </p>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-card/95">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-agro hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" /> Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const t = useT();
  const { lang, setLang, setAutoDetect } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [view, setView] = useState<AuthView>("health-check");
  const [healthStatus, setHealthStatus] = useState<"checking" | "ok" | "error">("checking");

  // ── Sunucu sağlık kontrolü ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        // 🔧 DÜZELTİLDİ: 8sn → 5sn; sunucu yavaş başlıyorsa kullanıcı çok beklemez
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.status === "ok") {
          setHealthStatus("ok");
          // 🔧 1200ms → 600ms: animasyon kısaltıldı
          setTimeout(() => { if (!cancelled) setView("login"); }, 600);
        } else {
          setHealthStatus("error");
          // 🔧 DÜZELTİLDİ: Hata olsa bile 3 saniye sonra login formunu göster.
          // "Bakım zamanı" ekranında kullanıcı mahsur kalmaz.
          setTimeout(() => { if (!cancelled) setView("login"); }, 3000);
        }
      } catch {
        if (!cancelled) {
          setHealthStatus("error");
          // 🔧 Timeout/network hatası → 3 saniye sonra login formuna geç
          setTimeout(() => { if (!cancelled) setView("login"); }, 3000);
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("add") === "1") {
        saveCurrentAsAccountFn();
        clearAuth();
      }
    } catch {}
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  // Policy modal
  const [policyModal, setPolicyModal] = useState<PolicyType>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Login
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Register
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regCity, setRegCity] = useState("");
  // 🎟️ Davet kodu — ?invite=KOD linkiyle gelindiyse otomatik doldurulur, manuel de girilebilir
  const [regInviteCode, setRegInviteCode] = useState("");

  // Onboarding: davet et adımı için kendi davet bilgilerim
  const [myInvite, setMyInvite] = useState<{ inviteCode: string; inviteLink: string; inviteCount: number; hasInviteBadge: boolean; remainingForBadge: number } | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);

  // URL'den ?invite=KOD parametresini oku (davet linkiyle gelindiyse)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inv = params.get("invite");
      if (inv) setRegInviteCode(inv.toUpperCase());
    } catch {}
  }, []);

  // 2FA / OTP
  const [tempToken, setTempTokenState] = useState("");
  const [otpCode, setOtpCode] = useState("");
  // Login akışından mı gelindi (doğrulama sonrası feed'e git, onboarding'e değil)
  const [emailVerifyFromLogin, setEmailVerifyFromLogin] = useState(false);

  // OTP güvenlik: cooldown + max deneme
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpBlocked, setOtpBlocked] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          resendTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Onboarding
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [website, setWebsite] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleInitTimerRef = useRef<number | null>(null);

  const clearError = () => setError("");

  const clearGoogleInitTimer = () => {
    if (googleInitTimerRef.current !== null) {
      window.clearInterval(googleInitTimerRef.current);
      googleInitTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearGoogleInitTimer();
    };
  }, []);

  // ── Google credential handler ────────────────────────────────────
  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      if (!idToken) {
        setError("Google token alınamadı, tekrar deneyin.");
        return;
      }

      clearError();
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.error) {
          setError(data.error || "Google ile giriş başarısız.");
          return;
        }

        setToken(data.token);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        if (data.user) setStoredUser(data.user);
        saveCurrentAsAccountFn();
        navigate("/feed");
      } catch {
        setError(t("loginErrorConn"));
      } finally {
        setLoading(false);
      }
    },
    [navigate, t]
  );

  // ── Google button render ─────────────────────────────────────────
  const renderGoogleButton = useCallback(() => {
    const container = googleBtnRef.current;
    if (!container) return false;
    if (!window.google?.accounts?.id) return false;

    try {
      container.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          void handleGoogleCredential(response.credential);
        },
        ux_mode: "popup",
      });

      window.google.accounts.id.renderButton(container, {
        type: "icon",
        theme: "outline",
        size: "large",
        shape: "circle",
        locale: "tr",
      });

      return true;
    } catch (e) {
      console.error("Google button render hatası:", e);
      return false;
    }
  }, [handleGoogleCredential]);

  useEffect(() => {
    if (view !== "login") return;

    const tryRender = () => {
      if (renderGoogleButton()) {
        clearGoogleInitTimer();
        return true;
      }
      return false;
    };

    if (tryRender()) return;

    clearGoogleInitTimer();
    googleInitTimerRef.current = window.setInterval(() => {
      tryRender();
    }, 150);

    return () => {
      clearGoogleInitTimer();
    };
  }, [view, renderGoogleButton]);

  // ── Login ────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !password) {
      setError(t("loginErrorEmpty"));
      return;
    }

    if (!recaptchaToken) {
      setError("Lütfen robot doğrulamasını tamamlayın.");
      return;
    }

    clearError();
    setLoading(true);

    try {
      console.log('[LOGIN] İstek gönderiliyor...', { identifier, hasRecaptcha: !!recaptchaToken });
      const data = await login(identifier, password, recaptchaToken);
      // 🔒 GÜVENLİK DÜZELTMESİ: Önceden burada JSON.stringify(data) konsola
      // basılıyordu — data içinde token/refreshToken/tempToken gibi hassas
      // alanlar olduğu için access/refresh token'lar tarayıcı konsoluna
      // (dolayısıyla ekran paylaşımı, destek araçları, tarayıcı uzantılarına)
      // sızabiliyordu. Artık sadece hassas olmayan durum bilgisi loglanıyor.
      console.log('[LOGIN] Cevap geldi:', {
        hasError: !!data?.error,
        requires2FA: !!data?.requires2FA,
        emailVerificationRequired: !!data?.emailVerificationRequired,
      });

      if (data.emailVerificationRequired) {
        // Server e-posta doğrulanmamış dedi → doğrulama ekranına yönlendir
        if (data.email) setRegEmail(data.email);
        setTempTokenState(data.tempToken || "");
        setEmailVerifyFromLogin(true);
        setOtpCode("");
        clearError();
        setView("email-verify");
        return;
      }

      if (data.error) {
        setError(data.error);
        resetRecaptcha();
        setRecaptchaToken(null);
        return;
      }

      if (data.requires2FA) {
        setTempTokenState(data.tempToken);
        setView("2fa");
        return;
      }

      setToken(data.token);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      if (data.user) setStoredUser(data.user);
      saveCurrentAsAccountFn();
      navigate("/feed");
    } catch (err: any) {
      console.error('[LOGIN] HATA:', err?.message, err?.stack?.substring(0, 300));
      if (err?.message === "NETWORK_ERROR") {
        setError("Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.");
      } else {
        setError(t("loginErrorConn"));
      }
      resetRecaptcha();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Register Step 1 ──────────────────────────────────────────────
  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName || !regUsername || !regEmail) {
      setError(t("regErrorAll"));
      return;
    }
    if (regUsername.length < 3) {
      setError(t("regErrorUsername"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setError(t("regErrorEmail"));
      return;
    }
    if (!termsAccepted) {
      setError("Devam edebilmek için şartları ve gizlilik politikasını kabul etmelisin.");
      return;
    }

    clearError();
    setView("register-2");
  };

  // ── Register Step 2 ──────────────────────────────────────────────
  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regPassword) {
      setError(t("regErrorPwd"));
      return;
    }
    if (regPassword.length < 8) {
      setError(t("regErrorPwdShort"));
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError(t("regErrorPwdMatch"));
      return;
    }

    clearError();
    setLoading(true);

    try {
      const data = await register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        birthDate: regBirthDate || undefined,
        city: regCity || undefined,
        inviteCode: regInviteCode || undefined,
      });

      const blocking =
        data?.error && /zaten|already|exist|kullan/i.test(String(data.error));

      if (blocking) {
        setError(data.error);
        return;
      }

      if (data?.token) setToken(data.token);
      if (data?.refreshToken) setRefreshToken(data.refreshToken);
      if (data?.user) setStoredUser(data.user);

      setTempTokenState(data?.token || data?.tempToken || "");
      setOtpCode("");
      setEmailVerifyFromLogin(false);
      setView("email-verify");

      try {
        await fetch(`${API_BASE}/auth/resend-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: regEmail }),
        });
      } catch {}
    } catch {
      setError(t("loginErrorConn"));
    } finally {
      setLoading(false);
    }
  };

  // ── 2FA ──────────────────────────────────────────────────────────
  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode) {
      setError(t("emailVerifyErrorCode"));
      return;
    }

    clearError();
    setLoading(true);

    try {
      const data = await verify2FA(tempToken, otpCode);

      if (data.error) {
        setError(data.error);
        return;
      }

      setToken(data.token || data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      if (data.user) setStoredUser(data.user);
      saveCurrentAsAccountFn();
      navigate("/feed");
    } catch {
      setError(t("loginErrorConn"));
    } finally {
      setLoading(false);
    }
  };

  // ── E-posta Doğrulama ────────────────────────────────────────────
  const handleEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpBlocked) {
      setError("Çok fazla hatalı deneme. Lütfen yeni kod isteyin.");
      return;
    }

    if (!otpCode || otpCode.length < 6) {
      setError(t("emailVerifyErrorCode"));
      return;
    }

    clearError();
    setLoading(true);

    try {
      const token = tempToken || getToken() || "";

      // 🔧 DÜZELTMESİ — "CSRF token eksik" HATASI:
      // Yeni KAYIT akışında (emailVerifyFromLogin=false) henüz bir giriş
      // token'ı yoktur (register endpoint'i doğrulama tamamlanmadan token
      // vermiyor). Eskiden bu durumda /auth/verify-email çağrılıyordu —
      // ama o endpoint authenticateToken ile korunuyor ve CSRF-muaf listesinde
      // değil; token gönderilemediği için hem auth hem CSRF kontrolüne takılıyordu.
      // ÇÖZÜM: Token olsun ya da olmasın, e-posta doğrulama kodu girme adımında
      // HER ZAMAN /auth/register-verify kullanılıyor — bu endpoint zaten
      // CSRF-muaf ve tempToken/e-posta ile kimlik doğruluyor, Bearer token istemiyor.
      const endpoint = `${API_BASE}/auth/register-verify`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: regEmail,
          code: otpCode,
          tempToken: token,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        // Yanlış kod → deneme sayacını artır
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        if (newAttempts >= 5) {
          setOtpBlocked(true);
          setError("5 hatalı deneme — hesabınız geçici olarak kilitlendi. Yeni kod isteyin.");
        } else {
          setError(`${data.error || data.message || t("emailVerifyErrorBad")} (${5 - newAttempts} hak kaldı)`);
        }
        setOtpCode("");
        return;
      }

      if (data.token) setToken(data.token);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      if (data.user) setStoredUser(data.user);

      setOtpCode("");
      setOtpAttempts(0);
      setOtpBlocked(false);
      clearError();

      if (emailVerifyFromLogin) {
        // Login akışından geldi → direkt feed'e yönlendir
        saveCurrentAsAccountFn();
        navigate("/feed");
      } else {
        setView("onboard-avatar");
      }
    } catch {
      setError(t("loginErrorConn"));
    } finally {
      setLoading(false);
    }
  };

  // ── Kodu yeniden gönder ───────────────────────────────────────────
  const handleResendCode = async () => {
    if (!regEmail) return;
    if (resendCooldown > 0) return; // cooldown bitmedi

    clearError();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setError(data.error || "Kod tekrar gönderilemedi");
      } else {
        // Başarılı → kilidi sıfırla + 60 sn cooldown başlat
        setOtpAttempts(0);
        setOtpBlocked(false);
        setOtpCode("");
        startResendCooldown(60);
      }
    } catch {
      setError(t("loginErrorConn"));
    } finally {
      setLoading(false);
    }
  };

  // ── Onboarding: Avatar ────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(await createSafePreviewUrl(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      setView("onboard-website");
      return;
    }

    clearError();
    setLoading(true);

    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("profilePic", avatarFile);

      const res = await fetch(`${API_BASE}/users/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.user) {
        const stored = localStorage.getItem("agrolink_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            localStorage.setItem(
              "agrolink_user",
              JSON.stringify({ ...parsed, ...data.user })
            );
          } catch {}
        }
      }

      setView("onboard-website");
    } catch {
      setError(t("loginErrorConn"));
    } finally {
      setLoading(false);
    }
  };

  // ── Onboarding: Website ───────────────────────────────────────────
  const handleWebsiteSave = async () => {
    if (!website.trim()) {
      setView("onboard-verify");
      return;
    }

    clearError();
    setLoading(true);

    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("website", website.trim());

      const res = await fetch(`${API_BASE}/users/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setView("onboard-verify");
    } catch {
      setError(t("loginErrorConn"));
    } finally {
      setLoading(false);
    }
  };

  // Onboarding: "davet et" adımına gelindiğinde kendi davet kodum/linkimi çek
  useEffect(() => {
    if (view !== "onboard-invite") return;
    let alive = true;
    getMyInvite()
      .then((d) => {
        if (!alive) return;
        if (d && d.inviteCode) {
          setMyInvite({
            inviteCode: d.inviteCode,
            inviteLink: d.inviteLink,
            inviteCount: d.inviteCount || 0,
            hasInviteBadge: !!d.hasInviteBadge,
            remainingForBadge: d.remainingForBadge ?? 10,
          });
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [view]);

  const handleCopyInviteLink = async () => {
    if (!myInvite?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(myInvite.inviteLink);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch {}
  };

  const handleShareInvite = async () => {
    if (!myInvite?.inviteLink) return;
    const shareText = `Agro Sosyal'e katıl! Türkiye'nin tarım sosyal ağında benimle buluş 🌾\n${myInvite.inviteLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Agro Sosyal", text: shareText, url: myInvite.inviteLink });
        return;
      } catch {}
    }
    handleCopyInviteLink();
  };

  const finishOnboardingToFeed = () => {
    setShowWelcomeSplash(true);
  };


  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail || !forgotUsername) {
      setError(t("forgotErrorAll"));
      return;
    }

    clearError();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, username: forgotUsername }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setForgotSent(true);
    } catch {
      setError(t("loginErrorConn"));
    } finally {
      setLoading(false);
    }
  };

  // Tek ekran giriş: robot doğrulaması alttan açılan bir kartta istenir, çözülünce giriş otomatik gönderilir.
  const onLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError(t("loginErrorEmpty"));
      return;
    }
    if (!recaptchaToken) {
      clearError();
      setCaptchaOpen(true);
      return;
    }
    void handleLogin(e);
  };

  useEffect(() => {
    if (captchaOpen && recaptchaToken) {
      setCaptchaOpen(false);
      void handleLogin({ preventDefault() {} } as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recaptchaToken, captchaOpen]);

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm";

  // 🎬 Onboarding tamamlandı → perde animasyonlu hoşgeldin ekranı, ardından feed'e geçiş
  if (showWelcomeSplash) {
    return (
      <WelcomeSplashScreen
        onDone={() => {
          navigate("/feed", { replace: true });
        }}
      />
    );
  }

  return (
    <div className={`nex-auth relative overflow-hidden ${view === "login" ? "nex-login-bg h-[100dvh]" : "min-h-screen bg-background"}`}>
      {/* Policy Modal */}
      <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-80 h-80 rounded-full bg-[#1E7FE0]/20 blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-[#3ECFA3]/20 blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute -bottom-32 left-1/3 w-72 h-72 rounded-full bg-[#2BA9BE]/15 blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className={`relative flex flex-col lg:flex-row items-stretch ${view === "login" ? "h-full" : "min-h-screen"}`}>
        {view !== "login" && (
          <div className="absolute top-4 right-4 z-20">
            <LanguageSwitcher variant="pill" />
          </div>
        )}

        <div className="hidden">
          <div className="flex items-center gap-3 animate-fade-in-down">
            <div className="w-12 h-12 rounded-2xl agro-gradient flex items-center justify-center shadow-agro">
              <Sprout className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-extrabold agro-gradient-text">
              {t("appName")}
            </span>
          </div>

          <div className="space-y-8 animate-fade-in-up">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {t("badgeCommunity")}
                </span>
              </div>
              <h2 className="text-5xl xl:text-6xl font-extrabold leading-[1.05] text-foreground">
                {t("heroLine1")} <br />
                <span className="agro-gradient-text">{t("heroLine2")}</span> <br />
                {t("heroLine3")}
              </h2>
              <p className="text-lg text-muted-foreground mt-6 max-w-md leading-relaxed">
                {t("heroDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-md">
              {[
                { icon: Users, title: t("heroFeat1Title"), desc: t("heroFeat1Desc") },
                {
                  icon: TrendingUp,
                  title: t("heroFeat2Title"),
                  desc: t("heroFeat2Desc"),
                },
                { icon: Leaf, title: t("heroFeat3Title"), desc: t("heroFeat3Desc") },
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-card/50 border border-border backdrop-blur-sm hover:bg-card/80 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl agro-gradient flex items-center justify-center flex-shrink-0 shadow-agro">
                    <f.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t("appName")} — {t("heroFooter")}
          </p>
        </div>

        {view === "login" && (
          <div className="relative z-10 h-full w-full max-w-md mx-auto flex flex-col items-center px-6 pt-[max(env(safe-area-inset-top),14px)] pb-[max(env(safe-area-inset-bottom),12px)]">
            {/* Dil seçici */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setLangOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-card/70 backdrop-blur border border-foreground/10 text-[15px] font-semibold text-foreground/75 active:scale-95 transition-transform"
              >
                {lang === "tr" ? "Türkçe" : "English"}
                <ChevronDown className={`w-4 h-4 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {langOpen && (
                <div role="listbox" className="absolute left-1/2 -translate-x-1/2 top-12 w-40 rounded-2xl bg-card border border-border shadow-xl p-1 z-30">
                  {(["tr", "en"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="option"
                      aria-selected={lang === l}
                      onClick={() => { setAutoDetect(false); setLang(l); setLangOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold ${lang === l ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
                    >
                      {l === "tr" ? "Türkçe" : "English"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Orta blok — ekrana sığar, kaydırma yok */}
            <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-[clamp(8px,1.8dvh,18px)]">
              <div
                className="rounded-[26px] bg-card/90 shadow-[0_10px_40px_-8px_rgba(43,169,190,0.55)] flex items-center justify-center overflow-hidden shrink-0"
                style={{ width: "clamp(64px, 10dvh, 96px)", height: "clamp(64px, 10dvh, 96px)" }}
              >
                <img src="https://sehitumitkestitarimmtal.com/agro.png" alt="Agro" className="w-[80%] h-[80%] object-contain" />
              </div>

              <div className="text-center shrink-0">
                <h1 className="text-[clamp(26px,4.4dvh,34px)] font-extrabold tracking-tight text-foreground leading-tight">
                  {lang === "tr" ? "Tekrar hoş geldin" : "Welcome back"}
                </h1>
                <p className="mt-1 text-[clamp(14px,2.1dvh,17px)] text-foreground/60">
                  {lang === "tr" ? "Üreticilerin bilgi ve dayanışma ağı" : "A knowledge and solidarity network for growers"}
                </p>
              </div>

              <form onSubmit={onLoginSubmit} className="w-full space-y-[clamp(8px,1.5dvh,14px)] shrink-0" noValidate>
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/55 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); if (error) clearError(); }}
                    style={{ paddingLeft: "3.4rem" }}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full text-[16px] text-foreground placeholder:text-foreground/45"
                    placeholder={lang === "tr" ? "E-posta veya kullanıcı adı" : "Email or username"}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/55 pointer-events-none z-10" />
                  <input
                    type={showLoginPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) clearError(); }}
                    style={{ paddingLeft: "3.4rem", paddingRight: "3.4rem" }}
                    autoComplete="current-password"
                    className="w-full text-[16px] text-foreground placeholder:text-foreground/45"
                    placeholder={lang === "tr" ? "Şifre" : "Password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((v) => !v)}
                    aria-label={showLoginPw ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1.5 text-foreground/60"
                  >
                    {showLoginPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {error && (
                  <p role="alert" className="text-destructive text-xs text-center bg-destructive/10 py-2 px-3 rounded-2xl border border-destructive/20">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-[17px] disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {lang === "tr" ? "Giriş yap" : "Log in"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { clearError(); setView("forgot"); }}
                className="shrink-0 text-[15px] font-semibold text-foreground py-1"
              >
                {lang === "tr" ? "Şifreni mi unuttun?" : "Forgot your password?"}
              </button>

              <button
                type="button"
                onClick={() => { clearError(); setView("register-1"); }}
                className="nex-login-outline shrink-0 w-full h-[54px] text-[17px] font-bold active:scale-[0.985] transition-transform"
              >
                <span className="nex-text">{lang === "tr" ? "Yeni hesap oluştur" : "Create new account"}</span>
              </button>

              <div className="shrink-0 flex justify-center min-h-[40px] items-center" title="Google">
                <div ref={googleBtnRef} />
              </div>

              <p className="shrink-0 text-center text-[12.5px] leading-snug text-foreground/60 px-1">
                {lang === "tr" ? (
                  <>Giriş veya kayıt olarak <button type="button" onClick={() => setPolicyModal("privacy")} className="underline underline-offset-2 font-semibold">gizlilik ilkemizi</button> kabul etmiş olursunuz.</>
                ) : (
                  <>By signing in or registering you accept our <button type="button" onClick={() => setPolicyModal("privacy")} className="underline underline-offset-2 font-semibold">privacy policy</button>.</>
                )}
              </p>

              <div className="shrink-0 text-center leading-tight">
                <p className="text-[13.5px] text-foreground/65">{lang === "tr" ? "Hesabına ulaşamıyor musun?" : "Can't access your account?"}</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[15px] font-bold text-emerald-700 dark:text-emerald-400">
                  {lang === "tr" ? "Bizimle iletişime geç" : "Contact us"}
                </a>
              </div>
            </div>

            {/* Alt imza */}
            <div className="shrink-0 flex items-center gap-3 pt-2 [@media(max-height:620px)]:hidden">
              <img src={`${import.meta.env.BASE_URL}agro-nex-mark.png`} alt="" className="h-9 w-auto" />
              <span className="text-[26px] font-extrabold tracking-tight text-foreground">Agro Nex</span>
            </div>

            {/* Robot doğrulaması — alttan açılan kart */}
            {captchaOpen && (
              <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 backdrop-blur-sm" onClick={() => setCaptchaOpen(false)}>
                <div
                  className="w-full max-w-md rounded-t-[28px] bg-card p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl animate-rise"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
                  <p className="text-center font-bold text-foreground">{lang === "tr" ? "Robot olmadığını doğrula" : "Verify you're human"}</p>
                  <p className="text-center text-xs text-muted-foreground mt-1 mb-3">
                    {lang === "tr" ? "Doğrulama sonrası giriş otomatik yapılır." : "You'll be signed in right after."}
                  </p>
                  <div className="flex justify-center">
                    <ReCaptcha onChange={(token) => { setRecaptchaToken(token); if (error) clearError(); }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`flex-1 items-center justify-center px-4 sm:px-6 py-10 lg:py-16 ${view === "login" ? "hidden" : "flex"}`}>
          <div className="w-full max-w-sm animate-scale-in">
            <div className="flex flex-col items-center mb-7 animate-fade-in-down">
              <div className="w-20 h-20 rounded-3xl overflow-hidden mb-4 shadow-agro animate-float ring-2 ring-primary/30 bg-card flex items-center justify-center">
                <img
                  src="https://sehitumitkestitarimmtal.com/agro.png"
                  alt="Agro Sosyal"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {t("appName")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 text-center px-4">
                {t("tagline")} 🌾
              </p>
              <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary tracking-wide uppercase">
                  {t("badgeCommunity")}
                </span>
              </div>
            </div>

            <div
              key={view}
              className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-border/60 shadow-2xl animate-fade-in-up"
            >
              {view === "health-check" && (
                <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
                  {/* Logo */}
                  <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-agro ring-2 ring-primary/30 bg-card flex items-center justify-center animate-float">
                    <img
                      src="https://sehitumitkestitarimmtal.com/agro.png"
                      alt="AgroLink"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {healthStatus === "checking" && (
                    <>
                      <div className="space-y-2">
                        <h2 className="text-lg font-bold text-foreground">Sunucu Doğrulanıyor</h2>
                        <p className="text-xs text-muted-foreground">Bağlantı kontrol ediliyor, lütfen bekleyin…</p>
                      </div>
                      {/* Animated dots */}
                      <div className="flex items-center gap-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full agro-gradient animate-bounce"
                            style={{ animationDelay: `${i * 0.18}s` }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {healthStatus === "ok" && (
                    <>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                        <CheckCircle2 className="w-8 h-8 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-foreground">Sunucu Hazır</h2>
                        <p className="text-xs text-muted-foreground">Bağlantı başarılı, yönlendiriliyorsunuz…</p>
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="h-1 w-8 rounded-full agro-gradient" style={{ opacity: 0.4 + i * 0.3 }} />
                        ))}
                      </div>
                    </>
                  )}

                  {healthStatus === "error" && (
                    <>
                      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                        <X className="w-8 h-8 text-destructive" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-foreground">Bakım Zamanı 🌱</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                          Sunucumuz şu an bakımda. <br className="hidden sm:block" />
                          Lütfen biraz sonra tekrar deneyin.
                        </p>
                      </div>
                      <div className="w-full p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground text-left space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-destructive" /> Sunucu Durumu
                        </p>
                        <p>🔴 API bağlantısı kurulamadı</p>
                        <p>⏳ Ekibimiz en kısa sürede sorunu çözecek</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHealthStatus("checking");
                          fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) })
                            .then((r) => r.json())
                            .then((d) => {
                              if (d.status === "ok") { setHealthStatus("ok"); setTimeout(() => setView("login"), 1200); }
                              else setHealthStatus("error");
                            })
                            .catch(() => setHealthStatus("error"));
                        }}
                        className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-agro hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
                      >
                        <Loader2 className="w-4 h-4" /> Tekrar Dene
                      </button>
                    </>
                  )}
                </div>
              )}

              {view === "register-1" && (
                <form onSubmit={handleRegisterStep1} className="space-y-5">
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setView("login");
                    }}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t("back")}
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full agro-gradient flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-agro">
                        1
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        Kimlik
                      </span>
                    </div>
                    <div className="flex-1 h-[2px] bg-border rounded-full overflow-hidden">
                      <div className="h-full w-1/2 agro-gradient" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                        2
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Güvenlik
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="inline-flex w-14 h-14 rounded-2xl agro-gradient items-center justify-center shadow-agro mb-1">
                      <Sparkles className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">
                      {t("registerTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t("registerStep1")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative group">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className={`${inputClass} pl-10`}
                        placeholder={t("regNamePh")}
                      />
                    </div>
                    <div className="relative group">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) =>
                          setRegUsername(
                            e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                          )
                        }
                        className={`${inputClass} pl-10`}
                        placeholder={t("regUsernamePh")}
                      />
                      {regUsername.length >= 3 && (
                        <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className={`${inputClass} pl-10`}
                        placeholder={t("regEmailPh")}
                      />
                    </div>
                  </div>

                  {/* ── Terms & Privacy Checkbox ── */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      termsAccepted
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/30 hover:border-border/80"
                    }`}
                    onClick={() => {
                      setTermsAccepted(!termsAccepted);
                      if (error) clearError();
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Custom checkbox */}
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          termsAccepted
                            ? "border-primary bg-primary shadow-agro"
                            : "border-border bg-background"
                        }`}
                      >
                        {termsAccepted && (
                          <svg
                            className="w-3 h-3 text-primary-foreground"
                            viewBox="0 0 12 10"
                            fill="none"
                          >
                            <path
                              d="M1 5l3.5 3.5L11 1"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed select-none">
                        AgroLink&apos;in{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPolicyModal("terms");
                          }}
                          className="inline-flex items-center gap-0.5 text-primary font-semibold hover:underline"
                        >
                          Kullanım Şartları
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>{" "}
                        ve{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPolicyModal("privacy");
                          }}
                          className="inline-flex items-center gap-0.5 text-primary font-semibold hover:underline"
                        >
                          Gizlilik Politikası
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>{" "}
                        &apos;nı okudum ve kabul ediyorum.
                      </p>
                    </div>

                    {/* School info strip */}
                    <div className="mt-2.5 pt-2.5 border-t border-border/40 flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                      <p className="text-[10px] text-muted-foreground/60 leading-tight">
                        {SCHOOL_NAME} · {SCHOOL_ADDRESS}
                      </p>
                    </div>
                  </div>

                  {error && (
                    <p className="text-destructive text-xs text-center bg-destructive/10 py-2 px-3 rounded-lg border border-destructive/20">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!termsAccepted}
                    className="w-full py-3.5 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-agro hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {t("next")} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {view === "register-2" && (
                <form onSubmit={handleRegisterStep2} className="space-y-5">
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setView("register-1");
                    }}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t("back")}
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Kimlik
                      </span>
                    </div>
                    <div className="flex-1 h-[2px] agro-gradient rounded-full" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full agro-gradient flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-agro">
                        2
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        Güvenlik
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="inline-flex w-14 h-14 rounded-2xl agro-gradient items-center justify-center shadow-agro mb-1">
                      <ShieldCheck className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">
                      {t("registerTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t("registerStep2")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className={`${inputClass} pl-10 pr-10`}
                        placeholder={t("regPasswordPh")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {regPassword.length > 0 &&
                      (() => {
                        const score = [
                          /.{8,}/,
                          /[A-Z]/,
                          /[0-9]/,
                          /[^A-Za-z0-9]/,
                        ].reduce((s, r) => s + (r.test(regPassword) ? 1 : 0), 0);

                        const labels = [
                          "Çok zayıf",
                          "Zayıf",
                          "Orta",
                          "Güçlü",
                          "Çok güçlü",
                        ];
                        const colors = [
                          "bg-destructive",
                          "bg-destructive",
                          "bg-amber-500",
                          "bg-primary",
                          "bg-emerald-500",
                        ];

                        return (
                          <div className="space-y-1.5">
                            <div className="flex gap-1">
                              {[0, 1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className={`h-1 flex-1 rounded-full transition-colors ${
                                    i < score ? colors[score] : "bg-muted"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Şifre gücü:{" "}
                              <span className="font-semibold text-foreground">
                                {labels[score]}
                              </span>
                            </p>
                          </div>
                        );
                      })()}

                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        className={`${inputClass} pl-10 pr-10`}
                        placeholder={t("regPasswordConfirmPh")}
                      />
                      {regPasswordConfirm.length > 0 &&
                        regPassword === regPasswordConfirm && (
                          <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative group">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                        <input
                          type="date"
                          value={regBirthDate}
                          onChange={(e) => setRegBirthDate(e.target.value)}
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                      <div className="relative group">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          className={`${inputClass} pl-10`}
                          placeholder={t("regCityPh")}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground -mt-1">
                      Doğum tarihi ve şehir opsiyoneldir.
                    </p>

                    <div className="relative group">
                      <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={regInviteCode}
                        onChange={(e) => setRegInviteCode(e.target.value.toUpperCase())}
                        className={`${inputClass} pl-10`}
                        placeholder="Davet kodu (varsa)"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-destructive text-xs text-center bg-destructive/10 py-2 px-3 rounded-lg border border-destructive/20">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                    {t("regSubmit")}
                  </button>
                </form>
              )}

              {view === "2fa" && (
                <form onSubmit={handle2FA} className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground text-center">
                    {t("twoFaTitle")}
                  </h2>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("twoFaDesc")}
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-4 rounded-xl bg-muted border border-border text-foreground text-center text-2xl tracking-[0.5em] font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="000000"
                  />
                  {error && (
                    <p className="text-destructive text-xs text-center">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                    {t("twoFaSubmit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      clearError();
                      setOtpCode("");
                    }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← {t("back")}
                  </button>
                </form>
              )}

              {view === "email-verify" && (
                <form onSubmit={handleEmailVerify} className="space-y-4">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      {t("emailVerifyTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("emailVerifyDesc", { email: regEmail })}
                    </p>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-4 rounded-xl bg-muted border border-border text-foreground text-center text-2xl tracking-[0.5em] font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="000000"
                    autoFocus
                  />
                  {error && (
                    <p className="text-destructive text-xs text-center">{error}</p>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    {t("emailVerifySupport")}{" "}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="text-primary hover:underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </p>
                  {otpBlocked && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
                      <p className="text-xs font-semibold text-destructive">🔒 Hesap geçici olarak kilitlendi</p>
                      <p className="text-xs text-muted-foreground mt-1">Yeni kod isteyin veya destek ile iletişime geçin.</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6 || otpBlocked}
                    className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                    {t("emailVerifySubmit")}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading || resendCooldown > 0}
                    className="w-full text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0
                      ? `Yeniden gönder (${resendCooldown}s)`
                      : t("emailVerifyResend")}
                  </button>
                </form>
              )}

              {view === "onboard-avatar" && (
                <div className="space-y-5">
                  <div className="flex gap-1.5 mb-2">
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-muted" />
                    <div className="h-1 flex-1 rounded-full bg-muted" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-foreground">
                      {t("onboardAvatarTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("onboardAvatarDesc")}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative w-28 h-28 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden hover:border-primary transition-colors bg-muted"
                    >
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Camera className="w-8 h-8" />
                          <span className="text-xs">{t("onboardAvatarPick")}</span>
                        </div>
                      )}
                      {avatarPreview && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  {error && (
                    <p className="text-destructive text-xs text-center">{error}</p>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleAvatarUpload}
                    className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {avatarFile ? t("onboardAvatarSave") : t("onboardAvatarSkip")}{" "}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {view === "onboard-website" && (
                <div className="space-y-5">
                  <div className="flex gap-1.5 mb-2">
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-muted" />
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Globe className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      {t("onboardWebsiteTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("onboardWebsiteDesc")}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {t("onboardWebsiteLabel")} ({t("optional")})
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className={inputClass}
                      placeholder={t("onboardWebsitePh")}
                    />
                  </div>
                  {error && (
                    <p className="text-destructive text-xs text-center">{error}</p>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleWebsiteSave}
                    className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {website.trim() ? t("save") : t("skip")}{" "}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {view === "onboard-verify" && (
                <div className="space-y-5">
                  <div className="flex gap-1.5 mb-2">
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      {t("onboardVerifyTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("onboardVerifyDesc")}
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{t("onboardVerifyB1")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{t("onboardVerifyB2")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{t("onboardVerifyB3")}</span>
                    </div>
                  </div>
                  {error && (
                    <p className="text-destructive text-xs text-center">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = AGROPAY_URL;
                    }}
                    className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-agro"
                  >
                    <ShieldCheck className="w-4 h-4" /> {t("onboardVerifyCta")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("onboard-invite")}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("onboardVerifySkip")}
                  </button>
                </div>
              )}

              {view === "onboard-invite" && (
                <div className="space-y-5">
                  <div className="flex gap-1.5 mb-2">
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      Arkadaşlarını davet et
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      10 kişiyi davet et, profilinde <span className="font-semibold text-foreground">Topluluk Elçisi</span> rozetini kazan!
                    </p>
                  </div>

                  {/* İlerleme çubuğu */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-primary" />
                        Davet ettiklerim
                      </span>
                      <span>{myInvite?.inviteCount ?? 0} / 10</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full agro-gradient rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((myInvite?.inviteCount ?? 0) / 10) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Davet kodu + link */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Davet kodun</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border font-mono text-sm font-bold text-foreground tracking-wide">
                        {myInvite?.inviteCode || "..."}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        className="p-3 rounded-xl bg-secondary border border-border hover:bg-secondary/70 transition-colors flex-shrink-0"
                        aria-label="Linki kopyala"
                      >
                        {inviteLinkCopied ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <Copy className="w-4 h-4 text-foreground" />
                        )}
                      </button>
                    </div>
                    {inviteLinkCopied && (
                      <p className="text-[11px] text-primary font-medium">Davet linki kopyalandı ✓</p>
                    )}
                  </div>

                  {error && (
                    <p className="text-destructive text-xs text-center">{error}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleShareInvite}
                    className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-agro"
                  >
                    <Share2 className="w-4 h-4" /> Davet linkini paylaş
                  </button>
                  <button
                    type="button"
                    onClick={finishOnboardingToFeed}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Şimdilik geç, ana akışa git
                  </button>
                </div>
              )}

              {view === "forgot" && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setForgotSent(false);
                      setView("login");
                    }}
                    className="flex items-center gap-1 text-sm text-muted-foreground mb-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t("back")}
                  </button>
                  <h2 className="text-lg font-bold text-foreground">
                    {t("forgotTitle")}
                  </h2>
                  {forgotSent ? (
                    <div className="text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <span className="text-3xl">📧</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{t("forgotSent")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("emailVerifySupport")}{" "}
                        <a
                          href={`mailto:${SUPPORT_EMAIL}`}
                          className="text-primary hover:underline"
                        >
                          {SUPPORT_EMAIL}
                        </a>
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">{t("forgotDesc")}</p>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          {t("regEmail")}
                        </label>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className={inputClass}
                          placeholder={t("regEmailPh")}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          {t("regUsername")}
                        </label>
                        <input
                          type="text"
                          value={forgotUsername}
                          onChange={(e) =>
                            setForgotUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                          }
                          className={inputClass}
                          placeholder={t("regUsernamePh")}
                        />
                      </div>
                      {error && (
                        <p className="text-destructive text-xs text-center">{error}</p>
                      )}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro"
                      >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                        {t("forgotSubmit")}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;








