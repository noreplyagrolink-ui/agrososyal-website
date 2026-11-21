import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Heart, MessageCircle, Bookmark, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { likePost, savePost } from "@/lib/api";
import ShareSheet from "./ShareSheet";

interface PostData {
  id: string;
  authorUsername?: string;
  username?: string;
  profilePic?: string;
  userId?: string;
  content?: string;
  mediaUrls?: any[];
  mediaUrl?: string;
  media?: string;
  mediaType?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved?: boolean;
  createdAt: string;
}

interface Props {
  post: PostData;
  onClose: () => void;
}

const PostModal = ({ post, onClose }: Props) => {
  const [liked, setLiked] = useState(post.isLiked);
  const [saved, setSaved] = useState(post.isSaved || false);
  const [likes, setLikes] = useState(post.likeCount || 0);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [showShare, setShowShare] = useState(false);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const rawUrls = post.mediaUrls
    ? post.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean)
    : post.mediaUrl || post.media
    ? [post.mediaUrl || post.media]
    : [];

  const displayName = post.authorUsername || post.username || "user";
  const avatar = post.profilePic || "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
  const isVideo = post.mediaType === "video";

  const toggleLike = async () => {
    setLiked(l => !l);
    setLikes(l => liked ? l - 1 : l + 1);
    try { await likePost(post.id); } catch {}
  };

  const toggleSave = async () => {
    setSaved(s => !s);
    try { await savePost(post.id); } catch {}
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-card rounded-2xl overflow-hidden animate-scale-in max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 p-4 flex-shrink-0">
          <img src={avatar} alt={displayName} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30" />
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>

        {/* Media */}
        {rawUrls.length > 0 && (
          <div className="relative flex-shrink-0 bg-black">
            {isVideo ? (
              <video
                src={rawUrls[0]}
                className="w-full max-h-[60dvh] object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <>
                <div className="overflow-hidden">
                  <div
                    className="flex transition-transform duration-300"
                    style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
                  >
                    {rawUrls.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full flex-shrink-0 max-h-[60dvh] object-contain" />
                    ))}
                  </div>
                </div>
                {rawUrls.length > 1 && (
                  <>
                    {carouselIdx > 0 && (
                      <button onClick={() => setCarouselIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                    )}
                    {carouselIdx < rawUrls.length - 1 && (
                      <button onClick={() => setCarouselIdx(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                    )}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {rawUrls.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full ${i === carouselIdx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Actions + Caption */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button onClick={toggleLike} className="flex items-center gap-1.5 active:scale-90 transition-transform">
                <Heart className={`w-6 h-6 ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                <span className="text-sm text-muted-foreground">{likes}</span>
              </button>
              <button className="flex items-center gap-1.5">
                <MessageCircle className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{post.commentCount || 0}</span>
              </button>
            </div>
            <button onClick={toggleSave} className="active:scale-90 transition-transform">
              <Bookmark className={`w-6 h-6 ${saved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
            <button onClick={() => setShowShare(true)} className="active:scale-90 transition-transform">
              <Share2 className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
          {post.content && (
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-semibold">{displayName}</span>{" "}{post.content}
            </p>
          )}
        </div>
      </div>

      <ShareSheet postId={post.id} open={showShare} onClose={() => setShowShare(false)} />

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default PostModal;


