import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SegmentedControl } from "./segmented-control.component";

const options = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

describe("SegmentedControl", () => {
  it("marks the selected option and lifts it on a surface", () => {
    render(<SegmentedControl options={options} value="week" />);

    expect(screen.getByRole("tab", { name: "Semana" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Semana" })).toHaveClass("bg-surface");
    expect(screen.getByRole("tab", { name: "Mês" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Mês" })).toHaveClass("text-ink-2");
  });

  it("draws three options", () => {
    render(<SegmentedControl options={[...options, { value: "year", label: "Ano" }]} value="year" />);

    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});
