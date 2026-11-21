import { useEffect, useState } from "react";
import { ShieldOff, Layers, Sprout } from "lucide-react";

interface Props {
  /** Geçiş tamamlandığında (perde kapanıp feed'e geçme zamanı geldiğinde) çağrılır */
  onDone: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// WelcomeSplashScreen — yeni kayıt sonrası gösterilen tanıtım ekranı.
// Akış: metin + rozetler beliriyor (fade/scale) → kısa bekleme →
// alttan yukarıya doğru yükselen bir "perde" tüm ekranı kaplıyor →
// perde tam kapanınca onDone() tetiklenir (bu sırada arkada feed
// zaten mount edilebilir) → perde yukarı doğru açılarak feed ortaya çıkar.
// ─────────────────────────────────────────────────────────────────────────
export function WelcomeSplashScreen({ onDone }: Props) {
  // "enter"  : içerik beliriyor
  // "hold"   : içerik tam görünür, kısa bekleme
  // "close"  : perde aşağıdan yukarıya kapanıyor (tüm ekranı kaplıyor)
  // "open"   : perde yukarı doğru açılıyor, feed görünüyor
  const [phase, setPhase] = useState<"enter" | "hold" | "close" | "open">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 120);
    const t2 = setTimeout(() => setPhase("close"), 2200);
    // Perde tamamen kapandıktan (ekranı kaplayıp beyaz/yeşil bir yüzey haline geldikten)
    // hemen sonra feed'i arkada hazırlamak için onDone çağrılır, sonra perde açılır.
    const t3 = setTimeout(() => {
      onDone();
      setPhase("open");
    }, 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-background">
      {/* ── İçerik: hoşgeldin metni ── */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center px-8 text-center transition-all duration-700 ${
          phase === "enter" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        } ${phase === "close" || phase === "open" ? "opacity-0" : ""}`}
      >
        <div className="w-20 h-20 rounded-3xl agro-gradient flex items-center justify-center shadow-agro mb-6 animate-float">
          <Sprout className="w-10 h-10 text-primary-foreground" />
        </div>

        <h1 className="text-2xl font-extrabold text-foreground mb-2">
          Türkiye&apos;nin tarım sosyal ağına hoş geldin
        </h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs">
          Çiftçiler, üreticiler ve tarım severlerle aynı yerde buluş.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldOff className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Reklamsız</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Akışın hiçbir zaman reklamla bölünmez</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Layers className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Sade, şeffaf akış</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Ne göreceğini gizli algoritmalar değil, sen belirlersin</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Perde: alttan yukarıya doğru yükselip tüm ekranı kaplar, sonra yukarı çıkıp açılır ──
          Üç konum: aşağıda gizli (enter/hold) → tam ortada/ekranı kaplamış (close) → yukarıda dışarı çıkmış (open) */}
      <div
        className={`absolute inset-0 h-full agro-gradient transition-transform ease-in-out ${
          phase === "close" ? "duration-700" : phase === "open" ? "duration-700" : "duration-0"
        }`}
        style={{
          transform:
            phase === "enter" || phase === "hold"
              ? "translateY(100%)" // ekranın altında, görünmüyor
              : phase === "close"
              ? "translateY(0%)" // yukarı kayıp tüm ekranı kaplıyor
              : "translateY(-100%)", // "open": ekranın üstüne doğru kayıp açılıyor
        }}
      />
    </div>
  );
}

export default WelcomeSplashScreen;

