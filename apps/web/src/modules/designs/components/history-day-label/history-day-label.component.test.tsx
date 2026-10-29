import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HistoryDayLabel } from "./history-day-label.component";

describe("HistoryDayLabel", () => {
  it("draws the day label as a heading", () => {
    render(<HistoryDayLabel label="qua, 9 set" />);

    expect(screen.getByRole("heading", { name: "qua, 9 set" })).toHaveClass("text-ink-2");
  });
});
