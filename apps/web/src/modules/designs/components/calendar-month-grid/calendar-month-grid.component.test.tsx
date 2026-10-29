import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarMonthGrid } from "./calendar-month-grid.component";
import type { CalendarMonthDay } from "./calendar-month-grid.types";

const day = (date: string, number: number, extra: Partial<CalendarMonthDay> = {}): CalendarMonthDay => ({
  date,
  number,
  selected: false,
  today: false,
  marked: false,
  adjacent: false,
  ...extra,
});

const weeks = [
  [day("2026-08-31", 31, { adjacent: true }), day("2026-09-01", 1, { today: true, marked: true })],
  [day("2026-09-07", 7, { selected: true }), day("2026-09-08", 8)],
];

describe("CalendarMonthGrid", () => {
  it("prints the weekday initials", () => {
    render(<CalendarMonthGrid initials={["S", "T"]} weeks={weeks} selectedWeekIndex={1} />);

    expect(screen.getByText("S")).toHaveClass("text-ink-3");
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("colors adjacent-month days ink-3, today sun and the selected day on grape", () => {
    render(<CalendarMonthGrid initials={["S", "T"]} weeks={weeks} selectedWeekIndex={1} />);

    expect(screen.getByText("31")).toHaveClass("text-ink-3");
    expect(screen.getByText("1")).toHaveClass("text-sun");
    expect(screen.getByText("7")).toHaveClass("text-on-color");
    expect(screen.getByText("7").parentElement).toHaveClass("bg-grape");
    expect(screen.getByText("8")).toHaveClass("text-ink");
  });

  it("tints the selected week and dots the marked days", () => {
    render(<CalendarMonthGrid initials={["S", "T"]} weeks={weeks} selectedWeekIndex={1} />);

    expect(screen.getByTestId("calendar-week-2026-09-07")).toHaveClass("bg-grape-tint");
    expect(screen.getByTestId("calendar-week-2026-08-31")).not.toHaveClass("bg-grape-tint");
    expect(screen.getByTestId("calendar-day-2026-09-01-dot")).toHaveClass("bg-lagoon");
    expect(screen.getByTestId("calendar-day-2026-09-01-dot").parentElement).toHaveClass("mt-1");
  });

  it("keeps no dot slot when no day is marked", () => {
    const unmarked = [[day("2026-09-07", 7), day("2026-09-08", 8)]];
    const { container } = render(<CalendarMonthGrid initials={["S", "T"]} weeks={unmarked} selectedWeekIndex={0} />);

    expect(container.querySelector(".h-1")).toBeNull();
  });
});
