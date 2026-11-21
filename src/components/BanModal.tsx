import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban } from "lucide-react";
import { clearAuth } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface BanModalProps {
  visible: boolean;
  /** When true, modal cannot be dismissed and forces logout (own account banned). */
  forceLogout?: boolean;
}

const BanModal = ({ visible, forceLogout = true }: BanModalProps) => {
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();
  const { lang } = useLanguage();

  useEffect(() => {
    if (!visible) {
      setCountdown(3);
      return;
    }
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const handleLogout = () => {
    clearAuth();
    try { localStorage.clear(); } catch {}
    navigate("/login", { replace: true });
    setTimeout(() => window.location.reload(), 50);
  };

  if (!visible) return null;

  const t = {
    tr: {
      title: "Erişim Engeli",
      sub1: "Hesabınız politika ihlali nedeniyle kısıtlanmıştır.",
      sub2: "Daha fazla bilgi için destek ekibiyle iletişime geçin.",
      countdown: "Bu pencere {n} saniye içinde kapanacak",
      btn: "Kapat ve Çıkış Yap",
    },
    en: {
      title: "Access Restricted",
      sub1: "Your account has been restricted due to a policy violation.",
      sub2: "Please contact support for more information.",
      countdown: "This window will close in {n} seconds",
      btn: "Close and Sign Out",
    },
  }[lang];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-[90%] p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <Ban className="w-10 h-10 text-destructive" strokeWidth={2.2} />
        </div>
        <h2 className="text-2xl font-bold text-destructive mb-2">{t.title}</h2>
        <p className="text-sm text-muted-foreground mb-1.5">
          {t.sub1.split("politika ihlali").length > 1 ? (
            <>
              {t.sub1.split("politika ihlali")[0]}
              <strong className="text-foreground">politika ihlali</strong>
              {t.sub1.split("politika ihlali")[1]}
            </>
          ) : (
            t.sub1.split("policy violation").length > 1 ? (
              <>
                {t.sub1.split("policy violation")[0]}
                <strong className="text-foreground">policy violation</strong>
                {t.sub1.split("policy violation")[1]}
              </>
            ) : t.sub1
          )}
        </p>
        <p className="text-sm text-muted-foreground mb-4">{t.sub2}</p>

        {forceLogout && countdown > 0 && (
          <p className="text-xs text-muted-foreground mb-4">
            {t.countdown.replace("{n}", String(countdown))}
          </p>
        )}

        {forceLogout && (
          <button
            onClick={handleLogout}
            className="w-full py-3 px-6 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm active:scale-95 transition-transform hover:opacity-90"
          >
            {t.btn}
          </button>
        )}
      </div>
    </div>
  );
};

export default BanModal;

