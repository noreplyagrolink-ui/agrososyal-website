import { useEffect, useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { absoluteUrl } from "@/lib/media";
import { sanitizeUrl } from "@/lib/security";
import { getToken } from "@/lib/api";

interface Ad {
  id?: string;
  title?: string;
  description?: string;
  content?: string;
  body?: string;
  imageUrl?: string;
  image?: string;
  media?: string;
  mediaUrl?: string;
  url?: string;
  link?: string;
  ctaUrl?: string;
  ctaText?: string;
  sponsor?: string;
  brand?: string;
  advertiser?: string;
  advertiserLogo?: string;
  logo?: string;
}

interface AdCardProps {
  ad: Ad;
}

/**
 * Premium, modern "sponsorlu" akış kartı.
 * - Tasarım sarı (amber) gradyan, ışıltılı kenarlık
 * - Etkileşim yok: beğeni / yorum / paylaşım butonu hiç yok
 * - "Reklam" rozeti + (varsa) marka adı
 */
export default function AdCard({ ad }: AdCardProps) {
  const [imgError, setImgError] = useState(false);

  const title = ad.title || ad.sponsor || ad.brand || ad.advertiser || "Sponsorlu";
  const body  = ad.description || ad.content || ad.body || "";
  const image = ad.imageUrl || ad.image || ad.media || ad.mediaUrl || "";
  const link  = sanitizeUrl(ad.url || ad.link || ad.ctaUrl || "");
  const cta   = ad.ctaText || "Linke Git";
  const logo  = ad.advertiserLogo || ad.logo || "";

  const Wrapper: any = link && link !== "#" ? "a" : "div";
  const wrapperProps = link && link !== "#"
    ? { href: link, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <div className="relative group" data-ad="true">
      {/* Dış ışıltı / glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-70 blur-[6px] transition-opacity group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(135deg, rgba(250,204,21,.55), rgba(245,158,11,.35) 40%, rgba(250,204,21,.55))",
        }}
      />

      <Wrapper
        {...wrapperProps}
        className="relative block overflow-hidden rounded-3xl border border-amber-300/70 dark:border-amber-400/30
                   bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100
                   dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-900/40
                   shadow-[0_8px_30px_-12px_rgba(217,119,6,0.35)]
                   transition-transform duration-300 hover:-translate-y-[2px]"
      >
        {/* Üst dekor — kavisli ışıltılı şerit */}
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full
                     bg-gradient-to-br from-yellow-300/60 to-amber-500/40 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full
                     bg-amber-300/30 blur-3xl"
        />

        {/* Üst bar: rozet + marka */}
        <div className="relative flex items-center justify-between px-4 sm:px-5 pt-4">
          <div className="flex items-center gap-2">
            {logo && !imgError ? (
              <img
                src={absoluteUrl(logo)}
                alt={title}
                onError={() => setImgError(true)}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-amber-400/40 bg-white/60"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500
                              flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4.5 h-4.5" strokeWidth={2.2} />
              </div>
            )}
            <div className="leading-tight">
              <p className="text-[13px] font-extrabold text-amber-900 dark:text-amber-200 tracking-tight">
                {title}
              </p>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-amber-700/80 dark:text-amber-300/80">
                Sponsorlu • Reklam
              </p>
            </div>
          </div>

          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full
                       bg-amber-500/15 text-amber-800 dark:text-amber-200
                       ring-1 ring-amber-500/30 backdrop-blur-sm"
          >
            AD
          </span>
        </div>

        {/* Görsel */}
        {image && !imgError && (
          <div className="relative mt-3 mx-3 sm:mx-4 overflow-hidden rounded-2xl aspect-[16/9] bg-amber-200/40">
            <img
              src={absoluteUrl(image)}
              alt={title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-900/20 to-transparent" />
          </div>
        )}

        {/* Metin */}
        {body && (
          <p className="relative px-4 sm:px-5 pt-3 text-[14px] leading-relaxed text-amber-950/90 dark:text-amber-100/90 font-medium">
            {body}
          </p>
        )}

        {/* Alt: CTA — beğeni vs yok, sadece bilgilendirici */}
        <div className="relative flex items-center justify-between gap-3 px-4 sm:px-5 py-4 mt-1">
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/70">
            Bu içerik beğenilemez veya yorumlanamaz.
          </p>
          {link && (
            <span
              className="inline-flex items-center gap-1.5 text-[12px] font-bold
                         px-3.5 py-2 rounded-full
                         bg-gradient-to-br from-amber-500 to-yellow-500
                         text-white shadow-md shadow-amber-500/30
                         group-hover:shadow-lg group-hover:shadow-amber-500/40
                         transition-shadow"
            >
              {cta}
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </Wrapper>
    </div>
  );
}

/**
 * Akışta reklam yüklemek için küçük yardımcı hook.
 * Tek sefer yükler, oturum boyunca sessionStorage'da cache'ler.
 */
export function useFeedAds(count = 3) {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = getToken() || localStorage.getItem("token") || "";
        const results: Ad[] = [];
        const seenIds = new Set<string>();
        let lastAdId = "";

        for (let i = 0; i < count; i++) {
          try {
            const url = lastAdId
              ? `https://sehitumitkestitarimmtal.com/api/ads/random?lastAdId=${lastAdId}`
              : "https://sehitumitkestitarimmtal.com/api/ads/random";

            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) { console.warn("[ads] /api/ads/random", res.status); continue; }
            const data = await res.json();

            // Server { ad: {...} } şeklinde sarmalıyor
            const raw = data?.ad ?? data;
            if (!raw || !raw.id) { console.warn("[ads] reklam yok / id eksik", data); continue; }
            if (seenIds.has(raw.id)) continue;
            seenIds.add(raw.id);
            lastAdId = raw.id; // bir sonraki istekte atlanacak

            // Alan adlarını AdCard'ın beklediği formata normalize et
            results.push({
              id:          raw.id,
              title:       raw.title       || raw.ownerName || "Sponsorlu",
              description: raw.body        || raw.description || "",
              imageUrl:    raw.imageUrl    || raw.image || "",
              url:         raw.linkUrl     || raw.url   || "",
              sponsor:     raw.ownerName   || "",
              advertiser:  raw.ownerName   || "",
              advertiserLogo: raw.ownerPic || "",
            });
          } catch (err) { console.warn("[ads] istek hatası", err); }
        }

        if (!cancelled && results.length) {
          setAds(results);
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [count]);

  return ads;
}


