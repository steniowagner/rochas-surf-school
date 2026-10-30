import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Chip } from "../chip";

import type { ClassSummaryCardProps } from "./class-summary-card.types";

/** The class in short, for the sheets that act on it: its category, level, time, day and location. */
export function ClassSummaryCard({ locale, discipline, level, dateLabel, timeRange, locationName, embedded = false }: ClassSummaryCardProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <div data-testid="class-summary-card" className={embedded ? "" : "rounded-card border border-line bg-surface p-3.5"}>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Chip tone={discipline === "surf" ? "surf" : "skate"}>{t(`newClass.discipline.${discipline}`)}</Chip>
        <Chip tone="info">{t(`newClass.level.${level}`)}</Chip>
      </div>
      <p className="ds-text-day-number mb-2.5 text-ink">{timeRange}</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.75">
          <AppIcon name="Ionicons:calendar-outline" size={14} className="text-lagoon" />
          <p className="ds-text-card-meta flex-1 text-ink-2">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-1.75">
          <AppIcon name="Ionicons:location-outline" size={14} className="text-lagoon" />
          <p className="ds-text-card-meta flex-1 text-ink-2">{locationName}</p>
        </div>
      </div>
    </div>
  );
}
