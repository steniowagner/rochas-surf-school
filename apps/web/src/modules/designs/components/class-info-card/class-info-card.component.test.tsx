import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassInfoCard } from "./class-info-card.component";

describe("ClassInfoCard", () => {
  it("draws the started card in sun with its start and end", () => {
    render(<ClassInfoCard locale="pt-br" variant="started" start="08:00" end="09:30" />);

    expect(screen.getByTestId("class-info-card")).toHaveClass("bg-sun");
    expect(screen.getByText("Em andamento")).toHaveClass("text-on-color");
    expect(screen.getByText("Começou às 08:00 e termina às 09:30.")).toBeInTheDocument();
  });

  it("draws the finished card on the dim background", () => {
    render(<ClassInfoCard locale="pt-br" variant="finished" end="09:30" />);

    expect(screen.getByTestId("class-info-card")).toHaveClass("bg-dim");
    expect(screen.getByText("Aula finalizada")).toBeInTheDocument();
    expect(screen.getByText("Terminou às 09:30.")).toBeInTheDocument();
  });

  it("draws the cancelled card with the generic text or the typed message", () => {
    const { rerender } = render(<ClassInfoCard locale="pt-br" variant="cancelled" />);
    expect(screen.getByTestId("class-info-card")).toHaveClass("bg-bad-tint");
    expect(screen.getByText("Esta aula não vai acontecer.")).toBeInTheDocument();

    rerender(<ClassInfoCard locale="pt-br" variant="cancelled" message="Mar agitado." />);
    expect(screen.getByText("Mar agitado.")).toBeInTheDocument();
  });

  it("draws the admin's warn cards", () => {
    const { rerender } = render(<ClassInfoCard locale="pt-br" variant="noInstructor" />);
    expect(screen.getByTestId("class-info-card")).toHaveClass("bg-warn-tint");
    expect(screen.getByText("Sem instrutor")).toBeInTheDocument();

    rerender(<ClassInfoCard locale="pt-br" variant="noDeadline" discipline="skate" />);
    expect(screen.getByText("Sem prazo de cancelamento")).toBeInTheDocument();
    expect(screen.getByText(/Confira a regra de skate/i)).toBeInTheDocument();
  });
});
