// Feed yüklenirken dönen çark yerine gerçek kart iskeleti (algılanan hız ↑)
const PostSkeleton = () => (
  <div className="pt-5 pb-3" aria-hidden>
    <div className="flex items-center gap-3 px-3.5 pb-3.5">
      <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded-full bg-muted animate-pulse" />
        <div className="h-3 w-40 rounded-full bg-muted/70 animate-pulse" />
      </div>
    </div>
    <div className="mx-2 rounded-[26px] bg-muted animate-pulse" style={{ aspectRatio: "4 / 5" }} />
    <div className="flex items-center gap-2 px-3 pt-3.5">
      <div className="h-9 w-14 rounded-full bg-muted/70 animate-pulse" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-9 w-14 rounded-full border border-border animate-pulse" />
      ))}
    </div>
    <div className="mx-2 mt-5 h-px bg-border/70" />
  </div>
);

export const FeedSkeleton = ({ count = 2 }: { count?: number }) => (
  <div>{Array.from({ length: count }).map((_, i) => <PostSkeleton key={i} />)}</div>
);

export default PostSkeleton;
