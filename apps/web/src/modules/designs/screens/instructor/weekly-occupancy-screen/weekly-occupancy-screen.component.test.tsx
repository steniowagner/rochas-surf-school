import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeeklyOccupancyScreen } from "./weekly-occupancy-screen.component";
import type { WeeklyOccupancyState } from "./weekly-occupancy-screen.types";

const open = (state: WeeklyOccupancyState) => render(<WeeklyOccupancyScreen locale="pt-br" state={state} />);

describe("WeeklyOccupancyScreen", () => {
  it("IN-05-01: this week, the stats, the map with every tone and a cancelled cell, and the emptiest class's card", () => {
    open("week");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Ocupação semanal" })).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-week-label")).toHaveTextContent("Esta semana");
    expect(screen.getByTestId("occupancy-week-label")).toHaveClass("text-sun");
    expect(screen.getByText("7 – 13 SET")).toBeInTheDocument();
    expect(screen.getByText("67%")).toHaveClass("text-grape");
    expect(screen.getByText("44/66")).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-day-2026-09-07")).toHaveClass("text-sun");
    expect(screen.getByTestId("occupancy-cell-box-tue-0800")).toHaveClass("bg-info-tint", "border-grape");
    expect(screen.getByTestId("occupancy-cell-box-mon-0800")).toHaveClass("bg-sun-tint");
    expect(screen.getByTestId("occupancy-cell-box-wed-0800")).toHaveClass("bg-sun");
    expect(screen.getByTestId("occupancy-cell-box-wed-1600")).toHaveClass("bg-bad");
    expect(screen.getByText("canc.")).toBeInTheDocument();
    expect(screen.getAllByText("08:00")).toHaveLength(1);
    expect(screen.getByTestId("occupancy-legend")).toBeInTheDocument();
    expect(screen.getByTestId("class-card")).toHaveTextContent("2/8 vagas");
  });

  it("IN-05-02: the full class selected, with its card", () => {
    open("otherSelected");

    expect(screen.getByTestId("occupancy-cell-box-wed-1600")).toHaveClass("border-grape");
    expect(screen.getByTestId("class-card")).toHaveTextContent("Sem vagas");
  });

  it("IN-05-03: next week", () => {
    open("nextWeek");

    expect(screen.getByTestId("occupancy-week-label")).toHaveTextContent("Próxima semana");
    expect(screen.getByTestId("occupancy-week-label")).toHaveClass("text-ink-2");
    expect(screen.getByText("14 – 20 SET")).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-day-2026-09-14")).toHaveClass("text-ink");
  });

  it("IN-05-04: the week picker over a phone-height frame, this week selected and the days with classes dotted", () => {
    open("picker");

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(screen.getByTestId("week-picker-month")).toHaveTextContent("SETEMBRO 2026");
    expect(screen.getByTestId("calendar-week-2026-09-07")).toHaveClass("bg-grape-tint");
    expect(screen.getByTestId("calendar-day-2026-09-12-dot")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-day-2026-09-13-dot")).toBeNull();
  });

  it("IN-05-05..07: loading, the empty week and the error", () => {
    const loading = open("loading");
    expect(screen.getByRole("status", { name: "Carregando a ocupação" })).toBeInTheDocument();
    loading.unmount();

    const empty = open("empty");
    expect(screen.getByRole("heading", { name: "Sem aulas nesta semana" })).toBeInTheDocument();
    empty.unmount();

    open("error");
    expect(screen.getByRole("heading", { name: "Não foi possível carregar a ocupação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
