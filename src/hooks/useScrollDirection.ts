import { useEffect, useState, useRef } from "react";

/**
 * Aşağı scroll'da `hidden=true`, yukarı scroll'da `hidden=false` döndürür.
 * Üst ve alt navigasyon barlarını animasyonla gizlemek için kullanılır.
 */
export function useScrollDirection(threshold = 8) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        if (Math.abs(dy) > threshold) {
          if (y < 80) setHidden(false);
          else if (dy > 0) setHidden(true);
          else setHidden(false);
          lastY.current = y;
        }
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}

