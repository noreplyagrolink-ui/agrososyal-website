import { useRef, useState } from "react";
import { Sparkles, Camera, X, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { absoluteUrl, createSafePreviewUrl } from "@/lib/media";
import { setStoredUser, getToken } from "@/lib/api";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";
const STORAGE_KEY = "agro_profile_complete_card_dismissed";

interface Props {
  user: any;
  onDismiss: () => void;
  onUpdated: (u: any) => void;
}

const ProfileCompleteCard = ({ user, onDismiss, onUpdated }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onDismiss();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(await createSafePreviewUrl(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("profilePic", file);
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const updated = { ...user, ...(data.user || {}), profilePic: data.user?.profilePic || user.profilePic };
      setStoredUser(updated);
      onUpdated(updated);
      setDone(true);
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, "1");
        onDismiss();
      }, 1600);
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 flex items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">Profil fotoğrafın güncellendi 🎉</p>
          <p className="text-xs text-muted-foreground mt-0.5">Profilin artık daha tanınır görünüyor!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-5 shadow-sm">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-violet-500/8 blur-2xl" />

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors z-10"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        {/* Avatar area */}
        <div className="relative flex-shrink-0">
          <div
            className="w-16 h-16 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/70 transition-colors active:scale-95"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera className="w-5 h-5 text-primary/60" />
                <span className="text-[9px] text-primary/60 font-semibold">Fotoğraf</span>
              </div>
            )}
          </div>
          {preview && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow ring-2 ring-card">
              <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-bold text-primary uppercase tracking-wide">Profilini Tamamla</span>
          </div>
          <p className="text-sm font-bold text-foreground leading-snug">
            Merhaba {user?.name?.split(" ")[0] || "çiftçi"}! 👋
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Profil fotoğrafı ekleyerek diğer çiftçiler tarafından daha kolay tanın.
          </p>

          <div className="flex items-center gap-2 mt-3">
            {!preview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-transform shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                Profil Fotoğrafı Ekle
              </button>
            ) : (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-transform shadow-sm disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                {uploading ? "Yükleniyor..." : "Kaydet"}
              </button>
            )}
            {preview && (
              <button
                onClick={() => { setPreview(null); setFile(null); }}
                className="px-3 py-2 rounded-xl bg-secondary text-xs font-medium text-muted-foreground active:scale-95 transition-transform"
              >
                Değiştir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProfileCompleteCard };
export default ProfileCompleteCard;

