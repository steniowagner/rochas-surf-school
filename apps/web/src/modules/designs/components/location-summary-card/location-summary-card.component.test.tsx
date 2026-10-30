import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocationSummaryCard } from "./location-summary-card.component";

describe("LocationSummaryCard", () => {
  it("shows the title over the subtitle", () => {
    render(<LocationSummaryCard title="Praia de Iracema" subtitle="Av. Beira Mar, 2200 – Meireles, Fortaleza" />);

    expect(screen.getByText("Praia de Iracema")).toBeInTheDocument();
    expect(screen.getByText("Av. Beira Mar, 2200 – Meireles, Fortaleza")).toBeInTheDocument();
  });

  it("leaves the subtitle out when there is none", () => {
    render(<LocationSummaryCard title="Buscando o endereço…" />);

    expect(screen.getByTestId("location-summary-card").querySelectorAll("p")).toHaveLength(1);
  });
});
