import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CapacityStepper } from "./capacity-stepper.component";

describe("CapacityStepper", () => {
  it("draws the value between its two buttons", () => {
    render(<CapacityStepper locale="pt-br" value={8} min={1} max={30} />);

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("alunos por aula")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diminuir" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Aumentar" })).toBeEnabled();
  });

  it("fades the button at each end", () => {
    const { rerender } = render(<CapacityStepper locale="pt-br" value={1} min={1} max={30} />);

    expect(screen.getByRole("button", { name: "Diminuir" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Diminuir" })).toHaveClass("opacity-40");
    rerender(<CapacityStepper locale="pt-br" value={30} min={1} max={30} />);
    expect(screen.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  });
});
