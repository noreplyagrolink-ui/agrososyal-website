import { useState } from "react";
import { X, Loader2, MapPin } from "lucide-react";
import { editPost } from "@/lib/api";

interface Props {
  post: { id: string; content?: string; locationName?: string; location?: string; allowComments?: boolean };
  open: boolean;
  onClose: () => void;
  onSaved?: (updated: any) => void;
}

const EditPostModal = ({ post, open, onClose, onSaved }: Props) => {
  const [content, setContent] = useState(post.content || "");
  const [locationName, setLocationName] = useState(post.locationName || post.location || "");
  const [allowComments, setAllowComments] = useState(post.allowComments !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const data = await editPost(post.id, {
        content,
        locationName: locationName.trim() || undefined,
        allowComments,
      });
      if (data.error) { setError(data.error); }
      else { onSaved?.({ ...post, content, locationName }); onClose(); }
    } catch { setError("Güncellenemedi"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card sm:rounded-3xl rounded-t-3xl border border-border animate-slide-up">
        <header className="flex items-center justify-between px-4 h-14 border-b border-border">
          <button onClick={onClose}><X className="w-5 h-5 text-foreground" /></button>
          <h2 className="text-base font-bold text-foreground">Gönderiyi Düzenle</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-bold text-primary disabled:opacity-50 flex items-center gap-1"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Kaydet
          </button>
        </header>
        <div className="p-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="İçerik..."
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
          />
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted border border-border">
            <MapPin className="w-4 h-4 text-primary" />
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Konum"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
          </div>
          <label className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
            <span className="text-sm text-foreground">Yorumlara izin ver</span>
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
          </label>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;

