import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassLocationCard } from "./class-location-card.component";

describe("ClassLocationCard", () => {
  it("draws the map, the place and the directions button", () => {
    render(<ClassLocationCard name="Praia de Iracema" address="Av. Beira Mar, Fortaleza" directionsLabel="Direções" />);

    expect(screen.getByTestId("map-preview")).toBeInTheDocument();
    expect(screen.getByText("Praia de Iracema")).toHaveClass("text-ink");
    expect(screen.getByText("Av. Beira Mar, Fortaleza")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Direções" })).toBeInTheDocument();
  });
});
