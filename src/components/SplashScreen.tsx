import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import animationData from "@/assets/AgroLogo.json";

interface Props {
  onComplete: () => void;
}

const SUB_BRANDS = [
  { name: "Agro Pay", icon: "💳" },
  { name: "Agro AI", icon: "🤖" },
  { name: "Agro Hava", icon: "🌤️" },
  { name: "Agro Grow", icon: "🌱" },
  { name: "İzleo", icon: "🎬" },
];

const SplashScreen = ({ onComplete }: Props) => {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    // 4 saniye göster, sonra exit animasyonu + callback
    const exitTimer = setTimeout(() => setExit(true), 4000);
    const doneTimer = setTimeout(() => onComplete(), 4600);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;800&display=swap');

        .spl {
          font-family: 'Outfit', sans-serif;
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #060c06;
          overflow: hidden;
          opacity: 1;
          transition: opacity 0.5s ease;
        }
        .spl.exit { opacity: 0; pointer-events: none; }

        /* subtle grid */
        .spl-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(74,222,128,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,222,128,.04) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        /* center glow */
        .spl-glow {
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,197,94,.12) 0%, transparent 65%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: glowPulse 3.5s ease-in-out infinite;
        }

        /* ── Lottie container ── */
        .spl-lottie-wrap {
          position: relative; z-index: 2;
          width: 220px; height: 220px;
          border-radius: 48px;
          background: #fff;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(74,222,128,.2),
            0 20px 60px rgba(0,0,0,.5),
            0 0 80px rgba(34,197,94,.15);
          animation: fadeUp .5s ease .1s both;
        }
        .spl-lottie {
          width: 100%; height: 100%;
        }

        /* ── Brand block (pinned bottom) ── */
        .spl-footer {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: env(safe-area-inset-bottom, 28px);
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 28px);
          gap: 14px;
          animation: fadeUp .5s ease .35s both;
        }

        .spl-brand {
          text-align: center;
        }
        .spl-brand-name {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -.4px;
          color: #fff;
          margin: 0;
          line-height: 1;
        }
        .spl-brand-name span {
          background: linear-gradient(135deg, #4ade80, #22c55e, #86efac);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .spl-tagline {
          font-size: .65rem;
          font-weight: 300;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: rgba(255,255,255,.28);
          margin: 5px 0 0;
        }

        /* sub-brands row */
        .spl-subs {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
          padding: 0 20px;
        }
        .spl-sub-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: .62rem;
          font-weight: 500;
          color: rgba(255,255,255,.38);
          letter-spacing: .02em;
          white-space: nowrap;
        }
        .spl-sub-item .ico { font-size: .72rem; }
        .spl-divider {
          width: 2px; height: 2px;
          border-radius: 50%;
          background: rgba(255,255,255,.18);
        }

        @keyframes glowPulse {
          0%,100% { opacity: .7; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 1;  transform: translate(-50%,-50%) scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className={`spl${exit ? " exit" : ""}`}>
        <div className="spl-grid" />
        <div className="spl-glow" />

        {/* Lottie animasyonu tam ortada — yumuşak köşeli beyaz kart */}
        <div className="spl-lottie-wrap">
          <div className="spl-lottie">
            <Lottie animationData={animationData} loop={false} autoplay />
          </div>
        </div>

        {/* Alt brand bloğu */}
        <div className="spl-footer">
          <div className="spl-brand">
            <h1 className="spl-brand-name">
              <span>Agro</span> Sosyal
            </h1>
            <p className="spl-tagline">Tarımın dijital buluşma noktası</p>
          </div>

          {/* Alt ürünler — Google tarzı */}
          <div className="spl-subs">
            {SUB_BRANDS.map((b, i) => (
              <>
                <div key={b.name} className="spl-sub-item">
                  <span className="ico">{b.icon}</span>
                  <span>{b.name}</span>
                </div>
                {i < SUB_BRANDS.length - 1 && (
                  <div key={`d${i}`} className="spl-divider" />
                )}
              </>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SplashScreen;


