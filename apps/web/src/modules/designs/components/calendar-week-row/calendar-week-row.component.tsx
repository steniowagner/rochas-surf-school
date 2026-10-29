import type { CalendarWeekRowProps } from "./calendar-week-row.types";

export function CalendarWeekRow({ days }: CalendarWeekRowProps) {
  return (
    <div className="flex gap-1">
      {days.map((day) => {
        const number = day.selected ? "text-on-color" : day.today ? "text-sun" : "text-ink";

        return (
          <div key={day.date} data-testid={`calendar-day-${day.date}`} aria-selected={day.selected} className="flex-1">
            <div className={`flex flex-col items-center justify-center gap-1 rounded-control py-2 ${day.selected ? "bg-grape" : ""}`}>
              <span className={`ds-text-chip ${day.selected ? "text-on-color" : "text-ink-2"}`}>{day.weekday}</span>
              <span className={`ds-text-calendar-day ${number}`}>{day.number}</span>
              <span className="h-1">
                {day.marked ? <span data-testid={`calendar-day-${day.date}-dot`} className={`block size-1 rounded-full ${day.selected ? "bg-on-color" : "bg-lagoon"}`} /> : null}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
