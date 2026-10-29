import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OccupancyWeekBar } from "./occupancy-week-bar.component";

describe("OccupancyWeekBar", () => {
  it("draws the current week's label in sun, with the caption and the calendar button", () => {
    render(<OccupancyWeekBar locale="pt-br" relativeLabel="Esta semana" isCurrentWeek caption="7 – 13 SET" />);

    expect(screen.getByRole("button", { name: "Escolher outra semana" })).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-week-label")).toHaveClass("text-sun");
    expect(screen.getByText("7 – 13 SET")).toHaveClass("ds-text-day-number");
    expect(screen.getByTestId("occupancy-week-calendar-icon")).toHaveClass("bg-sun-tint");
  });

  it("draws another week's label in ink-2", () => {
    render(<OccupancyWeekBar locale="pt-br" relativeLabel="Próxima semana" isCurrentWeek={false} caption="14 – 20 SET" />);

    expect(screen.getByTestId("occupancy-week-label")).toHaveClass("text-ink-2");
  });
});
