import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassToolCard } from "./class-tool-card.component";

describe("ClassToolCard", () => {
  it("draws an enabled tool on the surface", () => {
    render(<ClassToolCard icon="Ionicons:pencil-outline" title="Editar aula" subtitle="Data, hora, local…" />);

    const card = screen.getByRole("button", { name: "Editar aula" });
    expect(card).toBeEnabled();
    expect(card.firstElementChild).toHaveClass("bg-surface");
    expect(screen.getByText("Data, hora, local…")).toBeInTheDocument();
  });

  it("draws the danger tool on bad-tint, its title in bad", () => {
    render(<ClassToolCard icon="Ionicons:close-circle-outline" title="Cancelar aula" subtitle="Avisa 6 pessoas" tone="danger" />);

    expect(screen.getByRole("button", { name: "Cancelar aula" }).firstElementChild).toHaveClass("bg-bad-tint");
    expect(screen.getByText("Cancelar aula")).toHaveClass("text-bad");
  });

  it("fades a disabled tool", () => {
    render(<ClassToolCard icon="Ionicons:trash-outline" title="Excluir aula" subtitle="Tem inscritos" disabled />);

    const card = screen.getByRole("button", { name: "Excluir aula" });
    expect(card).toBeDisabled();
    expect(card.firstElementChild).toHaveClass("opacity-50");
  });
});
