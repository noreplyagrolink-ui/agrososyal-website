import { Skeleton } from "@/components/ui/skeleton";

/** Profil açılırken dönen çark yerine sayfanın iskeleti (kendi profil + diğer profiller) */
const ProfileSkeleton = () => (
  <div className="min-h-screen bg-background pb-24" aria-busy="true" aria-label="Yükleniyor">
    {/* Üst bar */}
    <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>

    <div className="max-w-lg mx-auto px-4">
      {/* Avatar + istatistikler */}
      <div className="flex items-center gap-5 pt-2">
        <Skeleton className="h-24 w-24 rounded-full shrink-0" />
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-3 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* İsim + biyografi */}
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-4/5 rounded-full" />
      </div>

      {/* Butonlar */}
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Sekmeler */}
      <div className="mt-6 flex items-center justify-around border-b border-border pb-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-5 w-5 rounded-md" />
        ))}
      </div>
    </div>

    {/* Gönderi ızgarası */}
    <div className="max-w-lg mx-auto mt-0.5 grid grid-cols-3 gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-none" />
      ))}
    </div>
  </div>
);

export default ProfileSkeleton;
