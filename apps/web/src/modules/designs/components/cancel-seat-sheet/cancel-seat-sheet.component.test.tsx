import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CancelSeatSheet } from "./cancel-seat-sheet.component";

describe("CancelSeatSheet", () => {
  it("shows the deadline in the description and the two buttons", () => {
    render(<CancelSeatSheet locale="pt-br" deadline="ter, 8 set às 20:00" />);

    expect(screen.getByRole("heading", { name: "Cancelar inscrição" })).toBeInTheDocument();
    expect(screen.getByText("Sua vaga fica livre. Você pode cancelar até ter, 8 set às 20:00.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sim, cancelar" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Manter inscrição" })).toBeInTheDocument();
  });

  it("shows the spinner while cancelling", () => {
    render(<CancelSeatSheet locale="pt-br" deadline="x" loading />);

    expect(screen.getByRole("status", { name: "Sim, cancelar" })).toBeInTheDocument();
  });
});
