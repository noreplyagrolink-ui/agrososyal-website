import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, CircleDashed, Sparkles, ChevronRight, X } from "lucide-react";
import { openOmniAI } from "@/lib/omni";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Android'deki "+" menüsü: Gönderi paylaş · Hikaye paylaş · Omni AI dene */
const CreateChooserSheet = ({ open, onClose }: Props) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const goPost = () => { onClose(); navigate("/create"); };

  const goStory = () => {
    onClose();
    if (window.location.pathname === "/feed") {
      // Zaten akıştayız: dokunma jesti içinde dosya seçiciyi aç
      window.dispatchEvent(new CustomEvent("agro:add-story"));
    } else {
      navigate("/feed", { state: { addStory: true } });
    }
  };

  const goOmni = () => { onClose(); openOmniAI(); };

  const items = [
    { icon: ImagePlus, title: "Gönderi paylaş", desc: "Fotoğraf, video, anket veya yazı paylaş", onClick: goPost, tone: "bg-primary/12 text-primary" },
    { icon: CircleDashed, title: "Hikaye paylaş", desc: "24 saat görünen anlık paylaşım", onClick: goStory, tone: "bg-amber-500/15 text-amber-600" },
    { icon: Sparkles, title: "Omni AI dene", desc: "Tarım asistanıyla sohbet et", onClick: goOmni, tone: "nex-gradient text-white", badge: "YENİ" },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
          <motion.div
            role="dialog" aria-label="Oluştur"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="relative w-full max-w-md bg-background rounded-t-[28px] md:rounded-[28px] px-4 pt-3 shadow-2xl"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="w-11 h-1.5 rounded-full bg-border mx-auto mb-3 md:hidden" />
            <div className="flex items-center justify-between px-1 mb-2">
              <h2 className="text-lg font-extrabold text-foreground">Oluştur</h2>
              <button onClick={onClose} aria-label="Kapat" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.title}
                  onClick={it.onClick}
                  className="w-full flex items-center gap-3 p-3.5 rounded-[20px] bg-card border border-border text-left active:scale-[0.985] transition-transform hover:border-primary/40"
                >
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${it.tone}`}>
                    <it.icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-foreground">{it.title}</span>
                      {it.badge && <span className="nex-gradient text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wide">{it.badge}</span>}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">{it.desc}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CreateChooserSheet;
