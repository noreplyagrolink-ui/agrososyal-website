import { useState, useEffect } from "react";
import { X, Trash2, Flag, Link2, Share2, Loader2, Edit2, BellOff, Bell } from "lucide-react";
import { deletePost, reportPost, muteUser, unmuteUser } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  postId: string;
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  authorId?: string;
  onEdit?: () => void;
}

const PostOptionsMenu = ({ postId, isOwner, open, onClose, onDeleted, authorId, onEdit }: Props) => {
  const { t } = useLanguage();
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!open) { setShowReport(false); setReportReason(""); setMsg(""); }
  }, [open]);

  if (!open) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    setMsg(t("pomLinkCopied"));
    setTimeout(() => { setMsg(""); onClose(); }, 1000);
  };

  const handleDelete = async () => {
    if (!confirm(t("pomDeleteConfirm"))) return;
    setLoading(true);
    try { await deletePost(postId); onDeleted?.(); onClose(); } catch {}
    setLoading(false);
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setLoading(true);
    try {
      await reportPost(postId, reportReason);
      setMsg(t("pomReportSent"));
      setTimeout(() => { setMsg(""); setShowReport(false); onClose(); }, 1000);
    } catch {}
    setLoading(false);
  };

  const handleShare = async () => {
    try { await navigator.share({ title: t("pomShareTitle"), url: `${window.location.origin}/post/${postId}` }); }
    catch { handleCopyLink(); }
  };

  const handleToggleMute = async () => {
    if (!authorId) return;
    setLoading(true);
    try {
      if (muted) { await unmuteUser(authorId); setMuted(false); setMsg(t("pomMuteRemoved")); }
      else { await muteUser(authorId); setMuted(true); setMsg(t("pomMuted")); }
      setTimeout(() => { setMsg(""); onClose(); }, 1000);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border border-b-0 animate-slide-up">
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {msg && <p className="text-center text-sm text-primary font-medium py-2">{msg}</p>}

        {showReport ? (
          <div className="p-4 space-y-4 pb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{t("pomReportPost")}</h3>
              <button onClick={() => setShowReport(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t("pomReportPlaceholder")}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            />
            <button onClick={handleReport} disabled={loading || !reportReason.trim()} className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} {t("pomSendReport")}
            </button>
          </div>
        ) : (
          <div className="py-2 pb-8">
            <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t("pomShare")}</span>
            </button>
            <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
              <Link2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t("pomCopyLink")}</span>
            </button>
            {isOwner ? (
              <>
                <button onClick={() => { onEdit?.(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                  <Edit2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{t("pomEditPost")}</span>
                </button>
                <button onClick={handleDelete} disabled={loading} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{loading ? t("pomDeleting") : t("pomDeletePost")}</span>
                </button>
              </>
            ) : (
              <>
                {authorId && (
                  <button onClick={handleToggleMute} disabled={loading} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                    {muted ? <Bell className="w-5 h-5 text-muted-foreground" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-sm font-medium text-foreground">{muted ? t("pomUnmute") : t("pomMuteUser")}</span>
                  </button>
                )}
                <button onClick={() => setShowReport(true)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                  <Flag className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{t("pomReport")}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostOptionsMenu;


