import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { RemovedAccountsSkeletonProps } from "./removed-accounts-skeleton.types";

const LOADING_CARDS = [0, 1];

/** Cards shaped like the removed accounts, read out as one loading state. */
export function RemovedAccountsSkeleton({ locale }: RemovedAccountsSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "removedAccounts.loading")} className="flex flex-col gap-3">
      {LOADING_CARDS.map((key) => (
        <div key={key} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-1/2 rounded-full" />
              <Skeleton className="h-5.5 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-7 w-3/4 rounded-checkbox" />
              <Skeleton className="h-7 w-full rounded-checkbox" />
            </div>
            <Skeleton className="h-11 w-24 rounded-control" />
          </div>
        </div>
      ))}
    </div>
  );
}
