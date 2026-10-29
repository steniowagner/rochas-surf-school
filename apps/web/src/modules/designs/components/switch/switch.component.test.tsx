import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Switch } from "./switch.component";

describe("Switch", () => {
  it("draws the on state with the lagoon track", () => {
    render(<Switch value label="Ocultar" />);

    expect(screen.getByRole("switch", { name: "Ocultar" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch")).toHaveClass("bg-lagoon", "justify-end");
  });

  it("draws the off state with the line track", () => {
    render(<Switch value={false} label="Ocultar" />);

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch")).toHaveClass("bg-line", "justify-start");
  });
});
