import { useState, useEffect } from "react";
import { ArrowLeft, Moon, Sun, Bell, Shield, Lock, Trash2, ChevronRight, LogOut, UserX, Monitor, Key, Globe, Wifi, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  logout as apiLogout, clearAuth, getPrivacySettings, updatePrivacySettings,
  getNotificationSettings, updateNotificationSettings, getBlockedUsers, unblockUser, changePassword,
  getMutedUsers, unmuteUser, getToken
} from "@/lib/api";
import { useT } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useDataSaver } from "@/lib/mediaPrefs";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";

type Theme = "dark" | "light" | "system";

const getSystemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (theme: Theme) => {
  const effective = theme === "system" ? getSystemTheme() : theme;
  if (effective === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  localStorage.setItem("agro_theme", theme);
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const t = useT();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("agro_theme") as Theme) || "dark");
  const [view, setView] = useState<"main" | "privacy" | "notifications" | "blocked" | "muted" | "delete" | "password">("main");
  const [dataSaver, setDataSaver] = useDataSaver();

  const handleTheme = (t: Theme) => { setTheme(t); applyTheme(t); };
  const handleLogout = async () => { try { await apiLogout(); } catch {} clearAuth(); navigate("/login"); };

  if (view === "privacy") return <PrivacySettings onBack={() => setView("main")} />;
  if (view === "notifications") return <NotificationSettings onBack={() => setView("main")} />;
  if (view === "blocked") return <BlockedAccounts onBack={() => setView("main")} />;
  if (view === "muted") return <MutedAccounts onBack={() => setView("main")} />;
  if (view === "delete") return <DeleteAccount onBack={() => setView("main")} />;
  if (view === "password") return <ChangePassword onBack={() => setView("main")} />;

  const themes: { key: Theme; icon: any; label: string }[] = [
    { key: "light", icon: Sun, label: "Aydınlık" },
    { key: "dark", icon: Moon, label: "Karanlık" },
    { key: "system", icon: Monitor, label: "Sistem" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground flex-1">{t("settingsTitle")}</h1>
          <LanguageSwitcher variant="compact" />
        </div>
      </header>
      <main className="max-w-lg mx-auto pb-20">
        {/* DİL */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">{t("settingsLanguage").toUpperCase()}</p>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>
          <LanguageSwitcher variant="menu" />
          <p className="text-[11px] text-muted-foreground mt-2">{t("settingsLanguageDesc")}</p>
        </div>

        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">{t("settingsTheme").toUpperCase()}</p>
          <div className="flex gap-2">
            {themes.map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => handleTheme(key)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${theme === key ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-5 h-5" />{label}
              </button>
            ))}
          </div>
        </div>
        {/* DATA SAVER */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Veri Tasarrufu</p>
                <p className="text-[11px] text-muted-foreground">Videolar otomatik oynatılmaz, görseller geç yüklenir</p>
              </div>
            </div>
            <button
              onClick={() => setDataSaver(!dataSaver)}
              role="switch"
              aria-checked={dataSaver}
              className={`relative w-11 h-6 rounded-full transition-colors ${dataSaver ? "bg-primary" : "bg-secondary"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${dataSaver ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
        {[
          { label: "Gizlilik", icon: Shield, view: "privacy" as const },
          { label: "Bildirim Ayarları", icon: Bell, view: "notifications" as const },
          { label: "Engellenen Hesaplar", icon: UserX, view: "blocked" as const },
          { label: "Sessiz Kullanıcılar", icon: BellOff, view: "muted" as const },
          { label: "Şifre Değiştir", icon: Key, view: "password" as const },
        ].map(({ label, icon: Icon, view: v }) => (
          <button key={v} onClick={() => setView(v)} className="w-full flex items-center justify-between px-4 py-4 border-b border-border hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-muted-foreground" /><span className="text-sm font-medium text-foreground">{label}</span></div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
        <div className="mt-6 px-4 space-y-1">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-destructive/10 transition-colors">
            <LogOut className="w-5 h-5 text-destructive" /><span className="text-sm font-medium text-destructive">{t("settingsLogout")}</span>
          </button>
          <button onClick={() => setView("delete")} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-5 h-5 text-destructive" /><span className="text-sm font-medium text-destructive">{t("delete")}</span>
          </button>
        </div>
        <div className="mt-10 px-6 pb-8 space-y-3">
          <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Gizlilik Bildirimi</p>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Bu uygulamayı kullanıyorsanız <span className="text-primary font-semibold">gizlilik ilkelerine</span> uymalısınız. Kişisel verileriniz korunur ve üçüncü taraflarla paylaşılmaz.
            </p>
          </div>
          <div className="text-center pt-2 space-y-1">
            <p className="text-[11px] text-muted-foreground">Agro Sosyal v1.0</p>
            <p className="text-[11px] text-muted-foreground">
              Bu platform <span className="font-bold text-foreground">Salih Öztürk</span>'ün ürünüdür.
            </p>
            <p className="text-[10px] text-muted-foreground/60">© {new Date().getFullYear()} Tüm hakları saklıdır.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

const SubPageWrapper = ({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
        <button onClick={onBack} className="active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </div>
    </header>
    <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
  </div>
);

const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
  <button onClick={onChange} className={`relative w-12 h-7 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted-foreground/30"}`}>
    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

const PrivacySettings = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useState<any>({ privateAccount: false, twoFactorEnabled: false, showActivity: true, allowMessagesFrom: "everyone", searchIndexable: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPrivacySettings().then(d => { if (d.settings) setSettings(d.settings); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async (updates: any) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setSaving(true);
    try { await updatePrivacySettings(newSettings); } catch {}
    setSaving(false);
  };

  const options = [
    { val: "everyone", label: "Herkes" },
    { val: "followers", label: "Takipçilerim" },
    { val: "nobody", label: "Kimse" },
  ];

  return (
    <SubPageWrapper title="Gizlilik" onBack={onBack}>
      {loading ? <p className="text-center text-muted-foreground py-10">Yükleniyor...</p> : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-foreground">Gizli Hesap</p><p className="text-xs text-muted-foreground mt-0.5">Sadece takipçilerin görsün</p></div>
            <Toggle value={settings.privateAccount} onChange={() => save({ privateAccount: !settings.privateAccount })} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-foreground">2FA Doğrulama</p><p className="text-xs text-muted-foreground mt-0.5">İki faktörlü doğrulama</p></div>
            <Toggle value={settings.twoFactorEnabled} onChange={() => save({ twoFactorEnabled: !settings.twoFactorEnabled })} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-foreground">Aktivite Durumu</p><p className="text-xs text-muted-foreground mt-0.5">Çevrimiçi durumunu göster</p></div>
            <Toggle value={settings.showActivity !== false} onChange={() => save({ showActivity: settings.showActivity === false })} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-foreground">Arama Motorlarında Görün</p><p className="text-xs text-muted-foreground mt-0.5">Kapatırsan profilin Google gibi arama motorlarında listelenmez</p></div>
            <Toggle value={settings.searchIndexable !== false} onChange={() => save({ searchIndexable: settings.searchIndexable === false })} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Mesaj Gönderebilecekler</p>
            <div className="space-y-2">
              {options.map(opt => (
                <button key={opt.val} onClick={() => save({ allowMessagesFrom: opt.val })}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${settings.allowMessagesFrom === opt.val ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary text-secondary-foreground"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {saving && <p className="text-xs text-primary text-center">Kaydediliyor...</p>}
        </div>
      )}
    </SubPageWrapper>
  );
};

const NotificationSettings = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useState<any>({ likes: true, comments: true, follows: true, messages: true, emailNotifications: true });
  const [loading, setLoading] = useState(true);
  // 🆕 Tarayıcı push bildirim izni durumu ve buton state'i.
  // Not: Notification API tarayıcıda yoksa (ör. bazı iOS Safari sürümleri
  // veya uygulama içi webview) permState "unsupported" olur, buton gizlenir.
  const [permState, setPermState] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    getNotificationSettings().then(d => { if (d.settings) setSettings(d.settings); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string) => {
    const newVal = { ...settings, [key]: !settings[key] };
    setSettings(newVal);
    try { await updateNotificationSettings(newVal); } catch {}
  };

  // 🔧 KÖK NEDEN DÜZELTMESİ: Bu fonksiyon bir onClick içinden çağrıldığı için
  // (gerçek kullanıcı tıklaması), tarayıcı izin diyaloğunu güvenilir şekilde
  // gösterir — otomatik (useEffect) çağrılardan farklı olarak engellenmez.
  const handleEnablePush = async () => {
    const token = getToken();
    if (!token) { setPushMsg("Önce giriş yapmalısınız."); return; }
    setPushLoading(true);
    setPushMsg("");
    try {
      const { requestAndRegisterWebPush } = await import("@/lib/fcm");
      const result = await requestAndRegisterWebPush(token);
      setPermState(result.permission);
      if (result.ok) setPushMsg("Bildirimler etkinleştirildi ✓");
      else if (result.permission === "denied") setPushMsg("İzin reddedildi. Tarayıcı site ayarlarından açabilirsiniz.");
      else setPushMsg("Bildirimler etkinleştirilemedi.");
    } catch {
      setPushMsg("Bir hata oluştu, tekrar deneyin.");
    } finally {
      setPushLoading(false);
    }
  };

  const items = [
    { label: "Beğeniler", key: "likes" },
    { label: "Yorumlar", key: "comments" },
    { label: "Takipler", key: "follows" },
    { label: "Mesajlar", key: "messages" },
    { label: "E-posta Bildirimleri", key: "emailNotifications" },
  ];

  return (
    <SubPageWrapper title="Bildirim Ayarları" onBack={onBack}>
      {/* Tarayıcı push bildirim izni */}
      {permState !== "unsupported" && (
        <div className="mb-4 p-4 rounded-xl bg-secondary border border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Tarayıcı Bildirimleri</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permState === "granted"
                  ? "Etkin — bu cihazda bildirim alacaksınız."
                  : permState === "denied"
                  ? "Reddedildi — tarayıcı site ayarlarından açabilirsiniz."
                  : "Yeni beğeni, yorum ve mesajlarda anlık bildirim alın."}
              </p>
            </div>
            {permState !== "granted" && permState !== "denied" && (
              <button
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap disabled:opacity-60"
              >
                {pushLoading ? "..." : "Etkinleştir"}
              </button>
            )}
          </div>
          {pushMsg && <p className="text-xs text-primary mt-2">{pushMsg}</p>}
        </div>
      )}

      {loading ? <p className="text-center text-muted-foreground py-10">Yükleniyor...</p> : (
        <div className="space-y-1">
          {items.map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between py-4 border-b border-border">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <Toggle value={settings[key] !== false} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>
      )}
    </SubPageWrapper>
  );
};

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

const BlockedAccounts = ({ onBack }: { onBack: () => void }) => {
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlockedUsers().then(d => setBlocked(d.blocks || d.blockedUsers || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (userId: string) => {
    setBlocked(prev => prev.filter(u => u.id !== userId));
    try { await unblockUser(userId); } catch {}
  };

  return (
    <SubPageWrapper title="Engellenen Hesaplar" onBack={onBack}>
      {loading ? <p className="text-center text-muted-foreground py-10">Yükleniyor...</p> :
        blocked.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <UserX className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">Engellenen hesap yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blocked.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                <img src={u.profilePic ? absoluteUrl(u.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{u.name || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <button onClick={() => handleUnblock(u.id)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive">Engeli Kaldır</button>
              </div>
            ))}
          </div>
        )}
    </SubPageWrapper>
  );
};

const MutedAccounts = ({ onBack }: { onBack: () => void }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getMutedUsers().then(d => setList(d.users || d.muted || d.mutedUsers || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const handleUnmute = async (userId: string) => {
    setList(prev => prev.filter(u => u.id !== userId));
    try { await unmuteUser(userId); } catch {}
  };
  return (
    <SubPageWrapper title="Sessiz Kullanıcılar" onBack={onBack}>
      {loading ? <p className="text-center text-muted-foreground py-10">Yükleniyor...</p> :
        list.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <BellOff className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">Sessizleştirilen hesap yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                <img src={u.profilePic ? absoluteUrl(u.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{u.name || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <button onClick={() => handleUnmute(u.id)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary">Sessizliği Kaldır</button>
              </div>
            ))}
          </div>
        )}
    </SubPageWrapper>
  );
};

const ChangePassword = ({ onBack }: { onBack: () => void }) => {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const inputClass = "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

  const handleChange = async () => {
    setError(""); setMsg("");
    if (newPass !== confirm) { setError("Şifreler eşleşmiyor"); return; }
    if (newPass.length < 6) { setError("Şifre en az 6 karakter olmalı"); return; }
    setLoading(true);
    try {
      const data = await changePassword(current, newPass);
      if (data.error) setError(data.error);
      else { setMsg("Şifre başarıyla değiştirildi!"); setCurrent(""); setNewPass(""); setConfirm(""); }
    } catch { setError("Bir hata oluştu"); }
    setLoading(false);
  };

  return (
    <SubPageWrapper title="Şifre Değiştir" onBack={onBack}>
      <div className="space-y-4">
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mevcut Şifre</label><input type="password" value={current} onChange={e => setCurrent(e.target.value)} className={inputClass} placeholder="Mevcut şifreniz" /></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Yeni Şifre</label><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className={inputClass} placeholder="Yeni şifre" /></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Yeni Şifre (Tekrar)</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} placeholder="Yeni şifre tekrar" /></div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        {msg && <p className="text-primary text-sm">{msg}</p>}
        <button onClick={handleChange} disabled={loading || !current || !newPass} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-30 transition-all">
          {loading ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
        </button>
      </div>
    </SubPageWrapper>
  );
};

const DeleteAccount = ({ onBack }: { onBack: () => void }) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputClass = "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-destructive/50 text-sm";

  const handleDelete = async () => {
    if (!password.trim()) { setError("Şifrenizi girin"); return; }
    setLoading(true); setError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/auth/account`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Silme başarısız"); setLoading(false); return; }
      clearAuth(); navigate("/login");
    } catch { setError("Bir hata oluştu"); }
    setLoading(false);
  };

  return (
    <SubPageWrapper title="Hesabı Sil" onBack={onBack}>
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">⚠️ Bu işlem geri alınamaz!</p>
          <p className="text-xs text-muted-foreground mt-1">Tüm gönderileriniz ve verileriniz kalıcı olarak silinir.</p>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Şifrenizi girin</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="Şifreniz" /></div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button onClick={handleDelete} disabled={!password.trim() || loading} className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-30 transition-all">
          {loading ? "Siliniyor..." : "Hesabımı Kalıcı Olarak Sil"}
        </button>
      </div>
    </SubPageWrapper>
  );
};

export default SettingsPage;





