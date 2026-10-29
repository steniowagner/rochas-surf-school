import { appT } from "@/modules/designs/i18n/app-t";
import { entryRowContainerClassName } from "@/modules/designs/utils/entry-row-container";

import { AppIcon } from "../app-icon";

import type { WeeklyOccupancyEntryRowProps } from "./weekly-occupancy-entry-row.types";

/** The "Ocupação semanal" row of the admin's and the instructor's home. */
export function WeeklyOccupancyEntryRow({ locale, grouped }: WeeklyOccupancyEntryRowProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <div className={entryRowContainerClassName(grouped)}>
      <div role="button" aria-label={t("weeklyOccupancy.title")} className="flex min-h-11 items-center gap-3 py-3">
        <AppIcon name="SimpleLineIcons:graph" size={20} className="text-lagoon" />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="ds-text-list-title text-ink">{t("weeklyOccupancy.title")}</p>
          <p className="ds-text-list-subtitle text-ink-2">{t("weeklyOccupancy.rowSubtitle")}</p>
        </div>
        <AppIcon name="Ionicons:chevron-forward" size={18} className="text-ink-2" />
      </div>
    </div>
  );
}
