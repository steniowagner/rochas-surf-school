import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { RegistrationsSkeletonProps } from "./registrations-skeleton.types";

const LOADING_CARDS = [0, 1, 2];

/** Cards shaped like registrations (the reactivations use them too), read out as one loading state. */
export function RegistrationsSkeleton({ locale }: RegistrationsSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "registrations.loading")} className="flex flex-col gap-3">
      {LOADING_CARDS.map((key) => (
        <div key={key} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
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
      ))}
    </div>
  );
}
