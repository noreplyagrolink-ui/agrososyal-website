import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";

const SPARK_COLORS = ["#FF3040", "#FF8A3D", "#FFC53D"];

/**
 * Android'deki LikeAction animasyonu:
 *  - beğenince: kalp 1.34x'e büyüyüp yaylanarak oturur, çevresinde halka + 6 renkli kıvılcım patlar
 *  - beğeniyi geri alınca: kalp hafif küçülüp geri yaylanır
 * İlk render'da animasyon oynamaz.
 */
const LikeHeart = ({ liked, size = 27 }: { liked: boolean; size?: number }) => {
  const prev = useRef(liked);
  const first = useRef(true);
  const [anim, setAnim] = useState<{ kind: "like" | "unlike"; key: number } | null>(null);

  useEffect(() => {
    if (first.current) { first.current = false; prev.current = liked; return; }
    if (prev.current === liked) return;
    prev.current = liked;
    setAnim({ kind: liked ? "like" : "unlike", key: Date.now() });
    if (liked) { try { navigator.vibrate?.(10); } catch {} }
  }, [liked]);

  const box = size * 2.4;

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {anim?.kind === "like" && (
        <span
          key={anim.key}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{ width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ border: "3px solid #FF3040", animation: "likeRing 560ms cubic-bezier(.05,.7,.1,1) forwards" }}
          />
          {Array.from({ length: 6 }).map((_, i) => {
            const ang = ((i * 60 + 15) * Math.PI) / 180;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                  width: 3,
                  height: size * 0.22,
                  marginLeft: -1.5,
                  marginTop: -size * 0.11,
                  background: SPARK_COLORS[i % 3],
                  ["--dx" as any]: `${Math.cos(ang) * size * 0.95}px`,
                  ["--dy" as any]: `${Math.sin(ang) * size * 0.95}px`,
                  ["--rot" as any]: `${(i * 60 + 15 + 90)}deg`,
                  animation: "likeSpark 560ms cubic-bezier(.05,.7,.1,1) forwards",
                }}
              />
            );
          })}
        </span>
      )}
      <Heart
        key={anim?.key ?? "init"}
        className={liked ? "fill-rose-500 text-rose-500" : ""}
        style={{
          width: size,
          height: size,
          animation:
            anim?.kind === "like"
              ? "likeBtnPop 520ms cubic-bezier(.2,.9,.3,1.3) both"
              : anim?.kind === "unlike"
              ? "likeBtnUnpop 280ms ease-out both"
              : undefined,
        }}
        strokeWidth={liked ? 2 : 1.8}
      />
    </span>
  );
};

export default LikeHeart;
