import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NewClassScreen } from "./new-class-screen.component";

const notes = "Ponto de encontro em frente à barraca do salva-vidas.";

describe("NewClassScreen", () => {
  it("AD-04-01: the form as it opens, surf and beginner selected, each section with its hint, in a tall frame", () => {
    render(<NewClassScreen locale="pt-br" state="empty" notes={notes} />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Nova aula" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Surf" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Iniciante" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("escolha pelo menos 1")).toHaveLength(2);
    expect(screen.getByText("escolha um local")).toBeInTheDocument();
    expect(screen.getByText("pelo menos 1")).toBeInTheDocument();
    expect(screen.getByText("Setembro 2026")).toBeInTheDocument();
    expect(screen.getByText("Toque em um dia para começar")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-2026-09-04")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gerir" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText("Ex.: Ponto de encontro em frente à barraca do salva-vidas. Traga protetor solar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar aula" })).toBeDisabled();
  });

  it("AD-04-02: a batch ready to create, with a removed day, two times, a place, the notes, two instructors and the summary", () => {
    render(<NewClassScreen locale="pt-br" state="filled" notes={notes} />);

    expect(screen.getByText("4 dias")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-band-2026-09-14")).toHaveClass("rounded-l-full");
    expect(screen.getByTestId("excluded-2026-09-16")).toHaveTextContent("16 set");
    expect(screen.getByRole("button", { name: "08:00 – 09:30" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "09:00 – 10:30" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(notes)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Juliana Prado" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Rafael Rocha" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("4 dias × 2 horários · Praia de Iracema")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar 8 aulas" })).toBeEnabled();
  });

  it("AD-04-03: the new time sheet over a phone-height frame", () => {
    render(<NewClassScreen locale="pt-br" state="timeSheet" notes={notes} />);

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Novo horário" })).toBeInTheDocument();
  });
});
