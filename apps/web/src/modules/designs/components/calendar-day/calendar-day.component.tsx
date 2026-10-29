import type { CalendarDayProps } from "./calendar-day.types";

/** A day of the class form's calendar: the grape circle on the range's edges, the band between them, a struck-out day taken out. */
export function CalendarDay({ date, disabled, adjacentMonth, today, edge, inRange, bandStart, bandEnd, excluded }: CalendarDayProps) {
  const labelColor = edge ? "text-on-color" : disabled || excluded ? "text-ink-3" : adjacentMonth ? "text-ink-2 opacity-60" : "text-ink";

  return (
    <button
      type="button"
      data-testid={`calendar-day-${date}`}
      disabled={disabled}
      aria-pressed={(edge || inRange) && !excluded}
      className="h-11 flex-1"
    >
      <span
        data-testid={`calendar-day-band-${date}`}
        className={`flex h-11 items-center justify-center ${inRange ? "bg-grape-tint" : ""} ${inRange && bandStart ? "rounded-l-full" : ""} ${inRange && bandEnd ? "rounded-r-full" : ""}`}
      >
        <span className={`flex size-10 items-center justify-center rounded-full ${edge ? "bg-grape" : ""} ${today ? "border-2 border-grape" : ""}`}>
          <span className={`ds-text-list-title ${labelColor} ${excluded ? "line-through" : ""}`}>{Number(date.slice(8, 10))}</span>
        </span>
      </span>
    </button>
  );
}
