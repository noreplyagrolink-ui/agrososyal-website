import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Globe } from "lucide-react";
import { getOgPreview } from "@/lib/api";
import { sanitizeUrl } from "@/lib/security";

interface Props {
  content: string;
  authorUsername: string;
  maxLength?: number;
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

const LinkPreviewCard = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOgPreview(url);
        if (!cancelled && data && !data.error) {
          setPreview({
            url,
            title: data.title || data.ogTitle,
            description: data.description || data.ogDescription,
            image: data.image || data.ogImage,
            siteName: data.siteName || data.ogSiteName,
            favicon: data.favicon,
          });
        } else {
          // Fallback to basic URL parsing
          const u = new URL(url);
          if (!cancelled) setPreview({ url, title: u.hostname.replace("www.", ""), description: u.pathname });
        }
      } catch {
        try {
          const u = new URL(url);
          if (!cancelled) setPreview({ url, title: u.hostname.replace("www.", ""), description: u.pathname });
        } catch {
          if (!cancelled) setFailed(true);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2.5 rounded-2xl border border-border overflow-hidden bg-secondary/30 animate-pulse">
        <div className="h-36 bg-muted" />
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (failed || !preview) return null;

  return (
    <a
      href={sanitizeUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2.5 rounded-2xl border border-border overflow-hidden hover:bg-secondary/30 transition-colors group"
      onClick={(e) => e.stopPropagation()}
    >
      {preview.image && (
        <div className="relative h-36 bg-muted overflow-hidden">
          <img
            src={preview.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          {preview.favicon ? (
            <img src={preview.favicon} alt="" className="w-3.5 h-3.5 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <Globe className="w-3 h-3 text-muted-foreground" />
          )}
          <span className="text-[11px] text-muted-foreground truncate">{preview.siteName || new URL(url).hostname.replace("www.", "")}</span>
        </div>
        {preview.title && preview.title !== new URL(url).hostname.replace("www.", "") && (
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{preview.title}</p>
        )}
        {preview.description && preview.description !== new URL(url).pathname && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{preview.description}</p>
        )}
      </div>
    </a>
  );
};

const PostContent = ({ content, authorUsername, maxLength = 280 }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  if (!content) return null;

  const displayText = expanded || content.length <= maxLength
    ? content
    : content.slice(0, maxLength);

  // Parse text into segments: normal, #hashtag, @mention, URL
  const segments: { type: "text" | "hashtag" | "mention" | "url"; value: string }[] = [];
  const regex = /(https?:\/\/[^\s<]+|[@#][\w\u00C0-\u024F\u0400-\u04FF]+)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(displayText)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", value: displayText.slice(last, match.index) });
    }
    const token = match[1];
    if (token.startsWith("http")) {
      segments.push({ type: "url", value: token });
    } else if (token.startsWith("#")) {
      segments.push({ type: "hashtag", value: token });
    } else {
      segments.push({ type: "mention", value: token });
    }
    last = match.index + token.length;
  }
  if (last < displayText.length) {
    segments.push({ type: "text", value: displayText.slice(last) });
  }

  // Extract first URL for preview
  const firstUrl = segments.find(s => s.type === "url")?.value;

  return (
    <div>
      <p className="text-[15px] text-foreground leading-relaxed">
        {segments.map((seg, i) => {
          if (seg.type === "hashtag") {
            return (
              <span key={i} className="text-primary font-medium cursor-pointer hover:underline"
                onClick={() => navigate(`/search?hashtag=${encodeURIComponent(seg.value.slice(1))}`)}>
                {seg.value}
              </span>
            );
          }
          if (seg.type === "mention") {
            return (
              <span key={i} className="text-primary font-medium cursor-pointer hover:underline"
                onClick={() => navigate(`/search?q=${seg.value.slice(1)}`)}>
                {seg.value}
              </span>
            );
          }
          if (seg.type === "url") {
            const safeUrl = sanitizeUrl(seg.value);
            return (
              <a key={i} href={safeUrl} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline break-all inline-flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}>
                {seg.value.length > 35 ? seg.value.slice(0, 35) + "…" : seg.value}
                <ExternalLink className="w-3 h-3 inline-flex flex-shrink-0" />
              </a>
            );
          }
          return <span key={i}>{seg.value}</span>;
        })}
        {!expanded && content.length > maxLength && (
          <>
            {"... "}
            <button onClick={() => setExpanded(true)}
              className="text-muted-foreground font-medium hover:text-foreground transition-colors">
              daha fazla
            </button>
          </>
        )}
        {expanded && content.length > maxLength && (
          <>
            {" "}
            <button onClick={() => setExpanded(false)}
              className="text-muted-foreground font-medium hover:text-foreground transition-colors">
              daha az
            </button>
          </>
        )}
      </p>
      {firstUrl && <LinkPreviewCard url={firstUrl} />}
    </div>
  );
};

export default PostContent;


