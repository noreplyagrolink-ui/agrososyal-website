import { useState } from "react";
import { CATEGORIES } from "@/lib/mock-data";

export function CategoryChips({ onChange }: { onChange?: (c: string) => void }) {
  const [active, setActive] = useState("Tümü");
  return (
    <div className="sticky top-14 z-30 bg-background/80 backdrop-blur-xl py-3 -mx-4 px-4 mb-4 flex gap-2 overflow-x-auto scrollbar-none">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => { setActive(c); onChange?.(c); }}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            active === c
              ? "bg-foreground text-background shadow-glow"
              : "bg-secondary hover:bg-muted text-foreground"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}