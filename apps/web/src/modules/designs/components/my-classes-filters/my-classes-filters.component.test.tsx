import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyClassesFilters } from "./my-classes-filters.component";

describe("MyClassesFilters", () => {
  it("draws the four status chips with the selected one in grape", () => {
    render(<MyClassesFilters locale="pt-br" selected="pending" />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Todas", "Pendentes", "Confirmadas", "Encerradas"]);
    expect(screen.getByRole("button", { name: "Pendentes" })).toHaveClass("bg-grape");
    expect(screen.getByRole("button", { name: "Pendentes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todas" })).toHaveClass("bg-surface");
  });
});
