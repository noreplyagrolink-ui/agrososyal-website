import { useState, useRef } from "react";
import { X, Loader2, Camera, Image, Globe, Lock, Eye, EyeOff, AlertTriangle, Trash2 } from "lucide-react";
import { setStoredUser, getToken } from "@/lib/api";
import { createSafePreviewUrl } from "@/lib/media";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";

interface Props {
  user: any;
  open: boolean;
  onClose: () => void;
  onUpdated: (data: any) => void;
}

type Tab = "profile" | "password";

const EditProfileModal = ({ user, open, onClose, onUpdated }: Props) => {
  const [tab, setTab] = useState<Tab>("profile");

  // Profile fields
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [location, setLocation] = useState(user?.location || user?.city || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setAvatarFile(f); setAvatarPreview(await createSafePreviewUrl(f)); }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setCoverFile(f); setCoverPreview(await createSafePreviewUrl(f)); }
  };

  const handleSaveProfile = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const token = getToken();
      const formData = new FormData();
      if (name !== user?.name) formData.append("name", name);
      if (bio !== (user?.bio || "")) formData.append("bio", bio);
      if (location !== (user?.location || user?.city || "")) formData.append("location", location);
      if (website !== (user?.website || "")) formData.append("website", website);
      if (avatarFile) formData.append("profilePic", avatarFile);
      if (removeAvatar && !avatarFile) formData.append("removeProfilePic", "1");
      if (coverFile) formData.append("coverPic", coverFile);
      if (removeCover && !coverFile) formData.append("removeCoverPic", "1");

      const res = await fetch(`${API_BASE}/users/profile`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const updated = { name, bio, location, city: location, website, ...(data.user || {}) };
      setStoredUser({ ...user, ...updated });
      onUpdated(updated);
      setSuccess("Profil güncellendi ✓");
      setTimeout(() => { setSuccess(""); onClose(); }, 1200);
    } catch { setError("Güncelleme başarısız"); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { setError("Tüm şifre alanlarını doldurun"); return; }
    if (newPw.length < 8) { setError("Yeni şifre en az 8 karakter olmalı"); return; }
    if (newPw !== newPwConfirm) { setError("Yeni şifreler eşleşmiyor"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setSuccess("Şifre değiştirildi ✓");
      setCurrentPw(""); setNewPw(""); setNewPwConfirm("");
    } catch { setError("Şifre değiştirme başarısız"); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  const currentAvatar = removeAvatar && !avatarPreview
    ? "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"
    : avatarPreview || (removeAvatar ? null : user?.profilePic) || "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
  const currentCover = removeCover && !coverPreview ? null : coverPreview || (removeCover ? null : user?.coverPic) || null;
  const inputClass = "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border border-b-0 max-h-[92dvh] flex flex-col"
        style={{ animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)" }}>

        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border flex-shrink-0">
          <h3 className="text-base font-bold text-foreground">Profili Düzenle</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => { setTab("profile"); setError(""); setSuccess(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "profile" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >Profil Bilgileri</button>
          <button
            onClick={() => { setTab("password"); setError(""); setSuccess(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "password" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >Şifre Değiştir</button>
        </div>

        <div className="overflow-y-auto scrollbar-hide flex-1 p-4 space-y-4">
          {tab === "profile" && (
            <>
              {/* Cover photo */}
              <div className="relative">
                <div
                  className="h-24 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden cursor-pointer"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {currentCover && <img src={currentCover} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                    <div className="flex flex-col items-center gap-1">
                      <Image className="w-5 h-5 text-white" />
                      <span className="text-white text-xs font-medium">Kapak Fotoğrafı</span>
                    </div>
                  </div>
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => { handleCoverChange(e); setRemoveCover(false); }} className="hidden" />

                {/* Kapak fotoğrafını kaldır / geri al */}
                {(user?.coverPic || coverPreview) && !removeCover && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setRemoveCover(true); setCoverFile(null); setCoverPreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/90 flex items-center justify-center border-2 border-card shadow"
                    aria-label="Kapak fotoğrafını kaldır"
                    title="Fotoğrafı kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
                {removeCover && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setRemoveCover(false); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-muted flex items-center justify-center border-2 border-card shadow text-muted-foreground"
                    aria-label="Geri al"
                    title="Geri al"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Avatar overlay */}
                <div className="absolute -bottom-6 left-4 flex items-end gap-1.5">
                  <button
                    className="relative"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <img src={currentAvatar} alt="" className="w-16 h-16 rounded-full object-cover ring-4 ring-card" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full agro-gradient flex items-center justify-center border-2 border-card">
                      <Camera className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </button>
                  {(user?.profilePic || avatarPreview) && !removeAvatar && (
                    <button
                      onClick={() => { setRemoveAvatar(true); setAvatarFile(null); setAvatarPreview(null); }}
                      className="w-6 h-6 rounded-full bg-destructive/90 flex items-center justify-center border-2 border-card shadow"
                      aria-label="Profil fotoğrafını kaldır"
                      title="Fotoğrafı kaldır"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  )}
                  {removeAvatar && (
                    <button
                      onClick={() => setRemoveAvatar(false)}
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-card shadow text-muted-foreground"
                      aria-label="Geri al"
                      title="Geri al"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={(e) => { handleAvatarChange(e); setRemoveAvatar(false); }} className="hidden" />
              </div>

              <div className="pt-8">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ad Soyad</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Adınız" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biyografi</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300} className={`${inputClass} resize-none`} placeholder="Kendinden bahset..." />
                <p className="text-right text-xs text-muted-foreground mt-1">{bio.length}/300</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  <span className="inline-flex items-center gap-1">📍 Konum</span>
                </label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="İstanbul, Türkiye" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> Web Sitesi</span>
                </label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://example.com" />
              </div>
              {error && <p className="text-destructive text-xs text-center flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
              {success && <p className="text-primary text-xs text-center font-medium">{success}</p>}
              <button onClick={handleSaveProfile} disabled={loading} className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Kaydet
              </button>

              {/* Hesap Doğrulama */}
              <div className="mt-6 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <path d="M17.7508 9.41667C17.7508 8.1 17.0217 6.95833 15.9608 6.41667C16.0892 6.05417 16.1592 5.6625 16.1592 5.25C16.1592 3.40833 14.7342 1.91833 12.9775 1.91833C12.5858 1.91833 12.2108 1.98833 11.8642 2.12667C11.3492 1.0125 10.2592 0.25 9.00083 0.25C7.7425 0.25 6.65417 1.01417 6.13667 2.125C5.79083 1.9875 5.415 1.91667 5.02333 1.91667C3.265 1.91667 1.84167 3.40833 1.84167 5.25C1.84167 5.66167 1.91083 6.05333 2.03917 6.41667C0.979167 6.95833 0.25 8.09833 0.25 9.41667C0.25 10.6625 0.901667 11.7483 1.86833 12.3217C1.85167 12.4633 1.84167 12.605 1.84167 12.75C1.84167 14.5917 3.265 16.0833 5.02333 16.0833C5.415 16.0833 5.79 16.0117 6.13583 15.875C6.6525 16.9867 7.74083 17.75 9 17.75C10.26 17.75 11.3483 16.9867 11.8642 15.875C12.21 16.0108 12.585 16.0817 12.9775 16.0817C14.7358 16.0817 16.1592 14.59 16.1592 12.7483C16.1592 12.6033 16.1492 12.4617 16.1317 12.3208C17.0967 11.7483 17.7508 10.6625 17.7508 9.4175V9.41667Z" fill="#1D9BF0"/>
                    <path d="M12.2375 6.63833L8.62583 12.055C8.505 12.2358 8.3075 12.3333 8.105 12.3333C7.98583 12.3333 7.865 12.3 7.75833 12.2283L7.6625 12.15L5.65 10.1375C5.40583 9.89333 5.40583 9.4975 5.65 9.25417C5.89417 9.01083 6.29 9.00917 6.53333 9.25417L8.00833 10.7267L11.1958 5.94333C11.3875 5.65583 11.7758 5.58 12.0625 5.77083C12.3508 5.9625 12.4292 6.35083 12.2375 6.6375V6.63833Z" fill="white"/>
                  </svg>
                  <p className="text-sm font-bold text-foreground">Hesabını Doğrula</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Mavi tik ile hesabını doğrula ve güvenilirliğini artır. Sadece <span className="font-bold text-foreground">50 TL</span></p>
                <a
                  href="https://sehitumitkestitarimmtal.com/agropay/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #1D9BF0, #0A84D4)", color: "white" }}
                >
                  Hesabı Doğrula — 50 TL
                </a>
              </div>
            </>
          )}

          {tab === "password" && (
            <>
              <div className="p-3 bg-primary/10 rounded-xl">
                <p className="text-xs text-muted-foreground">Güçlü bir şifre: en az 8 karakter, büyük/küçük harf ve rakam içermelidir.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mevcut Şifre</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inputClass} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Yeni Şifre</label>
                <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputClass} placeholder="En az 8 karakter" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Yeni Şifre Tekrar</label>
                <input type={showPw ? "text" : "password"} value={newPwConfirm} onChange={(e) => setNewPwConfirm(e.target.value)} className={inputClass} placeholder="Şifreyi tekrar girin" />
              </div>
              {error && <p className="text-destructive text-xs text-center">{error}</p>}
              {success && <p className="text-primary text-xs text-center font-medium">{success}</p>}
              <button onClick={handleChangePassword} disabled={loading} className="w-full py-3 rounded-xl agro-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-agro">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Lock className="w-4 h-4" /> Şifreyi Değiştir
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
};

export default EditProfileModal;





