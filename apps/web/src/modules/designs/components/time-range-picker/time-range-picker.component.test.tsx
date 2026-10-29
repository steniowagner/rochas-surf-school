import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeRangePicker } from "./time-range-picker.component";

const chips = [
  { label: "06:30 – 08:00", selected: false, blocked: false },
  { label: "08:00 – 09:30", selected: true, blocked: false },
  { label: "09:00 – 10:30", selected: false, blocked: true },
];

describe("TimeRangePicker", () => {
  it("draws the chips: the selected on grape, the blocked struck out, and the add chip", () => {
    render(<TimeRangePicker locale="pt-br" chips={chips} showSuggestionsHint showPastHint={false} showOverlapHint />);

    expect(screen.getByRole("button", { name: "08:00 – 09:30" })).toHaveClass("bg-grape");
    expect(screen.getByRole("button", { name: "09:00 – 10:30" })).toBeDisabled();
    expect(screen.getByText("09:00 – 10:30")).toHaveClass("line-through");
    expect(screen.getByRole("button", { name: "Novo horário" })).toHaveClass("border-dashed");
    expect(screen.getByText("Sugeridos a partir das aulas da semana passada.")).toBeInTheDocument();
    expect(screen.getByText("Horários sobrepostos não podem ir no mesmo lote.")).toBeInTheDocument();
    expect(screen.queryByText("Os horários que já passaram não terão aula hoje.")).toBeNull();
  });

  it("says the ranges that passed have no class today", () => {
    render(<TimeRangePicker locale="pt-br" chips={[]} showSuggestionsHint={false} showPastHint showOverlapHint={false} />);

    expect(screen.getByText("Os horários que já passaram não terão aula hoje.")).toBeInTheDocument();
    expect(screen.queryByText("Sugeridos a partir das aulas da semana passada.")).toBeNull();
  });
});
