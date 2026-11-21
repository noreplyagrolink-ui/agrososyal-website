import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2, Check, Volume2, VolumeX, MessageCircle } from "lucide-react";
import { getPost, sharePostToStory } from "@/lib/api";
import { absoluteUrl, inferMediaType } from "@/lib/media";

const DEFAULT_AVATAR = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

interface Props {
  postId: string;
  open: boolean;
  onClose: () => void;
  onShared?: () => void;
}

/**
 * Instagram tarzı "Hikayende paylaş" ön izlemesi.
 * Gönderi/video 9:16 hikaye çerçevesinde kart olarak gösterilir; kullanıcı
 * "Hikayene ekle" diyene kadar hiçbir şey paylaşılmaz.
 */
const StorySharePreview = ({ postId, open, onClose, onShared }: Props) => {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPost(null); setDone(false); setError(""); setMuted(true); setLoading(true);
    getPost(postId)
      .then((d) => { if (alive) setPost(d?.post || d); })
      .catch(() => { if (alive) setError("Gönderi yüklenemedi"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, postId]);

  // Ön izleme açıkken arka sayfa kaymasın
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const rawUrls: string[] = post?.mediaUrls
    ? post.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean).map(absoluteUrl)
    : (post?.mediaUrl || post?.media) ? [absoluteUrl(post.mediaUrl || post.media)] : [];
  const declared = post?.mediaType ?? (post?.mediaUrls?.[0] && typeof post.mediaUrls[0] === "object" ? post.mediaUrls[0].type : undefined);
  const mediaUrl = rawUrls[0];
  const isVideo = inferMediaType(mediaUrl, declared) === "video";
  const avatar = post?.profilePic ? absoluteUrl(post.profilePic) : DEFAULT_AVATAR;
  const name = post?.name || post?.authorName || post?.username || "";
  const handle = post?.authorUsername || post?.username || "";
  const text: string = (post?.content || "").trim();

  const handleShare = async () => {
    if (sharing || done || !post) return;
    setSharing(true); setError("");
    try {
      const r = await sharePostToStory(postId);
      if (r?.error) throw new Error(r.error);
      setDone(true);
      onShared?.();
      setTimeout(onClose, 900);
    } catch (e: any) {
      setError(e?.message || "Hikayeye eklenemedi, tekrar dene");
    } finally {
      setSharing(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[500] bg-black flex flex-col items-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center px-3 py-3">
        {/* 9:16 hikaye çerçevesi */}
        <div className="relative h-full max-h-full aspect-[9/16] max-w-full rounded-[28px] overflow-hidden ring-1 ring-white/15 shadow-2xl"
             style={{ background: "linear-gradient(160deg,#0B8F5A 0%,#075B3B 55%,#0a2a20 100%)" }}>
          {/* Bulanık medya zemini */}
          {mediaUrl && !isVideo && (
            <img src={mediaUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-125" />
          )}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />

          {/* İlerleme çubuğu + üst bar */}
          <div className="absolute top-2.5 inset-x-3 h-[3px] rounded-full bg-white/35 overflow-hidden z-10">
            <div className="h-full w-full bg-white rounded-full" />
          </div>
          <div className="absolute top-5 inset-x-3 flex items-center gap-2 z-10">
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold leading-tight">Hikayende paylaş</p>
              <p className="text-white/70 text-[11px] leading-tight">Ön izleme</p>
            </div>
            {isVideo && (
              <button onClick={() => setMuted((m) => !m)} aria-label="Ses"
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition">
                {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            )}
            <button onClick={onClose} aria-label="Kapat"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Ortadaki gönderi kartı */}
          <div className="absolute inset-0 flex items-center justify-center px-5 pt-16 pb-24">
            {loading ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : error && !post ? (
              <p className="text-white/90 text-sm text-center">{error}</p>
            ) : post ? (
              <div className="w-full max-h-full overflow-hidden rounded-3xl bg-card text-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col">
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-border" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold leading-tight truncate">{name}</p>
                    {handle && <p className="text-[11px] text-muted-foreground leading-tight truncate">@{handle}</p>}
                  </div>
                </div>

                {mediaUrl ? (
                  <div className="relative bg-black min-h-0">
                    {isVideo ? (
                      <video
                        src={mediaUrl}
                        className="w-full max-h-[48vh] object-contain bg-black"
                        autoPlay loop playsInline muted={muted}
                      />
                    ) : (
                      <img src={mediaUrl} alt="" className="w-full max-h-[48vh] object-cover" draggable={false} />
                    )}
                  </div>
                ) : null}

                {text && (
                  <p className={`px-3.5 py-3 text-[13px] leading-snug whitespace-pre-wrap break-words ${mediaUrl ? "line-clamp-3" : "line-clamp-[10] text-[15px]"}`}>
                    {text}
                  </p>
                )}

                <div className="flex items-center gap-1.5 px-3.5 pb-3 text-[11px] text-muted-foreground">
                  <MessageCircle className="w-3.5 h-3.5" /> Agro Sosyal
                </div>
              </div>
            ) : null}
          </div>

          {/* Alt: Hikayene ekle */}
          <div className="absolute bottom-4 inset-x-4 z-10">
            {error && post && <p className="text-center text-[12px] text-red-300 mb-2">{error}</p>}
            <button
              onClick={handleShare}
              disabled={sharing || done || !post}
              className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 bg-white text-black active:scale-[0.98] transition disabled:opacity-60"
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {done ? "Hikayene eklendi" : sharing ? "Ekleniyor..." : "Hikayene ekle"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StorySharePreview;
