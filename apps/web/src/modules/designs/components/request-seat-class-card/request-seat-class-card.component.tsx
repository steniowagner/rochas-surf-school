import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Chip } from "../chip";

import type { RequestSeatClassCardProps } from "./request-seat-class-card.types";

/** The class the student asks to join: the chips, its day and time range, and the location. */
export function RequestSeatClassCard({ locale, discipline, level, weekday, date, duration, timeRange, locationName }: RequestSeatClassCardProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        <Chip tone={discipline}>{appT(locale, `newClass.discipline.${discipline}`)}</Chip>
        <Chip tone="info">{appT(locale, `newClass.level.${level}`)}</Chip>
      </div>
      <div className="flex self-stretch">
        <div className="flex flex-col gap-1 pr-4">
          <p className="ds-text-section-label text-ink-2">{weekday}</p>
          <p className="ds-text-lesson-time truncate text-sun">{date}</p>
        </div>
        <div className="w-px bg-line" />
        <div className="flex flex-1 flex-col gap-1 pl-4">
          <p className="ds-text-section-label text-ink-2">{duration}</p>
          <p className="ds-text-lesson-time truncate text-ink">{timeRange}</p>
        </div>
      </div>
      <div className="ds-text-card-meta flex items-center gap-1.75 rounded-full border border-line bg-dim px-3.25 py-1.75 text-ink-2">
        <AppIcon name="Ionicons:location-outline" size={14} />
        <span className="truncate">{locationName}</span>
      </div>
    </div>
  );
}
