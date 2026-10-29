import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeekPickerSheet } from "./week-picker-sheet.component";

const day = (date: string, number: number, marked = false) => ({ date, number, selected: false, today: date === "2026-09-07", marked, adjacent: false });
const weeks = [
  [day("2026-08-31", 31), day("2026-09-01", 1), day("2026-09-02", 2, true)],
  [day("2026-09-07", 7, true), day("2026-09-08", 8), day("2026-09-09", 9, true)],
];

describe("WeekPickerSheet", () => {
  it("draws the month with its arrows and the selected week as a band, the dots overlapping the numbers", () => {
    render(<WeekPickerSheet locale="pt-br" caption="SETEMBRO 2026" initials={["S", "T", "Q"]} weeks={weeks} selectedWeekIndex={1} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("week-picker-month")).toHaveTextContent("SETEMBRO 2026");
    expect(screen.getByRole("button", { name: "Ver o mês anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver o mês seguinte" })).toBeInTheDocument();
    expect(screen.getByTestId("calendar-week-2026-09-07")).toHaveClass("bg-grape-tint");
    expect(screen.getByTestId("calendar-day-2026-09-07-dot").parentElement).toHaveClass("-mt-1.5");
  });
});
