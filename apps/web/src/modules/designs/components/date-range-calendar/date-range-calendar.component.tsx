import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { CalendarDay } from "../calendar-day";
import { DateRangeSummary } from "../date-range-summary";

import type { DateRangeCalendarProps } from "./date-range-calendar.types";

/** A month grid (Monday first) where the admin taps the first and the last day of the batch. */
export function DateRangeCalendar({ locale, monthLabel, initials, weeks, canGoPrevious, summary }: DateRangeCalendarProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label={t("newClass.calendar.previousMonth")} disabled={!canGoPrevious} className="flex size-11 items-center justify-center rounded-full bg-sand">
            <AppIcon name="Ionicons:chevron-back" size={20} className={canGoPrevious ? "text-ink" : "text-ink-3"} />
          </button>
          <p className="ds-text-button text-ink">{monthLabel}</p>
          <button type="button" aria-label={t("newClass.calendar.nextMonth")} className="flex size-11 items-center justify-center rounded-full bg-sand">
            <AppIcon name="Ionicons:chevron-forward" size={20} className="text-ink" />
          </button>
        </div>
        <div className="flex">
          {initials.map((initial, index) => (
            <p key={index} className="ds-text-section-label flex-1 text-center text-ink-2">
              {initial}
            </p>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex">
            {week.map((day, index) => (day === null ? <span key={`empty-${index}`} className="h-11 flex-1" /> : <CalendarDay key={day.date} {...day} />))}
          </div>
        ))}
      </div>
      {summary ? <DateRangeSummary locale={locale} {...summary} /> : null}
    </div>
  );
}
