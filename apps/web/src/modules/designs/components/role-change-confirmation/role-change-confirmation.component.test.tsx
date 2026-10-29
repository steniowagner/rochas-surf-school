import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoleChangeConfirmation } from "./role-change-confirmation.component";

describe("RoleChangeConfirmation", () => {
  it("asks before making a student admin, with the seats note and the instructor checkbox", () => {
    render(<RoleChangeConfirmation locale="pt-br" action="promoteAdmin" name="Caio" showSeatsNote />);

    expect(screen.getByRole("heading", { name: "Promover Caio a admin?" })).toBeInTheDocument();
    expect(screen.getByText("As vagas e pedidos que tinha em aulas futuras, como aluno, são cancelados.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Também é instrutor" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: "Promover a admin" })).toHaveClass("bg-sun");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("asks before a change that takes something away, in bad, without the checkbox", () => {
    render(<RoleChangeConfirmation locale="pt-br" action="demoteStudent" name="Marcos" showSeatsNote={false} />);

    expect(screen.getByRole("heading", { name: "Rebaixar Marcos a aluno?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rebaixar a aluno" })).toHaveClass("bg-bad");
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/As vagas e pedidos/)).toBeNull();
  });
});
