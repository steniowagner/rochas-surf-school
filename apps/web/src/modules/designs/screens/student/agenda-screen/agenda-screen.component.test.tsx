import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgendaScreen } from "./agenda-screen.component";

describe("AgendaScreen", () => {
  it("draws the week (ST-01-01): header, calendar, the day's classes with the student's enrolment, the filter and the tab bar, in a tall frame", () => {
    render(<AgendaScreen locale="pt-br" state="week" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByText("Bom dia,")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notificações, 2 não lidas" })).toBeInTheDocument();
    expect(screen.getByTestId("calendar-pill")).toHaveClass("bg-dim");
    expect(screen.getByText("7 – 13 SET")).toBeInTheDocument();
    expect(screen.getAllByTestId("class-card")).toHaveLength(5);
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("Sem vagas", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtrar por modalidade" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-selected", "true");
  });

  it("draws the month grid (ST-01-02) in a phone-height frame", () => {
    render(<AgendaScreen locale="pt-br" state="month" />);

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(screen.getByTestId("calendar-pill")).toHaveClass("bg-grape");
    expect(screen.getByText("SETEMBRO DE 2026")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^calendar-week-/)).toHaveLength(5);
  });

  it("opens the sport filter over the scrim with Todas selected (ST-01-03)", () => {
    render(<AgendaScreen locale="pt-br" state="filterOpen" />);

    expect(screen.getByTestId("discipline-filter-scrim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lists only the surf classes with Surf selected (ST-01-04)", () => {
    render(<AgendaScreen locale="pt-br" state="filtered" />);

    expect(screen.getAllByTestId("class-card")).toHaveLength(4);
    expect(screen.queryByText("Skate")).toBeNull();
    expect(screen.getByRole("button", { name: "Filtrar por modalidade" })).toBeInTheDocument();
  });

  it("draws the skeletons while loading (ST-01-05)", () => {
    render(<AgendaScreen locale="pt-br" state="loading" />);

    expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(4);
    expect(screen.getByRole("status", { name: "Carregando as aulas" })).toBeInTheDocument();
    expect(screen.queryByTestId("class-card")).toBeNull();
  });

  it("draws the empty day with the date and no create button (ST-01-06)", () => {
    render(<AgendaScreen locale="pt-br" state="empty" />);

    expect(screen.getByRole("heading", { name: "Sem aulas neste dia" })).toBeInTheDocument();
    expect(screen.getByText("Ainda não há aulas marcadas para quarta-feira, 9 de setembro.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Criar aula" })).toBeNull();
  });

  it("draws the load error with the date and the retry button (ST-01-07)", () => {
    render(<AgendaScreen locale="pt-br" state="error" />);

    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(screen.getByText(/quarta-feira, 9 de setembro/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
