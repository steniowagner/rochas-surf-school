import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeachingClassesScreen } from "./teaching-classes-screen.component";
import type { TeachingClassesState } from "./teaching-classes-screen.types";

const open = (state: TeachingClassesState) => render(<TeachingClassesScreen locale="pt-br" state={state} />);

describe("TeachingClassesScreen", () => {
  it("IN-04-01: the intro, the history button, the class under way, the classes by day with the next one, in a tall frame", () => {
    open("list");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Minhas aulas" })).toBeInTheDocument();
    expect(screen.getByText("As aulas que você vai dar: as em andamento e as próximas, dia a dia.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aulas anteriores" })).toBeInTheDocument();
    expect(screen.getByTestId("ongoing-class-card")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hoje, 7 set" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Amanhã, 8 set" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quinta, 10 set" })).toBeInTheDocument();
    expect(screen.getAllByTestId("class-card")).toHaveLength(5);
    expect(screen.getByText("Próxima")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtrar por modalidade" })).toBeInTheDocument();
  });

  it("IN-04-02..03: without the class under way, and with only surf", () => {
    const nothing = open("nothingOngoing");
    expect(screen.queryByTestId("ongoing-class-card")).toBeNull();
    expect(screen.getAllByTestId("class-card")).toHaveLength(5);
    nothing.unmount();

    open("filtered");
    expect(screen.getAllByTestId("class-card")).toHaveLength(3);
    expect(screen.queryByText("Skate")).toBeNull();
  });

  it("IN-04-04..05: the empty states, with the plain title", () => {
    const empty = open("empty");
    expect(screen.getByRole("heading", { name: "Nada por aqui" })).toBeInTheDocument();
    expect(screen.getByText("Você ainda não tem aulas atribuídas.")).toBeInTheDocument();
    expect(screen.queryByText(/dia a dia/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Minhas aulas" })).toBeInTheDocument();
    empty.unmount();

    open("emptyFiltered");
    expect(screen.getByRole("heading", { name: "Nenhuma aula de surf" })).toBeInTheDocument();
  });

  it("IN-04-06..07: loading with the intro, and the error", () => {
    const loading = open("loading");
    expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(4);
    expect(screen.getByText(/dia a dia/)).toBeInTheDocument();
    loading.unmount();

    open("error");
    expect(screen.getByText("Não conseguimos carregar suas aulas. Verifique sua conexão e tente novamente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
