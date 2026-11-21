import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, ExternalLink, Lock, ChevronRight, User } from "lucide-react";
import { setToken, setStoredUser, setRefreshToken } from "@/lib/api";

const API_BASE = "https://sehitumitkestitarimmtal.com";
const GOOGLE_CLIENT_ID =
  "942312074029-0qa0cf3m6s7tpfe0cbaqaho3fls28jos.apps.googleusercontent.com";

const ease = [0.16, 1, 0.3, 1];

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

// Sunucudan dönen kullanıcı tipi
interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  profilePic?: string;
  isVerified?: boolean;
  role?: string;
}

interface AuthResponse {
  token: string;
  refreshToken?: string;
  user?: AuthUser;
  isNewUser?: boolean;
}

// Aynı Google e-postasına bağlı birden fazla hesap — frontend'de simulate
// (Gerçekte server tek hesap döndürür; bu UI gelecekte multi-account eklenirse hazır)
interface PendingGoogleAuth {
  idToken: string;
  googleName: string;
  googleEmail: string;
  googlePicture: string;
  // server'dan dönen ilk hesap
  resolvedData: AuthResponse;
}

const Auth = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  // Çoklu hesap seçim ekranı
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleAuth | null>(null);

  // ─── Giriş başarılı → kaydet & yönlendir ────────────────────────────
  const onLoginSuccess = useCallback(
    (data: AuthResponse) => {
      setToken(data.token);
      setStoredUser(data.user || {});
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      setMessage("Giriş başarılı! Yönlendiriliyorsunuz...");
      setMessageType("success");
      // useNavigate → basename "/agropay" otomatik eklenir → /agropay/loading
      setTimeout(() => navigate("/loading"), 800);
    },
    [navigate]
  );

  // ─── Google idToken → server ─────────────────────────────────────────
  const handleGoogleToken = useCallback(
    async (idToken: string, googleInfo?: { name: string; email: string; picture: string }) => {
      setGoogleLoading(true);
      setMessage("");
      try {
        const res = await fetch(`${API_BASE}/api/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-App-Platform": "android",
            "X-Client-Type": "native",
          },
          body: JSON.stringify({ idToken }),
        });
        const data: AuthResponse = await res.json();

        if (res.ok) {
          // Eğer Google e-postasıyla kayıtlı BAŞKA bir hesap da varsa seçim göster
          // Şimdilik: server tek hesap döndürüyor → direkt giriş
          // Ama kullanıcıya "hangi hesapla devam?" UI'ı gösterelim (UX için)
          if (googleInfo) {
            setPendingGoogle({
              idToken,
              googleName: googleInfo.name,
              googleEmail: googleInfo.email,
              googlePicture: googleInfo.picture,
              resolvedData: data,
            });
          } else {
            onLoginSuccess(data);
          }
        } else {
          const errData = data as { error?: string };
          setMessage(errData.error || "Google ile giriş başarısız.");
          setMessageType("error");
        }
      } catch {
        setMessage("Sunucuya bağlanılamadı.");
        setMessageType("error");
      } finally {
        setGoogleLoading(false);
      }
    },
    [onLoginSuccess]
  );

  // ─── GSI script yükle ────────────────────────────────────────────────
  useEffect(() => {
    const SCRIPT_ID = "google-gsi-script";

    const initGSI = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          // JWT payload'ı decode et (imzasız — sadece UI bilgisi için)
          try {
            const payload = JSON.parse(atob(response.credential.split(".")[1]));
            handleGoogleToken(response.credential, {
              name: payload.name || "",
              email: payload.email || "",
              picture: payload.picture || "",
            });
          } catch {
            handleGoogleToken(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      const btn = document.getElementById("google-signin-btn");
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          width: btn.offsetWidth || 380,
          text: "continue_with",
          locale: "tr",
        });
      }
    };

    if (document.getElementById(SCRIPT_ID)) {
      initGSI();
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGSI;
    document.head.appendChild(script);
  }, [handleGoogleToken]);

  // ─── Normal giriş ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Platform": "android",
          "X-Client-Type": "native",
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (res.ok) {
        const data: AuthResponse = await res.json();
        onLoginSuccess(data);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 404) {
          setMessage(
            "Hesap bulunamadı veya şifre hatalı. Önce Agro Sosyal'de hesap açmanız gerekiyor."
          );
        } else {
          setMessage((data as { error?: string }).error || "Bir hata oluştu. Lütfen tekrar deneyin.");
        }
        setMessageType("error");
      }
    } catch {
      setMessage("Sunucuya bağlanılamadı.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // HESAP SEÇİM EKRANI — Google girişten sonra göster
  // ════════════════════════════════════════════════════════════
  if (pendingGoogle) {
    const { googleName, googleEmail, googlePicture, resolvedData } = pendingGoogle;
    const resolvedUser = resolvedData.user;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-6">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[150px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="relative z-10 w-full max-w-md"
        >
          <div
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{ background: "linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))" }}
          >
            <div className="absolute inset-0 border border-border rounded-3xl" />
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="relative z-10">
              {/* Google hesap bilgisi */}
              <div className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-white/5 border border-border">
                {googlePicture ? (
                  <img src={googlePicture} alt={googleName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User size={18} className="text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{googleName}</p>
                  <p className="text-xs text-muted-foreground">{googleEmail}</p>
                </div>
              </div>

              <h1 className="text-xl font-bold text-foreground mb-1">Hesap Seç</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Bu Google hesabıyla devam edecek Agro PAY hesabını seç
              </p>

              {/* Bulunan hesap */}
              <AnimatePresence>
                {resolvedUser && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onLoginSuccess(resolvedData)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group mb-3"
                  >
                    {resolvedUser.profilePic ? (
                      <img
                        src={resolvedUser.profilePic.startsWith("http") ? resolvedUser.profilePic : `${API_BASE}${resolvedUser.profilePic}`}
                        alt={resolvedUser.name}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User size={20} className="text-primary" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">{resolvedUser.name}</p>
                        {resolvedUser.isVerified && (
                          <span className="text-primary text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">@{resolvedUser.username}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Farklı hesapla giriş */}
              <button
                onClick={() => setPendingGoogle(null)}
                className="w-full py-3 rounded-2xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-200 mt-1"
              >
                Farklı hesap kullan
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ANA GİRİŞ EKRANI
  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[150px]" />
      <div
        className="absolute inset-0 opacity-[0.01]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="relative z-10 w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="text-sm">Ana Sayfa</span>
        </Link>

        <div
          className="rounded-3xl p-8 relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))" }}
        >
          <div className="absolute inset-0 border border-border rounded-3xl" />
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-[10px] icon-container-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <span className="text-foreground font-semibold text-lg">Agro PAY</span>
            </div>

            <h1 className="text-2xl font-bold text-foreground mt-8 mb-2">Giriş Yap</h1>
            <p className="text-muted-foreground text-sm mb-8">
              Agro Sosyal hesabınız ile giriş yapın
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                  Kullanıcı Adı veya E-posta
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
                  placeholder="kullaniciadi veya eposta@..."
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all pr-12 placeholder:text-muted-foreground/50"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm p-4 rounded-xl ${
                    messageType === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : messageType === "error"
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  {message}
                  {messageType === "error" && message.includes("Agro Sosyal") && (
                    <a
                      href="https://sehitumitkestitarimmtal.com/agrolink/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 mt-2 text-primary hover:underline font-medium text-xs"
                    >
                      Agro Sosyal'de Hesap Aç <ExternalLink size={12} />
                    </a>
                  )}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-all duration-300 disabled:opacity-50 hover:shadow-glow"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Yükleniyor...
                  </span>
                ) : (
                  "Giriş Yap"
                )}
              </button>
            </form>

            {/* Ayraç */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground/60 font-medium tracking-widest uppercase">veya</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google butonu */}
            <div className="relative w-full" style={{ minHeight: 44 }}>
              {googleLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-sm">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              <div id="google-signin-btn" className="w-full flex justify-center" />
            </div>

            <div className="section-divider my-6" />

            <p className="text-center text-sm text-muted-foreground">
              Hesabınız yok mu?{" "}
              <a
                href="https://sehitumitkestitarimmtal.com/agrolink/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Agro Sosyal'de Kayıt Ol
              </a>
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground/50">
              <Lock size={10} />
              <span>256-bit SSL ile korunmaktadır</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;


