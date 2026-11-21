import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

interface Props {
  variant?: "pill" | "compact" | "menu";
  className?: string;
}

const LanguageSwitcher = ({ variant = "pill", className = "" }: Props) => {
  // NOT: "Otomatik" seçeneği artık Ayarlar ekranında (menu varyantı) gösterilmiyor.
  // Otomatik tespit (cihazın sistem/işletim sistemi diline göre) arka planda,
  // yalnızca kullanıcı daha önce manuel bir dil seçmediyse (ör. ilk giriş/login
  // ekranında) LanguageContext içinde otomatik olarak çalışmaya devam eder.
  // Ayarlardan manuel TR/EN seçimi yapıldığı anda bu seçim kalıcı olur ve
  // otomatik tespit bir daha devreye girmez.
  const { lang, setLang, isAutoDetect, setAutoDetect } = useLanguage();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => setLang(lang === "tr" ? "en" : "tr")}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground transition-colors active:scale-95 ${className}`}
        aria-label="Toggle language"
      >
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="uppercase">{lang}</span>
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        {/* Manuel dil seçimi — "Otomatik" seçeneği kaldırıldı.
            Buradan bir dil seçildiği anda otomatik tespit kalıcı olarak kapanır. */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
          {(["tr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => { setAutoDetect(false); setLang(l); }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                lang === l
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l === "tr" ? "🇹🇷 Türkçe" : "🇬🇧 English"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // pill (default)
  return (
    <div className={`inline-flex items-center p-1 rounded-full bg-card/80 backdrop-blur border border-border shadow-sm ${className}`}>
      <Globe className="w-3.5 h-3.5 text-muted-foreground ml-2 mr-1" />
      {(["tr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => { setAutoDetect(false); setLang(l); }}
          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all ${
            lang === l && !isAutoDetect
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={lang === l && !isAutoDetect}
        >
          {l}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;



