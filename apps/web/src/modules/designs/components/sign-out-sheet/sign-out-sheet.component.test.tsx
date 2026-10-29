import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignOutSheet } from "./sign-out-sheet.component";

describe("SignOutSheet", () => {
  it("asks before signing out with a danger button and a cancel", () => {
    render(<SignOutSheet locale="pt-br" />);

    expect(screen.getByRole("heading", { name: "Sair da conta?" })).toBeInTheDocument();
    expect(screen.getByText("Para voltar, é só entrar de novo com a mesma conta.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
