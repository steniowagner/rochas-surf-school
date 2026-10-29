import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRuleSheet } from "./school-rule-sheet.component";

describe("SchoolRuleSheet", () => {
  it("opens empty to add a rule, with the note that everyone accepts again", () => {
    render(<SchoolRuleSheet locale="pt-br" mode="add" />);

    expect(screen.getByRole("heading", { name: "Nova regra" })).toBeInTheDocument();
    expect(screen.getByText("Ex.: Traga protetor solar")).toBeInTheDocument();
    expect(screen.getByText("0/60")).toBeInTheDocument();
    expect(screen.getByText("0/300")).toBeInTheDocument();
    expect(screen.getByText("Ao salvar, todos vão precisar aceitar as regras de novo na próxima vez que abrirem o app.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar regra" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Excluir regra" })).toBeNull();
  });

  it("opens a rule to edit, with its text and Excluir regra", () => {
    render(<SchoolRuleSheet locale="pt-br" mode="edit" rule={{ title: "Traga protetor solar", description: "Passe antes de entrar no mar." }} />);

    expect(screen.getByRole("heading", { name: "Editar regra" })).toBeInTheDocument();
    expect(screen.getByText("Traga protetor solar")).toBeInTheDocument();
    expect(screen.getByText("20/60")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excluir regra" })).toBeInTheDocument();
  });
});
