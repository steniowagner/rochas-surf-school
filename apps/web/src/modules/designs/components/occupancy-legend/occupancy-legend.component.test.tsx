import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OccupancyLegend } from "./occupancy-legend.component";

describe("OccupancyLegend", () => {
  it("draws the four steps with their swatches", () => {
    render(<OccupancyLegend locale="en" />);

    expect(screen.getByTestId("occupancy-legend-swatch-low")).toHaveClass("bg-info-tint");
    expect(screen.getByTestId("occupancy-legend-swatch-mid")).toHaveClass("bg-sun-tint");
    expect(screen.getByTestId("occupancy-legend-swatch-high")).toHaveClass("bg-sun");
    expect(screen.getByTestId("occupancy-legend-swatch-full")).toHaveClass("bg-bad");
    expect(screen.getByText("Full")).toBeInTheDocument();
  });
});
