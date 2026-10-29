import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OccupancyMap } from "./occupancy-map.component";
import type { OccupancyMapProps } from "./occupancy-map.types";

const days = [
  { date: "2026-09-07", weekday: "SEG", dayNumber: "7", isToday: true },
  { date: "2026-09-08", weekday: "TER", dayNumber: "8", isToday: false },
];
const surf = { date: "2026-09-07", time: "08:00", discipline: "surf", capacity: 8, cancelled: false } as const;
const rows: OccupancyMapProps["rows"] = [
  { time: "08:00", showsTime: true, slots: [{ kind: "class", item: { ...surf, id: "a", seatsTaken: 2 } }, { kind: "empty", date: "2026-09-08" }] },
  { time: "08:00", showsTime: false, slots: [{ kind: "class", item: { ...surf, id: "b", seatsTaken: 8 } }, { kind: "empty", date: "2026-09-08" }] },
];

describe("OccupancyMap", () => {
  it("draws the days with today in sun, the time once per start time, the cells and the legend", () => {
    render(<OccupancyMap locale="pt-br" days={days} rows={rows} selectedId="b" />);

    expect(screen.getByTestId("occupancy-day-2026-09-07")).toHaveClass("text-sun");
    expect(screen.getByTestId("occupancy-day-2026-09-08")).toHaveClass("text-ink");
    expect(screen.getAllByText("08:00")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "SEG 7, 08:00, Surf, 25%" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "SEG 7, 08:00, Surf, 100%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("occupancy-dashed-2026-09-08")).toHaveLength(2);
    expect(screen.getByTestId("occupancy-legend")).toBeInTheDocument();
  });

  it("leaves the day names blank for a slot past the days given", () => {
    render(<OccupancyMap locale="pt-br" days={[]} rows={[rows[0]!]} selectedId={null} />);

    expect(screen.getByRole("button", { name: /^,? ?08:00, Surf, 25%$/ })).toBeInTheDocument();
  });
});
