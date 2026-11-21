// ============================================================
//  InviteBadge — Topluluk Elçisi Rozeti (10 kişi davet edenlere)
//  Özel SVG ikon: merkez düğüm (elçi/kullanıcı) + etrafına bağlanan
//  3 uydu düğüm — "topluluğu birbirine bağlayan kişi" temasını
//  jenerik bir hediye kutusu yerine doğrudan simgeliyor.
// ============================================================

interface Props {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function AmbassadorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Bağlantı çizgileri — merkezden dış düğümlere */}
      <path
        d="M12 12L5.5 7.5M12 12L18.5 7.5M12 12V19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Dış uydu düğümler (topluluk üyeleri) */}
      <circle cx="5.5" cy="6.5" r="2.25" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18.5" cy="6.5" r="2.25" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="20.25" r="2.25" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
      {/* Merkez düğüm (elçi) — dolu, vurgulu */}
      <circle cx="12" cy="10.5" r="3.4" fill="currentColor" />
      <circle cx="12" cy="10.5" r="3.4" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
    </svg>
  );
}

export function InviteBadge({ size = "sm", showLabel = true }: Props) {
  const sizeClass =
    size === "lg"
      ? "px-2.5 py-1 text-xs gap-1.5"
      : size === "md"
      ? "px-2 py-0.5 text-[11px] gap-1"
      : "px-1.5 py-[2px] text-[10px] gap-0.5";

  const iconSize = size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3";

  return (
    <span
      title="Topluluk Elçisi — 10 kişiyi davet etti"
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-400 ${sizeClass}`}
    >
      <AmbassadorIcon className={`${iconSize} text-violet-600 flex-shrink-0`} />
      {showLabel && "Topluluk Elçisi"}
    </span>
  );
}

export default InviteBadge;


