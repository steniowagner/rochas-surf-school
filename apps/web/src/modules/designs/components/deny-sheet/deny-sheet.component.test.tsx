import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DenySheet } from "./deny-sheet.component";

const props = { title: "Recusar pedido", hint: "A pessoa será avisada.", maxLength: 200, backLabel: "Voltar", confirmLabel: "Recusar e avisar" };

describe("DenySheet", () => {
  it("draws the reason field with its label and the two buttons", () => {
    render(<DenySheet {...props} label="Motivo (opcional)" showLabel placeholder="Ex.: sem vagas" />);

    expect(screen.getByText("Motivo (opcional)")).toBeInTheDocument();
    expect(screen.getByText("Ex.: sem vagas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recusar e avisar" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Voltar" })).toHaveClass("bg-dim");
  });

  it("hides the label unless asked and hides the field with hideReason", () => {
    const { rerender } = render(<DenySheet {...props} label="Motivo" />);
    expect(screen.queryByText("Motivo")).toBeNull();

    rerender(<DenySheet {...props} hideReason />);
    expect(screen.queryByText("0/200")).toBeNull();
  });

  it("shows the loading state on the confirm button", () => {
    render(<DenySheet {...props} loading />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
