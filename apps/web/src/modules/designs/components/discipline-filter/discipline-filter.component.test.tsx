import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DisciplineFilter } from "./discipline-filter.component";

describe("DisciplineFilter", () => {
  it("draws the closed button only", () => {
    render(<DisciplineFilter locale="pt-br" value="all" />);

    expect(screen.getByRole("button", { name: "Filtrar por modalidade" })).toHaveClass("bg-grape");
    expect(screen.queryByTestId("discipline-filter-scrim")).toBeNull();
    expect(screen.queryByText("Surf")).toBeNull();
  });

  it("draws the three options over the scrim with the current one selected", () => {
    render(<DisciplineFilter locale="pt-br" value="all" open />);

    expect(screen.getByTestId("discipline-filter-scrim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todas" })).toHaveClass("bg-grape");
    expect(screen.getByRole("button", { name: "Surf" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Skate" })).toHaveClass("bg-surface");
    expect(screen.getByRole("button", { name: "Fechar filtro" })).toBeInTheDocument();
  });

  it("marks the chosen sport", () => {
    render(<DisciplineFilter locale="en" value="surf" open />);

    expect(screen.getByRole("button", { name: "Surf" })).toHaveClass("bg-grape");
  });

  it("floats above the tab bar, or near the bottom edge without one", () => {
    const { container, rerender } = render(<DisciplineFilter locale="pt-br" value="all" />);
    expect(container.querySelector(".bottom-28")).not.toBeNull();

    rerender(<DisciplineFilter locale="pt-br" value="all" aboveTabBar={false} />);
    expect(container.querySelector(".bottom-28")).toBeNull();
    expect(container.querySelector(".bottom-12")).not.toBeNull();
  });
});
