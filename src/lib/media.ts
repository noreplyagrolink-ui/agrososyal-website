// Centralized media URL & type helpers
// Server returns relative paths like "/uploads/videos/abc.mp4" or HLS "/uploads/hls/abc/master.m3u8"
// We must convert to absolute URLs and infer mediaType when the API omits it.

export const API_ORIGIN = "https://sehitumitkestitarimmtal.com";

export const absoluteUrl = (url?: string | null): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|m3u8|ogv)(\?.*)?$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?.*)?$/i;

export const inferMediaType = (url?: string | null, declared?: string): "video" | "image" | "text" | undefined => {
  if (declared === "video" || declared === "image" || declared === "text") return declared;
  if (!url) return undefined;
  if (VIDEO_EXT.test(url)) return "video";
  if (IMAGE_EXT.test(url)) return "image";
  return undefined;
};

export const isHls = (url?: string | null) => !!url && /\.m3u8(\?|$)/i.test(url);

// ─────────────────────────────────────────────────────────────────────────────
// 📸 Güvenli Önizleme URL'i — HEIC / HEIF / AVIF / Yüksek-MP desteği
// ─────────────────────────────────────────────────────────────────────────────
// Sorun: iPhone HEIC, Android AVIF ve çok yüksek çözünürlüklü fotoğraflar
//        URL.createObjectURL() ile oluşturulan blob tarayıcıda <img> tag'inde
//        render edilemiyor → siyah ekran / bozuk görüntü.
// Çözüm: Canvas API ile dosyayı JPEG blob'una dönüştür, sonra ObjectURL yarat.
//        Dönüştürme başarısız olursa (zaten uyumlu format) doğrudan blob URL döner.
// ─────────────────────────────────────────────────────────────────────────────

const NEEDS_CANVAS_DECODE = /^image\/(heic|heif|heic-sequence|heif-sequence|avif|avif-sequence|tiff|tif)$/i;

export async function createSafePreviewUrl(file: File): Promise<string> {
  const isModern = NEEDS_CANVAS_DECODE.test(file.type);

  if (!isModern) {
    // Standart format (JPEG/PNG/WebP/GIF) → doğrudan ObjectURL
    return URL.createObjectURL(file);
  }

  // HEIC/AVIF/TIFF → Canvas decode
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) { resolve(URL.createObjectURL(file)); return; }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          // Önizleme için max 1920px — hafıza tasarrufu
          const maxSide = 1920;
          let { width, height } = img;
          if (width > maxSide || height > maxSide) {
            const ratio = Math.min(maxSide / width, maxSide / height);
            width  = Math.round(width  * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width  = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(URL.createObjectURL(file)); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(URL.createObjectURL(blob));
            else      resolve(URL.createObjectURL(file));
          }, "image/jpeg", 0.92);
        } catch {
          resolve(URL.createObjectURL(file));
        }
      };
      img.onerror = () => resolve(URL.createObjectURL(file));
      img.src = dataUrl;
    };
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
}

// Normalize possibly-mixed mediaUrls payloads (string[] | {url,type}[]) into absolute strings
export const normalizeMediaUrls = (post: any): string[] => {
  if (Array.isArray(post?.mediaUrls) && post.mediaUrls.length > 0) {
    return post.mediaUrls
      .map((m: any) => (typeof m === "string" ? m : m?.url))
      .filter(Boolean)
      .map((u: string) => absoluteUrl(u));
  }
  const single = post?.mediaUrl || post?.media;
  return single ? [absoluteUrl(single)] : [];
};


