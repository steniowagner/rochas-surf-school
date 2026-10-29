import { AppIcon } from "../app-icon";
import { CalendarMonthGrid } from "../calendar-month-grid";
import { CalendarWeekRow } from "../calendar-week-row";

import type { WeekMonthCalendarProps } from "./week-month-calendar.types";

export function WeekMonthCalendar({ view, caption, previousLabel, nextLabel, week, month }: WeekMonthCalendarProps) {
  const isMonth = view === "month";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span role="img" aria-label={previousLabel} className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink">
          <AppIcon name="Ionicons:chevron-back" size={18} />
        </span>
        <div className="flex flex-1 items-center justify-center">
          <span data-testid="calendar-pill" className={`ds-text-pill flex min-w-0 items-center justify-center gap-2 rounded-full border px-3 py-2 ${isMonth ? "border-grape bg-grape text-on-color" : "border-line bg-dim text-ink"}`}>
            <AppIcon name="Ionicons:calendar-outline" size={15} />
            <span className="truncate">{caption}</span>
            <AppIcon name={isMonth ? "Ionicons:chevron-up" : "Ionicons:chevron-down"} size={14} />
          </span>
        </div>
        <span role="img" aria-label={nextLabel} className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink">
          <AppIcon name="Ionicons:chevron-forward" size={18} />
        </span>
      </div>
      {isMonth ? <CalendarMonthGrid {...month} /> : <CalendarWeekRow {...week} />}
    </div>
  );
}
