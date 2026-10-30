import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocationAddressCard } from "./location-address-card.component";

describe("LocationAddressCard", () => {
  it("says to tap the map before any point, on a dashed card", () => {
    render(<LocationAddressCard locale="pt-br" place={null} />);

    expect(screen.getByText("Toque no mapa para marcar o ponto")).toBeInTheDocument();
    expect(screen.getByTestId("location-address-card")).toHaveClass("border-dashed");
  });

  it("says the address is being looked up for the tapped point", () => {
    render(<LocationAddressCard locale="pt-br" place={null} resolving pendingPoint="-3.7190, -38.5020" />);

    expect(screen.getByText("Buscando o endereço…")).toBeInTheDocument();
    expect(screen.getByText("Ponto escolhido no mapa · -3.7190, -38.5020")).toBeInTheDocument();
  });

  it("draws the picked address over where it came from", () => {
    const { rerender } = render(<LocationAddressCard locale="pt-br" place={{ address: "Av. Beira Mar, 2200 – Meireles, Fortaleza", point: "-3.7190, -38.5020" }} />);

    expect(screen.getByText("Av. Beira Mar, 2200 – Meireles, Fortaleza")).toBeInTheDocument();
    expect(screen.getByText("Ponto escolhido no mapa · -3.7190, -38.5020")).toBeInTheDocument();
    rerender(<LocationAddressCard locale="pt-br" place={{ address: "Av. Beira Mar, 2200", name: "Praia de Iracema", point: "-3.7190, -38.5020" }} />);
    expect(screen.getByText("Praia de Iracema · -3.7190, -38.5020")).toBeInTheDocument();
  });
});
