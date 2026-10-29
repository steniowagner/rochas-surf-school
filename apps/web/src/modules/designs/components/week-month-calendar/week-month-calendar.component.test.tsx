import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeekMonthCalendar } from "./week-month-calendar.component";

const props = {
  caption: "setembro",
  previousLabel: "Ver a semana anterior",
  nextLabel: "Ver a semana seguinte",
  week: { days: [{ date: "2026-09-07", weekday: "SEG", number: 7, selected: true, today: false, marked: false }] },
  month: { initials: ["S"], weeks: [[{ date: "2026-09-07", number: 7, selected: true, today: false, marked: false, adjacent: false }]], selectedWeekIndex: 0 },
};

describe("WeekMonthCalendar", () => {
  it("draws the week row with the idle pill", () => {
    render(<WeekMonthCalendar view="week" {...props} />);

    expect(screen.getByTestId("calendar-pill")).toHaveClass("bg-dim");
    expect(screen.getByText("SEG")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ver a semana anterior" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ver a semana seguinte" })).toBeInTheDocument();
  });

  it("draws the month grid with the grape pill", () => {
    render(<WeekMonthCalendar view="month" {...props} />);

    expect(screen.getByTestId("calendar-pill")).toHaveClass("bg-grape");
    expect(screen.getByTestId("calendar-week-2026-09-07")).toBeInTheDocument();
    expect(screen.queryByText("SEG")).toBeNull();
  });
});
