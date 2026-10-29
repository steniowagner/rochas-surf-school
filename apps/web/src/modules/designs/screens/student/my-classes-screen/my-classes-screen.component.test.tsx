import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyClassesScreen } from "./my-classes-screen.component";

const open = (state: Parameters<typeof MyClassesScreen>[0]["state"]) => render(<MyClassesScreen locale="pt-br" state={state} />);

describe("MyClassesScreen", () => {
  it("ST-03-01: all the student's classes with their chips, in a tall frame", () => {
    open("all");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Minhas aulas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Histórico" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas", pressed: true })).toBeInTheDocument();
    expect(screen.getAllByTestId("class-card")).toHaveLength(10);
    expect(screen.getByText("Na lista de espera")).toBeInTheDocument();
    expect(screen.getByText("Recusado")).toBeInTheDocument();
    expect(screen.getByText("Retirado")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Reservas" })).toHaveAttribute("aria-selected", "true");
  });

  it.each([
    ["pending", "Pendentes", 2],
    ["confirmed", "Confirmadas", 2],
    ["ended", "Encerradas", 6],
  ] as const)("ST-03-02..04: %s lists only its classes", (state, label, count) => {
    open(state);

    expect(screen.getByRole("button", { name: label, pressed: true })).toBeInTheDocument();
    expect(screen.getAllByTestId("class-card")).toHaveLength(count);
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
  });

  it("ST-03-05: a sport filtered with Todas", () => {
    open("sport");

    expect(screen.getByRole("button", { name: "Todas", pressed: true })).toBeInTheDocument();
    expect(screen.queryByText("Skate")).toBeNull();
    expect(screen.getAllByTestId("class-card").length).toBeGreaterThan(0);
  });

  it("ST-03-06, 07: the empty states", () => {
    const empty = open("empty");
    expect(screen.getByText("Você ainda não pediu vaga em nenhuma aula.")).toBeInTheDocument();
    empty.unmount();

    open("emptyFilter");
    expect(screen.getByText("Você não tem pedidos com este status.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendentes", pressed: true })).toBeInTheDocument();
  });

  it("ST-03-08, 09: loading and error", () => {
    const loading = open("loading");
    expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(4);
    loading.unmount();

    open("error");
    expect(screen.getByText("Não conseguimos carregar suas aulas. Verifique sua conexão e tente novamente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
