import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { ClassRequestsSkeletonProps } from "./class-requests-skeleton.types";

const LOADING_GROUPS = [0, 1];

/** Class headers with a request card each, read out as one loading state. */
export function ClassRequestsSkeleton({ locale }: ClassRequestsSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "classRequests.loading")} className="flex flex-col gap-6">
      {LOADING_GROUPS.map((key) => (
        <div key={key} className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-12 rounded-card" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/2 rounded-full" />
                <Skeleton className="h-3 w-1/3 rounded-full" />
                <Skeleton className="h-3 w-2/3 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/2 rounded-full" />
                <Skeleton className="h-3 w-2/3 rounded-full" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-11 flex-1 rounded-full" />
              <Skeleton className="h-11 flex-1 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
