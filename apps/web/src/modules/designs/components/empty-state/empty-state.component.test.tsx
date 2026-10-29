import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state.component";

describe("EmptyState", () => {
  it("draws the tilted tile, title and description, with no action", () => {
    render(<EmptyState icon="Ionicons:calendar-outline" title="Sem aulas" description="Nada marcado." />);

    expect(screen.getByRole("heading", { name: "Sem aulas" })).toBeInTheDocument();
    expect(screen.getByText("Nada marcado.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws the action with its icon", () => {
    render(<EmptyState icon="Ionicons:calendar-outline" title="T" description="D" action={{ label: "Criar aula", icon: "Ionicons:calendar-outline" }} />);

    expect(screen.getByRole("button", { name: "Criar aula" }).querySelector("svg")).not.toBeNull();
  });

  it("draws an action without an icon", () => {
    render(<EmptyState icon="Ionicons:calendar-outline" title="T" description="D" action={{ label: "Criar aula" }} />);

    expect(screen.getByRole("button", { name: "Criar aula" }).querySelector("svg")).toBeNull();
  });
});
