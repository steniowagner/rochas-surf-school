import type { CalendarMonthGridProps } from "./calendar-month-grid.types";

export function CalendarMonthGrid({ initials, weeks, selectedWeekIndex, dotPlacement = "below" }: CalendarMonthGridProps) {
  const hasMarks = weeks.some((week) => week.some((day) => day.marked));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex">
        {initials.map((initial, index) => (
          <span key={index} className="ds-text-chip flex-1 text-center text-ink-3">{initial}</span>
        ))}
      </div>
      {weeks.map((week, index) => (
        <div key={week[0]?.date} data-testid={`calendar-week-${week[0]?.date}`} className={`flex ${index === selectedWeekIndex ? "rounded-full bg-grape-tint" : ""}`}>
          {week.map((day) => {
            const number = day.selected ? "text-on-color" : day.today ? "text-sun" : day.adjacent ? "text-ink-3" : "text-ink";

            return (
              <div key={day.date} data-testid={`calendar-day-${day.date}`} className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5">
                <span className={`flex size-10 items-center justify-center rounded-full ${day.selected ? "bg-grape" : ""}`}>
                  <span className={`ds-text-calendar-month-day ${number}`}>{day.number}</span>
                </span>
                {hasMarks ? (
                  <span className={`${dotPlacement === "overlap" ? "-mt-1.5 mb-1.5" : "mt-1"} h-1`}>
                    {day.marked ? <span data-testid={`calendar-day-${day.date}-dot`} className="block size-1 rounded-full bg-lagoon" /> : null}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
