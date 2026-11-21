import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Flag, MessageCircle, Phone, Video, Lock } from "lucide-react";
import { absoluteUrl } from "@/lib/media";

const DEFAULT_AVATAR = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

function lastSeenLabel(u: any): string {
  if (u?.isOnline) return "Çevrimiçi";
  const raw: string | undefined = u?.lastSeen || u?.lastActive;
  if (!raw) return "Son görülme yakınlarda";
  const t = Date.parse(/Z|\+/.test(raw) ? raw : raw.replace(" ", "T") + "Z");
  if (Number.isNaN(t)) return "Son görülme yakınlarda";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "Son görülme: şimdi";
  if (m < 60) return `Son görülme: ${m} dk önce`;
  if (m < 1440) return `Son görülme: ${Math.floor(m / 60)} sa önce`;
  if (m < 10080) return `Son görülme: ${Math.floor(m / 1440)} gün önce`;
  return "Son görülme: uzun zaman önce";
}

interface Props {
  open: boolean;
  user: any;
  messagingDisabled?: boolean;
  onClose: () => void;
  onMessage: () => void;
  onCall: (video: boolean) => void;
  onShare: () => void;
  /** "Özel" ve bayrak: profilin seçenekler menüsünü açar */
  onMore: () => void;
}

const GlassBtn = ({
  children, onClick, disabled, className = "", label,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string; label: string }) => (
  <motion.button
    whileTap={disabled ? undefined : { scale: 0.88 }}
    transition={{ type: "spring", stiffness: 600, damping: 26 }}
    onClick={() => { if (disabled) return; try { navigator.vibrate?.(8); } catch {} onClick(); }}
    disabled={disabled}
    aria-label={label}
    className={`flex items-center justify-center backdrop-blur-xl border disabled:opacity-35 bg-white/60 dark:bg-white/10 border-white/80 dark:border-white/15 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.25)] ${className}`}
  >
    {children}
  </motion.button>
);

/** Android'deki "kişi kartı" — başka profilde uçak ikonuna basınca açılır. */
const ContactCardSheet = ({ open, user, messagingDisabled, onClose, onMessage, onCall, onShare, onMore }: Props) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    const id = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { cancelAnimationFrame(id); document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !user) return null;

  const name = user.name || user.username || "Kullanıcı";
  const avatar = user.profilePic ? absoluteUrl(user.profilePic) : DEFAULT_AVATAR;
  const appear = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: shown ? { opacity: 1, y: 0 } : {},
    transition: { delay: delay / 1000, type: "spring" as const, stiffness: 260, damping: 24 },
  });

  const actions = [
    { icon: MessageCircle, label: "Mesaj", disabled: !!messagingDisabled, run: onMessage },
    { icon: Phone, label: "Ara", disabled: !!messagingDisabled, run: () => onCall(false) },
    { icon: Video, label: "Görüntülü", disabled: !!messagingDisabled, run: () => onCall(true) },
    { icon: Lock, label: "Özel", disabled: false, run: onMore },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[450] overflow-y-auto bg-gradient-to-b from-[#F1D9CD] via-[#EBDFD9] to-[#EDEDED] dark:from-[#3A2D29] dark:via-[#241F1E] dark:to-[#171717]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md mx-auto px-5 py-4 flex flex-col items-center min-h-full">
        {/* Üst butonlar */}
        <motion.div {...appear(0)} className="w-full flex items-center gap-2.5">
          <GlassBtn onClick={onClose} label="Geri" className="w-12 h-12 rounded-full">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </GlassBtn>
          <div className="flex-1" />
          <GlassBtn onClick={onShare} label="Paylaş" className="w-12 h-12 rounded-full">
            <Share2 className="w-5 h-5 text-foreground" />
          </GlassBtn>
          <GlassBtn onClick={onMore} label="Şikayet et" className="w-12 h-12 rounded-full">
            <Flag className="w-5 h-5 text-foreground" />
          </GlassBtn>
        </motion.div>

        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={shown ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 140, damping: 12 }}
          className="relative mt-4 w-40 h-40 rounded-full shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]"
        >
          <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
          <span className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-[#F1E9E4] dark:bg-[#2A2523] flex items-center justify-center">
            <span className={`w-5 h-5 rounded-full ${user.isOnline ? "bg-[#3DDC4A]" : "bg-[#9AA0A6]"}`} />
          </span>
        </motion.div>

        <motion.div {...appear(80)} className="mt-5 text-center px-2">
          <h2 className="text-3xl font-medium text-foreground leading-tight break-words">{name}</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">{lastSeenLabel(user)}</p>
        </motion.div>

        {/* 4 kapsül aksiyon */}
        <motion.div {...appear(160)} className="mt-7 w-full grid grid-cols-4 gap-2.5">
          {actions.map(({ icon: Icon, label, disabled, run }) => (
            <div key={label} className="flex flex-col items-center">
              <GlassBtn onClick={run} disabled={disabled} label={label} className="w-full h-[68px] rounded-full">
                <Icon className="w-6 h-6 text-foreground" strokeWidth={2} />
              </GlassBtn>
              <span className={`mt-2 text-[13px] text-foreground ${disabled ? "opacity-45" : ""}`}>{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Bio */}
        {user.bio?.trim() && (
          <motion.div
            {...appear(240)}
            className="mt-6 w-full rounded-[26px] px-5 py-4 bg-white/55 dark:bg-white/[0.07] border border-white/80 dark:border-white/10 backdrop-blur-xl"
          >
            <p className="text-xs text-muted-foreground/80">bio</p>
            <p className="mt-1 text-[17px] text-foreground whitespace-pre-wrap break-words">{user.bio}</p>
          </motion.div>
        )}
        <div className="h-6" />
      </div>
    </div>,
    document.body
  );
};

export default ContactCardSheet;
