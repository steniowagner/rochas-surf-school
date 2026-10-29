import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoleFilters } from "./role-filters.component";

describe("RoleFilters", () => {
  it("draws one toggle per role and highlights the selected ones", () => {
    render(<RoleFilters locale="pt-br" selected={["instructor"]} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Alunos", "Instrutores", "Admins"]);
    expect(screen.getByRole("button", { name: "Instrutores" })).toHaveClass("bg-grape");
    expect(screen.getByRole("button", { name: "Alunos" })).toHaveAttribute("aria-pressed", "false");
  });

  it("can have several roles on, or none", () => {
    const { rerender } = render(<RoleFilters locale="en" selected={["student", "admin"]} />);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(2);

    rerender(<RoleFilters locale="en" selected={[]} />);
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });
});
