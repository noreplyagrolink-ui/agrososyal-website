import { useEffect, useState } from "react";
import { X, Loader2, Quote as QuoteIcon } from "lucide-react";
import { getPost, quotePost, getStoredUser } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";
import { useToast } from "@/hooks/use-toast";

interface Props {
  postId: string;
  open: boolean;
  onClose: () => void;
  onPosted?: (newPost: any) => void;
}

const DEFAULT_AVATAR = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
const MAX_LEN = 2200;

const QuoteComposeModal = ({ postId, open, onClose, onPosted }: Props) => {
  const me = getStoredUser();
  const { toast } = useToast();
  const [original, setOriginal] = useState<any>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContent("");
    setLoadingOriginal(true);
    getPost(postId)
      .then((d) => setOriginal(d.post || d))
      .catch(() => setOriginal(null))
      .finally(() => setLoadingOriginal(false));
  }, [open, postId]);

  if (!open) return null;

  const origName   = original?.name || original?.authorUsername || original?.username || "kullanıcı";
  const origHandle = original?.authorUsername || original?.username || "user";
  const origAvatar = original?.profilePic ? absoluteUrl(original.profilePic) : DEFAULT_AVATAR;
  const origMedia = original?.mediaUrls?.[0]?.url
    ? absoluteUrl(original.mediaUrls[0].url)
    : (original?.mediaUrl || original?.media)
      ? absoluteUrl(original.mediaUrl || original.media)
      : null;
  const origIsVideo = (original?.mediaType === "video");

  const handleSubmit = async () => {
    if (posting) return;
    setPosting(true);
    try {
      const r = await quotePost(postId, content.trim());
      if (r?.error) throw new Error(r.error);
      toast({ title: "Alıntı paylaşıldı ✅" });
      onPosted?.(r.post);
      onClose();
    } catch (e: any) {
      toast({ title: "Paylaşılamadı", description: e?.message || "Lütfen tekrar deneyin", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[410] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border max-h-[90vh] flex flex-col animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <QuoteIcon className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Alıntıla</h3>
          </div>
          <button onClick={onClose} aria-label="Kapat" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Kendi yorumun */}
          <div className="flex gap-3">
            <img
              src={me?.profilePic ? absoluteUrl(me.profilePic) : DEFAULT_AVATAR}
              alt=""
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-muted"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_LEN))}
              placeholder="Bir şeyler yaz..."
              autoFocus
              rows={3}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-[15px] leading-6 pt-2"
            />
          </div>

          {/* Orijinal gönderi önizlemesi */}
          <div className="border border-border rounded-2xl overflow-hidden">
            {loadingOriginal ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : original ? (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <img src={origAvatar} alt="" className="w-6 h-6 rounded-full object-cover bg-muted" />
                  <span className="text-[13px] font-bold text-foreground">{origName}</span>
                  <span className="text-[12px] text-muted-foreground">@{origHandle}</span>
                </div>
                {original.content && (
                  <p className="text-[13px] text-foreground/90 leading-5 line-clamp-4 whitespace-pre-wrap">
                    {original.content}
                  </p>
                )}
                {origMedia && !origIsVideo && (
                  <img src={origMedia} alt="" className="mt-2 w-full max-h-56 object-cover rounded-xl bg-muted" />
                )}
                {origMedia && origIsVideo && (
                  <video src={origMedia} className="mt-2 w-full max-h-56 object-cover rounded-xl bg-muted" muted />
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Gönderi yüklenemedi</p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">{content.length}/{MAX_LEN}</span>
          <button
            onClick={handleSubmit}
            disabled={posting || loadingOriginal || !original}
            className="px-6 h-10 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {posting && <Loader2 className="w-4 h-4 animate-spin" />}
            Paylaş
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteComposeModal;

