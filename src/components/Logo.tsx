export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl overflow-hidden bg-background/40 ring-1 ring-border/60 backdrop-blur-sm">
      <img
        src="https://sehitumitkestitarimmtal.com/agro.png"
        alt="Agro Sosyal logo"
        width={36}
        height={36}
        className="w-7 h-7 object-contain relative z-10 rounded-xl"
        loading="eager"
      />
      <div className="absolute inset-0 blur-md bg-primary/25 -z-0 rounded-2xl" />
    </div>
    <span className="font-display font-semibold text-lg tracking-tight">
      Agro <span className="text-gradient-emerald">Sosyal</span>
    </span>
  </div>
);
