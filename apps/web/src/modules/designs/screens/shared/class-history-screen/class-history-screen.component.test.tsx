import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassHistoryScreen } from "./class-history-screen.component";

const open = (state: Parameters<typeof ClassHistoryScreen>[0]["state"]) => render(<ClassHistoryScreen locale="pt-br" state={state} />);

describe("ClassHistoryScreen", () => {
  it("ST-03-10: the calendar with its legend and the classes grouped by day, in a tall frame", () => {
    open("month");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Aulas anteriores" })).toBeInTheDocument();
    expect(screen.getByText("Dias em que você fez aula")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Todas as aulas" })).toBeInTheDocument();
    expect(screen.getAllByText("SETEMBRO DE 2026")).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(3);
    expect(screen.getAllByTestId("class-card")).toHaveLength(4);
    expect(screen.getByTestId("calendar-day-2026-09-03-dot")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-day-2026-09-02-dot")).toBeNull();
  });

  it("ST-03-11: one day selected, with the clear chip", () => {
    open("daySelected");

    expect(screen.getByRole("button", { name: "Limpar 3 set" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(1);
    expect(screen.getAllByTestId("class-card")).toHaveLength(2);
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
  });

  it("ST-03-12..14: empty period, loading and error", () => {
    const empty = open("emptyPeriod");
    expect(screen.getByRole("heading", { name: "Sem aulas neste período" })).toBeInTheDocument();
    empty.unmount();

    const loading = open("loading");
    expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(3);
    loading.unmount();

    open("error");
    expect(screen.getByText("Não conseguimos carregar seu histórico. Verifique sua conexão e tente novamente.")).toBeInTheDocument();
  });

  describe("the instructor's form", () => {
    const openAs = (state: Parameters<typeof ClassHistoryScreen>[0]["state"]) => render(<ClassHistoryScreen locale="pt-br" state={state} role="instructor" />);

    it("IN-04-08: the intro of the teaching history, the calendar with its legend and the classes by day", () => {
      openAs("month");

      expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
      expect(screen.getAllByRole("heading", { name: "Aulas anteriores" })).toHaveLength(1);
      expect(screen.getByText("Todas as aulas que você já deu, mês a mês ou semana a semana.")).toBeInTheDocument();
      expect(screen.getByText("Dias em que você deu aula")).toBeInTheDocument();
      expect(screen.getAllByTestId("class-card")).toHaveLength(4);
    });

    it("IN-04-09: a day selected, with the clear chip", () => {
      openAs("daySelected");

      expect(screen.getByRole("button", { name: "Limpar 3 set" })).toBeInTheDocument();
      expect(screen.getByText("Todas as aulas que você já deu, mês a mês ou semana a semana.")).toBeInTheDocument();
    });

    it("IN-04-10..12: the intro gives way to the title on the empty period and the error; loading keeps it", () => {
      const empty = openAs("emptyPeriod");
      expect(screen.getByRole("heading", { name: "Sem aulas neste período" })).toBeInTheDocument();
      expect(screen.getByText("Você não deu nenhuma aula neste período.")).toBeInTheDocument();
      expect(screen.queryByText(/mês a mês/)).toBeNull();
      expect(screen.getByRole("heading", { name: "Aulas anteriores" })).toBeInTheDocument();
      empty.unmount();

      const loading = openAs("loading");
      expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(3);
      expect(screen.getByText(/mês a mês/)).toBeInTheDocument();
      loading.unmount();

      openAs("error");
      expect(screen.getByText("Não conseguimos carregar suas aulas anteriores. Verifique sua conexão e tente novamente.")).toBeInTheDocument();
      expect(screen.queryByText(/mês a mês/)).toBeNull();
    });
  });
});
