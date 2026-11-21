import { X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply?: () => void;
}

/**
 * "Bu hesap hakkında" — AgroSosyal mavi tik bilgi modalı.
 * Görseldeki N-Sosyal modalı ile aynı düzen, metin AgroSosyal olarak güncellendi.
 */
const VerifiedBadgeModal = ({ open, onClose, onApply }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Twitter/X tarzı gerçek mavi tik SVG
  const BlueTick = ({ size = 64, dim = false }: { size?: number; dim?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity: dim ? 0.35 : 1 }}>
      <defs>
        <linearGradient id={`grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60C8F5" />
          <stop offset="100%" stopColor="#1A7FE8" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#grad-${size})`}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C3.13 9.33 2.25 10.57 2.25 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <span className="w-6" />
          <h3 className="font-bold text-[16px] text-foreground">Bu hesap hakkında</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 rozet — soldan sağa büyüyen hiyerarşi */}
        <div className="flex items-end justify-center gap-5 my-8">
          <div className="flex flex-col items-center gap-1.5">
            <BlueTick size={36} dim />
            <span className="text-[10px] text-muted-foreground/50 font-medium">Başvuran</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 drop-shadow-[0_6px_18px_rgba(29,127,232,0.5)]">
            <BlueTick size={60} />
            <span className="text-[11px] text-[#1A7FE8] font-bold">Doğrulandı</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <BlueTick size={36} dim />
            <span className="text-[10px] text-muted-foreground/50 font-medium">İnceleniyor</span>
          </div>
        </div>

        {/* Açıklama metni */}
        <p className="text-[13.5px] text-foreground/80 text-center leading-relaxed mb-6 px-2">
          AgroSosyal doğrulama rozeti (mavi tik), bir hesabın gerçek kişiye, markaya veya kuruma ait olduğunu
          AgroSosyal'in resmi olarak onayladığını gösteren simgedir. Kullanıcı adının yanında mavi bir tik olarak
          görünür. Dilersen sen de güvenilirliğini artırmak için mavi tik'e başvur.
        </p>

        {/* Buton — direkt agropay sayfasına yönlendir */}
        <a
          href="https://sehitumitkestitarimmtal.com/agropay/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full h-12 rounded-full text-white font-semibold text-[15px] active:scale-[0.98] transition-transform select-none"
          style={{ background: "linear-gradient(90deg, #5EC2F2 0%, #1A7FE8 100%)" }}
          onClick={() => { onApply?.(); onClose(); }}
        >
          Doğrulanmış Rozet Al
        </a>
      </div>
    </div>
  );
};

export default VerifiedBadgeModal;


