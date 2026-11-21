// ============================================================
//  FarmerBadge — Organik Çiftçi & İyi Tarım Uzmanı Rozetleri
// ============================================================

import { Award, Leaf } from "lucide-react";

type BadgeType = "organik_ciftci" | "iyi_tarim_uzmani";

interface Props {
  type: BadgeType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const BADGE_CONFIG = {
  organik_ciftci: {
    label: "Organik Çiftçi",
    icon: Leaf,
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-600",
    title: "Organik Çiftçi Sertifikası — Topluluk tarafından onaylandı",
  },
  iyi_tarim_uzmani: {
    label: "İyi Tarım Uzmanı",
    icon: Award,
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-600",
    title: "İyi Tarım Uzmanı Sertifikası — Bilgi testi başarısıyla kazanıldı",
  },
};

export function FarmerBadge({ type, size = "sm", showLabel = true }: Props) {
  const cfg = BADGE_CONFIG[type];
  const Icon = cfg.icon;

  const sizeClass =
    size === "lg"
      ? "px-2.5 py-1 text-xs gap-1.5"
      : size === "md"
      ? "px-2 py-0.5 text-[11px] gap-1"
      : "px-1.5 py-[2px] text-[10px] gap-0.5";

  const iconSize = size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3";

  return (
    <span
      title={cfg.title}
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide ${sizeClass} ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <Icon className={`${iconSize} ${cfg.iconColor} flex-shrink-0`} />
      {showLabel && cfg.label}
    </span>
  );
}

/** Kullanıcı nesnesinden hangi rozetlere sahip olduğunu döner */
export function getUserBadges(user: any): BadgeType[] {
  const badges: BadgeType[] = [];
  if (user?.farmerCertificate === "organik_ciftci" || user?.farmerBadgeType === "organik_ciftci") {
    badges.push("organik_ciftci");
  }
  if (user?.farmerCertificate === "iyi_tarim_uzmani" || user?.farmerBadgeType === "iyi_tarim_uzmani") {
    badges.push("iyi_tarim_uzmani");
  }
  // Legacy hasFarmerBadge desteği
  if (user?.hasFarmerBadge && badges.length === 0) {
    badges.push("organik_ciftci");
  }
  return badges;
}

