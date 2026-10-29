import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { OccupancyWeekBarProps } from "./occupancy-week-bar.types";

/** The week the map shows, with how far it is from this one: all of it presses to open the calendar that picks another. */
export function OccupancyWeekBar({ locale, relativeLabel, isCurrentWeek, caption }: OccupancyWeekBarProps) {
  return (
    <div role="button" aria-label={appT(locale, "weeklyOccupancy.openCalendar")} className="flex min-h-11 items-center gap-3 rounded-card border border-line bg-surface p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <p data-testid="occupancy-week-label" className={`ds-text-section-label truncate ${isCurrentWeek ? "text-sun" : "text-ink-2"}`}>
          {relativeLabel}
        </p>
        <p className="ds-text-day-number truncate text-ink">{caption}</p>
      </div>
      <span data-testid="occupancy-week-calendar-icon" className="flex size-11 items-center justify-center rounded-control bg-sun-tint text-ink">
        <AppIcon name="Ionicons:calendar-outline" size={20} />
      </span>
    </div>
  );
}
