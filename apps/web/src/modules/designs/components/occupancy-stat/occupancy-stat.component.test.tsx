import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OccupancyStat } from "./occupancy-stat.component";

describe("OccupancyStat", () => {
  it("draws the value in its color over the label, with the divider when asked", () => {
    const { rerender } = render(<OccupancyStat value="65%" label="Ocupação" valueClassName="text-grape" hasDivider={false} />);

    expect(screen.getByText("65%")).toHaveClass("text-grape");
    expect(screen.getByText("Ocupação")).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-stat")).not.toHaveClass("border-l");
    rerender(<OccupancyStat value="3" label="Cheias" valueClassName="text-bad" hasDivider />);
    expect(screen.getByTestId("occupancy-stat")).toHaveClass("border-l");
  });
});
