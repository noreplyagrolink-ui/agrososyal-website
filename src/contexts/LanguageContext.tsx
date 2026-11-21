import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, TranslationKey, Language } from "@/lib/i18n";

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  isAutoDetect: boolean;
  setAutoDetect: (v: boolean) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "agrolink_lang";
const STORAGE_AUTO_KEY = "agrolink_lang_auto";

const getInitialLang = (): Language => {
  if (typeof window === "undefined") return "tr";
  const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (saved === "tr" || saved === "en") return saved;
  const browser = navigator.language?.toLowerCase() || "";
  if (browser.startsWith("en")) return "en";
  return "tr";
};

const getInitialAuto = (): boolean => {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(STORAGE_AUTO_KEY);
  if (saved === "false") return false;
  return true;
};

// Cihaz / işletim sistemi diline göre tespit (navigator.language,
// telefonun/bilgisayarın sistem dili tarayıcıya bu şekilde yansır).
// Not: Önceden IP bazlı (ipapi.co) tespit vardı; kullanıcı isteği üzerine
// cihazın sistem diline göre tespite geçildi.
function detectLangByDevice(): Language {
  const locales: readonly string[] =
    (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
  for (const loc of locales) {
    const l = loc?.toLowerCase() || "";
    if (l.startsWith("tr")) return "tr";
    if (l.startsWith("en")) return "en";
  }
  // Sistem dili tr/en dışındaysa varsayılan: tr
  return "tr";
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>(getInitialLang);
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(getInitialAuto);

  // Uygulama açılışında: auto mod aktifse cihazın sistem diline göre belirle.
  // Kullanıcı daha önce manuel bir dil seçmişse (localStorage'da kayıtlıysa) dokunulmaz.
  useEffect(() => {
    if (!isAutoDetect) return;
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === "tr" || saved === "en") return; // manuel seçim varsa dokunma
    const detected = detectLangByDevice();
    setLangState(detected);
    document.documentElement.lang = detected;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Language) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  const setAutoDetect = (v: boolean) => {
    setIsAutoDetect(v);
    try { localStorage.setItem(STORAGE_AUTO_KEY, String(v)); } catch {}
    if (v) {
      // Otomatike geçince: kayıtlı manuel seçimi sil, cihaz diline yeniden bak
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      const detected = detectLangByDevice();
      setLangState(detected);
      document.documentElement.lang = detected;
    }
  };

  const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
    const dict = translations[lang] || translations.tr;
    let str = (dict[key] ?? translations.tr[key] ?? key) as string;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
      }
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isAutoDetect, setAutoDetect }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

// Kısa kullanım için
export const useT = () => useLanguage().t;



