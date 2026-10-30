import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { SchoolRulesSkeletonProps } from "./school-rules-skeleton.types";

const LOADING_ROWS = [0, 1, 2];

/** The card of numbered rules, read out as one loading state. */
export function SchoolRulesSkeleton({ locale }: SchoolRulesSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "schoolRulesScreen.loading")} className="rounded-card border border-line bg-surface">
      {LOADING_ROWS.map((key) => (
        <div key={key} className={`flex gap-3 px-4 py-3.5 ${key < LOADING_ROWS.length - 1 ? "border-b border-line" : ""}`}>
          <Skeleton className="h-5.5 w-7 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-3 w-5/6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
