import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeeklyOccupancyEntryRow } from "./weekly-occupancy-entry-row.component";

describe("WeeklyOccupancyEntryRow", () => {
  it("draws the title and the subtitle", () => {
    render(<WeeklyOccupancyEntryRow locale="es" grouped="next" />);

    expect(screen.getByRole("button", { name: "Ocupación semanal" })).toBeInTheDocument();
    expect(screen.getByText(/Plazas ocupadas/)).toBeInTheDocument();
  });
});
