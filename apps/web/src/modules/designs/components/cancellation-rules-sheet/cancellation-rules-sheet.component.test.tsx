import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CancellationRulesSheet } from "./cancellation-rules-sheet.component";

describe("CancellationRulesSheet", () => {
  it("draws one card per sport with the school's rule", () => {
    render(<CancellationRulesSheet locale="pt-br" status="ready" rules={{ surf: "Cancele até 24 horas antes.", skate: "Cancele até 12 horas antes." }} />);

    expect(screen.getByText("Surf")).toHaveClass("bg-lagoon");
    expect(screen.getByText("Skate")).toHaveClass("bg-tan");
    expect(screen.getByText("Cancele até 24 horas antes.")).toBeInTheDocument();
    expect(screen.getByText("Cancele até 12 horas antes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });

  it("says a sport has no rule yet", () => {
    render(<CancellationRulesSheet locale="pt-br" status="ready" rules={{ surf: "Cancele até 24 horas antes.", skate: null }} />);

    expect(screen.getByText(/ainda não/i)).toBeInTheDocument();
  });

  it("shows the spinner while loading, with no rule", () => {
    render(<CancellationRulesSheet locale="pt-br" status="loading" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Surf")).toBeNull();
  });

  it("shows the error and the retry button", () => {
    render(<CancellationRulesSheet locale="pt-br" status="error" />);

    expect(screen.getByRole("button", { name: "Tentar novamente" })).toHaveClass("bg-dim");
    expect(screen.queryByText("Surf")).toBeNull();
  });
});
