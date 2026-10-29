import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { SchoolSettingsSkeletonProps } from "./school-settings-skeleton.types";

/** The two sections of the settings and the save button, read out as one loading state. */
export function SchoolSettingsSkeleton({ locale }: SchoolSettingsSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "schoolSettings.loading")} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24 rounded-full" />
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <div className="flex min-h-11 items-center gap-3">
            <Skeleton className="h-3.5 flex-1 rounded-full" />
            <Skeleton className="h-8 w-12.75 rounded-full" />
          </div>
          <Skeleton className="h-3 w-5/6 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        <div className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-4">
          <Skeleton className="h-3 w-4/5 rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}
