import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeScreen } from "./home-screen.component";

const badges = () => screen.queryAllByTestId("admin-tool-row-badge").map((badge) => badge.textContent);

describe("HomeScreen (admin)", () => {
  it("AD-01-01: the user header, the tools with what waits as badges, the school's rows and the admin tab bar, in a tall frame", () => {
    render(<HomeScreen locale="pt-br" state="home" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByText("Juliana")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ferramentas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Escola" })).toBeInTheDocument();
    for (const name of ["Criar aulas", "Inscrições em aulas", "Entrar na escola", "Inscrever aluno", "Contas removidas", "Reativar contas", "Regras de cancelamento", "Enviar aviso", "Configurações da escola"]) {
      expect(screen.getByRole("button", { name }), name).toBeInTheDocument();
    }
    expect(badges()).toEqual(["5", "3", "2", "2"]);
    expect(screen.getByText("Minhas aulas")).toBeInTheDocument();
    expect(screen.getByText("4 aulas atribuídas a você")).toBeInTheDocument();
    expect(screen.getByText("Regras")).toBeInTheDocument();
    expect(screen.getByText("3 regras no onboarding dos alunos")).toBeInTheDocument();
    expect(screen.getByText("Ocupação semanal")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Início" })).toHaveAttribute("aria-selected", "true");
  });

  it("AD-01-02: an admin who doesn't teach, with nothing waiting", () => {
    render(<HomeScreen locale="pt-br" state="notTeaching" />);

    expect(screen.queryByText("Minhas aulas")).toBeNull();
    expect(badges()).toEqual([]);
    expect(screen.getByText("3 regras no onboarding dos alunos")).toBeInTheDocument();
  });

  it("AD-01-03: no counts and no Minhas aulas while they load", () => {
    render(<HomeScreen locale="pt-br" state="loading" />);

    expect(badges()).toEqual([]);
    expect(screen.queryByText("Minhas aulas")).toBeNull();
    expect(screen.queryByText(/no onboarding/)).toBeNull();
  });

  it("draws a toast over a phone-height frame", () => {
    render(<HomeScreen locale="pt-br" state="home" toast={{ key: "newClass.created", params: { count: 8 } }} />);

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(screen.getByTestId("screen-toast")).toHaveTextContent("8 aulas criadas");
  });
});
