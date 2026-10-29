import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DenialReasonSheet } from "./denial-reason-sheet.component";

const props = { locale: "pt-br", discipline: "surf", level: "beginner", start: "qua, 9 set às 08:00" } as const;

describe("DenialReasonSheet", () => {
  it("shows the class line and the reason as written", () => {
    render(<DenialReasonSheet {...props} reason="Turma reservada para o curso." />);

    expect(screen.getByRole("heading", { name: "Pedido recusado" })).toBeInTheDocument();
    expect(screen.getByText("Surf · Iniciante · qua, 9 set às 08:00")).toBeInTheDocument();
    expect(screen.getByText("Motivo da escola")).toBeInTheDocument();
    expect(screen.getByText("Turma reservada para o curso.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveClass("bg-dim");
  });

  it("says there is no reason without one", () => {
    render(<DenialReasonSheet {...props} />);

    expect(screen.getByText("Sem motivo indicado.")).toBeInTheDocument();
  });
});
