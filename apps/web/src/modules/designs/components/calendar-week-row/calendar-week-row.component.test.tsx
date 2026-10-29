import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarWeekRow } from "./calendar-week-row.component";

const days = [
  { date: "2026-09-07", weekday: "SEG", number: 7, selected: false, today: true, marked: true },
  { date: "2026-09-08", weekday: "TER", number: 8, selected: true, today: false, marked: true },
  { date: "2026-09-09", weekday: "QUA", number: 9, selected: false, today: false, marked: false },
];

describe("CalendarWeekRow", () => {
  it("highlights the selected day in grape with on-color numbers", () => {
    render(<CalendarWeekRow days={days} />);

    const selected = screen.getByTestId("calendar-day-2026-09-08");
    expect(selected.firstElementChild).toHaveClass("bg-grape");
    expect(screen.getByText("8")).toHaveClass("text-on-color");
    expect(selected).toHaveAttribute("aria-selected", "true");
  });

  it("draws today's number in sun and the others in ink", () => {
    render(<CalendarWeekRow days={days} />);

    expect(screen.getByText("7")).toHaveClass("text-sun");
    expect(screen.getByText("9")).toHaveClass("text-ink");
  });

  it("draws a dot for days with classes: lagoon, or on-color when selected", () => {
    render(<CalendarWeekRow days={days} />);

    expect(screen.getByTestId("calendar-day-2026-09-07-dot")).toHaveClass("bg-lagoon");
    expect(screen.getByTestId("calendar-day-2026-09-08-dot")).toHaveClass("bg-on-color");
    expect(screen.queryByTestId("calendar-day-2026-09-09-dot")).toBeNull();
  });
});
