import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/api";
import SplashScreen from "@/components/SplashScreen";

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.yourcompany.agrolink";

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// iOS Safari'de (standalone değilse) direkt web'e geç — Play Store banner gösterme
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  // Chrome/Firefox/Edge iOS kullanıyor ama "CriOS","FxiOS","OPiOS" gibi marker taşır
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

const Index = () => {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [showMobileBanner, setShowMobileBanner] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    // iOS Safari → direkt ana uygulamaya geç, Play Store banner'ı gösterme
    if (isIosSafari()) {
      if (isAuthenticated()) navigate("/feed", { replace: true });
      else navigate("/login", { replace: true });
    } else if (isMobile()) {
      setShowMobileBanner(true);
    } else {
      if (isAuthenticated()) navigate("/feed", { replace: true });
      else navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleContinueWeb = () => {
    setShowMobileBanner(false);
    if (isAuthenticated()) navigate("/feed", { replace: true });
    else navigate("/login", { replace: true });
  };

  if (showSplash) return <SplashScreen onComplete={handleSplashComplete} />;

  if (showMobileBanner) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[#060c06] overflow-hidden">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;800;900&display=swap');
          .mb-root { font-family: 'Outfit', sans-serif; }
          @keyframes mbFadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes mbScale {
            from { opacity: 0; transform: scale(0.8); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes mbGlow {
            0%,100% { opacity: .6; transform: scale(1); }
            50%      { opacity: 1;  transform: scale(1.1); }
          }
          @keyframes mbShimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .mb-play-btn {
            background: #fff;
            border-radius: 20px;
            display: flex; align-items: center; gap: 14px;
            padding: 14px 24px;
            width: 100%;
            cursor: pointer;
            border: none;
            transition: transform .15s ease, box-shadow .15s ease;
            box-shadow: 0 8px 32px rgba(0,0,0,.4);
          }
          .mb-play-btn:active { transform: scale(.97); box-shadow: 0 4px 16px rgba(0,0,0,.3); }

          .mb-web-btn {
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 16px;
            color: rgba(255,255,255,.65);
            font-size: .9rem;
            font-weight: 500;
            font-family: 'Outfit', sans-serif;
            padding: 14px;
            width: 100%;
            cursor: pointer;
            transition: background .2s, color .2s;
          }
          .mb-web-btn:active { background: rgba(255,255,255,.1); color: #fff; }

          .mb-badge {
            display: inline-flex; align-items: center; gap: 5px;
            background: rgba(74,222,128,.1);
            border: 1px solid rgba(74,222,128,.2);
            border-radius: 99px;
            padding: 4px 12px;
            font-size: .68rem; font-weight: 600;
            color: #4ade80;
            letter-spacing: .06em;
            text-transform: uppercase;
          }
        `}</style>

        {/* Arka plan glow */}
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,.1) 0%, transparent 65%)",
          top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          animation: "mbGlow 4s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* İnce grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(74,222,128,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,.03) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* İçerik */}
        <div className="mb-root" style={{
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center",
          flex: 1, padding: "0 28px",
          justifyContent: "center", gap: 0,
        }}>

          {/* App ikonu */}
          <div style={{ animation: "mbScale .5s cubic-bezier(.34,1.56,.64,1) .05s both", marginBottom: 28 }}>
            <div style={{
              width: 100, height: 100, borderRadius: 28,
              background: "linear-gradient(145deg,#0f2d1a,#14532d,#166534)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(74,222,128,.2), 0 20px 50px rgba(0,0,0,.5), 0 0 60px rgba(34,197,94,.15)",
              position: "relative",
            }}>
              <img
                src="https://sehitumitkestitarimmtal.com/agro.png"
                alt="Agro"
                style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 14 }}
              />
              {/* glow halo */}
              <div style={{
                position: "absolute", inset: -16, borderRadius: 44,
                background: "radial-gradient(circle, rgba(34,197,94,.18) 0%, transparent 70%)",
                zIndex: -1, pointerEvents: "none",
              }} />
            </div>
          </div>

          {/* Başlık */}
          <div style={{ textAlign: "center", animation: "mbFadeUp .45s ease .15s both", marginBottom: 10 }}>
            <div className="mb-badge" style={{ marginBottom: 14 }}>
              <span>⭐</span> En çok indirilen tarım uygulaması
            </div>
            <h1 style={{
              fontSize: "2.2rem", fontWeight: 900, color: "#fff",
              margin: 0, letterSpacing: "-.5px", lineHeight: 1.05,
            }}>
              Agro <span style={{
                background: "linear-gradient(135deg,#4ade80,#22c55e,#86efac)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Sosyal</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: ".85rem", margin: "8px 0 0", fontWeight: 400 }}>
              Tarımın dijital buluşma noktası
            </p>
          </div>

          {/* Rating + İndirme sayısı */}
          <div style={{
            display: "flex", gap: 20, marginBottom: 36,
            animation: "mbFadeUp .45s ease .25s both",
          }}>
            {[
              { val: "4.9", label: "Puan", sub: "★★★★★" },
              { val: "10K+", label: "İndirme" },
              { val: "Ücretsiz", label: "Fiyat" },
            ].map(({ val, label, sub }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>{val}</div>
                {sub && <div style={{ fontSize: ".6rem", color: "#4ade80", letterSpacing: 1 }}>{sub}</div>}
                <div style={{ fontSize: ".65rem", color: "rgba(255,255,255,.3)", fontWeight: 400, marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Özellikler — yatay kaydırmalı chip'ler */}
          <div style={{
            display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap", justifyContent: "center",
            animation: "mbFadeUp .45s ease .32s both",
          }}>
            {["🌾 Çiftçi ağı","📈 Fiyat takibi","💬 Mesajlaşma","🌤️ Hava durumu","🏪 Pazar yeri"].map(f => (
              <span key={f} style={{
                background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)",
                borderRadius: 99, padding: "6px 14px",
                fontSize: ".72rem", fontWeight: 500, color: "rgba(255,255,255,.6)",
              }}>{f}</span>
            ))}
          </div>

          {/* Butonlar */}
          <div style={{
            width: "100%", display: "flex", flexDirection: "column", gap: 10,
            animation: "mbFadeUp .45s ease .4s both",
          }}>
            <a href={PLAY_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button className="mb-play-btn">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M3.18 1L13.35 11.17L3.19 21.33C2.94 21.17 2.75 20.9 2.75 20.55V1.78C2.75 1.42 2.94 1.15 3.18 1Z" fill="#EA4335"/>
                  <path d="M17.33 8.17L14.5 11L3.18 1C3.4 0.88 3.66 0.88 3.89 1.01L17.33 8.17Z" fill="#FBBC04"/>
                  <path d="M17.33 15.83L3.89 23C3.66 23.12 3.4 23.12 3.18 23L14.5 13L17.33 15.83Z" fill="#34A853"/>
                  <path d="M21.25 12C21.25 12.58 20.96 13.09 20.5 13.38L17.33 15.17L14.25 12L17.33 8.83L20.5 10.62C20.96 10.91 21.25 11.42 21.25 12Z" fill="#4285F4"/>
                </svg>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: ".68rem", color: "#888", fontWeight: 500, lineHeight: 1 }}>Google Play'den İndir</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#111", lineHeight: 1.2 }}>Google Play</div>
                </div>
              </button>
            </a>

            <button className="mb-web-btn" onClick={handleContinueWeb}>
              Tarayıcıda devam et →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;

