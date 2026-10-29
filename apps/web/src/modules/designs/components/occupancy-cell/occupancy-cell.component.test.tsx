import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OccupancyCell } from "./occupancy-cell.component";
import { getOccupancyCellLook } from "./occupancy-cell.constants";
import type { OccupancyMapClass } from "./occupancy-cell.types";

const item: OccupancyMapClass = { id: "c", date: "2026-09-07", time: "08:00", discipline: "surf", seatsTaken: 3, capacity: 8, cancelled: false };

describe("OccupancyCell", () => {
  it("draws a class under 50% in the lagoon tone, named for a screen reader", () => {
    render(<OccupancyCell locale="pt-br" item={item} weekday="SEG" dayNumber="7" selected={false} />);

    expect(screen.getByRole("button", { name: "SEG 7, 08:00, Surf, 38%" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("occupancy-cell-box-c")).toHaveClass("bg-info-tint");
    expect(screen.getByText("38%")).toHaveClass("text-lagoon");
  });

  it("frames the selected class in grape", () => {
    render(<OccupancyCell locale="pt-br" item={{ ...item, seatsTaken: 8 }} weekday="SEG" dayNumber="7" selected />);

    expect(screen.getByTestId("occupancy-cell-box-c")).toHaveClass("bg-bad", "border-2", "border-grape");
    expect(screen.getByText("100%")).toHaveClass("text-on-color");
  });

  it("strikes a cancelled class through", () => {
    render(<OccupancyCell locale="pt-br" item={{ ...item, cancelled: true }} weekday="SEG" dayNumber="7" selected={false} />);

    expect(screen.getByRole("button", { name: "SEG 7, 08:00, Surf, cancelada" })).toBeInTheDocument();
    expect(screen.getByText("canc.")).toHaveClass("line-through");
    expect(screen.getByTestId("occupancy-cell-box-c")).toHaveClass("bg-dim", "border-line");
  });
});

describe("getOccupancyCellLook", () => {
  it("steps through the app's scale", () => {
    expect(getOccupancyCellLook({ ...item, seatsTaken: 4 })).toEqual({ tone: "mid", percent: 50 });
    expect(getOccupancyCellLook({ ...item, seatsTaken: 9, capacity: 10 })).toEqual({ tone: "high", percent: 90 });
    expect(getOccupancyCellLook({ ...item, seatsTaken: 0, capacity: 0 })).toEqual({ tone: "full", percent: 0 });
  });
});
