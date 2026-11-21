import { useRef, useState } from "react";
import { Sparkles, Loader2, Check, Undo2, X } from "lucide-react";
import { TONES, rewriteWithTone, type ToneId } from "@/lib/omniRewrite";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** Gönderi metninin altında: "Omni AI ile geliştir" → ton seçenekleri → öneri → Kullan / Geri al */
const OmniRewriteBar = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ToneId | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const has = value.trim().length >= 3;

  const run = async (tone: ToneId) => {
    if (!has || busy) return;
    setError(""); setSuggestion(""); setBusy(tone);
    const ac = new AbortController(); abortRef.current = ac;
    let acc = "";
    try {
      await rewriteWithTone(value.trim(), tone, ac.signal, (t) => { acc += t; setSuggestion(acc); });
      if (!acc.trim()) setError("Öneri üretilemedi, tekrar dene.");
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "Bağlantı kurulamadı. Tekrar dene.");
    }
    setBusy(null);
  };

  const cancel = () => { abortRef.current?.abort(); setBusy(null); setSuggestion(""); setError(""); };
  const accept = () => {
    const s = suggestion.trim().replace(/^"""\s*|\s*"""$/g, "").slice(0, 5000);
    setOriginal(value); onChange(s); setSuggestion(""); 
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!has}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full nex-gradient text-white text-xs font-bold shadow-md active:scale-95 transition-transform disabled:opacity-40"
        >
          <Sparkles className="w-3.5 h-3.5" /> Omni AI ile geliştir
        </button>
        {original !== null && (
          <button type="button" onClick={() => { onChange(original); setOriginal(null); }} className="inline-flex items-center gap-1 px-3 h-9 rounded-full border border-border text-xs font-semibold text-foreground active:scale-95">
            <Undo2 className="w-3.5 h-3.5" /> Geri al
          </button>
        )}
      </div>

      {open && has && (
        <div className="rounded-[20px] border border-border bg-card p-3 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Duygu / Ton</p>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => run(t.id)}
                disabled={!!busy}
                className={`flex items-start gap-2 text-left p-2.5 rounded-2xl border transition-all active:scale-[0.97] disabled:opacity-60 ${busy === t.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"}`}
              >
                <span className="text-lg leading-none mt-0.5">{busy === t.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : t.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-foreground">{t.label}</span>
                  <span className="block text-[11px] text-muted-foreground leading-tight">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {suggestion && (
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 space-y-2">
              <p className="text-[11px] font-bold text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" /> Omni AI önerisi</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{suggestion}</p>
              <div className="flex gap-2">
                {busy ? (
                  <button type="button" onClick={cancel} className="px-3 h-9 rounded-full border border-border text-xs font-semibold inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Durdur</button>
                ) : (
                  <>
                    <button type="button" onClick={accept} className="px-4 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95"><Check className="w-3.5 h-3.5" /> Kullan</button>
                    <button type="button" onClick={() => setSuggestion("")} className="px-3 h-9 rounded-full border border-border text-xs font-semibold">Vazgeç</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OmniRewriteBar;
