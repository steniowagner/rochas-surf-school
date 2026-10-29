import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RequestSeatSheet } from "./request-seat-sheet.component";

const classCard = { discipline: "surf", level: "beginner", weekday: "QUA", date: "9 set", duration: "1 h 30 min", timeRange: "08:00 – 09:30", locationName: "Praia de Iracema" } as const;
const props = { locale: "pt-br", deadline: "ter, 8 set às 20:00", classCard } as const;

describe("RequestSeatSheet", () => {
  it("draws the deadline, the unchecked acceptance and the disabled submit button", () => {
    render(<RequestSeatSheet {...props} />);

    expect(screen.getByRole("heading", { name: "Pedir para entrar" })).toBeInTheDocument();
    expect(screen.getByText("O pedido fica pendente até a escola confirmar.")).toBeInTheDocument();
    expect(screen.getByText("Você pode cancelar até ter, 8 set às 20:00.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("link", { name: "Ler" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar pedido" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Agora não" })).toBeInTheDocument();
  });

  it("checks the box and shows the spinner while sending", () => {
    render(<RequestSeatSheet {...props} sending />);

    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status", { name: "Enviar pedido" })).toBeInTheDocument();
  });

  it("enables the button once the rule is accepted", () => {
    render(<RequestSeatSheet {...props} accepted />);

    expect(screen.getByRole("button", { name: "Enviar pedido" })).toBeEnabled();
  });

  it("says the deadline is not defined yet", () => {
    render(<RequestSeatSheet {...props} rule="noDeadline" />);

    expect(screen.getByText("Prazo ainda não definido")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("leaves the acceptance out when the school wrote no rule", () => {
    render(<RequestSeatSheet {...props} rule="noRule" />);

    expect(screen.getByText("A escola ainda não escreveu esta regra.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar pedido" })).toBeEnabled();
  });

  it("asks for the waiting list on a full class", () => {
    render(<RequestSeatSheet {...props} waitingList />);

    expect(screen.getByRole("heading", { name: "Entrar na lista de espera" })).toBeInTheDocument();
    expect(screen.getByText(/A turma está cheia/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar na lista de espera" })).toBeDisabled();
  });
});
