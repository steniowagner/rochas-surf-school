import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeSheet } from "./theme-sheet.component";

describe("ThemeSheet", () => {
  it("lists the options and only shows the check of the selected one", () => {
    render(
      <ThemeSheet
        title="Tema"
        description="Escolha o tema."
        options={[
          { icon: "Ionicons:options-outline", label: "Sistema", selected: false },
          { icon: "Ionicons:sunny-outline", label: "Claro", selected: true },
          { icon: "Ionicons:moon-outline", label: "Escuro", selected: false },
        ]}
      />,
    );

    const check = (name: string) => screen.getByRole("button", { name }).querySelectorAll("svg")[1];
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(check("Claro")).not.toHaveClass("opacity-0");
    expect(check("Sistema")).toHaveClass("opacity-0");
    expect(check("Escuro")).toHaveClass("opacity-0");
  });
});
