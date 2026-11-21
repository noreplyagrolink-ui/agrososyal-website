import { useCallback, useEffect, useRef, useState } from "react";
import { X, Zap, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

// Sürüm değişince anahtar değişir → kart her kullanıcıya yeni sürümde 1 kez gösterilir.
// (Siteyi her açışta göstermek istersen: aşağıdaki iki localStorage satırını sil.)
const KEY = "agro_release_seen_v8";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { setOpen(true); }
  }, []);

  const close = useCallback(() => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  }, []);

  // Esc ile kapat, arka plan kaymasın, CTA'ya odaklan
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const f = setTimeout(() => ctaRef.current?.focus(), 350);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(f);
    };
  }, [open, close]);

  if (!open) return null;

  const tiles = [
    {
      icon: Zap,
      title: "Daha fazla hız",
      desc: "Anlık beğeni sayıları, daha akıcı ana akış ve gecikmesiz açılan gönderiler.",
      delay: 280,
    },
    {
      icon: ShieldCheck,
      title: "Daha fazla güvenlik",
      desc: "Güçlendirilmiş oturum ve hesap koruması ile verilerin her zaman güvende.",
      delay: 380,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agro-v8-title"
      onClick={close}
    >
      <div
        className="v8-card relative w-full max-w-[400px] rounded-[32px] px-6 pt-8 pb-6 text-center overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arka plan ışıkları */}
        <span className="v8-orb w-56 h-56 -top-20 -left-16 bg-primary animate-float" />
        <span className="v8-orb w-48 h-48 -bottom-16 -right-12 bg-accent animate-float" style={{ animationDelay: "1.2s" }} />

        <button
          onClick={close}
          className="absolute top-3.5 right-3.5 z-10 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 transition"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Yeni sürüm rozeti */}
        <div className="animate-rise inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-[11px] font-bold tracking-[0.14em] uppercase text-primary">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-primary opacity-70 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" />
          </span>
          Yeni sürüm
        </div>

        {/* Dev "8" */}
        <div className="animate-rise mt-5" style={{ animationDelay: "120ms" }}>
          <div className="v8-eight text-[132px] font-black tracking-tighter select-none" aria-hidden>8</div>
        </div>

        <h2
          id="agro-v8-title"
          className="animate-rise mt-4 text-[26px] leading-tight font-extrabold tracking-tight text-foreground"
          style={{ animationDelay: "200ms" }}
        >
          8 sürümüne <span className="text-gradient-brand">hoş geldiniz</span>
        </h2>
        <p className="animate-rise mt-2 text-sm text-muted-foreground" style={{ animationDelay: "240ms" }}>
          AgroLink tamamen yenilendi. Daha hızlı, daha güvenli, daha güzel.
        </p>

        {/* Hız / Güvenlik kartları */}
        <div className="mt-6 grid gap-3 text-left">
          {tiles.map(({ icon: Icon, title, desc, delay }) => (
            <div
              key={title}
              className="animate-rise rounded-2xl border border-border/70 bg-foreground/[0.03] backdrop-blur p-4"
              style={{ animationDelay: `${delay}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl gradient-brand grid place-items-center shadow-glow">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold text-foreground">{title}</div>
                  <div className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</div>
                </div>
              </div>
              <div className="v8-bar mt-3"><span /></div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          ref={ctaRef}
          onClick={close}
          className="btn-premium animate-rise mt-6 w-full px-5 py-3.5 rounded-2xl font-bold text-[15px] shadow-glow inline-flex items-center justify-center gap-2"
          style={{ animationDelay: "480ms" }}
        >
          <Sparkles className="w-4 h-4" />
          Keşfetmeye başla
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default WelcomeModal;
