import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyHistoryScreen } from "./my-history-screen.component";

const open = (state: Parameters<typeof MyHistoryScreen>[0]["state"]) => render(<MyHistoryScreen locale="pt-br" state={state} />);

describe("MyHistoryScreen", () => {
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
});
