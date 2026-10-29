import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HistoryListHeader } from "./history-list-header.component";

const props = { title: "Todas as aulas", caption: "setembro", clearDayLabel: "Limpar 9 set" };

describe("HistoryListHeader", () => {
  it("shows the period's caption while no day is selected", () => {
    render(<HistoryListHeader {...props} dayLabel={null} />);

    expect(screen.getByRole("heading", { name: "Todas as aulas" })).toBeInTheDocument();
    expect(screen.getByText("setembro")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the selected day as a clearable chip", () => {
    render(<HistoryListHeader {...props} dayLabel="9 set" />);

    expect(screen.queryByText("setembro")).toBeNull();
    expect(screen.getByRole("button", { name: "Limpar 9 set" })).toBeInTheDocument();
    expect(screen.getByTestId("history-day-chip")).toHaveTextContent("9 set");
  });
});
