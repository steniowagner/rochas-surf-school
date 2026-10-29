import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CalendarDayProps } from "../calendar-day/calendar-day.types";

import { DateRangeCalendar } from "./date-range-calendar.component";

const day = (date: string, extra: Partial<CalendarDayProps> = {}): CalendarDayProps => ({
  date,
  disabled: false,
  adjacentMonth: false,
  today: false,
  edge: false,
  inRange: false,
  bandStart: false,
  bandEnd: false,
  excluded: false,
  ...extra,
});
const weeks = [[null, day("2026-09-01", { disabled: true }), day("2026-09-02", { disabled: true }), day("2026-09-03", { disabled: true }), day("2026-09-04", { disabled: true }), day("2026-09-05", { disabled: true }), day("2026-09-06", { disabled: true })]];
const initials = ["S", "T", "Q", "Q", "S", "S", "D"];

describe("DateRangeCalendar", () => {
  it("draws the month, the weekdays and the days, the blank ones of the month before left out", () => {
    const { container } = render(<DateRangeCalendar locale="pt-br" monthLabel="Setembro 2026" initials={initials} weeks={weeks} canGoPrevious={false} summary={{ from: null, to: null, excluded: [] }} />);

    expect(screen.getByText("Setembro 2026")).toBeInTheDocument();
    expect(screen.getAllByText("S")).toHaveLength(3);
    expect(container.querySelectorAll('[data-testid^="calendar-day-2026"]')).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeEnabled();
    expect(screen.getByText("Toque em um dia para começar")).toBeInTheDocument();
  });

  it("leaves the summary out for a single day", () => {
    render(<DateRangeCalendar locale="pt-br" monthLabel="Outubro 2026" initials={initials} weeks={weeks} canGoPrevious />);

    expect(screen.queryByText("Toque em um dia para começar")).toBeNull();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeEnabled();
  });
});
