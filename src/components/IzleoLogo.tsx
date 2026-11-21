export function IzleoLogo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2 group">
      <div
        className="relative grid place-items-center rounded-2xl bg-gradient-brand shadow-glow transition-transform group-hover:scale-110"
        style={{ width: size, height: size }}
        aria-label="İzleo"
      >
        <svg
          viewBox="0 0 32 32"
          width={size * 0.62}
          height={size * 0.62}
          fill="none"
          stroke="white"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* stylized play + eye */}
          <path d="M5 9 L5 23 Q5 25 7 24 L25 17 Q27 16 25 15 L7 8 Q5 7 5 9 Z" fill="white" stroke="none" />
          <circle cx="22.5" cy="16" r="2.2" fill="oklch(0.62 0.23 25)" stroke="none" />
        </svg>
        <span className="absolute inset-0 rounded-2xl bg-gradient-brand blur-xl opacity-40 -z-10" />
      </div>
      {withText && (
        <span className="text-2xl font-black tracking-tight leading-none">
          İz<span className="text-gradient-brand">leo</span>
        </span>
      )}
    </div>
  );
}