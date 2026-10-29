import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocationSearchHeader } from "./location-search-header.component";

describe("LocationSearchHeader", () => {
  it("draws the search field with its placeholder", () => {
    render(<LocationSearchHeader locale="pt-br" />);

    expect(screen.getByText("Busque um endereço ou uma praia")).toHaveClass("text-ink-2");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws what was typed with the clear button", () => {
    render(<LocationSearchHeader locale="pt-br" text="Praia do Futuro" />);

    expect(screen.getByText("Praia do Futuro")).toHaveClass("text-ink");
    expect(screen.getByRole("button", { name: "Limpar" })).toBeInTheDocument();
  });
});
