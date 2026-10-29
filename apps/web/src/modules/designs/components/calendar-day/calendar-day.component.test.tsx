import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarDay } from "./calendar-day.component";
import type { CalendarDayProps } from "./calendar-day.types";

const day: CalendarDayProps = { date: "2026-09-14", disabled: false, adjacentMonth: false, today: false, edge: false, inRange: false, bandStart: false, bandEnd: false, excluded: false };

describe("CalendarDay", () => {
  it("draws a plain day with its number", () => {
    render(<CalendarDay {...day} />);

    expect(screen.getByText("14")).toHaveClass("text-ink");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("draws the range's edge on grape and the band's rounded start", () => {
    render(<CalendarDay {...day} edge inRange bandStart />);

    expect(screen.getByText("14")).toHaveClass("text-on-color");
    expect(screen.getByText("14").parentElement).toHaveClass("bg-grape");
    expect(screen.getByTestId("calendar-day-band-2026-09-14")).toHaveClass("bg-grape-tint", "rounded-l-full");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("strikes out a day taken out of the range and rounds the band's end", () => {
    render(<CalendarDay {...day} inRange bandEnd excluded />);

    expect(screen.getByText("14")).toHaveClass("line-through", "text-ink-3");
    expect(screen.getByTestId("calendar-day-band-2026-09-14")).toHaveClass("rounded-r-full");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("rings today, fades a past day and the adjacent month's", () => {
    const { rerender } = render(<CalendarDay {...day} today />);

    expect(screen.getByText("14").parentElement).toHaveClass("border-grape");
    rerender(<CalendarDay {...day} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("14")).toHaveClass("text-ink-3");
    rerender(<CalendarDay {...day} adjacentMonth />);
    expect(screen.getByText("14")).toHaveClass("opacity-60");
  });
});
