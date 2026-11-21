import { useNavigate } from "react-router-dom";
import { X, Sprout, LogIn, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** "like" | "follow" | "comment" | "save" */
  action?: string;
}

const ACTION_COPY: Record<string, { title: string; desc: string }> = {
  like: {
    title: "Beğenmek için giriş yapın",
    desc: "AgroLink'e katılarak çiftçilerle etkileşime geçin, içerikleri beğenin ve keşfedin.",
  },
  follow: {
    title: "Takip etmek için giriş yapın",
    desc: "Hesap oluşturun, çiftçileri takip edin ve tarım dünyasından haberdar olun.",
  },
  comment: {
    title: "Yorum yapmak için giriş yapın",
    desc: "Topluluğa katılın, görüşlerinizi paylaşın ve tartışmalara dahil olun.",
  },
  save: {
    title: "Kaydetmek için giriş yapın",
    desc: "İlginizi çeken içerikleri kaydedin, istediğinizde geri dönün.",
  },
  default: {
    title: "AgroLink'e hoş geldiniz",
    desc: "Bu özelliği kullanmak için giriş yapın veya ücretsiz hesap oluşturun.",
  },
};

const AuthPromptModal = ({ open, onClose, action = "default" }: Props) => {
  const navigate = useNavigate();
  const copy = ACTION_COPY[action] || ACTION_COPY.default;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-sm rounded-t-3xl pb-8 shadow-2xl"
        style={{ animation: "slideUp 0.22s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-5 pt-1">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Icon + Text */}
        <div className="flex flex-col items-center gap-3 px-6 pt-2 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sprout className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{copy.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{copy.desc}</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 px-5">
          <button
            onClick={() => { onClose(); navigate("/login?register=1"); }}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <UserPlus className="w-4 h-4" />
            Ücretsiz Hesap Oluştur
          </button>
          <button
            onClick={() => { onClose(); navigate("/login"); }}
            className="w-full py-3.5 rounded-2xl bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <LogIn className="w-4 h-4" />
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPromptModal;

