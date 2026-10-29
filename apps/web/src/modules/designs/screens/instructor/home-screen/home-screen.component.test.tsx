import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeScreen } from "./home-screen.component";

describe("HomeScreen", () => {
  it("IN-01-01: the user header, the school's card with the three rows and their counts, and the tab bar", () => {
    render(<HomeScreen locale="pt-br" state="home" />);

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(screen.getByText("Bom dia,")).toBeInTheDocument();
    expect(screen.getByText("Rafael")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notificações, 3 não lidas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Escola" })).toBeInTheDocument();
    expect(screen.getByText("6 aulas atribuídas a você")).toBeInTheDocument();
    expect(screen.getByText("3 regras para todos os alunos")).toBeInTheDocument();
    expect(screen.getByText("Lugares ocupados e vagas por aula")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Início" })).toHaveAttribute("aria-selected", "true");
  });

  it("IN-01-02: nothing assigned", () => {
    render(<HomeScreen locale="pt-br" state="noneAssigned" />);

    expect(screen.getByText("Nenhuma aula atribuída")).toBeInTheDocument();
  });

  it("IN-01-03: the rows without their counts while they load", () => {
    render(<HomeScreen locale="pt-br" state="loading" />);

    expect(screen.getByText("Minhas aulas")).toBeInTheDocument();
    expect(screen.queryByText(/atribuída/)).toBeNull();
    expect(screen.queryByText(/regras para/)).toBeNull();
    expect(screen.getByText("Lugares ocupados e vagas por aula")).toBeInTheDocument();
  });
});
