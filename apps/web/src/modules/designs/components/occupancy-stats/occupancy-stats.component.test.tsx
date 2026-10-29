import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OccupancyStats } from "./occupancy-stats.component";

describe("OccupancyStats", () => {
  it("draws the four figures with their labels and colors", () => {
    render(<OccupancyStats locale="pt-br" stats={{ percent: 65, taken: 26, total: 40, free: 14, fullClasses: 1 }} />);

    expect(screen.getByText("65%")).toHaveClass("text-grape");
    expect(screen.getByText("26/40")).toHaveClass("text-ink");
    expect(screen.getByText("14")).toHaveClass("text-lagoon");
    expect(screen.getByText("1")).toHaveClass("text-bad");
    for (const label of ["Ocupação", "Lugares", "Livres", "Cheias"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
