import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Chip } from "./chip.component";

describe("Chip", () => {
  it.each([
    ["surf", "bg-lagoon"],
    ["skate", "bg-tan"],
    ["info", "bg-info-tint"],
    ["sun", "bg-sun"],
    ["grape", "bg-grape"],
    ["warn", "bg-warn-tint"],
    ["ok", "bg-ok-tint"],
    ["bad", "bg-bad-tint"],
    ["muted", "bg-dim"],
    ["onHighlight", "bg-white/18"],
  ] as const)("draws the %s tone", (tone, expected) => {
    render(<Chip tone={tone}>Rótulo</Chip>);

    expect(screen.getByText("Rótulo")).toHaveClass(expected);
  });

  it("defaults to info and tightens the padding when compact", () => {
    const { rerender } = render(<Chip>Rótulo</Chip>);
    expect(screen.getByText("Rótulo")).toHaveClass("bg-info-tint", "px-2.5");

    rerender(<Chip size="compact">Rótulo</Chip>);
    expect(screen.getByText("Rótulo")).toHaveClass("px-2");
  });

  it("draws the icon at 12, or 10 when compact", () => {
    const { container, rerender } = render(<Chip icon="Ionicons:time-outline">Rótulo</Chip>);
    expect(container.querySelector("svg")).toHaveAttribute("height", "12");

    rerender(<Chip icon="Ionicons:time-outline" size="compact">Rótulo</Chip>);
    expect(container.querySelector("svg")).toHaveAttribute("height", "10");
  });
});
