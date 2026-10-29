import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeleteAccountSheet } from "./delete-account-sheet.component";

describe("DeleteAccountSheet", () => {
  it("explains what removing the account does, with a danger button", () => {
    render(<DeleteAccountSheet locale="pt-br" />);

    expect(screen.getByRole("heading", { name: "Remover a conta?" })).toBeInTheDocument();
    expect(screen.getByText(/Você pode pedir a reativação em até 30 dias/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover a conta" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("shows the spinner while removing", () => {
    render(<DeleteAccountSheet locale="pt-br" removing />);

    expect(screen.getByRole("status", { name: "Remover a conta" })).toBeInTheDocument();
  });
});
