import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocationPicker } from "./location-picker.component";

const locations = [
  { id: "iracema", name: "Praia de Iracema", address: "Av. Beira Mar, 2200 – Meireles" },
  { id: "futuro", name: "Praia do Futuro", address: "Av. Zezé Diogo, 3500" },
  { id: "cumbuco", name: "Cumbuco", address: "Caucaia", archived: true },
];

describe("LocationPicker", () => {
  it("draws the locations, the chosen one ticked on grape, and the add chip", () => {
    render(<LocationPicker locale="pt-br" locations={locations.slice(0, 2)} selectedId="iracema" managing={false} />);

    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toHaveClass("bg-grape-tint");
    expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: "Novo local" })).toBeInTheDocument();
  });

  it("draws a pencil on each row while managing, the removed location with its chip and no add chip", () => {
    const { container } = render(<LocationPicker locale="pt-br" locations={locations} selectedId={null} managing />);

    expect(screen.getByText("Removido")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Cumbuco" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "Novo local" })).toBeNull();
    // The location icon on every row, the pencil on the two that can be edited.
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });
});
