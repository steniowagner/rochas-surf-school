import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OccupancyMapSkeleton } from "./occupancy-map-skeleton.component";

describe("OccupancyMapSkeleton", () => {
  it("draws the stats card, the header row and four rows of seven cells, read as one loading state", () => {
    render(<OccupancyMapSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando a ocupação" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(1 + 7 + 4 * 8);
  });
});
