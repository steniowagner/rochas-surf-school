import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { CancellationRulesSkeletonProps } from "./cancellation-rules-skeleton.types";

/** The form of a rule (discipline switch, tips, text and save button), read out as one loading state. */
export function CancellationRulesSkeleton({ locale }: CancellationRulesSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "cancellationRules.screen.loading")} className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full rounded-full" />
      <div className="flex flex-col gap-3 rounded-card bg-dim p-4">
        <Skeleton className="h-3.5 w-5/6 rounded-full" tone="surface" />
        <Skeleton className="h-3.5 w-2/3 rounded-full" tone="surface" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-48 w-full rounded-card" />
        <Skeleton className="h-3 w-1/3 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}
