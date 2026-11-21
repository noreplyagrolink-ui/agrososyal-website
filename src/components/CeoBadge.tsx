import { Crown } from "lucide-react";

export function CeoBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const px = size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-[1px] text-[10px]";
  return (
    <span
      title="CEO — Doğrulanmış kanal sahibi"
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-gradient-brand text-primary-foreground shadow-glow ${px}`}
    >
      <Crown className="w-3 h-3" />
      CEO
    </span>
  );
}