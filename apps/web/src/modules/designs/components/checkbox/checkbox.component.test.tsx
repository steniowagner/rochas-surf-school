import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Checkbox } from "./checkbox.component";

describe("Checkbox", () => {
  it("draws an unchecked box", () => {
    render(<Checkbox checked={false} label="Aceito" />);

    const box = screen.getByRole("checkbox", { name: "Aceito" });
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(box.querySelector("svg")).toBeNull();
    expect(box.firstElementChild).toHaveClass("bg-input");
  });

  it("draws a checked box with the check in lagoon", () => {
    render(<Checkbox checked label="Aceito" helper="Leia antes" />);

    const box = screen.getByRole("checkbox");
    expect(box.firstElementChild).toHaveClass("bg-lagoon");
    expect(box.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Leia antes")).toBeInTheDocument();
  });

  it("draws the boxed variant and dims a disabled one", () => {
    render(<Checkbox checked={false} label="Aceito" variant="boxed" disabled />);

    expect(screen.getByRole("checkbox")).toHaveClass("bg-dim", "opacity-50");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
  });
});
