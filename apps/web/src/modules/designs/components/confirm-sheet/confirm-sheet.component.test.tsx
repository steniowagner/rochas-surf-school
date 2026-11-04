import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppIcon } from "../app-icon";

import { ConfirmSheet } from "./confirm-sheet.component";

describe("ConfirmSheet", () => {
  it("draws the title, the description, the confirm button in its variant with its icon and a ghost cancel", () => {
    const { container } = render(
      <ConfirmSheet
        title="Aprovar entrada?"
        description="Ana Souza entra na escola."
        confirmLabel="Aprovar"
        confirmIcon={<AppIcon name="Feather:check" size={16} />}
        confirmVariant="success"
        cancelLabel="Cancelar"
      />,
    );

    expect(screen.getByRole("heading", { name: "Aprovar entrada?" })).toBeInTheDocument();
    expect(screen.getByText("Ana Souza entra na escola.")).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Aprovar" });
    expect(confirm).toHaveClass("bg-ok");
    expect(confirm.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });

  it("uses the primary variant by default and can draw the confirm button spinning", () => {
    render(
      <ConfirmSheet
        title="Restaurar conta?"
        description="Bia volta."
        confirmLabel="Restaurar"
        confirmIcon={<AppIcon name="Ionicons:refresh-outline" size={16} />}
        cancelLabel="Cancelar"
        loading
      />,
    );

    expect(screen.getByRole("button", { name: "Restaurar" })).toHaveClass("bg-sun");
    expect(screen.queryByText("Restaurar")).toBeNull();
  });
});
