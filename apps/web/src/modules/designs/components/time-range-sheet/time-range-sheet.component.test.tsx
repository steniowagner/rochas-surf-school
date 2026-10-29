import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeRangeSheet } from "./time-range-sheet.component";

describe("TimeRangeSheet", () => {
  it("opens at 12:00 to 13:00, ready to add", () => {
    render(<TimeRangeSheet locale="pt-br" />);

    expect(screen.getByRole("heading", { name: "Novo horário" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Início 12:00" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Fim 13:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar horário" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByText("O fim precisa ser depois do início.")).toBeNull();
  });

  it("says the end must come after the start", () => {
    render(<TimeRangeSheet locale="pt-br" start={{ hour: 14, minute: 0 }} end={{ hour: 13, minute: 30 }} />);

    expect(screen.getByText("O fim precisa ser depois do início.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar horário" })).toBeDisabled();
  });
});
