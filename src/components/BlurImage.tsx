import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BlurImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  wrapperClassName?: string;
}

/**
 * Image with blur-up loading effect.
 * Renders a low-opacity blurred placeholder while the image loads.
 */
const BlurImage = ({ src, alt = "", className, wrapperClassName, ...rest }: BlurImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-muted", wrapperClassName)}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-secondary to-muted" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "transition-all duration-500",
          loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-xl scale-105",
          className,
        )}
        {...rest}
      />
    </div>
  );
};

export default BlurImage;

