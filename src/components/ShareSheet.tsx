import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Link2, Share2, Sparkles, MessageCircle, Loader2, Check, Search, Quote } from "lucide-react";
import { getFollowing, sharePostToDM, getStoredUser } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";
import QuoteComposeModal from "./QuoteComposeModal";
import StorySharePreview from "./StorySharePreview";
import { useLanguage } from "@/contexts/LanguageContext";

const PAGE_SIZE = 5;

interface Props {
  postId: string;
  open: boolean;
  onClose: () => void;
  onQuoted?: (newPost: any) => void;
}

const ShareSheet = ({ postId, open, onClose, onQuoted }: Props) => {
  const { t } = useLanguage();
  const me = getStoredUser();
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [storyState, setStoryState] = useState<"idle" | "loading" | "done">("idle");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showStoryPreview, setShowStoryPreview] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  const shareUrl = `https://sehitumitkestitarimmtal.com/post/${postId}`;

  useEffect(() => {
    if (!open || !me?.id) return;
    setVisibleCount(PAGE_SIZE);
    setLoadingUsers(true);
    getFollowing(me.id)
      .then((d) => setUsers(d.following || d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [open, me?.id]);

  // Arama değişince görünür sayacı sıfırla (yeni filtre sonuçları için)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      setVisibleCount((c) => c + PAGE_SIZE);
    }
  };

  useEffect(() => {
    if (!open) {
      // Reset on close
      setTimeout(() => {
        setSentTo(new Set());
        setStoryState("idle");
        setLinkCopied(false);
        setQuery("");
      }, 300);
    }
  }, [open]);

  if (!open && !showQuote && !showStoryPreview) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: t("ssShareTitle"), url: shareUrl });
    } catch {
      handleCopy();
    }
  };

  // "Hikayende paylaş": önce Instagram tarzı ön izleme açılır, paylaşım orada onaylanır
  const handleStory = () => {
    onClose();
    setShowStoryPreview(true);
  };

  const handleSendTo = async (uid: string) => {
    if (sentTo.has(uid) || sendingTo) return;
    setSendingTo(uid);
    try {
      const r = await sharePostToDM(postId, uid);
      if (r?.error) throw new Error(r.error);
      setSentTo((prev) => new Set(prev).add(uid));
    } catch {}
    setSendingTo(null);
  };

  const handleQuote = () => {
    onClose();
    setShowQuote(true);
  };

  const filtered = users.filter((u: any) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (u.username || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q)
    );
  });
  const visibleUsers = filtered.slice(0, visibleCount);
  const hasMoreToShow = visibleCount < filtered.length;

  return createPortal(
    <>
    {open && (
    <div className="fixed inset-0 z-[400] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border border-b-0 max-h-[85vh] flex flex-col animate-slide-up shadow-2xl">
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
          <h3 className="text-base font-bold text-foreground">{t("ssTitle")}</h3>
          <button onClick={onClose} aria-label={t("close")} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Üst hızlı aksiyonlar */}
        <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b border-border">
          <button
            onClick={handleStory}
            disabled={storyState === "loading"}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg transition-transform group-active:scale-90 ${storyState === "loading" ? "animate-pulse" : ""}`}>
              {storyState === "loading" ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : storyState === "done" ? (
                <Check className="w-6 h-6 text-white" />
              ) : (
                <Sparkles className="w-6 h-6 text-white" />
              )}
            </div>
            <span className="text-xs font-medium text-foreground">
              {storyState === "done" ? t("ssStoryAdded") : t("ssToStory")}
            </span>
          </button>

          <button onClick={handleQuote} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center shadow-md transition-transform group-active:scale-90 border border-border">
              <Quote className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{t("ssQuote")}</span>
          </button>

          <button onClick={handleCopy} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center shadow-md transition-transform group-active:scale-90 border border-border">
              {linkCopied ? (
                <Check className="w-6 h-6 text-primary" />
              ) : (
                <Link2 className="w-6 h-6 text-foreground" />
              )}
            </div>
            <span className="text-xs font-medium text-foreground">
              {linkCopied ? t("ssCopied") : t("ssCopyLink")}
            </span>
          </button>

          <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center shadow-md transition-transform group-active:scale-90 border border-border">
              <Share2 className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{t("ssOther")}</span>
          </button>
        </div>

        {/* Arama */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> {t("ssSendViaMessage")}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ssSearchFollowing")}
              className="w-full bg-secondary text-foreground placeholder:text-muted-foreground rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Kişi listesi */}
        <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto px-2 pb-8">
          {loadingUsers ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {query ? t("ssNoMatch") : t("ssNotFollowingAnyone")}
            </p>
          ) : (
            <>
            {visibleUsers.map((u: any) => {
              const isSent = sentTo.has(u.id);
              const isSending = sendingTo === u.id;
              const av = u.profilePic
                ? absoluteUrl(u.profilePic)
                : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
              return (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40 rounded-xl transition-colors">
                  <img src={av} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">{u.name || u.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                  </div>
                  <button
                    onClick={() => handleSendTo(u.id)}
                    disabled={isSent || isSending}
                    className={`px-4 h-9 rounded-full text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                      isSent
                        ? "bg-secondary text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSent ? (
                      <><Check className="w-3.5 h-3.5" /> {t("ssSent")}</>
                    ) : (
                      t("ssSend")
                    )}
                  </button>
                </div>
              );
            })}
            {hasMoreToShow && (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
    )}

    <StorySharePreview
      postId={postId}
      open={showStoryPreview}
      onClose={() => setShowStoryPreview(false)}
    />

    <QuoteComposeModal
      postId={postId}
      open={showQuote}
      onClose={() => setShowQuote(false)}
      onPosted={(p) => onQuoted?.(p)}
    />
    </>,
    document.body
  );
};

export default ShareSheet;




