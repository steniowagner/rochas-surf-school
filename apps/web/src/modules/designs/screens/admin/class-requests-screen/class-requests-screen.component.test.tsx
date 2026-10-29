import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassRequestsScreen } from "./class-requests-screen.component";

const groups = () => screen.queryAllByTestId("class-requests-group");

describe("ClassRequestsScreen", () => {
  it("AD-06-01: the intro with the counts, the requests by class and the sport filter, in a tall frame", () => {
    render(<ClassRequestsScreen locale="pt-br" state="ready" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Inscrições em aulas" })).toBeInTheDocument();
    expect(screen.getByText("5 pedidos · 3 aulas")).toBeInTheDocument();
    expect(groups()).toHaveLength(3);
    expect(screen.getByText("Pediu às 14:20 · 5 set")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Inscrever" })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Filtrar por modalidade" })).toBeInTheDocument();
  });

  it("AD-06-02: scrolled to the full class: its waiting list in order, enrolling blocked", () => {
    render(<ClassRequestsScreen locale="pt-br" state="fullClass" />);

    expect(groups()).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Inscrições em aulas" })).toBeInTheDocument();
    expect(screen.getByText("Lista de espera · por ordem de pedido")).toBeInTheDocument();
    expect(screen.getByText("1º Igor Santos")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Inscrever" })) {
      expect(button).toBeDisabled();
    }
  });

  it("AD-06-03: surf only", () => {
    render(<ClassRequestsScreen locale="pt-br" state="filtered" />);

    expect(groups()).toHaveLength(2);
    expect(screen.queryByText("Skate")).toBeNull();
  });

  it("AD-06-04..05: the deny sheet and the enrolled toast over a phone-height frame", () => {
    const deny = render(<ClassRequestsScreen locale="pt-br" state="denySheet" />);
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Recusar inscrição?" })).toBeInTheDocument();
    expect(screen.getByText(/Gabriel Moura não fica inscrito nesta aula/)).toBeInTheDocument();
    deny.unmount();

    render(<ClassRequestsScreen locale="pt-br" state="approved" />);
    expect(screen.getByTestId("screen-toast")).toHaveTextContent("Gabriel Moura inscrito · aluno avisado");
  });

  it("AD-06-06..07: nothing waiting, and no surf request with only the skate class waiting", () => {
    const empty = render(<ClassRequestsScreen locale="pt-br" state="empty" />);
    expect(screen.getByRole("heading", { name: "Nada à espera" })).toBeInTheDocument();
    expect(screen.queryByText(/pedidos ·/)).toBeNull();
    empty.unmount();

    render(<ClassRequestsScreen locale="pt-br" state="emptyFiltered" />);
    expect(screen.getByText("2 pedidos · 1 aula")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sem pedidos de surf" })).toBeInTheDocument();
    expect(groups()).toHaveLength(0);
  });

  it("AD-06-08..09: the skeletons and the load error", () => {
    const loading = render(<ClassRequestsScreen locale="pt-br" state="loading" />);
    expect(screen.getByRole("status", { name: "Carregando os pedidos" })).toBeInTheDocument();
    loading.unmount();

    render(<ClassRequestsScreen locale="pt-br" state="error" />);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar os pedidos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
