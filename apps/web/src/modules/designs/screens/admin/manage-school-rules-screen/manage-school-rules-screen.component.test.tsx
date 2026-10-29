import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ManageSchoolRulesScreen } from "./manage-school-rules-screen.component";

const rules = [
  { title: "Chegue 15 minutos antes", description: "A aula começa na hora marcada." },
  { title: "Traga protetor solar", description: "Passe antes de entrar no mar." },
  { title: "Avise se não puder ir", description: "Cancele pelo app para liberar a vaga." },
];

describe("ManageSchoolRulesScreen", () => {
  it("AD-10-09: the intro, the rules in order with their moves, and Adicionar regra, in a tall frame", () => {
    render(<ManageSchoolRulesScreen locale="pt-br" state="ready" rules={rules} />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Regras da escola" })).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subir a regra 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descer a regra 3" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descer a regra 1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Adicionar regra" })).toBeInTheDocument();
  });

  it("AD-10-10..12: the new rule, edit rule and delete rule sheets over a phone-height frame", () => {
    const add = render(<ManageSchoolRulesScreen locale="pt-br" state="addSheet" rules={rules} />);
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Nova regra" })).toBeInTheDocument();
    add.unmount();

    const edit = render(<ManageSchoolRulesScreen locale="pt-br" state="editSheet" rules={rules} />);
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Editar regra" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Excluir regra" })).toBeInTheDocument();
    edit.unmount();

    render(<ManageSchoolRulesScreen locale="pt-br" state="deleteSheet" rules={rules} />);
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Excluir esta regra?" })).toBeInTheDocument();
  });

  it("AD-10-13..15: no rule yet with its add action, the skeletons and the load error", () => {
    const empty = render(<ManageSchoolRulesScreen locale="pt-br" state="empty" rules={rules} />);
    expect(screen.getByRole("heading", { name: "Nenhuma regra ainda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar regra" })).toBeInTheDocument();
    empty.unmount();

    const loading = render(<ManageSchoolRulesScreen locale="pt-br" state="loading" rules={rules} />);
    expect(screen.getByRole("status", { name: "Carregando as regras" })).toBeInTheDocument();
    loading.unmount();

    render(<ManageSchoolRulesScreen locale="pt-br" state="error" rules={rules} />);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar as regras" })).toBeInTheDocument();
  });
});
