import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2, Heart, LogIn, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { getPostComments, addComment, likeComment, getStoredUser, getCommentReplies, addCommentReply } from "@/lib/api";
import { rateLimiter } from "@/lib/security";
import AuthPromptModal from "./AuthPromptModal";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  postId: string;
  open: boolean;
  onClose: () => void;
}

const CommentsModal = ({ postId, open, onClose }: Props) => {
  const { t, lang } = useLanguage();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  // Yanıt state'leri
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUser = getStoredUser();
  const isLoggedIn = !!currentUser;

  useEffect(() => {
    if (open) {
      setLoading(true);
      getPostComments(postId)
        .then(async (data) => {
          const all: any[] = data.comments || [];
          // Yanıtlar (parentId dolu) ana listede görünmez; "N yanıtı gör" altında gösterilir
          const top = all.filter((c) => !c.parentId);
          const nested = all.filter((c) => c.parentId);
          const withReplies = top.map((c) => ({
            ...c,
            replies: [...(c.replies || []), ...nested.filter((r) => r.parentId === c.id)],
          }));
          setComments(withReplies);
          setLoading(false);
          // Yanıt sayısı yorum listesiyle gelmediği için yanıtları önceden çek
          await Promise.all(
            withReplies.slice(0, 30).map(async (c) => {
              try {
                const r = await getCommentReplies(c.id);
                const list: any[] = r?.replies || [];
                if (!list.length) return;
                setComments((prev) =>
                  prev.map((x) => {
                    if (x.id !== c.id) return x;
                    const seen = new Set(list.map((y) => y.id));
                    return { ...x, replies: [...list, ...(x.replies || []).filter((y: any) => !seen.has(y.id))] };
                  })
                );
              } catch {}
            })
          );
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      if (isLoggedIn) setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, postId]);

  // Yanıtlamaya tıklayınca input'a odaklan
  const handleReply = (comment: any, parentOverride?: string) => {
    if (!isLoggedIn) { setAuthPrompt(true); return; }
    setReplyTo({ id: parentOverride || comment.parentId || comment.id, username: comment.username || comment.name });
    setInput(`@${comment.username || comment.name} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setInput("");
  };

  const handleSend = async () => {
    if (!isLoggedIn) { setAuthPrompt(true); return; }
    if (!input.trim() || sending) return;

    // Rate limit: 10 yorum / 60 saniye
    const userId = currentUser?.id || "anon";
    if (!rateLimiter(`comment_${userId}`, 10, 60_000)) {
      alert(t("commentTooMany"));
      return;
    }
    const text = input.trim();
    const parentId = replyTo?.id;
    setInput("");
    setReplyTo(null);
    setSending(true);
    try {
      const data = parentId
        ? await addCommentReply(parentId, text).then((d) => (d?.comment ? d : addComment(postId, text, parentId)))
        : await addComment(postId, text);
      if (data.comment) {
        if (parentId) {
          // Yanıtı parent yorumun replies listesine ekle
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: [...(c.replies || []), data.comment] }
                : c
            )
          );
          // Yanıtları otomatik aç
          setExpandedReplies((prev) => new Set([...prev, parentId]));
        } else {
          setComments((prev) => [...prev, data.comment]);
        }
      }
    } catch {}
    setSending(false);
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
  };

  if (!open) return null;

  const CommentItem = ({ c, isReply = false, parentId }: { c: any; isReply?: boolean; parentId?: string }) => {
    const avatar = c.profilePic || "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
    const handleLike = async () => {
      if (!isLoggedIn) { setAuthPrompt(true); return; }
      setComments((prev) => updateCommentLike(prev, c.id));
      try { await likeComment(c.id); } catch {}
    };
    return (
      <div className={`flex gap-3 group animate-fade-in ${isReply ? "pl-10" : ""}`}>
        <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-semibold text-foreground">{c.username || c.name}</span>{" "}
            <span className="text-foreground/90">{c.content}</span>
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(c.createdAt, t, lang)}
              {c.likeCount > 0 && <span className="ml-2">{t("commentLikeCount", { count: c.likeCount })}</span>}
            </p>
            {!isReply && (
              <button
                onClick={() => handleReply(c, parentId)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {t("commentReply")}
              </button>
            )}
          </div>
        </div>
        <button onClick={handleLike} className="self-start p-1.5 rounded-full hover:bg-pink-500/10 active:scale-90 transition-all">
          <Heart className={`w-4 h-4 transition-all ${c.isLiked ? "fill-pink-600 text-pink-600" : "text-muted-foreground"}`} />
        </button>
      </div>
    );
  };

  // Nested replies için like güncelleme helper'ı
  const updateCommentLike = (list: any[], targetId: string): any[] =>
    list.map((c) => {
      if (c.id === targetId) return { ...c, isLiked: !c.isLiked, likeCount: (c.likeCount || 0) + (c.isLiked ? -1 : 1) };
      if (c.replies?.length) return { ...c, replies: updateCommentLike(c.replies, targetId) };
      return c;
    });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-fade-in">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <h3 className="text-base font-bold text-foreground">{t("commentsTitle")}</h3>
        <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground active:scale-90 transition-transform">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">{t("commentsEmpty")}</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="space-y-3">
              <CommentItem c={c} />

              {/* Yanıtlar */}
              {c.replies?.length > 0 && (
                <div className="pl-10">
                  <button
                    onClick={() => toggleReplies(c.id)}
                    className="flex items-center gap-1.5 text-xs text-primary font-semibold mb-2"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    {expandedReplies.has(c.id) ? (
                      <><ChevronUp className="w-3 h-3" /> {t("commentHideReplies")}</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" /> {t("commentShowReplies", { count: c.replies.length })}</>
                    )}
                  </button>
                  {expandedReplies.has(c.id) && (
                    <div className="space-y-3">
                      {c.replies.map((r: any) => (
                        <CommentItem key={r.id} c={r} isReply parentId={c.id} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input alanı */}
      <div className="border-t border-border px-3 pb-3 pt-2 max-w-2xl mx-auto w-full sticky bottom-0 bg-background">
        {/* Yanıt banner'ı */}
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-semibold">@{replyTo.username}</span> {t("commentReplyingTo")}
            </p>
            <button onClick={cancelReply} className="text-xs text-muted-foreground hover:text-destructive">
              {t("commentCancel")}
            </button>
          </div>
        )}
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={replyTo ? t("commentReplyPlaceholder", { username: replyTo.username }) : t("commentWritePlaceholder")}
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" /> : <Send className="w-4 h-4 text-primary-foreground" />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthPrompt(true)}
            className="flex-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold active:scale-95 transition-transform"
          >
            <LogIn className="w-4 h-4" />
            {t("commentLoginPrompt")}
          </button>
        )}
      </div>

      <AuthPromptModal open={authPrompt} onClose={() => setAuthPrompt(false)} action="comment" />
    </div>,
    document.body
  );
};

function formatTimeAgo(dateStr: string, t: (key: any, vars?: Record<string, string | number>) => string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return t("commentJustNow");
  if (diff < 3600) return `${Math.floor(diff / 60)}${lang === "tr" ? "dk" : "m"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${lang === "tr" ? "sa" : "h"}`;
  return `${Math.floor(diff / 86400)}${lang === "tr" ? "g" : "d"}`;
}

export default CommentsModal;




