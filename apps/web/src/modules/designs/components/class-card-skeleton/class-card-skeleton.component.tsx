import { Skeleton } from "../skeleton";

export function ClassCardSkeleton() {
  return (
    <div data-testid="class-card-skeleton" className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 pt-3.25">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-44 rounded-card" />
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="flex items-center gap-2.5 border-t border-line bg-dim px-3.5 py-2.5">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-3 w-32 rounded-full" />
      </div>
    </div>
  );
}
