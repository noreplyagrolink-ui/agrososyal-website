import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MapPin, Volume2, VolumeX } from "lucide-react";
import { getStoredUser } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";

export interface PreviewMedia {
  url: string;
  type: "image" | "video";
  /** CSS filter değeri (ör. "contrast(1.1)") */
  css?: string;
  muted?: boolean;
}

interface Props {
  media: PreviewMedia[];
  caption?: string;
  location?: string;
}

/**
 * Instagram tarzı gönderi ön izlemesi: başlık (avatar + kullanıcı + konum),
 * kaydırılabilir 4:5 medya (nokta göstergeli), aksiyon ikonları ve açıklama.
 */
const PostPreviewCard = ({ media, caption, location }: Props) => {
  const me = getStoredUser();
  const avatar = me?.profilePic
    ? absoluteUrl(me.profilePic)
    : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
  const username = me?.username || me?.name || "kullanici";

  const scroller = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Sadece görünen slayttaki video oynasın
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === idx) v.play().catch(() => {});
      else v.pause();
    });
    return () => videoRefs.current.forEach((v) => v?.pause());
  }, [idx, media.length]);

  useEffect(() => { if (idx > media.length - 1) setIdx(Math.max(0, media.length - 1)); }, [media.length, idx]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };

  const hasVideo = media[idx]?.type === "video";

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Başlık */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-border" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{username}</p>
          {location?.trim() && (
            <p className="text-[11px] text-muted-foreground leading-tight flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />{location}
            </p>
          )}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Ön izleme</span>
      </div>

      {/* Medya (4:5) */}
      <div className="relative aspect-[4/5] bg-black">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {media.map((m, i) => (
            <div key={i} className="relative flex-shrink-0 w-full h-full snap-center bg-black">
              {m.type === "video" ? (
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={m.url}
                  className="w-full h-full object-cover"
                  style={{ filter: m.css }}
                  loop playsInline muted={!soundOn || !!m.muted}
                />
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" style={{ filter: m.css }} draggable={false} />
              )}
            </div>
          ))}
        </div>

        {media.length > 1 && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-semibold">
            {idx + 1}/{media.length}
          </div>
        )}

        {hasVideo && (
          <button
            onClick={() => setSoundOn((v) => !v)}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
            aria-label="Ses"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white" />}
          </button>
        )}
      </div>

      {/* Aksiyonlar + noktalar */}
      <div className="px-3.5 pt-3 flex items-center">
        <div className="flex items-center gap-4 text-foreground">
          <Heart className="w-6 h-6" strokeWidth={1.8} />
          <MessageCircle className="w-6 h-6" strokeWidth={1.8} />
          <Send className="w-6 h-6" strokeWidth={1.8} />
        </div>
        {media.length > 1 && (
          <div className="flex-1 flex items-center justify-center gap-1">
            {media.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all ${i === idx ? "w-1.5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        )}
        <div className={`${media.length > 1 ? "" : "ml-auto"} text-foreground`}>
          <Bookmark className="w-6 h-6" strokeWidth={1.8} />
        </div>
      </div>

      {/* Açıklama */}
      <div className="px-3.5 pt-2 pb-3.5 text-[13px] leading-snug text-foreground">
        {caption?.trim() ? (
          <p className="break-words whitespace-pre-wrap">
            <span className="font-semibold mr-1.5">{username}</span>{caption}
          </p>
        ) : (
          <p className="text-muted-foreground/70">Açıklama eklediğinde burada görünür…</p>
        )}
      </div>
    </div>
  );
};

export default PostPreviewCard;
