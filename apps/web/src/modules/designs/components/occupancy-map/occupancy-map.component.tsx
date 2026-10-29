import { OccupancyCell } from "../occupancy-cell";
import { OccupancyLegend } from "../occupancy-legend";

import type { OccupancyMapProps } from "./occupancy-map.types";

/** The week as a grid: the days across, a row per start time, each class's cell on the color of how full it is. */
export function OccupancyMap({ locale, days, rows, selectedId }: OccupancyMapProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <span className="w-11 shrink-0" />
          {days.map((day) => (
            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="ds-text-section-label text-ink-2">{day.weekday}</span>
              <span data-testid={`occupancy-day-${day.date}`} className={`ds-text-calendar-month-day ${day.isToday ? "text-sun" : "text-ink"}`}>
                {day.dayNumber}
              </span>
            </div>
          ))}
        </div>
        {rows.map((row, rowIndex) => (
          <div key={`${row.time}-${rowIndex}`} className="flex gap-1">
            <span className="ds-text-occupancy-cell flex h-11 w-11 shrink-0 items-center text-ink-2">{row.showsTime ? row.time : null}</span>
            {row.slots.map((slot, dayIndex) =>
              slot.kind === "class" ? (
                <OccupancyCell key={slot.item.id} locale={locale} item={slot.item} weekday={days[dayIndex]?.weekday ?? ""} dayNumber={days[dayIndex]?.dayNumber ?? ""} selected={slot.item.id === selectedId} />
              ) : (
                <div key={slot.date} aria-hidden="true" className="h-11 min-w-0 flex-1">
                  <div data-testid={`occupancy-dashed-${slot.date}`} className="h-11 rounded-occupancy-cell border border-dashed border-line" />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
      <OccupancyLegend locale={locale} />
    </div>
  );
}
