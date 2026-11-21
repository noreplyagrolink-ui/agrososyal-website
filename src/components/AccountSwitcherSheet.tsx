import { useEffect, useState } from "react";
import { Plus, LogOut, Check, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAccounts,
  switchToAccount,
  removeAccount,
  saveCurrentAsAccount,
  getStoredUser,
  type StoredAccount,
} from "@/lib/api";
import { DEFAULT_AVATAR } from "@/lib/avatar";

const absoluteAvatar = (pic?: string | null) => {
  if (!pic) return DEFAULT_AVATAR;
  if (pic.startsWith("http")) return pic;
  return `https://sehitumitkestitarimmtal.com${pic}`;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const AccountSwitcherSheet = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const me = getStoredUser();

  useEffect(() => {
    if (open) {
      // önce mevcut hesabı kaydet ki listede görünsün
      saveCurrentAsAccount();
      setAccounts(getAccounts());
    }
  }, [open]);

  if (!open) return null;

  const handleSwitch = (acc: StoredAccount) => {
    switchToAccount(acc);
    onClose();
    // Tam reload — uygulama yeni token'la baştan başlasın
    window.location.href = "/agrolink/profile";
  };

  const handleAdd = () => {
    onClose();
    navigate("/login?add=1");
  };

  const handleRemove = (e: React.MouseEvent, idOrUsername: string | number) => {
    e.stopPropagation();
    removeAccount(idOrUsername);
    setAccounts(getAccounts());
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-lg rounded-t-3xl pb-6 shadow-2xl"
        style={{ animation: "slideUp 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-base font-bold text-foreground">Hesap değiştir</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mx-auto w-12 h-1.5 rounded-full bg-border mb-3" />

        <div className="max-h-[60vh] overflow-y-auto px-2">
          {accounts.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Kayıtlı hesap yok
            </p>
          )}
          {accounts.map((acc) => {
            const isActive = String(acc.id ?? acc.username) === String(me?.id ?? me?.username);
            return (
              <button
                key={String(acc.id ?? acc.username)}
                onClick={() => !isActive && handleSwitch(acc)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 transition-colors ${
                  isActive ? "bg-primary/10" : "hover:bg-secondary/60 active:bg-secondary"
                }`}
              >
                <img
                  src={absoluteAvatar(acc.profilePic)}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {acc.name || acc.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{acc.username}
                  </p>
                </div>
                {isActive ? (
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Check className="w-4 h-4" /> Aktif
                  </span>
                ) : (
                  <span
                    role="button"
                    aria-label="Hesabı kaldır"
                    onClick={(e) => handleRemove(e as any, acc.id ?? acc.username!)}
                    className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-3 pt-2 border-t border-border mt-2">
          <button
            onClick={handleAdd}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-secondary/60 active:bg-secondary transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Hesap ekle</span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("agrolink_token");
              localStorage.removeItem("agrolink_refresh_token");
              localStorage.removeItem("agrolink_user");
              window.location.href = "/agrolink/login";
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-secondary/60 active:bg-secondary transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-sm font-semibold text-destructive">Çıkış yap</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSwitcherSheet;

