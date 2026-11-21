// ============================================================
//  AIFloatingWidget
//  • Sağ alt köşede sabit "Agro AI" butonu
//  • Tıklanınca: harici Agro AI sayfasını yeni sekmede açar
// ============================================================

import { useState, useEffect } from "react";
import { Bot, X, Sparkles, Leaf, TrendingUp, ExternalLink } from "lucide-react";
import { useLocation } from "react-router-dom";
import { safeStorage } from "@/lib/security";
import { getStoredUser } from "@/lib/api";

const HIDE_PATHS = ["/login", "/"]; // bu sayfalarda gösterme
const AGRO_AI_URL = "https://sehitumitkestitarimmtal.com/agro-ai/";

function openAgroAI() {
  window.open(AGRO_AI_URL, "_blank", "noopener,noreferrer");
}

const AIFloatingWidget = () => {
  const location = useLocation();
  const user = getStoredUser();

  const [showPopup, setShowPopup] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    safeStorage.get<boolean>("ai_welcome_dismissed", false)
  );

  useEffect(() => {
    if (!user) return;
    if (dismissed) return;
    if (HIDE_PATHS.includes(location.pathname)) return;
    const timer = setTimeout(() => setShowPopup(true), 3000);
    return () => clearTimeout(timer);
  }, [location.pathname, user, dismissed]);

  const dismiss = () => {
    setShowPopup(false);
    setDismissed(true);
    safeStorage.set("ai_welcome_dismissed", true);
  };

  const goToAI = () => {
    dismiss();
    openAgroAI();
  };

  if (!user) return null;
  if (HIDE_PATHS.includes(location.pathname)) return null;

  return (
    <>
      {showPopup && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-card shadow-2xl shadow-emerald-500/10 animate-in slide-in-from-bottom-4 fade-in duration-500"
            style={{ marginBottom: "80px" }}
          >
            <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-emerald-600 to-green-700 px-5 pt-5 pb-8">
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold text-base">Agro AI</span>
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">YENİ</span>
                  </div>
                  <p className="text-emerald-100 text-xs">Tarım Yapay Zeka Asistanı</p>
                </div>
              </div>
            </div>

            <div className="px-5 pt-4 pb-5 space-y-3 -mt-4 relative">
              <div className="bg-card rounded-xl border border-border p-3.5 space-y-3">
                <p className="text-sm font-semibold text-foreground">AI asistanınız hazır! 🎉</p>
                <div className="space-y-2">
                  {[
                    { icon: Leaf, text: "Bitki hastalığı teşhisi", color: "text-emerald-600" },
                    { icon: TrendingUp, text: "Ürün fiyat ve kar analizi", color: "text-blue-600" },
                    { icon: Sparkles, text: "Tarım soruları ve öneriler", color: "text-purple-600" },
                  ].map(({ icon: Icon, text, color }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg bg-muted flex items-center justify-center ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs text-foreground">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={dismiss}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-muted transition-all"
                >
                  Sonra
                </button>
                <button
                  onClick={goToAI}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-all"
                >
                  Aç <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed z-50 pointer-events-auto" style={{ bottom: "80px", right: "16px" }}>
        <button
          onClick={goToAI}
          className="group relative rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-110 transition-all active:scale-95 flex items-center justify-center"
          style={{ width: "52px", height: "52px" }}
          title="Agro AI"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
          <span className="absolute right-full mr-3 whitespace-nowrap bg-foreground text-background text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-medium">
            Agro AI
          </span>
        </button>
      </div>
    </>
  );
};

export default AIFloatingWidget;
