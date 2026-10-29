import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DateRangeSummary } from "./date-range-summary.component";

describe("DateRangeSummary", () => {
  it("says to tap a day before any is picked", () => {
    render(<DateRangeSummary locale="pt-br" from={null} to={null} excluded={[]} />);

    expect(screen.getByText("Toque em um dia para começar")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says to tap another day after the first one", () => {
    render(<DateRangeSummary locale="pt-br" from="14 set" to={null} excluded={[]} />);

    expect(screen.getByText("14 set · toque em outro dia para um intervalo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar" })).toBeInTheDocument();
  });

  it("lists the days taken out of a range", () => {
    render(<DateRangeSummary locale="pt-br" from="14 set" to="18 set" excluded={[{ date: "2026-09-16", label: "16 set" }]} />);

    expect(screen.getByText("Dias removidos")).toBeInTheDocument();
    expect(screen.getByTestId("excluded-2026-09-16")).toHaveTextContent("16 set");
    expect(screen.getByText("Toque em um dia do intervalo para removê-lo. Toque de novo para incluí-lo.")).toBeInTheDocument();
  });

  it("says no day was taken out", () => {
    render(<DateRangeSummary locale="pt-br" from="14 set" to="18 set" excluded={[]} />);

    expect(screen.getByText("Nenhum dia removido")).toBeInTheDocument();
  });
});
