import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PendingStep } from "./pending-step.component";

describe("PendingStep", () => {
  it("draws the check for a done step", () => {
    const { container } = render(<PendingStep state="done" title="Conta criada" trailing={<span>Agora</span>} />);

    expect(screen.getByTestId("step-done")).toHaveClass("bg-ok");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Conta criada")).toHaveClass("text-ink");
    expect(screen.getByText("Agora")).toBeInTheDocument();
  });

  it("draws the ring for the current step", () => {
    render(<PendingStep state="current" title="Aprovação" />);

    expect(screen.getByTestId("step-current")).toHaveClass("border-warn");
    expect(screen.getByText("Aprovação")).toHaveClass("text-ink");
  });

  it("draws the dashed circle and the dim title for a future step", () => {
    render(<PendingStep state="future" title="Reservar aulas" />);

    expect(screen.getByTestId("step-future")).toHaveClass("border-dashed");
    expect(screen.getByText("Reservar aulas")).toHaveClass("text-ink-3");
  });
});
