import { Skeleton } from "../skeleton";

import type { ClassDetailsSkeletonProps } from "./class-details-skeleton.types";

/** The class details while the class loads: the chips, date and time, "A aula" and "Onde e como" as blocks. */
export function ClassDetailsSkeleton(props: ClassDetailsSkeletonProps) {
  void props;

  return (
    <div data-testid="class-details-skeleton" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="mb-1 flex items-center gap-2">
          <Skeleton className="h-5.5 w-13 rounded-full" />
          <Skeleton className="h-5.5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-40 rounded" />
        <Skeleton className="h-11.75 w-55 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.75 w-16 rounded" />
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="flex flex-col gap-2 bg-dim px-3.5 py-3">
            <Skeleton className="h-3.75 w-20 rounded" tone="surface" />
            <Skeleton className="h-11 w-36 rounded-full" tone="surface" />
          </div>
          <div className="flex min-h-11 items-center gap-3 border-t border-line px-4 py-3">
            <div className="flex items-center">
              <Skeleton className="size-7.5 rounded-full border-2 border-surface" />
              <Skeleton className="-ml-2 size-7.5 rounded-full border-2 border-surface" />
              <Skeleton className="-ml-2 size-7.5 rounded-full border-2 border-surface" />
            </div>
            <Skeleton className="h-3.75 w-24 rounded" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.75 w-24 rounded" />
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <Skeleton className="h-24" />
          <div className="flex min-h-11 items-center gap-2.5 border-t border-line px-3.5 py-3">
            <Skeleton className="size-4 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
